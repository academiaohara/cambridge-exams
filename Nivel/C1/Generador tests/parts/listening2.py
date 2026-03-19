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
# CONFIGURACIÓN (Keys desde variables de entorno)
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

def generate_tts_clean(text, voice, filename, speech_config):
    # Eliminar marcas de examen [7] para el audio, pero mantener el texto fluido
    clean_text = re.sub(r'\[/?\d+\]', '', text)
    clean_text = html.escape(clean_text)
    lang = "-".join(voice.split("-")[:2])
    
    audio_config = speechsdk.audio.AudioOutputConfig(filename=str(filename))
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    ssml = f"""
    <speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='{voice}'>
            <prosody rate='-5%'>{clean_text}</prosody>
        </voice>
    </speak>"""
    
    result = synthesizer.speak_ssml_async(ssml).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        raise RuntimeError(f"Error Azure TTS Part 2: {result.reason}")

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
    voice = "en-GB-SoniaNeural"
    prompt = f"""Generate listening2.json for Cambridge CAE Test {test_id}.

SCHEMA:
{{
  "exam_part": 2,
  "title": "Listening - Part 2",
  "type": "sentence-completion",
  "time": 15,
  "totalQuestions": 8,
  "description": "You will hear [speaker description, e.g. 'a marine biologist giving a talk about deep-sea exploration']. Complete the sentences 7–14.",
  "instructions": "For questions 7–14, complete the sentences with a word or short phrase.",
  "duration_minutes": 10,
  "audio_source": "{audio_url}",
  "extracts": [
    {{
      "id": 1,
      "context": "Brief spoken context statement e.g. 'You will hear a marine biologist…'",
      "voices": {{"speaker": "{voice}"}},
      "audio_script": "Full monologue 320–380 words. Mark each answer in situ: [7]answer1[/7], [8]answer2[/8]… through [14]answer8[/14]. The answer must be a short phrase (1–4 words) that fits naturally into the gap sentence.",
      "dialogue": [
        {{"speaker": "speaker", "text": "Full monologue text with no markers – clean TTS input."}}
      ],
      "questions": [
        {{"number": 7,  "sentence": "The speaker first became interested in [topic] when she was [7]___[/7].", "answer": "phrase that fits the gap", "explanation": "The answer is evidenced by [7]…[/7] in the script."}},
        {{"number": 8,  "sentence": "...", "answer": "...", "explanation": "..."}},
        {{"number": 9,  "sentence": "...", "answer": "...", "explanation": "..."}},
        {{"number": 10, "sentence": "...", "answer": "...", "explanation": "..."}},
        {{"number": 11, "sentence": "...", "answer": "...", "explanation": "..."}},
        {{"number": 12, "sentence": "...", "answer": "...", "explanation": "..."}},
        {{"number": 13, "sentence": "...", "answer": "...", "explanation": "..."}},
        {{"number": 14, "sentence": "...", "answer": "...", "explanation": "..."}}
      ]
    }}
  ]
}}

STRICT RULES:
1. Monologue topic: an expert speaking about their profession or area of research.
   Forbidden topics: digital detox, productivity apps, climate activism (overused in previous tests).
2. Gap answers must be factual short phrases – NOT full sentences.
3. Each gap sentence must make grammatical sense on its own when the answer is inserted.
4. Answers appear in the audio in QUESTION ORDER (7 → 14).
5. Voice: {voice}.
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
    json_file = output_path / f"test_{test_id}_listening2.json"
    audio_file = output_path / f"test_{test_id}_listening2.mp3"

    # 1. Crear JSON
    if not audio_only:
        print(f"🤖 Generando contenido AI para Listening 2...")
        content = get_ai_content(api_key, test_id)
        data = {
            "title": "Listening Part 2",
            "time": 15,
            "totalQuestions": 8,
            "description": "You will hear a talk about... For questions 7 – 14, complete the sentences with a word or short phrase.",
            **content
        }
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    else:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

    if json_only: return

    # 2. Crear Audio
    print(f"🎙️ Montando audio Part 2 (Monólogo)...")
    beep = make_beep()
    
    # Cargar Intro y Prompts
    try:
        final_audio = AudioSegment.from_file(os.path.join(NARRATOR_DIR, "intro_part2.mp3"))
    except:
        final_audio = AudioSegment.silent(duration=1000)

    extract = data["extracts"][0]
    voice = list(extract["voices"].values())[0]
    full_text = extract["dialogue"][0]["text"]
    
    # Generar el audio del monólogo completo
    temp_wav = output_path / "temp_p2_monologue.wav"
    generate_tts_clean(full_text, voice, temp_wav, speech_config)
    monologue_audio = AudioSegment.from_file(temp_wav)
    os.remove(temp_wav)

    # Estructura del examen: Lectura (45s) -> Audio -> Pausa -> Repetición -> Final
    final_audio += AudioSegment.silent(duration=45000) # Tiempo oficial de lectura P2
    
    for _ in range(2):
        final_audio += beep + monologue_audio + AudioSegment.silent(duration=3000)
        if _ == 0: # Añadir prompt de repetición entre pasadas
             try:
                final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "repeat_prompt_p2.mp3"))
             except: pass

    try:
        final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "part_2_finish.mp3"))
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