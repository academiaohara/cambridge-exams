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
    # Limpiar etiquetas de speaker y marcas de examen para el audio
    clean_text = re.sub(r'Speaker \d+:', '', text)
    clean_text = re.sub(r'\[/?\d+\]', '', clean_text)
    clean_text = html.escape(clean_text.strip())
    
    lang = "-".join(voice.split("-")[:2])
    temp_filename = output_path / f"temp_p4_{int(time.time()*1000)}.wav"
    
    audio_config = speechsdk.audio.AudioOutputConfig(filename=str(temp_filename))
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    ssml = f"""
    <speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='{voice}'>
            <prosody rate='-2%'>{clean_text}</prosody>
        </voice>
    </speak>"""

    synthesizer.speak_ssml_async(ssml).get()
    
    del synthesizer
    del audio_config
    time.sleep(0.2) 

    if os.path.exists(temp_filename):
        line_audio = AudioSegment.from_file(temp_filename)
        try: os.remove(temp_filename)
        except: pass
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
    voices = {
        "Speaker 1": "en-GB-RyanNeural",
        "Speaker 2": "en-GB-LibbyNeural",
        "Speaker 3": "en-US-GuyNeural",
        "Speaker 4": "en-US-JennyNeural",
        "Speaker 5": "en-AU-NatashaNeural",
    }
    prompt = f"""Generate content for Cambridge CAE Listening Part 4 Test {test_id}.

SCHEMA (return exactly this JSON structure, fully populated):
{{
  "title": "Listening - Part 4: [Topic]",
  "topic": "[brief description of common theme, e.g. 'people who gave up corporate careers to start organic farms']",
  "voices": {json.dumps(voices)},
  "audio_script": "Speaker 1: [Full 100–150 word monologue. Embed [21]answer evidence[/21] and [26]answer evidence[/26] in the text.] || Speaker 2: [Full 100–150 word monologue with [22]...[/22] and [27]...[/27]] || Speaker 3: [Full 100–150 word monologue with [23]...[/23] and [28]...[/28]] || Speaker 4: [Full 100–150 word monologue with [24]...[/24] and [29]...[/29]] || Speaker 5: [Full 100–150 word monologue with [25]...[/25] and [30]...[/30]]",
  "task1": {{
    "title": "Task One",
    "instruction": "For questions 21–25, choose from the list (A–H) [angle 1 description, e.g. 'why each speaker decided to make a change'].",
    "questions": [
      {{"number": 21, "speaker": "Speaker 1", "correct": "E", "explanation": "..."}},
      {{"number": 22, "speaker": "Speaker 2", "correct": "G", "explanation": "..."}},
      {{"number": 23, "speaker": "Speaker 3", "correct": "B", "explanation": "..."}},
      {{"number": 24, "speaker": "Speaker 4", "correct": "D", "explanation": "..."}},
      {{"number": 25, "speaker": "Speaker 5", "correct": "A", "explanation": "..."}}
    ],
    "options": {{
      "A": "...", "B": "...", "C": "...", "D": "...",
      "E": "...", "F": "...", "G": "...", "H": "..."
    }}
  }},
  "task2": {{
    "title": "Task Two",
    "instruction": "For questions 26–30, choose from the list (A–H) [angle 2 description, e.g. 'what each speaker finds most rewarding about their new life'].",
    "questions": [
      {{"number": 26, "speaker": "Speaker 1", "correct": "C", "explanation": "..."}},
      {{"number": 27, "speaker": "Speaker 2", "correct": "H", "explanation": "..."}},
      {{"number": 28, "speaker": "Speaker 3", "correct": "F", "explanation": "..."}},
      {{"number": 29, "speaker": "Speaker 4", "correct": "B", "explanation": "..."}},
      {{"number": 30, "speaker": "Speaker 5", "correct": "G", "explanation": "..."}}
    ],
    "options": {{
      "A": "...", "B": "...", "C": "...", "D": "...",
      "E": "...", "F": "...", "G": "...", "H": "..."
    }}
  }}
}}

STRICT RULES:
1. Choose an engaging, cohesive theme where 5 different people share related but varied experiences (e.g. people who changed careers, people who moved abroad, people who started a creative business). Do NOT use farming/agriculture (used in Test 1).
2. Each speaker's monologue must be 100–150 words — substantial and natural-sounding, not a brief summary. Each speaker must have a distinct voice and perspective.
3. audio_script: All 5 speakers joined by ' || ' (space-pipe-pipe-space). Each segment starts with 'Speaker N: '. Markers [21]–[25] are task1 answers; markers [26]–[30] are task2 answers. Each marker pair wraps the exact phrase(s) evidencing the answer (e.g. 'I found [21]the isolation deeply unsettling[/21]').
4. Task 1 and Task 2 must have DIFFERENT angles (e.g. Task 1 = motivation for the change, Task 2 = biggest challenge faced).
5. Each task must have exactly 8 options (A–H). Not all options are used — include 3 distractors per task. Answer letters must be spread across A–H (avoid clustering).
6. Speaker-to-question mapping: Q21=Speaker 1, Q22=Speaker 2, Q23=Speaker 3, Q24=Speaker 4, Q25=Speaker 5 (same for task2: Q26=Speaker 1, Q27=Speaker 2, Q28=Speaker 3, Q29=Speaker 4, Q30=Speaker 5).
7. Voices are already defined as {json.dumps(voices)} — do not change them.
8. Avoid reusing the farming/agriculture theme from Test 1.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a Cambridge exam expert specializing in CAE listening tasks."}, {"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================
# FUNCIÓN PRINCIPAL
# ==========================

def generate(test_id, output_path, api_key, json_only, audio_only, no_upload):
    speech_config = get_speech_config()
    json_file = output_path / f"listening4.json"
    audio_file = output_path / f"test_{test_id}_listening4.mp3"

    # 1. Crear JSON
    if not audio_only:
        print(f"🤖 Generando contenido AI para Listening 4 (Matching)...")
        content = get_ai_content(api_key, test_id)
        topic = content.get("topic", "people talking about a shared experience")
        data = {
            "title": content.get("title", "Listening - Part 4"),
            "audioUrl": "",
            "time": 10,
            "totalQuestions": 10,
            "description": f"You will hear five short extracts in which {topic}. You must complete two tasks while listening.",
            "content": {
                "voices": content["voices"],
                "audio_script": content["audio_script"],
                "task1": content["task1"],
                "task2": content["task2"],
            }
        }
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    else:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

    if json_only: return

    # 2. Crear Audio
    print(f"🎙️ Sintetizando los 5 Speakers de la Parte 4...")
    
    # Procesar script
    script = data["content"]["audio_script"]
    voices = data["content"]["voices"]
    speakers_list = script.split("||")
    
    all_speakers_audio = AudioSegment.empty()
    for entry in speakers_list:
        match = re.search(r'(Speaker \d+):', entry)
        if match:
            s_label = match.group(1)
            voice = voices.get(s_label)
            print(f"  - Generando {s_label}...")
            all_speakers_audio += generate_tts_line(entry, voice, speech_config, output_path)
            all_speakers_audio += AudioSegment.silent(duration=1200) # Pausa entre speakers

    # Montaje
    try:
        final_audio = AudioSegment.from_file(os.path.join(NARRATOR_DIR, "intro_part4.mp3"))
    except:
        final_audio = AudioSegment.silent(duration=1000)

    # Tiempo lectura (45s)
    try:
        final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "reading_time_p4.mp3"))
    except: pass
    final_audio += AudioSegment.silent(duration=45000)

    beep = make_beep()
    for _ in range(2):
        final_audio += beep + all_speakers_audio
        if _ == 0:
            final_audio += AudioSegment.silent(duration=5000)
            try:
                final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "repeat_prompt_p4.mp3"))
            except: pass

    try:
        final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "part_4_finish.mp3"))
    except: pass

    # Exportar y Subir
    final_audio.export(audio_file, format="mp3")
    
    if not no_upload:
        url = upload_to_bunny(audio_file)
        data["audioUrl"] = url
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        if os.path.exists(audio_file):
            os.remove(audio_file)
            print(f"🗑️ Limpieza: MP3 eliminado. URL: {url}")