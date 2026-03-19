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
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(samples))
    buf.seek(0)
    return AudioSegment.from_wav(buf) + volume_db

def generate_tts_line(text, voice, speech_config, output_path):
    # Limpieza AGRESIVA de marcadores y etiquetas
    clean_text = re.sub(r'\[/?\d+\]', '', text)  # Elimina [15], [/15], etc.
    clean_text = re.sub(r'\[/?[a-z]+\]', '', clean_text, flags=re.IGNORECASE)  # Elimina otras etiquetas
    clean_text = html.unescape(clean_text)  # Primero unescape por si acaso
    clean_text = html.escape(clean_text)    # Luego escape para SSML
    
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
    
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"⚠️ Error en síntesis: {result.reason}")
        return AudioSegment.silent(duration=1000)
    
    del synthesizer
    del audio_config
    time.sleep(0.1) 

    if os.path.exists(temp_filename):
        line_audio = AudioSegment.from_file(temp_filename)
        try:
            os.remove(temp_filename)
        except:
            pass
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
        "interviewer": "en-GB-RyanNeural",
        "guest1": "en-GB-SoniaNeural",
        "guest2": "en-GB-LibbyNeural"
    }

    prompt = f"""Generate listening3.json for Cambridge CAE Test {test_id}.

    CRITICAL INSTRUCTION: The "dialogue" array MUST NOT contain ANY markers like [15] or [/15]. 
    The "audio_script" field is the ONLY place where markers [15]...[/15] through [20]...[/20] should appear.

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

        "audio_script": "FULL TRANSCRIPT REQUIRED: Write the COMPLETE interview (400–500 words) as a continuous script, including EVERYTHING that is said by interviewer and both guests. This must be a clean readable transcript (not bullet points, not summaries). Use paragraph breaks with \\n\\n when a new speaker talks. Insert answer evidence markers exactly like [15]...[/15] through [20]...[/20] around the relevant phrases in the transcript.",

        "dialogue": [
            {{"speaker": "interviewer", "text": "Opening question addressing both guests. NO MARKERS HERE."}},
            {{"speaker": "john",        "text": "Answer (60–80 words). NO MARKERS HERE."}},
            {{"speaker": "meredith",    "text": "Adding their perspective. NO MARKERS HERE."}},
            {{"speaker": "interviewer", "text": "Follow-up question to one guest. NO MARKERS HERE."}},
            {{"speaker": "meredith",    "text": "Detailed answer. NO MARKERS HERE."}},
            {{"speaker": "interviewer", "text": "Question to the other guest. NO MARKERS HERE."}},
            {{"speaker": "john",        "text": "Answer. NO MARKERS HERE."}},
            {{"speaker": "interviewer", "text": "Question. NO MARKERS HERE."}},
            {{"speaker": "meredith",    "text": "Answer. NO MARKERS HERE."}},
            {{"speaker": "interviewer", "text": "Question. NO MARKERS HERE."}},
            {{"speaker": "john",        "text": "Closing answer. NO MARKERS HERE."}}
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
    1. TWO guests, both real-sounding professionals in an interesting shared field.
    2. Use their REAL FIRST NAMES in lowercase in "voices" and "dialogue".
    3. Voices: interviewer → "en-GB-RyanNeural"; guests must have different British/Irish voices.
    4. 6 questions (15–20), 4 options each. Use "correct".
    5. Questions must test inference, attitude, reference, meaning.
    6. Dialogue: 11–13 turns total.
    7. Questions must follow the order of the dialogue.
    8. CRITICAL: The "audio_script" MUST be the FULL transcript of the interview (400–500 words), NOT a summary.
    9. CRITICAL: The "audio_script" must MATCH the dialogue content (same ideas, just written as a continuous transcript).
    10. CRITICAL: Include ALL answer markers [15]...[/15] to [20]...[/20] in the transcript only (NOT in dialogue).
    11. Do NOT shorten or simplify the audio_script.
    12. Avoid Test 1 topic (collecting/collections).
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a Cambridge exam expert."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )

    return json.loads(response.choices[0].message.content)

# ==========================
# FUNCIÓN PRINCIPAL
# ==========================

def generate(test_id, output_path, api_key, json_only, audio_only, no_upload):
    speech_config = get_speech_config()
    json_file = output_path / f"listening3.json"
    audio_file = output_path / f"test_{test_id}_listening3.mp3"

    if not audio_only:
        print(f"🤖 Generando contenido AI para Listening 3 (Entrevista)...")
        content = get_ai_content(api_key, test_id)
        
        # Verificación y limpieza adicional de marcadores en el diálogo
        for extract in content["extracts"]:
            for line in extract["dialogue"]:
                if re.search(r'\[\d+\]', line["text"]) or re.search(r'\[/\d+\]', line["text"]):
                    print(f"⚠️ ADVERTENCIA: Se encontraron marcadores en el diálogo del extracto {extract['id']}. Limpiando...")
                    line["text"] = re.sub(r'\[/?\d+\]', '', line["text"])
        
        data = {
            "title": "Listening Part 3",
            "time": 20,
            "totalQuestions": 6,
            "description": "You will hear an interview...",
            **content
        }
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    else:
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

    if json_only:
        return

    print(f"🎙️ Sintetizando entrevista...")
    beep = make_beep()
    
    extract = data["extracts"][0]
    interview_audio = AudioSegment.empty()

    for i, line in enumerate(extract["dialogue"]):
        voice = extract["voices"].get(line["speaker"])
        if not voice:
            print(f"⚠️ Error: No se encontró voz para el speaker {line['speaker']}")
            continue
            
        print(f"  - Procesando turno {i+1}: {line['speaker']}")
        line_audio = generate_tts_line(line["text"], voice, speech_config, output_path)
        interview_audio += line_audio
        interview_audio += AudioSegment.silent(duration=600)

    # Cargar intro
    try:
        final_audio = AudioSegment.from_file(os.path.join(NARRATOR_DIR, "intro_part3.mp3"))
    except:
        print("⚠️ No se encontró intro_part3.mp3, usando silencio")
        final_audio = AudioSegment.silent(duration=1000)

    # Tiempo de lectura (70 segundos como en el original)
    final_audio += AudioSegment.silent(duration=70000)

    # Dos pasadas con beep
    for i in range(2):
        final_audio += beep + interview_audio + AudioSegment.silent(duration=3000)
        if i == 0:  # Entre pasadas
            try:
                final_audio += AudioSegment.from_file(os.path.join(NARRATOR_DIR, "repeat_prompt_p3.mp3"))
            except:
                print("⚠️ No se encontró repeat_prompt_p3.mp3")
                final_audio += AudioSegment.silent(duration=2000)

    # Exportar
    print(f"💾 Exportando MP3...")
    final_audio.export(audio_file, format="mp3")
    print(f"✅ MP3 generado: {audio_file}")

    if not no_upload:
        print(f"☁️ Subiendo a Bunny CDN...")
        url = upload_to_bunny(audio_file)
        data["audio_source"] = url
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

        if os.path.exists(audio_file):
            os.remove(audio_file)
            print(f"🗑️ Limpieza: MP3 eliminado. URL: {url}")
    
    print(f"✅ Listening 3 completado!")