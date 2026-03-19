import json
import os
import requests
import time
import html
import math
import struct
import wave
import io
import re
from pathlib import Path
from openai import OpenAI
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment

# =================================================
# CONFIGURACIÓN (Variables de entorno)
# =================================================

def get_speech_config():
    auth_key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_REGION", "westeurope")
    return speechsdk.SpeechConfig(subscription=auth_key, region=region)

BUNNY_STORAGE_ZONE = os.getenv("BUNNY_STORAGE_ZONE", "audios-examen")
BUNNY_API_KEY = os.getenv("BUNNY_API_KEY")
BUNNY_PULL_ZONE = os.getenv("BUNNY_PULL_ZONE", "listeninggenerator")
NARRATOR_DIR = os.getenv("NARRATOR_DIR", r"C:\Users\34717\Desktop\Examenes página\C1\Narrador")

# ==========================
# UTILIDADES DE AUDIO
# ==========================

def make_beep(duration_ms=500, freq=880, volume_db=-10):
    sample_rate = 44100
    num_samples = int(sample_rate * duration_ms / 1000)
    samples = [struct.pack('<h', int(32767 * math.sin(2 * math.pi * freq * n / sample_rate))) for n in range(num_samples)]
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sample_rate)
        wf.writeframes(b''.join(samples))
    buf.seek(0)
    return AudioSegment.from_wav(buf) + volume_db

def generate_tts_line(text, voice, speech_config, output_path):
    clean_text = re.sub(r'\[/?\d+\]', '', text)
    clean_text = html.escape(clean_text)
    lang = "-".join(voice.split("-")[:2])
    
    temp_filename = output_path / f"temp_line_{int(time.time()*1000)}.wav"
    audio_config = speechsdk.audio.AudioOutputConfig(filename=str(temp_filename))
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    ssml = f"""
    <speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='{voice}'>
            <prosody rate='-3%'>{clean_text}</prosody>
        </voice>
    </speak>"""

    result = synthesizer.speak_ssml_async(ssml).get()
    
    # Liberar recursos para evitar errores de permisos en Windows
    del synthesizer
    del audio_config
    time.sleep(0.1) 

    if os.path.exists(temp_filename):
        line_audio = AudioSegment.from_file(temp_filename)
        try:
            os.remove(temp_filename)
        except:
            pass # Reintento de borrado silencioso
        return line_audio
    return AudioSegment.silent(duration=500)

def upload_to_bunny(file_path):
    filename = os.path.basename(file_path)
    url = f"https://storage.bunnycdn.com/{BUNNY_STORAGE_ZONE}/{filename}"
    headers = {"AccessKey": BUNNY_API_KEY, "Content-Type": "application/octet-stream"}
    with open(file_path, "rb") as f:
        requests.put(url, data=f, headers=headers)
    return f"https://{BUNNY_PULL_ZONE}.b-cdn.net/{filename}"

# ==========================
# GENERACIÓN DE CONTENIDO (AI)
# ==========================

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    audio_url = ""
    voices = {"interviewer": "en-GB-RyanNeural", "guest1": "en-GB-SoniaNeural", "guest2": "en-GB-LibbyNeural"}
    prompt = f"""Generate listening3.json for Cambridge CAE Test {test_id}.

The interview features TWO guests (not one). Both guests must have realistic first names (e.g. "John" and "Meredith").
Use their first names in lowercase as the keys in "voices" and as "speaker" values in the dialogue array.

SCHEMA:
{{
  "exam_part": 3,
  "title": "Listening - Part 3",
  "type": "multiple-choice-text",
  "time": 15,
  "totalQuestions": 6,
  "description": "You will hear an interview with [Guest1 Name] and [Guest2 Name] about [topic]. For questions 15–20, choose the answer (A, B, C or D) which fits best.",
  "instructions": "For questions 15–20, choose the answer (A, B, C or D) which fits best.",
  "duration_minutes": 12,
  "audio_source": "{audio_url}",
  "extracts": [
    {{
      "id": 1,
      "context": "An interview with [Guest1 Name] and [Guest2 Name] discussing [topic].",
      "voices": {{"interviewer": "en-GB-RyanNeural", "john": "en-GB-SoniaNeural", "meredith": "en-GB-LibbyNeural"}},
      "audio_script": "Full interview 400–500 words. Mark answer evidence: [15]...[/15] through [20]...[/20]. Use \\n\\n for paragraph breaks within a long turn.",
      "dialogue": [
        {{"speaker": "interviewer", "text": "Opening question addressing both guests."}},
        {{"speaker": "john",        "text": "Answer (60–80 words)."}},
        {{"speaker": "meredith",    "text": "Adding their perspective."}},
        {{"speaker": "interviewer", "text": "Follow-up question to one guest."}},
        {{"speaker": "meredith",    "text": "Detailed answer."}},
        {{"speaker": "interviewer", "text": "Question to the other guest."}},
        {{"speaker": "john",        "text": "Answer."}},
        {{"speaker": "interviewer", "text": "Question."}},
        {{"speaker": "meredith",    "text": "Answer."}},
        {{"speaker": "interviewer", "text": "Question."}},
        {{"speaker": "john",        "text": "Closing answer."}}
      ],
      "questions": [
        {{"number": 15, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "C", "explanation": "..."}},
        {{"number": 16, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A", "explanation": "..."}},
        {{"number": 17, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "D", "explanation": "..."}},
        {{"number": 18, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "B", "explanation": "..."}},
        {{"number": 19, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A", "explanation": "..."}},
        {{"number": 20, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "C", "explanation": "..."}}
      ]
    }}
  ]
}}

STRICT RULES:
1. TWO guests, both real-sounding professionals in an interesting shared field (e.g. two authors of a book, two scientists in the same discipline, two co-founders of a project).
2. Give each guest a realistic first name. Use those names (lowercase) as keys in "voices" and as "speaker" values. Do NOT use "guest", "guest1", or "guest2".
3. Voices: interviewer → "en-GB-RyanNeural"; assign two different British/Irish voices for the guests.
4. 6 questions (15–20), 4 options each. Options must be an ARRAY of strings in the format ["A) text", "B) text", "C) text", "D) text"]. Use "correct" (not "answer") for the correct letter.
5. Questions test: inference, attitude, reference, meaning in context.
6. Dialogue: 11–13 turns total. Interviewer asks open questions; both guests contribute answers across the interview.
7. Questions follow the ORDER of the dialogue (Q15 relates to early dialogue, Q20 to late).
8. Avoid Test 1 topic (collecting/collections).
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a Cambridge exam expert."}, {"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================
# FUNCIÓN PRINCIPAL
# ==========================

def generate(test_id, output_path, api_key, json_only, audio_only, no_upload):
    speech_config = get_speech_config()
    json_file = output_path / f"test_{test_id}_listening3.json"
    audio_file = output_path / f"test_{test_id}_listening3.mp3"

    # 1. Crear JSON
    if not audio_only:
        print(f"🤖 Generando contenido AI para Listening 3 (Entrevista)...")
        content = get_ai_content(api_key, test_id)
        data = {
            "title": "Listening Part 3",
            "time": 20,
            "totalQuestions": 6,
            "description": "You will hear an interview in which... For questions 15 – 20, choose the answer (A, B, C or D) which fits best according to what you hear.",
            **content
        }
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    else:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

    if json_only: return

    # 2. Crear Audio
    print(f"🎙️ Sintetizando entrevista (esto puede tardar unos minutos)...")
    beep = make_beep()
    
    # Ensamblar diálogo
    extract = data["extracts"][0]
    interview_audio = AudioSegment.empty()
    for line in extract["dialogue"]:
        voice = extract["voices"].get(line["speaker"])
        interview_audio += generate_tts_line(line["text"], voice, speech_config, output_path)
        interview_audio += AudioSegment.silent(duration=600) # Pausa entre turnos

    # Estructura del examen
    try:
        final_audio = AudioSegment.from_file(os.path.join(NARRATOR_DIR, "intro_part3.mp3"))
    except:
        final_audio = AudioSegment.silent(duration=1000)

    # Locución tiempo lectura (Aprox 70s)
    try:
        final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "reading_time_p3.mp3"))
    except: pass
    
    final_audio += AudioSegment.silent(duration=70000) 

    # Pasadas con repetición
    for _ in range(2):
        final_audio += beep + interview_audio + AudioSegment.silent(duration=3000)
        if _ == 0:
            try:
                final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "repeat_prompt_p3.mp3"))
            except: pass

    try:
        final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "part_3_finish.mp3"))
    except: pass

    # Exportar y Subir
    final_audio.export(audio_file, format="mp3")
    
    if not no_upload:
        url = upload_to_bunny(audio_file)
        data["audio_source"] = url
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        if os.path.exists(audio_file):
            os.remove(audio_file)
            print(f"🗑️ Limpieza: MP3 eliminado. URL: {url}")