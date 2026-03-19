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

# ==========================
# CONFIGURACIÓN Y CLIENTES
# ==========================

def get_speech_config():
    auth_key = os.getenv("AZURE_SPEECH_KEY")
    region = os.getenv("AZURE_REGION", "westeurope")
    return speechsdk.SpeechConfig(subscription=auth_key, region=region)

BUNNY_STORAGE_ZONE = os.getenv("BUNNY_STORAGE_ZONE", "audios-examen")
BUNNY_API_KEY = os.getenv("BUNNY_API_KEY")
BUNNY_PULL_ZONE = os.getenv("BUNNY_PULL_ZONE", "listeninggenerator")
# Directorio donde guardas los audios pre-grabados del narrador
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

def generate_tts(text, voice, filename, speech_config):
    style = "general"
    clean_text = text
    if text.startswith("["):
        match = re.search(r"\[(.*?)\]", text)
        if match:
            style = match.group(1)
            clean_text = text[text.find("]")+1:].strip()

    clean_text = html.escape(clean_text)
    lang = "-".join(voice.split("-")[:2])
    audio_config = speechsdk.audio.AudioOutputConfig(filename=str(filename))
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    ssml = f"""
    <speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts'>
        <voice name='{voice}'>
            <mstts:express-as style='{style}'>
                <prosody rate='-8%'>{clean_text}</prosody>
            </mstts:express-as>
        </voice>
    </speak>"""
    result = synthesizer.speak_ssml_async(ssml).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        raise RuntimeError(f"Error Azure TTS: {result.reason}")

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
    vp = [
        {"man": "en-GB-RyanNeural", "woman": "en-GB-SoniaNeural"},
        {"man": "en-US-GuyNeural", "woman": "en-US-JennyNeural"},
        {"man": "en-GB-RyanNeural", "woman": "en-GB-SoniaNeural"},
    ]
    prompt = f"""Generate listening1.json for Cambridge CAE Test {test_id}.

SCHEMA (return exactly this structure, fully populated):
{{
  "exam_part": 1,
  "title": "Listening - Part 1",
  "type": "multiple-choice-text",
  "time": 15,
  "totalQuestions": 6,
  "description": "You will hear three different extracts. For questions 1–6, choose the answer (A, B or C) which fits best.",
  "instructions": "You will hear three different extracts. For questions 1–6, choose the answer (A, B or C) which fits best according to what you hear. There are two questions for each extract.",
  "duration_minutes": 10,
  "audio_source": "{audio_url}",
  "extracts": [
    {{
      "id": 1,
      "context": "Setting description read aloud, e.g. 'You hear two colleagues discussing a project deadline.'",
      "voices": {json.dumps(vp[0])},
      "audio_script": "Full dialogue text. Wrap the key phrase that proves Q1 in [1]...[/1] and Q2 in [2]...[/2]. Use || for paragraph breaks within a turn.",
      "dialogue": [
        {{"speaker": "man",   "text": "First speaker turn (no markers)."}},
        {{"speaker": "woman", "text": "Second speaker turn."}},
        {{"speaker": "man",   "text": "Third turn."}},
        {{"speaker": "woman", "text": "Fourth turn."}}
      ],
      "questions": [
        {{
          "number": 1,
          "question": "What is the man's main concern about the project?",
          "options": {{"A": "Option A text.", "B": "Option B text.", "C": "Option C text."}},
          "answer": "B",
          "explanation": "B is supported by [1]key phrase[/1] because..."
        }},
        {{
          "number": 2,
          "question": "The woman implies that she...",
          "options": {{"A": "...", "B": "...", "C": "..."}},
          "answer": "A",
          "explanation": "..."
        }}
      ]
    }},
    {{
      "id": 2,
      "context": "...",
      "voices": {json.dumps(vp[1])},
      "audio_script": "...[3]...[/3]...[4]...[/4]...",
      "dialogue": [],
      "questions": [
        {{"number": 3, "question": "...", "options": {{"A": "...", "B": "...", "C": "..."}}, "answer": "C", "explanation": "..."}},
        {{"number": 4, "question": "...", "options": {{"A": "...", "B": "...", "C": "..."}}, "answer": "A", "explanation": "..."}}
      ]
    }},
    {{
      "id": 3,
      "context": "...",
      "voices": {json.dumps(vp[2])},
      "audio_script": "...[5]...[/5]...[6]...[/6]...",
      "dialogue": [],
      "questions": [
        {{"number": 5, "question": "...", "options": {{"A": "...", "B": "...", "C": "..."}}, "answer": "B", "explanation": "..."}},
        {{"number": 6, "question": "...", "options": {{"A": "...", "B": "...", "C": "..."}}, "answer": "C", "explanation": "..."}}
      ]
    }}
  ]
}}

STRICT RULES:
1. Three DIFFERENT settings – vary: workplace, leisure, academic, domestic, social, professional.
2. Each dialogue: 150–200 words, minimum 5 turns, natural register (contractions, hedging, fillers).
3. Questions test INFERENCE or ATTITUDE, not literal recall.
4. All three options must be plausible; only one is unambiguously correct.
5. The dialogue array must perfectly match audio_script (one entry per turn, speaker = "man" or "woman").
6. Avoid Test 1 topics: corporate restructuring, vertical farming.
7. Do not repeat any topic used in previous tests for this series.
8. audio_source: "{audio_url}"
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
    json_file = output_path / f"test_{test_id}_listening1.json"
    audio_file = output_path / f"test_{test_id}_listening1.mp3"

    # 1. Crear JSON
    if not audio_only:
        print(f"🤖 Generando contenido AI para Listening 1...")
        content = get_ai_content(api_key, test_id)
        data = {
            "title": f"Listening Part 1",
            "time": 15,
            "totalQuestions": 6,
            "description": "You will hear three different extracts. For questions 1 – 6, choose the answer (A, B or C) which fits best according to what you hear. There are two questions for each extract.",
            **content
        }
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    else:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

    if json_only: return

    # 2. Crear Audio
    print(f"🎙️ Montando audio para Test {test_id}...")
    beep = make_beep()
    
    # Cargar Intro Narrador
    try:
        final_audio = AudioSegment.from_file(os.path.join(NARRATOR_DIR, "intro_part1.mp3"))
    except:
        final_audio = AudioSegment.silent(duration=1000)

    for extract in data["extracts"]:
        print(f"  - Procesando extracto {extract['id']}...")
        
        # Audio Narrador "Extract X"
        try:
            final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, f"extract_{extract['id']}_start.mp3"))
        except: pass
        
        final_audio += AudioSegment.silent(duration=15000) # Tiempo lectura

        # Generar Diálogo
        dialogue_seg = AudioSegment.silent(duration=0)
        for i, line in enumerate(extract["dialogue"]):
            temp_wav = output_path / f"temp_l1_{extract['id']}_{i}.wav"
            generate_tts(line["text"], extract["voices"][line["speaker"]], temp_wav, speech_config)
            dialogue_seg += AudioSegment.from_file(temp_wav) + AudioSegment.silent(duration=500)
            os.remove(temp_wav) # Borrado inmediato del temporal .wav

        # Doble pasada con beep
        for _ in range(2):
            final_audio += beep + dialogue_seg + AudioSegment.silent(duration=3000)
        
        # Audio Narrador Fin Extracto
        try:
            final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, f"extract_{extract['id']}_end.mp3"))
        except: pass

    # Exportar MP3 final
    final_audio.export(audio_file, format="mp3")
    print(f"✅ MP3 generado.")

    # 3. Subir a Bunny y borrar localmente
    if not no_upload:
        url = upload_to_bunny(audio_file)
        data["audio_source"] = url
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        
        if os.path.exists(audio_file):
            os.remove(audio_file)
            print(f"🗑️ Limpieza: MP3 eliminado. URL: {url}")