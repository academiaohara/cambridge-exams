#!/usr/bin/env python3
"""
Cambridge CAE Test Generator
=============================
Generates a complete CAE practice test (18 JSON files + 4 listening audio files).

Requirements:
    pip install openai azure-cognitiveservices-speech pydub requests python-dotenv

Environment variables (or .env file):
    OPENAI_API_KEY          - OpenAI API key
    AZURE_SPEECH_KEY        - Azure Cognitive Services Speech key
    AZURE_REGION            - Azure region (default: westeurope)
    BUNNY_API_KEY           - Bunny.net storage API key
    BUNNY_STORAGE_ZONE      - Bunny storage zone name (default: audios-examen)
    BUNNY_PULL_ZONE         - Bunny CDN pull zone hostname (default: listeninggenerator)

Usage:
    python generate_test.py                         # auto-detect next test number
    python generate_test.py --test-number 16        # generate Test16
    python generate_test.py --json-only             # only generate JSON files
    python generate_test.py --audio-only            # only generate audio (JSON must exist)
    python generate_test.py --parts listening4      # generate specific part only
    python generate_test.py --parts listening1 listening2 reading1

Notes:
    - speaking2 image URLs are generated following the pattern
      https://listeninggenerator.b-cdn.net/test{N}_{label}.jpg
      The actual images must be found and uploaded manually.
    - All API keys must be set as environment variables or in a .env file.
"""

import argparse
import io
import json
import math
import os
import re
import struct
import sys
import tempfile
import time
import wave
from pathlib import Path

# ---------------------------------------------------------------------------
# Optional third-party imports
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: openai package not installed. JSON generation disabled.")

try:
    import azure.cognitiveservices.speech as speechsdk
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False
    print("Warning: azure-cognitiveservices-speech not installed. Audio generation disabled.")

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("Warning: pydub not installed. Audio will be saved as separate WAV files.")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("Warning: requests not installed. Bunny CDN upload disabled.")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
OPENAI_API_KEY   = os.environ.get("OPENAI_API_KEY", "")
AZURE_KEY        = os.environ.get("AZURE_SPEECH_KEY", "")
AZURE_REGION     = os.environ.get("AZURE_REGION", "westeurope")
BUNNY_API_KEY    = os.environ.get("BUNNY_API_KEY", "")
BUNNY_STORAGE_ZONE = os.environ.get("BUNNY_STORAGE_ZONE", "audios-examen")
BUNNY_PULL_ZONE  = os.environ.get("BUNNY_PULL_ZONE", "listeninggenerator")

BUNNY_UPLOAD_URL = f"https://storage.bunnycdn.com/{BUNNY_STORAGE_ZONE}"
BUNNY_PUBLIC_URL = f"https://{BUNNY_PULL_ZONE}.b-cdn.net"

EXAMS_BASE_DIR = Path(__file__).parent.parent / "Nivel" / "C1" / "Exams"
INDEX_FILE     = EXAMS_BASE_DIR / "index.json"

# Azure TTS narrator voice (British English, neutral)
NARRATOR_VOICE = "en-GB-SoniaNeural"

# Voice pools for variety across tests
MALE_VOICES = [
    "en-GB-RyanNeural",
    "en-GB-NoahNeural",
    "en-IE-ConnorNeural",
    "en-US-GuyNeural",
    "en-AU-WilliamNeural",
    "en-CA-LiamNeural",
]
FEMALE_VOICES = [
    "en-GB-SoniaNeural",
    "en-GB-LibbyNeural",
    "en-IE-EmilyNeural",
    "en-US-JennyNeural",
    "en-AU-NatashaNeural",
    "en-CA-ClaraNeural",
    "en-ZA-LeahNeural",
]

# Silence durations (milliseconds)
SILENCE_SHORT       = 500
SILENCE_MEDIUM      = 1200
SILENCE_LONG        = 3000
SILENCE_READING     = 45000   # 45 s for students to read questions
SILENCE_ANSWER_GAP  = 10000   # gap between extracts / questions

# OpenAI model
OPENAI_MODEL = "gpt-4o"

# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _next_test_number() -> int:
    """Return the next available test number from the index file."""
    if not INDEX_FILE.exists():
        return 1
    try:
        with open(INDEX_FILE) as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise SystemExit(
            f"ERROR: {INDEX_FILE} contains invalid JSON — {exc}\n"
            "Please fix the file before running the generator."
        ) from exc
    tests = data.get("tests", [])
    if not tests:
        return 1
    nums = []
    for t in tests:
        m = re.search(r"(\d+)$", t.get("id", ""))
        if m:
            nums.append(int(m.group(1)))
    return max(nums) + 1 if nums else 1


def _pick_voice(index: int, gender: str = "male") -> str:
    pool = MALE_VOICES if gender == "male" else FEMALE_VOICES
    return pool[index % len(pool)]


def _make_silence_wav(duration_ms: int) -> bytes:
    """Return raw WAV bytes for a silence of the given duration."""
    sample_rate = 24000
    num_samples = int(sample_rate * duration_ms / 1000)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * num_samples)
    return buf.getvalue()


def _make_beep_wav(duration_ms: int = 500, freq: int = 880) -> bytes:
    """Return raw WAV bytes for a short sine-wave beep."""
    sample_rate = 44100
    num_samples = int(sample_rate * duration_ms / 1000)
    samples = []
    for i in range(num_samples):
        val = int(32767 * 0.3 * math.sin(2 * math.pi * freq * i / sample_rate))
        samples.append(struct.pack("<h", val))
    raw = b"".join(samples)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(raw)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Azure TTS
# ---------------------------------------------------------------------------

_TTS_COUNTER = 0


def _tts_counter() -> int:
    """Return a monotonically increasing counter for unique temp file names."""
    global _TTS_COUNTER
    _TTS_COUNTER += 1
    return _TTS_COUNTER


def _tts_to_wav(text: str, voice: str, tmp_dir: str) -> str:
    """Synthesise *text* with *voice* and return path to a .wav file."""
    if not AZURE_AVAILABLE:
        raise RuntimeError("Azure Speech SDK not available.")
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_KEY, region=AZURE_REGION)
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
    )
    tmp_path = os.path.join(tmp_dir, f"seg_{_tts_counter()}.wav")
    audio_cfg = speechsdk.audio.AudioOutputConfig(filename=tmp_path)
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, audio_config=audio_cfg
    )
    result = synthesizer.speak_text_async(text).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        raise RuntimeError(f"TTS failed for text: {text[:60]}... Reason: {result.reason}")
    return tmp_path


def _wav_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _concat_wavs(wav_list: list[bytes]) -> bytes:
    """Concatenate a list of raw WAV byte-strings into a single WAV."""
    if not wav_list:
        return _make_silence_wav(100)
    if PYDUB_AVAILABLE:
        combined = None
        for wav_bytes in wav_list:
            seg = AudioSegment.from_wav(io.BytesIO(wav_bytes))
            combined = seg if combined is None else combined + seg
        buf = io.BytesIO()
        combined.export(buf, format="mp3", bitrate="128k")
        return buf.getvalue()
    # Fallback: raw PCM concatenation (same format assumed: 24 kHz, 16-bit, mono)
    frames = []
    sample_rate = 24000
    for wb in wav_list:
        buf = io.BytesIO(wb)
        with wave.open(buf, "rb") as wf:
            frames.append(wf.readframes(wf.getnframes()))
            sample_rate = wf.getframerate()
    raw = b"".join(frames)
    out = io.BytesIO()
    with wave.open(out, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(raw)
    return out.getvalue()


# ---------------------------------------------------------------------------
# Bunny CDN upload
# ---------------------------------------------------------------------------

def upload_to_bunny(local_path: str, remote_filename: str) -> str:
    """Upload *local_path* to Bunny CDN and return the public URL.

    *remote_filename* may contain spaces; they are URL-encoded in the PUT
    request so Bunny accepts the file, and the returned public URL also uses
    percent-encoding to match the pattern used in existing exam JSON files
    (e.g. ``listening4_Test%201.mp3``).
    """
    if not REQUESTS_AVAILABLE:
        raise RuntimeError("requests package not available.")
    if not BUNNY_API_KEY:
        raise ValueError("BUNNY_API_KEY is not set.")
    from urllib.parse import quote
    encoded = quote(remote_filename, safe="/")
    url = f"{BUNNY_UPLOAD_URL}/{encoded}"
    with open(local_path, "rb") as f:
        data = f.read()
    headers = {
        "AccessKey": BUNNY_API_KEY,
        "Content-Type": "application/octet-stream",
    }
    resp = requests.put(url, headers=headers, data=data, timeout=120)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Bunny upload failed ({resp.status_code}): {resp.text}")
    return f"{BUNNY_PUBLIC_URL}/{encoded}"


# ---------------------------------------------------------------------------
# OpenAI JSON generation
# ---------------------------------------------------------------------------

def _call_openai(system_prompt: str, user_prompt: str, retries: int = 3) -> dict:
    """Call OpenAI and return parsed JSON. Raises on failure."""
    if not OPENAI_AVAILABLE:
        raise RuntimeError("openai package not available.")
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set.")
    client = OpenAI(api_key=OPENAI_API_KEY)
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=0.8,
            )
            text = response.choices[0].message.content
            return json.loads(text)
        except Exception as e:
            if attempt < retries - 1:
                print(f"  OpenAI attempt {attempt + 1} failed: {e}. Retrying…")
                time.sleep(5)
            else:
                raise


SYSTEM_PROMPT = (
    "You are an expert Cambridge CAE (C1 Advanced) exam writer. "
    "Your output must be ONLY valid JSON with no markdown fences, no explanations, "
    "and no extra text outside the JSON object. "
    "Follow the provided schema exactly. "
    "All content should be at C1 level, British English preferred. "
    "Never reuse topics, vocabulary or dialogues from previously described tests."
)


# ── Listening 1 ─────────────────────────────────────────────────────────────

def generate_listening1(test_num: int, seed_topic: str = "") -> dict:
    """Generate listening1.json – three short multiple-choice extracts."""
    voice_pairs = [
        {"man": _pick_voice(test_num,     "male"),   "woman": _pick_voice(test_num,     "female")},
        {"man": _pick_voice(test_num + 1, "male"),   "woman": _pick_voice(test_num + 1, "female")},
        {"man": _pick_voice(test_num + 2, "male"),   "woman": _pick_voice(test_num + 2, "female")},
    ]
    audio_url = f"{BUNNY_PUBLIC_URL}/listening1_Test%20{test_num}.mp3"

    schema = {
        "exam_part": 1,
        "title": "Listening - Part 1",
        "type": "multiple-choice-text",
        "time": 15,
        "totalQuestions": 6,
        "description": "<string: 'You will hear three different extracts…'>",
        "instructions": "You will hear three different extracts. For questions 1 – 6, choose the answer (A, B or C) which fits best according to what you hear. There are two questions for each extract.",
        "duration_minutes": 10,
        "extracts": [
            {
                "id": 1,
                "context": "<string: brief setting description, e.g. 'You hear two colleagues discussing…'>",
                "voices": voice_pairs[0],
                "audio_script": "<string: full dialogue with [1]evidence1[/1] and [2]evidence2[/2] markers around the key phrases that answer questions 1 and 2 respectively. Use || for paragraph breaks.>",
                "dialogue": [
                    {"speaker": "man",   "text": "<turn text>"},
                    {"speaker": "woman", "text": "<turn text>"},
                ],
                "questions": [
                    {
                        "number": 1,
                        "question": "<question text>",
                        "options": {"A": "<option A>", "B": "<option B>", "C": "<option C>"},
                        "answer": "A",
                        "explanation": "<why A is correct>"
                    },
                    {
                        "number": 2,
                        "question": "<question text>",
                        "options": {"A": "<option A>", "B": "<option B>", "C": "<option C>"},
                        "answer": "B",
                        "explanation": "<why B is correct>"
                    }
                ]
            }
        ],
        "audio_source": audio_url
    }

    prompt = f"""Generate a complete listening1.json for Cambridge CAE Test {test_num}.

RULES:
- 3 extracts with 2 questions each (questions 1–6 total).
- Extract 1: questions 1–2. Extract 2: questions 3–4. Extract 3: questions 5–6.
- Each extract is a 2-person dialogue (man and woman) of roughly 150–200 words.
- Each dialogue must have at least 4 dialogue turns.
- Mark the key evidence in audio_script with [N]evidence[/N] where N is the question number.
- Dialogue array must match audio_script exactly (one entry per speaker turn, speaker field is "man" or "woman").
- Contexts/topics must be varied and different: e.g. workplace, leisure, academic, social, professional.
- Avoid topics used in Test 1 (corporate restructuring, vertical farming, dissertations).
- Questions test inference, opinion, attitude — not just memory.
- Each option A/B/C must be plausible; only one is correct.
- Voices: extract1={json.dumps(voice_pairs[0])}, extract2={json.dumps(voice_pairs[1])}, extract3={json.dumps(voice_pairs[2])}.
- audio_source: "{audio_url}"
{f'- Seed topic hint: {seed_topic}' if seed_topic else ''}

Return EXACTLY this JSON structure:
{json.dumps({"exam_part": 1, "title": "Listening - Part 1", "type": "multiple-choice-text", "time": 15, "totalQuestions": 6, "description": "...", "instructions": "You will hear three different extracts. For questions 1 – 6, choose the answer (A, B or C) which fits best according to what you hear. There are two questions for each extract.", "duration_minutes": 10, "extracts": [{"id": 1, "context": "...", "voices": voice_pairs[0], "audio_script": "...[1]...[/1]...[2]...[/2]...", "dialogue": [{"speaker": "man", "text": "..."}, {"speaker": "woman", "text": "..."}], "questions": [{"number": 1, "question": "...", "options": {"A": "...", "B": "...", "C": "..."}, "answer": "A", "explanation": "..."}, {"number": 2, "question": "...", "options": {"A": "...", "B": "...", "C": "..."}, "answer": "B", "explanation": "..."}]}, {"id": 2, "context": "...", "voices": voice_pairs[1], "audio_script": "...", "dialogue": [], "questions": [{"number": 3}, {"number": 4}]}, {"id": 3, "context": "...", "voices": voice_pairs[2], "audio_script": "...", "dialogue": [], "questions": [{"number": 5}, {"number": 6}]}], "audio_source": audio_url}, indent=2)}
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Listening 2 ─────────────────────────────────────────────────────────────

def generate_listening2(test_num: int) -> dict:
    """Generate listening2.json – sentence-completion monologue."""
    voice_name = _pick_voice(test_num + 3, "female")
    audio_url  = f"{BUNNY_PUBLIC_URL}/listening2_Test%20{test_num}.mp3"

    prompt = f"""Generate listening2.json for Cambridge CAE Test {test_num}.

FORMAT (return this exact structure):
{{
  "exam_part": 2,
  "title": "Listening - Part 2",
  "type": "sentence-completion",
  "time": 10,
  "totalQuestions": 8,
  "description": "You will hear [SPEAKER NAME] talking about [TOPIC]. For questions 7 – 14, complete the sentences with a word or short phrase.",
  "instructions": "You will hear [SPEAKER NAME] talking about [TOPIC]. For questions 7 – 14, complete the sentences with a word or short phrase.",
  "audio_source": "{audio_url}",
  "extracts": [
    {{
      "id": 1,
      "context": "Brief description of the speaker and topic.",
      "voices": {{"[speaker_role]": "{voice_name}"}},
      "audio_script": "Full monologue text (~350–400 words). Mark answers inline: [7]answer text[/7]. Questions 7–14 must each have one bracketed marker.",
      "dialogue": [{{"speaker": "[speaker_name]", "text": "Full monologue text without markers."}}],
      "questions": [
        {{"number": 7, "question": "Sentence completion stem ending with (7).", "answer": "exact answer phrase", "explanation": "Quote from transcript + grammar note."}},
        // ... questions 8–14
      ]
    }}
  ]
}}

RULES:
- Speaker is a named person (first + last name), British English.
- Topic must be interesting, specific and different from Test 1 (wildlife volunteering in South Africa).
- Monologue is a first-person talk (like a radio interview or lecture excerpt).
- 8 questions (7–14). Answers must be 1–3 word phrases extractable from the monologue.
- Question sentences provide enough context so the gap is clear.
- Avoid obscure vocabulary; answers should be accessible to C1 learners.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Listening 3 ─────────────────────────────────────────────────────────────

def generate_listening3(test_num: int) -> dict:
    """Generate listening3.json – multiple-choice interview with two guests."""
    interviewer_voice = _pick_voice(test_num,     "female")
    guest1_voice      = _pick_voice(test_num + 1, "male")
    guest2_voice      = _pick_voice(test_num + 2, "female")
    audio_url = f"{BUNNY_PUBLIC_URL}/listening3_Test%20{test_num}.mp3"

    prompt = f"""Generate listening3.json for Cambridge CAE Test {test_num}.

FORMAT (return this exact structure):
{{
  "exam_part": 3,
  "title": "Listening - Part 3",
  "type": "multiple-choice-text",
  "time": 10,
  "totalQuestions": 6,
  "description": "You will hear part of an interview about [TOPIC]. For questions 15 – 20, choose the answer (A, B, C or D) which fits best.",
  "audioUrl": "{audio_url}",
  "audio_source": "{audio_url}",
  "instructions": "You will hear part of an interview. For questions 15 – 20, choose the answer (A, B, C or D) which fits best according to what you hear.",
  "extracts": [
    {{
      "id": 16,
      "context": "An interview about [TOPIC] with two guests.",
      "voices": {{
        "interviewer": "{interviewer_voice}",
        "[guest1_name]": "{guest1_voice}",
        "[guest2_name]": "{guest2_voice}"
      }},
      "audio_script": "Full interview transcript (~500 words). Mark key evidence: [15]...[/15] through [20]...[/20]. Use the actual speaker names as labels (not just 'interviewer').",
      "dialogue": [
        {{"speaker": "interviewer", "text": "..."}},
        {{"speaker": "[guest1_name]", "text": "..."}},
        // more turns alternating
      ],
      "questions": [
        {{
          "number": 15,
          "question": "Question text?",
          "options": {{"A": "option A", "B": "option B", "C": "option C", "D": "option D"}},
          "answer": "A",
          "explanation": "Explanation citing evidence [15] from the script."
        }},
        // questions 16–20
      ]
    }}
  ]
}}

RULES:
- Interview topic must be original and different from Test 1 (collecting/antiques).
- Two named guests (a man and a woman) plus a named interviewer.
- 6 questions (15–20), each with 4 options (A–D).
- Dialogue must have enough turns to cover all 6 question topics (at least 10–12 turns).
- Evidence markers [N]...[/N] must correspond exactly to the answer clues.
- Options must be plausible distractors; only one is correct.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Listening 4 ─────────────────────────────────────────────────────────────

def generate_listening4(test_num: int) -> dict:
    """Generate listening4.json – dual-matching with 5 speakers."""
    voices = {
        "Speaker 1": _pick_voice(test_num,     "male"),
        "Speaker 2": _pick_voice(test_num + 1, "female"),
        "Speaker 3": _pick_voice(test_num + 2, "male"),
        "Speaker 4": _pick_voice(test_num + 3, "female"),
        "Speaker 5": _pick_voice(test_num + 4, "male"),
    }
    audio_url = f"{BUNNY_PUBLIC_URL}/listening4_Test%20{test_num}.mp3"

    prompt = f"""Generate listening4.json for Cambridge CAE Test {test_num}.

FORMAT (return this exact JSON structure, no extra keys):
{{
  "title": "Listening - Part 4: [THEME]",
  "audioUrl": "{audio_url}",
  "time": 10,
  "totalQuestions": 10,
  "description": "You will hear five short extracts in which people talk about [THEME]. You must complete two tasks while listening.",
  "content": {{
    "voices": {json.dumps(voices, indent=6)},
    "audio_script": "Speaker 1: ~100-word monologue with [21]task1 evidence[/21] and [26]task2 evidence[/26]. || Speaker 2: ~100-word monologue with [22]...[/22] and [27]...[/27]. || Speaker 3: ... [23] and [28]. || Speaker 4: ... [24] and [29]. || Speaker 5: ... [25] and [30].",
    "task1": {{
      "title": "Task One",
      "instruction": "For questions 21 – 25, choose from the list (A – H) [TASK1_QUESTION].",
      "questions": [
        {{"number": 21, "speaker": "Speaker 1", "correct": "E", "explanation": "..."}},
        {{"number": 22, "speaker": "Speaker 2", "correct": "G", "explanation": "..."}},
        {{"number": 23, "speaker": "Speaker 3", "correct": "B", "explanation": "..."}},
        {{"number": 24, "speaker": "Speaker 4", "correct": "D", "explanation": "..."}},
        {{"number": 25, "speaker": "Speaker 5", "correct": "A", "explanation": "..."}}
      ],
      "options": {{
        "A": "option A text",
        "B": "option B text",
        "C": "option C text",
        "D": "option D text",
        "E": "option E text",
        "F": "option F text",
        "G": "option G text",
        "H": "option H text"
      }}
    }},
    "task2": {{
      "title": "Task Two",
      "instruction": "For questions 26 – 30, choose from the list (A – H) [TASK2_QUESTION].",
      "questions": [
        {{"number": 26, "speaker": "Speaker 1", "correct": "C", "explanation": "..."}},
        {{"number": 27, "speaker": "Speaker 2", "correct": "H", "explanation": "..."}},
        {{"number": 28, "speaker": "Speaker 3", "correct": "F", "explanation": "..."}},
        {{"number": 29, "speaker": "Speaker 4", "correct": "B", "explanation": "..."}},
        {{"number": 30, "speaker": "Speaker 5", "correct": "G", "explanation": "..."}}
      ],
      "options": {{
        "A": "option A text",
        "B": "option B text",
        "C": "option C text",
        "D": "option D text",
        "E": "option E text",
        "F": "option F text",
        "G": "option G text",
        "H": "option H text"
      }}
    }}
  }}
}}

RULES:
- Theme must be original. Avoid careers/farming (used in Test 1).
- Each speaker monologue: ~100 words, first-person, distinct accent/background hinted.
- Task 1 asks why/how/what they did X; Task 2 asks what they found rewarding/challenging/surprising.
- Each option A–H must be plausible and relate to the theme.
- Correct answers for 21–25 must use each letter at most twice across all 5; same for 26–30.
- Evidence markers [21]–[30] must appear in audio_script at the exact phrase that proves the answer.
- Monologues separated by " || " in audio_script.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 1 ────────────────────────────────────────────────────────────────

def generate_reading1(test_num: int) -> dict:
    """Generate reading1.json – multiple-choice cloze (8 gaps)."""
    prompt = f"""Generate reading1.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "id": "Test{test_num}-reading-1",
  "examId": "Test{test_num}",
  "section": "reading",
  "part": 1,
  "type": "multiple-choice",
  "title": "Multiple-choice cloze",
  "description": "Read the text below and decide which answer (A, B, C or D) best fits each gap.",
  "time": "10",
  "totalQuestions": 8,
  "content": {{
    "text": "Continuous text ~250 words with gaps marked (0) through (8). Use || for paragraph breaks.",
    "example": {{
      "number": 0,
      "options": ["A) word1", "B) word2", "C) word3", "D) word4"],
      "correct": "A",
      "explanation": "Reason why A is correct."
    }},
    "questions": [
      {{
        "number": 1,
        "options": ["A) phrase1", "B) phrase2", "C) phrase3", "D) phrase4"],
        "correct": "B",
        "explanation": "Collocation/idiom explanation in English."
      }},
      // questions 2–8
    ]
  }}
}}

RULES:
- Topic: original academic/journalistic text (NOT digital attention or farming).
- Test collocation, idiom, and fixed-phrase knowledge at C1 level.
- 4 options per gap; one clearly correct (based on collocation/usage), three plausible distractors.
- Gap (0) is the worked example; questions 1–8 are tested.
- Explanations in English.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 2 ────────────────────────────────────────────────────────────────

def generate_reading2(test_num: int) -> dict:
    """Generate reading2.json – open cloze (8 gaps, structural words)."""
    prompt = f"""Generate reading2.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Reading and Use of English - Part 2",
  "type": "open-cloze",
  "time": 10,
  "totalQuestions": 8,
  "description": "For questions 9 – 16, read the text below and think of the word which best fits each gap. Use only one word in each gap.",
  "content": {{
    "text": "Continuous text ~200 words with gaps (0) through (16). Gaps test structural/grammatical words: articles, prepositions, pronouns, conjunctions, auxiliary verbs. Use || for paragraph breaks.",
    "example": {{"text": "First sentence with (0) gap.", "correct": "which"}},
    "questions": [
      {{"number": 9,  "correct": "word_or_word/word", "explanation": "Grammar point in English."}},
      // 10–16
    ]
  }}
}}

RULES:
- Text topic: different from Test 1 (social mirroring). Use science, culture, history, or psychology.
- Gaps must test function words only: articles (a/an/the), prepositions, relative pronouns, conjunctions, quantifiers, auxiliaries, etc.
- One correct answer per gap (accept two alternatives separated by "/" if genuinely interchangeable).
- Explanations in English.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 3 ────────────────────────────────────────────────────────────────

def generate_reading3(test_num: int) -> dict:
    """Generate reading3.json – word formation (8 gaps)."""
    prompt = f"""Generate reading3.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "id": "Test{test_num}-reading-3",
  "examId": "CAE-Practice",
  "section": "use-of-english",
  "part": 3,
  "type": "word-formation",
  "title": "<Article title related to the text topic>",
  "description": "For questions 17 – 24, read the text below. Use the word given in capitals to form a word that fits the gap.",
  "content": {{
    "text": "Continuous passage ~180 words. Gaps (0), (17)–(24). Each gap line ends with the base word in capitals, e.g. '(17) TEND'.",
    "example": {{"text": "Opening sentence with (0) gap (BASE_WORD).", "correct": "DERIVED_FORM", "word": "BASE_WORD"}},
    "questions": [
      {{"number": 17, "word": "TEND",   "correct": "TENDENCY",    "explanation": "Noun required after 'noticeable'."}},
      // 18–24
    ]
  }}
}}

RULES:
- Text about: society, science, arts, or environment (NOT urban stress/metropolis).
- Base words must require C1-level derivation: prefixes (un-, in-, over-, re-), suffixes (-tion, -ity, -ness, -ment, -able, -ful, -ous), or both.
- Each answer must be a single word.
- Explanations in English.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 4 ────────────────────────────────────────────────────────────────

def generate_reading4(test_num: int) -> dict:
    """Generate reading4.json – key word transformations (6 questions)."""
    prompt = f"""Generate reading4.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Reading and Use of English - Part 4",
  "type": "transformations",
  "time": 10,
  "totalQuestions": 6,
  "description": "For questions 25 – 30, complete the second sentence so that it has a similar meaning to the first sentence, using the word given. Use between three and six words, including the word given.",
  "content": {{
    "questions": [
      {{
        "number": 25,
        "firstSentence": "Original sentence.",
        "keyWord": "KEYWORD",
        "beforeGap": "Start of rewritten sentence",
        "afterGap": "end of rewritten sentence.",
        "routes": [
          {{"p1": "must", "p2": "have been (very)"}},
          {{"p1": "must", "p2": "have been quite"}}
        ]
      }},
      // 26–30
    ]
  }}
}}

RULES:
- 6 questions (25–30), testing different grammatical structures.
- Each transformation must test a DIFFERENT structure from: passive voice, reported speech, wish/regret, comparison, modal perfects, conditionals, causative have/get, inversion, phrasal verbs, etc.
- keyword is ALL CAPS; it must appear in the transformed answer.
- routes: provide 1–2 acceptable variations of the gap fill (3–6 words each, including keyword).
- beforeGap + gap answer + afterGap = complete correct sentence.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 5 ────────────────────────────────────────────────────────────────

def generate_reading5(test_num: int) -> dict:
    """Generate reading5.json – multiple-choice long text (6 questions)."""
    prompt = f"""Generate reading5.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Reading and Use of English - Part 5",
  "type": "multiple-choice-text",
  "time": 15,
  "totalQuestions": 6,
  "description": "You are going to read an article. For questions 31 – 36, choose the answer (A, B, C or D) which fits best.",
  "content": {{
    "title": "Article headline",
    "subtitle": "Subheading",
    "text": "~700-word article text. Enclose each question's evidence in [31]...[/31] through [36]...[/36] markers. Use || for paragraph breaks.",
    "questions": [
      {{
        "number": 31,
        "question": "Question about paragraph 1?",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct": "B",
        "explanation": "B is correct because [31] evidence..."
      }},
      // 32–36
    ]
  }}
}}

RULES:
- Article topic: different from Test 1 (deep work/cognitive focus). Possible: creativity, memory, language, sport psychology, social change, architecture, travel, etc.
- 6 questions (31–36) testing: inference, author's attitude, reference, meaning in context, paragraph summary.
- Each option must be plausible; only one is unambiguously correct.
- Text must be engaging and at C1 level (~700 words).
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 6 ────────────────────────────────────────────────────────────────

def generate_reading6(test_num: int) -> dict:
    """Generate reading6.json – cross-text multiple matching (4 texts, 4 questions)."""
    prompt = f"""Generate reading6.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Reading and Use of English - Part 6",
  "type": "cross-text-matching",
  "time": 10,
  "totalQuestions": 4,
  "description": "You are going to read four extracts. For questions 37 – 40, choose from the writers (A – D). A writer may be chosen more than once.",
  "content": {{
    "title": "Shared article title for all 4 texts",
    "texts": {{
      "A": "Writer A's text ~150 words. Embed [37]evidence[/37] markers where relevant to any question.",
      "B": "Writer B's text ~150 words. Embed markers as needed.",
      "C": "Writer C's text ~150 words.",
      "D": "Writer D's text ~150 words.",
      "questions": [
        {{
          "number": 37,
          "question": "Which writer [shares/contradicts] writer [X]'s view on [aspect]?",
          "options": ["A", "B", "C", "D"],
          "correct": "A",
          "explanation": "A's view is [X] because... B's view is [Y] because..."
        }},
        // 38–40
      ]
    }}
  }}
}}

RULES:
- 4 writers (A–D) each give an opinion on the SAME topic from different angles.
- Topic: different from Test 1 (AI and privacy). Use: education, sport, arts, urban planning, diet, etc.
- 4 questions (37–40). Each asks which writer shares OR contradicts a named writer's view on a specific aspect.
- Writers must have genuinely different, sometimes overlapping, sometimes opposing opinions to make cross-matching non-trivial.
- Correct answers can repeat (a writer chosen more than once is valid).
- Evidence markers [37]–[40] must appear in the texts where the relevant opinions are expressed.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 7 ────────────────────────────────────────────────────────────────

def generate_reading7(test_num: int) -> dict:
    """Generate reading7.json – gapped text (6 paragraphs to insert)."""
    prompt = f"""Generate reading7.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "type": "gapped-text",
  "title": "Reading and Use of English - Part 7",
  "time": 12,
  "totalQuestions": 6,
  "description": "You are going to read an article from which six paragraphs have been removed. Choose from paragraphs A–G the one which fits each gap. There is one extra paragraph you do not need.",
  "content": {{
    "title": "Article title",
    "text": "Main article text with 6 gaps marked as [41] [42] [43] [44] [45] [46]. Around each gap there must be cohesion clues (pronouns, connectives, topic references) that only the correct paragraph resolves. Use || for paragraph breaks.",
    "paragraphs": {{
      "A": "[41]cohesion clue evidence[/41] Paragraph A text ~60 words.",
      "B": "[42]evidence[/42] Paragraph B text.",
      "C": "[43]evidence[/43] Paragraph C text.",
      "D": "[44]evidence[/44] Paragraph D text.",
      "E": "[45]evidence[/45] Paragraph E text.",
      "F": "[46]evidence[/46] Paragraph F text.",
      "G": "Extra paragraph (not used) ~60 words."
    }},
    "questions": [
      {{"number": 41, "correct": "B", "explanation": "B contains reference to X which links back to..."}},
      // 42–46
    ]
  }}
}}

RULES:
- 6 gaps (41–46) in the main text; 7 paragraphs (A–G) to choose from (one is extra/distractor).
- Topic: different from Test 1 (underwater archaeology). Use history, science, biography, travel, or culture.
- Main text must have clear before/after cohesion clues at each gap.
- Removed paragraphs must fit exactly ONE gap each; distractor (G) must be plausible but wrong for all gaps.
- Evidence markers in paragraphs show the key linking phrase.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Reading 8 ────────────────────────────────────────────────────────────────

def generate_reading8(test_num: int) -> dict:
    """Generate reading8.json – multiple matching (4–5 texts, 10 questions)."""
    prompt = f"""Generate reading8.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Reading and Use of English - Part 8",
  "type": "multiple-matching",
  "time": 12,
  "totalQuestions": 10,
  "description": "Read the article about four people who [describe theme]. For questions 47 – 56, choose from the people (A – D). The people may be chosen more than once.",
  "content": {{
    "title": "Section title",
    "texts": {{
      "A": "### [Person A name and role]\\n~150 word first-person account. Embed [47] [48] [52] etc. markers around the key phrases matching the questions.",
      "B": "### [Person B] ~150 words.",
      "C": "### [Person C] ~150 words.",
      "D": "### [Person D] ~150 words."
    }},
    "questions": [
      {{"number": 47, "question": "mention receiving unexpected support from others?", "correct": "C", "explanation": "C says '...'"}},
      // 48–56 (10 total)
    ]
  }}
}}

RULES:
- 4 people (A–D) describe personal experiences related to ONE shared theme.
- Theme: different from Test 1 (career switches) and Test 2 (remote work). Use: travel, health, sport, learning, creativity, parenting, etc.
- 10 questions (47–56), phrased as short participial clauses ("mention doing X?", "describe feeling Y?").
- Each question has exactly ONE correct answer (A, B, C, or D).
- Correct answers are balanced (roughly 2–3 per person).
- Evidence markers [N]...[/N] in text show the matching phrases.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Speaking 1 ───────────────────────────────────────────────────────────────

def generate_speaking1(test_num: int) -> dict:
    """Generate speaking1.json – interview phase."""
    prompt = f"""Generate speaking1.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Speaking Interview",
  "time": 1,
  "totalQuestions": 6,
  "description": "The examiner asks you questions about yourself, your opinions and your experiences.",
  "content": {{
    "phases": [
      {{
        "id": 1,
        "name": "Socializing / Basics",
        "questions": ["Q1", "Q2", "Q3", "Q4"]
      }},
      {{
        "id": 2,
        "name": "Current Lifestyle",
        "questions": ["Q1", "Q2", "Q3", "Q4", "Q5"]
      }},
      {{
        "id": 3,
        "name": "Abstract / Personal Growth",
        "questions": ["Q1", "Q2", "Q3"]
      }}
    ]
  }}
}}

RULES:
- Phase 1: 4 simple warm-up questions (background, work/study, hobbies).
- Phase 2: 5 lifestyle questions (habits, preferences, opinions on everyday topics).
- Phase 3: 3 abstract/reflective questions (values, future, society).
- Questions must be fresh and different from Test 1 (not identical to "Where are you from?" etc. — vary wording).
- All questions should be open-ended and invite extended answers.
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Speaking 2 ───────────────────────────────────────────────────────────────

def generate_speaking2(test_num: int) -> dict:
    """Generate speaking2.json – long-turn photograph comparison.

    Images are NOT generated or uploaded — URLs follow the pattern
    https://listeninggenerator.b-cdn.net/test{N}_{label}.jpg
    and must be sourced and uploaded manually by the user.
    """
    labels_a = ["a", "b", "c"]
    labels_b = ["d", "e", "f"]

    def img_url(label: str) -> str:
        return f"{BUNNY_PUBLIC_URL}/test{test_num}_1{label}.jpg"

    prompt = f"""Generate speaking2.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Speaking - Part 2",
  "time": 1.5,
  "totalQuestions": 2,
  "description": "Compare the photographs and answer the questions.",
  "content": {{
    "tasks": [
      {{
        "id": "1A",
        "candidate": "Candidate A",
        "topic": "Short thematic topic label (e.g. 'Dealing with challenges')",
        "instructions": "Compare two of the pictures, say [RELEVANT QUESTION ABOUT THE IMAGES] and [SECOND QUESTION].",
        "images": [
          {{"label": "A", "url": "{img_url('a')}", "description": "Detailed visual description of image A (~30 words). Must match the topic."}},
          {{"label": "B", "url": "{img_url('b')}", "description": "Detailed visual description of image B."}},
          {{"label": "C", "url": "{img_url('c')}", "description": "Detailed visual description of image C."}}
        ],
        "followUp": {{
          "recipient": "Candidate B",
          "question": "A short follow-up question for Candidate B to answer briefly."
        }}
      }},
      {{
        "id": "1B",
        "candidate": "Candidate B",
        "topic": "Different thematic topic label",
        "instructions": "Compare two of the pictures, say [QUESTION] and [QUESTION].",
        "images": [
          {{"label": "D", "url": "{img_url('d')}", "description": "Description of image D."}},
          {{"label": "E", "url": "{img_url('e')}", "description": "Description of image E."}},
          {{"label": "F", "url": "{img_url('f')}", "description": "Description of image F."}}
        ],
        "followUp": {{
          "recipient": "Candidate A",
          "question": "Follow-up question for Candidate A."
        }}
      }}
    ]
  }}
}}

RULES:
- Two tasks, each with 3 photos and different topics.
- Topics must be abstract/thematic (e.g. "Helping others", "Showing determination", "Relaxing").
- Images must be realistic, searchable photos (real-world scenes, not illustrations).
- Descriptions must be detailed enough to search for and find on Google Images.
- Instructions ask candidates to compare TWO of the three images and discuss a theme.
- Follow-up questions are brief and ask the other candidate for a quick opinion.
- Avoid Test 1 topics (precision/accuracy, water leisure).
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Speaking 3 ───────────────────────────────────────────────────────────────

def generate_speaking3(test_num: int) -> dict:
    """Generate speaking3.json – collaborative discussion."""
    prompt = f"""Generate speaking3.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Speaking - Part 3",
  "type": "multiple-choice-text",
  "time": 1.5,
  "totalQuestions": 6,
  "description": "Discuss the options shown with your partner for about two minutes, then decide together which two would be most effective.",
  "content": {{
    "task": "Look at the following [options/ideas/suggestions] about [TOPIC]. Discuss how [RELEVANT CRITERION] each one is, then decide which two are the most [CONCLUSION].",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"],
    "followUp": "Now decide which two [options] would be the most [CRITERION] for [REASON].",
    "participants": ["examiner", "candidate", "partner"],
    "script": [
      {{"role": "examiner", "text": "Now, I'd like you to talk about something together for about two minutes. Here are some [options].", "showOptions": true}},
      {{"role": "examiner", "text": "First, discuss [CRITERION], then decide which two are the best. You have two minutes."}},
      {{"role": "partner",  "text": ""}},
      {{"role": "candidate","text": ""}},
      {{"role": "partner",  "text": ""}},
      {{"role": "candidate","text": ""}},
      {{"role": "partner",  "text": ""}},
      {{"role": "candidate","text": ""}},
      {{"role": "examiner", "text": "Now decide which two factors would be most effective."}},
      {{"role": "partner",  "text": ""}},
      {{"role": "candidate","text": ""}},
      {{"role": "examiner", "text": "Thank you."}}
    ]
  }}
}}

RULES:
- Topic must link thematically to speaking2 (same broad theme but different focus).
- 5 distinct options to discuss (concrete, not vague).
- Task instruction tells candidates what criterion to evaluate (practicality, cost, impact, etc.).
- Script has 3 examiner turns (intro, task, close) and alternating partner/candidate empty turns.
- Avoid Test 1 topic (environmental measures for cities).
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Speaking 4 ───────────────────────────────────────────────────────────────

def generate_speaking4(test_num: int) -> dict:
    """Generate speaking4.json – discussion (follow-up questions)."""
    prompt = f"""Generate speaking4.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Speaking - Part 4",
  "type": "multiple-choice-text",
  "time": 2.5,
  "totalQuestions": 6,
  "description": "The examiner will ask you questions related to the theme from Part 3.",
  "content": {{
    "task": "The examiner will ask questions related to [THEME].",
    "questions": [
      {{"number": 1, "question": "Open-ended discussion question 1?"}},
      {{"number": 2, "question": "Open-ended discussion question 2?"}},
      {{"number": 3, "question": "Open-ended discussion question 3?"}}
    ],
    "participants": ["examiner", "candidate", "partner"],
    "script": [
      {{"role": "examiner",  "text": "Now I'd like to ask you some questions related to [THEME]."}},
      {{"role": "examiner",  "text": "Question 1 text?"}},
      {{"role": "candidate", "text": ""}},
      {{"role": "partner",   "text": ""}},
      {{"role": "examiner",  "text": "Question 2 text?"}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "examiner",  "text": "Question 3 text?"}},
      {{"role": "candidate", "text": ""}},
      {{"role": "partner",   "text": ""}},
      {{"role": "examiner",  "text": "Thank you. That's the end of the speaking test."}}
    ]
  }}
}}

RULES:
- Questions must be broader and more abstract than speaking3 (philosophical, societal level).
- They should naturally follow from the speaking3 topic.
- 3 questions in both "questions" array AND script (script examiner turns 2, 5, 8 match questions 1, 2, 3).
- Avoid Test 1 topic (environment, government vs. individual).
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Writing 1 ────────────────────────────────────────────────────────────────

def generate_writing1(test_num: int) -> dict:
    """Generate writing1.json – compulsory essay."""
    prompt = f"""Generate writing1.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Writing - Part 1: [TOPIC]",
  "time": 45,
  "totalQuestions": 1,
  "description": "Your class has attended a [lecture/panel/seminar] on [TOPIC].",
  "content": {{
    "question": "Write an essay discussing two of the methods in your notes. You should explain which method is more important, giving reasons for your opinion.",
    "notes": {{
      "methods": ["Method 1", "Method 2", "Method 3"],
      "opinions": [
        "Opinion quote 1.",
        "Opinion quote 2.",
        "Opinion quote 3."
      ]
    }},
    "wordLimit": "220-260 words",
    "structure": {{
      "introduction": "Brief description of intro paragraph focus.",
      "bodyParagraph1": "Description of first body paragraph.",
      "bodyParagraph2": "Description of second body paragraph.",
      "conclusion": "Description of concluding paragraph."
    }},
    "modelAnswer": "Complete model essay ~250 words at C1 level. Must discuss exactly two of the three methods and argue which is more important."
  }}
}}

RULES:
- Topic: social issue, education, technology, health, environment, work, or culture — original for this test.
- 3 methods/approaches in notes (student must choose 2 to discuss).
- Model answer: formal register, balanced paragraphs, clear argument, ~250 words.
- Avoid Test 1 topic (environmental protection).
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ── Writing 2 ────────────────────────────────────────────────────────────────

def generate_writing2(test_num: int) -> dict:
    """Generate writing2.json – three optional writing tasks."""
    prompt = f"""Generate writing2.json for Cambridge CAE Test {test_num}.

FORMAT:
{{
  "title": "Writing - Part 2: Exercise 1",
  "time": 45,
  "totalQuestions": 1,
  "description": "Choose one of the following writing tasks and write your answer in 220-260 words.",
  "content": {{
    "tasks": [
      {{
        "id": "report_1",
        "title": "Report",
        "type": "Report",
        "prompt": "Task prompt for a report (220-260 words).",
        "modelAnswer": "Complete model report ~250 words with sections (Introduction, main sections, Conclusion/Recommendations). Formal register."
      }},
      {{
        "id": "letter_1",
        "title": "Letter",
        "type": "Letter",
        "prompt": "Task prompt for a formal/semi-formal letter (220-260 words).",
        "modelAnswer": "Complete model letter ~250 words. Appropriate salutation and sign-off. Formal/semi-formal register."
      }},
      {{
        "id": "review_1",
        "title": "Review",
        "type": "Review",
        "prompt": "Task prompt for a review in an English-language publication (220-260 words).",
        "modelAnswer": "Complete model review ~250 words. Engaging title, atmosphere/content/recommendation. Semi-formal register."
      }}
    ]
  }}
}}

RULES:
- Three different task types: Report, Letter, Review.
- Each task prompt must be self-contained and clearly explain what to write.
- Model answers: ~250 words, at C1 level, demonstrating range of vocabulary and structures.
- Topics must be different from Test 1 (work placement report, hotel complaint, restaurant review).
- Return valid JSON only.
"""
    return _call_openai(SYSTEM_PROMPT, prompt)


# ---------------------------------------------------------------------------
# Audio generation
# ---------------------------------------------------------------------------

def _generate_dialogue_audio(
    dialogue: list[dict],
    voices: dict[str, str],
    tmp_dir: str,
    silence_between_ms: int = SILENCE_MEDIUM,
) -> list[bytes]:
    """Generate TTS for each dialogue/monologue turn. Returns list of WAV bytes."""
    segments = []
    for turn in dialogue:
        speaker = turn.get("speaker", "")
        text    = turn.get("text", "").strip()
        if not text:
            continue
        voice = voices.get(speaker, NARRATOR_VOICE)
        wav_path = _tts_to_wav(text, voice, tmp_dir)
        segments.append(_wav_bytes(wav_path))
        segments.append(_make_silence_wav(silence_between_ms))
    return segments


def _narrator_wav(text: str, tmp_dir: str) -> bytes:
    path = _tts_to_wav(text, NARRATOR_VOICE, tmp_dir)
    return _wav_bytes(path)


def generate_audio_listening1(data: dict, test_num: int, out_dir: str) -> str:
    """Build listening1 audio and return local path to the combined MP3/WAV.

    Format mirrors real Cambridge CAE:
      • Part intro (narrator)
      • For each extract: context announcement → 30 s reading pause → dialogue
        → answer silence → "Now listen again" → dialogue → silence
      • Part close (narrator)
    Questions are displayed on screen and are NOT read aloud.
    """
    print("  Generating audio for listening1…")
    with tempfile.TemporaryDirectory() as tmp_dir:
        segments: list[bytes] = []

        intro_text = (
            "Listening Part 1. "
            "You will hear three different extracts. "
            "For questions one to six, choose the answer A, B or C "
            "which fits best according to what you hear. "
            "There are two questions for each extract."
        )
        segments.append(_narrator_wav(intro_text, tmp_dir))
        segments.append(_make_silence_wav(SILENCE_LONG))

        ordinals = {1: "One", 2: "Two", 3: "Three"}
        for extract in data.get("extracts", []):
            eid  = extract.get("id", 1)
            ctx  = extract.get("context", "")
            segs = extract.get("dialogue", [])
            vcs  = extract.get("voices", {})

            # Context announcement + reading time
            segments.append(
                _narrator_wav(f"Extract {ordinals.get(eid, eid)}. {ctx}", tmp_dir)
            )
            segments.append(_make_silence_wav(30_000))  # 30 s to read questions

            # Dialogue – first play
            segments.extend(_generate_dialogue_audio(segs, vcs, tmp_dir))
            segments.append(_make_silence_wav(SILENCE_ANSWER_GAP))

            # Repeat
            segments.append(_narrator_wav("Now listen again.", tmp_dir))
            segments.append(_make_silence_wav(SILENCE_MEDIUM))
            segments.extend(_generate_dialogue_audio(segs, vcs, tmp_dir))
            segments.append(_make_silence_wav(SILENCE_LONG))

        segments.append(_narrator_wav("That is the end of Part 1.", tmp_dir))

        ext = "mp3" if PYDUB_AVAILABLE else "wav"
        out_path = os.path.join(out_dir, f"listening1_Test {test_num}.{ext}")
        with open(out_path, "wb") as f:
            f.write(_concat_wavs(segments))
        print(f"  Saved: {out_path}")
        return out_path


def generate_audio_listening2(data: dict, test_num: int, out_dir: str) -> str:
    """Build listening2 audio."""
    print("  Generating audio for listening2…")
    with tempfile.TemporaryDirectory() as tmp_dir:
        segments: list[bytes] = []

        intro_text = (
            "Listening Part 2. "
            f"{data.get('description', 'You will hear a speaker.')} "
            "For questions seven to fourteen, complete the sentences with a word or short phrase."
        )
        segments.append(_narrator_wav(intro_text, tmp_dir))
        segments.append(_make_silence_wav(SILENCE_READING))

        for extract in data.get("extracts", []):
            vcs  = extract.get("voices", {})
            segs = extract.get("dialogue", [])
            segments.extend(_generate_dialogue_audio(segs, vcs, tmp_dir, SILENCE_SHORT))
            segments.append(_make_silence_wav(SILENCE_LONG))

        segments.append(_narrator_wav("Now listen again.", tmp_dir))
        segments.append(_make_silence_wav(SILENCE_SHORT))

        for extract in data.get("extracts", []):
            vcs  = extract.get("voices", {})
            segs = extract.get("dialogue", [])
            segments.extend(_generate_dialogue_audio(segs, vcs, tmp_dir, SILENCE_SHORT))

        segments.append(_make_silence_wav(SILENCE_LONG))
        segments.append(_narrator_wav("That is the end of Part 2.", tmp_dir))

        ext = "mp3" if PYDUB_AVAILABLE else "wav"
        out_path = os.path.join(out_dir, f"listening2_Test {test_num}.{ext}")
        with open(out_path, "wb") as f:
            f.write(_concat_wavs(segments))
        print(f"  Saved: {out_path}")
        return out_path


def generate_audio_listening3(data: dict, test_num: int, out_dir: str) -> str:
    """Build listening3 audio."""
    print("  Generating audio for listening3…")
    with tempfile.TemporaryDirectory() as tmp_dir:
        segments: list[bytes] = []

        desc = data.get("description", "You will hear an interview.")
        segments.append(_narrator_wav(f"Listening Part 3. {desc}", tmp_dir))
        segments.append(_make_silence_wav(SILENCE_READING))

        for extract in data.get("extracts", []):
            vcs  = extract.get("voices", {})
            segs = extract.get("dialogue", [])
            segments.extend(_generate_dialogue_audio(segs, vcs, tmp_dir))
            segments.append(_make_silence_wav(SILENCE_LONG))

        segments.append(_narrator_wav("Now listen again.", tmp_dir))
        segments.append(_make_silence_wav(SILENCE_SHORT))

        for extract in data.get("extracts", []):
            vcs  = extract.get("voices", {})
            segs = extract.get("dialogue", [])
            segments.extend(_generate_dialogue_audio(segs, vcs, tmp_dir))

        segments.append(_make_silence_wav(SILENCE_LONG))
        segments.append(_narrator_wav("That is the end of Part 3.", tmp_dir))

        ext = "mp3" if PYDUB_AVAILABLE else "wav"
        out_path = os.path.join(out_dir, f"listening3_Test {test_num}.{ext}")
        with open(out_path, "wb") as f:
            f.write(_concat_wavs(segments))
        print(f"  Saved: {out_path}")
        return out_path


def generate_audio_listening4(data: dict, test_num: int, out_dir: str) -> str:
    """Build listening4 audio (5 speakers, dual-matching)."""
    print("  Generating audio for listening4…")
    content = data.get("content", data)  # listening4 nests under "content"
    voices  = content.get("voices", {})
    script  = content.get("audio_script", "")
    desc    = data.get("description", "You will hear five short extracts.")

    # Parse monologues from audio_script (split on " || ")
    monologues = [s.strip() for s in script.split("||") if s.strip()]

    with tempfile.TemporaryDirectory() as tmp_dir:
        segments: list[bytes] = []

        intro_text = (
            f"Listening Part 4. {desc} "
            "You must complete two tasks while listening. "
            "Look at Task One. For questions twenty-one to twenty-five, "
            "choose from the list A to H. "
            "Now look at Task Two. For questions twenty-six to thirty, "
            "choose from the list A to H."
        )
        segments.append(_narrator_wav(intro_text, tmp_dir))
        segments.append(_make_silence_wav(SILENCE_READING))

        def _play_monologues() -> None:
            for i, mono in enumerate(monologues, start=1):
                speaker_key = f"Speaker {i}"
                voice = voices.get(speaker_key, _pick_voice(i, "male" if i % 2 else "female"))
                # Strip evidence markers for clean TTS
                clean = re.sub(r"\[\d+\]|\[/\d+\]", "", mono)
                # Remove "Speaker N: " prefix if present
                clean = re.sub(r"^Speaker\s+\d+:\s*", "", clean.strip())
                wav_path = _tts_to_wav(clean, voice, tmp_dir)
                segments.append(_wav_bytes(wav_path))
                segments.append(_make_silence_wav(SILENCE_MEDIUM))

        _play_monologues()
        segments.append(_make_silence_wav(SILENCE_LONG))
        segments.append(_narrator_wav("Now listen again.", tmp_dir))
        segments.append(_make_silence_wav(SILENCE_SHORT))
        _play_monologues()
        segments.append(_make_silence_wav(SILENCE_LONG))
        segments.append(_narrator_wav("That is the end of Part 4 and of the listening test.", tmp_dir))

        ext = "mp3" if PYDUB_AVAILABLE else "wav"
        out_path = os.path.join(out_dir, f"listening4_Test {test_num}.{ext}")
        with open(out_path, "wb") as f:
            f.write(_concat_wavs(segments))
        print(f"  Saved: {out_path}")
        return out_path


# ---------------------------------------------------------------------------
# All parts catalogue
# ---------------------------------------------------------------------------

PARTS_GENERATORS = {
    "listening1": generate_listening1,
    "listening2": generate_listening2,
    "listening3": generate_listening3,
    "listening4": generate_listening4,
    "reading1":   generate_reading1,
    "reading2":   generate_reading2,
    "reading3":   generate_reading3,
    "reading4":   generate_reading4,
    "reading5":   generate_reading5,
    "reading6":   generate_reading6,
    "reading7":   generate_reading7,
    "reading8":   generate_reading8,
    "speaking1":  generate_speaking1,
    "speaking2":  generate_speaking2,
    "speaking3":  generate_speaking3,
    "speaking4":  generate_speaking4,
    "writing1":   generate_writing1,
    "writing2":   generate_writing2,
}

AUDIO_GENERATORS = {
    "listening1": generate_audio_listening1,
    "listening2": generate_audio_listening2,
    "listening3": generate_audio_listening3,
    "listening4": generate_audio_listening4,
}


# ---------------------------------------------------------------------------
# Index management
# ---------------------------------------------------------------------------

def _update_index(test_num: int) -> None:
    """Add Test{N} to the C1 Exams index.json if not already present."""
    test_id = f"Test{test_num}"
    if not INDEX_FILE.exists():
        data: dict = {"tests": []}
    else:
        try:
            with open(INDEX_FILE) as f:
                data = json.load(f)
        except json.JSONDecodeError as exc:
            raise SystemExit(
                f"ERROR: {INDEX_FILE} contains invalid JSON — {exc}\n"
                "Please fix the file before running the generator."
            ) from exc
    existing_ids = {t["id"] for t in data.get("tests", [])}
    if test_id not in existing_ids:
        data["tests"].append({"id": test_id, "status": "available"})
        with open(INDEX_FILE, "w") as f:
            json.dump(data, f, indent=2)
        print(f"  Updated index.json → added {test_id}")
    else:
        print(f"  index.json already contains {test_id}")


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------

def run(
    test_num: int,
    parts: list[str],
    json_only: bool,
    audio_only: bool,
    upload: bool,
) -> None:
    test_dir = EXAMS_BASE_DIR / f"Test{test_num}"
    test_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n{'='*60}")
    print(f"  Generating Test {test_num} → {test_dir}")
    print(f"{'='*60}\n")

    audio_dir = str(test_dir)  # save audio alongside JSON for easy reference

    # ── JSON generation ────────────────────────────────────────────────────
    if not audio_only:
        for part in parts:
            gen_fn = PARTS_GENERATORS.get(part)
            if gen_fn is None:
                print(f"  Unknown part: {part} — skipping.")
                continue
            json_path = test_dir / f"{part}.json"
            if json_path.exists():
                print(f"  {part}.json already exists — skipping (delete to regenerate).")
                continue
            print(f"  Generating {part}.json …")
            try:
                data = gen_fn(test_num)
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"  Saved {json_path.name}")
            except Exception as e:
                print(f"  ERROR generating {part}: {e}")
                continue

    # ── Audio generation ────────────────────────────────────────────────────
    if not json_only:
        if not AZURE_AVAILABLE:
            print("\n  Skipping audio: Azure Speech SDK not installed.")
        else:
            for part in parts:
                if part not in AUDIO_GENERATORS:
                    continue
                json_path = test_dir / f"{part}.json"
                if not json_path.exists():
                    print(f"  Skipping audio for {part}: JSON file not found.")
                    continue
                try:
                    with open(json_path) as f:
                        data = json.load(f)
                except json.JSONDecodeError as exc:
                    print(
                        f"  Skipping audio for {part}: {json_path.name} contains "
                        f"invalid JSON — {exc}. Delete and regenerate the file."
                    )
                    continue
                try:
                    local_audio = AUDIO_GENERATORS[part](data, test_num, audio_dir)
                    if upload:
                        remote_name = os.path.basename(local_audio)
                        print(f"  Uploading {remote_name} to Bunny CDN…")
                        public_url = upload_to_bunny(local_audio, remote_name)
                        print(f"  Uploaded: {public_url}")
                except Exception as e:
                    print(f"  ERROR generating audio for {part}: {e}")

    # ── Update index ────────────────────────────────────────────────────────
    if not audio_only:
        _update_index(test_num)

    print(f"\n  Done! Test {test_num} files in: {test_dir}")
    if any(p == "speaking2" for p in parts):
        print(
            "\n  ⚠️  speaking2 image URLs have been generated following the pattern:\n"
            f"      {BUNNY_PUBLIC_URL}/test{test_num}_1a.jpg  (through _1f.jpg)\n"
            "     You must find and upload the 6 images manually to Bunny CDN.\n"
        )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a complete Cambridge CAE practice test.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--test-number", "-n", type=int, default=None,
        help="Test number to generate (default: auto-detect next available).",
    )
    parser.add_argument(
        "--parts", "-p", nargs="+", default=list(PARTS_GENERATORS.keys()),
        metavar="PART",
        help=(
            "Parts to generate (default: all 18). "
            "E.g. --parts listening4 reading1 speaking2"
        ),
    )
    parser.add_argument(
        "--json-only", action="store_true",
        help="Only generate JSON files; skip audio generation.",
    )
    parser.add_argument(
        "--audio-only", action="store_true",
        help="Only generate audio from existing JSON files; skip JSON generation.",
    )
    parser.add_argument(
        "--no-upload", action="store_true",
        help="Skip uploading audio to Bunny CDN (audio saved locally only).",
    )
    args = parser.parse_args()

    if args.test_number is None:
        test_num = _next_test_number()
        print(f"Auto-detected next test number: {test_num}")
    else:
        test_num = args.test_number

    # Validate parts
    unknown = [p for p in args.parts if p not in PARTS_GENERATORS]
    if unknown:
        parser.error(f"Unknown parts: {', '.join(unknown)}. Valid parts: {', '.join(PARTS_GENERATORS)}")

    run(
        test_num   = test_num,
        parts      = args.parts,
        json_only  = args.json_only,
        audio_only = args.audio_only,
        upload     = not args.no_upload,
    )


if __name__ == "__main__":
    main()
