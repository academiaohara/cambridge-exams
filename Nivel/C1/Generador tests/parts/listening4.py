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
    audio_url = ""
    voices = {
        "Speaker 1": "en-GB-RyanNeural",
        "Speaker 2": "en-GB-SoniaNeural",
        "Speaker 3": "en-US-GuyNeural",
        "Speaker 4": "en-US-JennyNeural",
        "Speaker 5": "en-GB-RyanNeural",
    }
    prompt = f"""Generate listening3.json for Cambridge CAE Test {test_id}.

SCHEMA:
{{
  "exam_part": 3,
  "title": "Listening - Part 3",
  "type": "multiple-choice-text",
  "time": 15,
  "totalQuestions": 6,
  "description": "You will hear an interview with [guest description]. For questions 15–20, choose the answer (A, B, C or D) which fits best.",
  "instructions": "For questions 15–20, choose the answer (A, B, C or D) which fits best.",
  "duration_minutes": 12,
  "audio_source": "{audio_url}",
  "extracts": [
    {{
      "id": 1,
      "context": "You hear an interview with [Name], a [profession].",
      "voices": {json.dumps(voices)},
      "audio_script": "Full interview 480–560 words. Mark answer evidence: [15]...[/15] through [20]...[/20]. Use || for paragraph breaks within a long turn.",
      "dialogue": [
        {{"speaker": "interviewer", "text": "Opening question."}},
        {{"speaker": "guest",       "text": "Long answer (80–100 words)."}},
        {{"speaker": "interviewer", "text": "Follow-up question."}},
        {{"speaker": "guest",       "text": "Answer."}},
        {{"speaker": "interviewer", "text": "Another question."}},
        {{"speaker": "guest",       "text": "Answer."}},
        {{"speaker": "interviewer", "text": "Question."}},
        {{"speaker": "guest",       "text": "Answer."}},
        {{"speaker": "interviewer", "text": "Question."}},
        {{"speaker": "guest",       "text": "Answer."}},
        {{"speaker": "interviewer", "text": "Final question."}},
        {{"speaker": "guest",       "text": "Closing answer."}}
      ],
      "questions": [
        {{"number": 15, "question": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "answer": "C", "explanation": "..."}},
        {{"number": 16, "question": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "answer": "A", "explanation": "..."}},
        {{"number": 17, "question": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "answer": "D", "explanation": "..."}},
        {{"number": 18, "question": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "answer": "B", "explanation": "..."}},
        {{"number": 19, "question": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "answer": "A", "explanation": "..."}},
        {{"number": 20, "question": "...", "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}}, "answer": "C", "explanation": "..."}}
      ]
    }}
  ]
}}

STRICT RULES:
1. Guest must be a real-sounding professional in an interesting field (e.g. palaeontologist, forensic architect, wildlife sound recorder, urban planner).
2. 6 questions (15–20), 4 options each (A–D). Questions test: inference, attitude, reference, meaning in context.
3. Dialogue must be realistic: interviewer asks open questions; guest gives detailed, naturally-paced answers.
4. Questions follow the ORDER of the dialogue (Q15 relates to early dialogue, Q20 to late).
5. Avoid Test 1 guest type (entrepreneur). Voices: {json.dumps(voices)}.
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
    json_file = output_path / f"test_{test_id}_listening4.json"
    audio_file = output_path / f"test_{test_id}_listening4.mp3"

    # 1. Crear JSON
    if not audio_only:
        print(f"🤖 Generando contenido AI para Listening 4 (Matching)...")
        content = get_ai_content(api_key, test_id)
        data = {
            "title": "Listening Part 4",
            "time": 20,
            "totalQuestions": 10,
            "description": "You will hear five short extracts in which people are talking about... While you listen you must complete two tasks.",
            "content": content
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
        data["audio_source"] = url
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        if os.path.exists(audio_file):
            os.remove(audio_file)
            print(f"🗑️ Limpieza: MP3 eliminado. URL: {url}")