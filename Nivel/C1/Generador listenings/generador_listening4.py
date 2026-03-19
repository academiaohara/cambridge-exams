import os
import json
import html
import time
import re
import requests
import math
import struct
import wave
import io
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment

# =================================================
# 1. CONFIGURACIÓN - Estos valores se inyectarán desde el script global
# =================================================

AZURE_KEY = ""
AZURE_REGION = "westeurope"

BUNNY_STORAGE_ZONE = "audios-examen"
BUNNY_PULL_ZONE = "listeninggenerator"
BUNNY_API_KEY = ""

BUNNY_UPLOAD_URL = f"https://storage.bunnycdn.com/{BUNNY_STORAGE_ZONE}"
BUNNY_PUBLIC_URL = f"https://{BUNNY_PULL_ZONE}.b-cdn.net"

# Buscar Narrador en la carpeta actual
NARRATOR_DIR = os.environ.get('NARRATOR_DIR', os.path.join(os.getcwd(), "Narrador"))

# Nombres de archivos del narrador
INTRO = "intro_part4.mp3"
READING_TIME_VOICE = "reading_time_p4.mp3"
REPEAT_PROMPT = "repeat_prompt_p4.mp3"
FINISH = "part_4_finish.mp3"

# Tiempos estándar
BEFORE_EXTRACT = 45000  # 45 segundos para leer tareas
REPEAT_GAP = 5000       # Pausa antes de "Now listen again"
AFTER_REPEAT = 5000     # Pausa antes del cierre
BETWEEN_SPEAKERS = 1200 # Silencio entre cada Speaker

speech_config = None

# ==========================
# FUNCIÓN PARA CONFIGURAR CREDENCIALES
# ==========================

def configure_credentials(azure_key, azure_region, bunny_api_key, bunny_storage_zone, bunny_pull_zone):
    """Configura las credenciales desde el script global"""
    global AZURE_KEY, AZURE_REGION, BUNNY_API_KEY, BUNNY_STORAGE_ZONE, BUNNY_PULL_ZONE
    global BUNNY_UPLOAD_URL, BUNNY_PUBLIC_URL, speech_config
    
    AZURE_KEY = azure_key
    AZURE_REGION = azure_region
    BUNNY_API_KEY = bunny_api_key
    BUNNY_STORAGE_ZONE = bunny_storage_zone
    BUNNY_PULL_ZONE = bunny_pull_zone
    
    BUNNY_UPLOAD_URL = f"https://storage.bunnycdn.com/{BUNNY_STORAGE_ZONE}"
    BUNNY_PUBLIC_URL = f"https://{BUNNY_PULL_ZONE}.b-cdn.net"
    
    speech_config = speechsdk.SpeechConfig(
        subscription=AZURE_KEY,
        region=AZURE_REGION
    )
    
    print("✅ Credenciales configuradas correctamente para Parte 4")

# ==========================
# 2. FUNCIONES DE APOYO (BEEP & BUNNY)
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

def upload_to_bunny(file_path):
    filename = os.path.basename(file_path)
    url = f"{BUNNY_UPLOAD_URL}/{filename}"
    headers = {"AccessKey": BUNNY_API_KEY, "Content-Type": "application/octet-stream"}
    
    with open(file_path, "rb") as f:
        response = requests.put(url, data=f, headers=headers)
    
    if response.status_code in [200, 201]:
        print(f"✅ Archivo subido exitosamente a Bunny")
        return f"{BUNNY_PUBLIC_URL}/{filename}"
    else:
        print(f"❌ Error al subir a Bunny: {response.status_code} - {response.text}")
        return None

# ==========================
# 3. GENERADOR TTS (MULTI-VOZ)
# ==========================

def generate_tts_line(text, voice):
    # Verificar que las credenciales están configuradas
    if not speech_config:
        raise RuntimeError("Error: Credenciales no configuradas. Llama a configure_credentials primero.")
    
    # Limpiar marcas [21] [/21]
    clean_text = re.sub(r'\[/?\d+\]', '', text)
    clean_text = html.escape(clean_text)
    lang = "-".join(voice.split("-")[:2])
    
    temp_filename = f"temp_p4_{int(time.time()*1000)}_{hash(text)%10000}.wav"
    audio_config = speechsdk.audio.AudioOutputConfig(filename=temp_filename)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    ssml_text = f"""
    <speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='{voice}'>
            <prosody rate='-2%'> {clean_text} </prosody>
        </voice>
    </speak>"""

    synthesizer.speak_ssml_async(ssml_text).get()
    
    # Liberar recursos
    del synthesizer
    del audio_config
    time.sleep(0.2) 

    if os.path.exists(temp_filename):
        line_audio = AudioSegment.from_file(temp_filename)
        try:
            os.remove(temp_filename)
        except:
            time.sleep(0.5)
            try:
                os.remove(temp_filename)
            except:
                pass  # Ignorar si no se puede eliminar
        return line_audio
    else:
        raise FileNotFoundError(f"Error: No se generó {temp_filename}")

# ==========================
# 4. CONSTRUICTOR PRINCIPAL PARTE 4
# ==========================

def build_listening():
    # Verificar que las credenciales están configuradas
    if not speech_config:
        print("❌ Error: Credenciales no configuradas. Llama a configure_credentials primero.")
        return None, None, None
    
    json_path = "listening4.json"
    if not os.path.exists(json_path):
        print(f"❌ Error: No se encuentra {json_path} en {os.getcwd()}")
        return None, None, None

    with open(json_path, encoding="utf8") as f:
        data = json.load(f)

    folder_name = os.path.basename(os.getcwd())
    output_filename = f"listening4_{folder_name}.mp3"
    output_path = os.path.join(os.getcwd(), output_filename)

    print(f"\n🎵 Generando Listening Parte 4 para: {folder_name}")
    print(f"📁 Usando narrador de: {NARRATOR_DIR}")
    
    # Verificar archivos de narrador
    intro_path = os.path.join(NARRATOR_DIR, INTRO)
    if not os.path.exists(intro_path):
        print(f"❌ Error: No se encuentra {intro_path}")
        return None, None, None
    
    # A. Intro y Locución de lectura
    print("🔄 Cargando intro...")
    final_audio = AudioSegment.from_file(intro_path)
    
    reading_path = os.path.join(NARRATOR_DIR, READING_TIME_VOICE)
    if os.path.exists(reading_path):
        final_audio += AudioSegment.from_file(reading_path)
    else:
        print(f"⚠️  Advertencia: No se encuentra {reading_path}")
    
    print(f"⏸️  Insertando {BEFORE_EXTRACT//1000}s de silencio para lectura...")
    final_audio += AudioSegment.silent(duration=BEFORE_EXTRACT)

    # B. Procesar los Speakers del audio_script
    script_completo = data["content"]["audio_script"]
    speakers_texts = script_completo.split("||")
    voices_dict = data["content"]["voices"]
    
    print("🔊 Sintetizando testimonios de los Speakers...")
    all_speakers_audio = AudioSegment.empty()
    temp_files = []  # Para llevar registro
    
    for i, full_text in enumerate(speakers_texts):
        full_text = full_text.strip()
        # Buscar etiqueta "Speaker X"
        match = re.search(r'^(Speaker \d+):', full_text)
        if match:
            speaker_label = match.group(1)
            # Limpiar el prefijo "Speaker X:"
            text_to_speak = re.sub(r'^Speaker \d+:\s*', '', full_text)
            # Obtener voz del JSON
            voice_name = voices_dict.get(speaker_label)
            
            if voice_name:
                print(f"   -> Generando {speaker_label}")
                speaker_audio = generate_tts_line(text_to_speak, voice_name)
                all_speakers_audio += speaker_audio
                all_speakers_audio += AudioSegment.silent(duration=BETWEEN_SPEAKERS)
            else:
                print(f"⚠️  Advertencia: No se encontró voz para {speaker_label}")

    # C. Montaje Final (Doble pasada)
    beep = make_beep()
    
    # Pasada 1
    final_audio += beep
    final_audio += all_speakers_audio
    
    # Pausa + Now Listen Again
    final_audio += AudioSegment.silent(duration=REPEAT_GAP)
    repeat_path = os.path.join(NARRATOR_DIR, REPEAT_PROMPT)
    if os.path.exists(repeat_path):
        final_audio += AudioSegment.from_file(repeat_path)
    else:
        print(f"⚠️  Advertencia: No se encuentra {repeat_path}")
    
    # Pasada 2
    final_audio += beep
    final_audio += all_speakers_audio
    
    # D. Cierre del examen
    final_audio += AudioSegment.silent(duration=AFTER_REPEAT)
    finish_path = os.path.join(NARRATOR_DIR, FINISH)
    if os.path.exists(finish_path):
        final_audio += AudioSegment.from_file(finish_path)
    else:
        print(f"⚠️  Advertencia: No se encuentra {finish_path}")

    # E. Exportación
    print(f"💾 Exportando audio temporal...")
    final_audio.export(output_path, format="mp3")
    print(f"✅ Audio generado localmente: {output_path}")
    
    return output_path, data, json_path

# ==========================
# MAIN
# ==========================

if __name__ == "__main__":
    print("="*60)
    print("🎧 GENERADOR LISTENING PARTE 4")
    print("="*60)
    print("⚠️  Este script está diseñado para ser llamado desde generador_global.py")
    print("⚠️  Las credenciales deben configurarse mediante configure_credentials()")
    
    # Ejemplo de uso si se ejecuta directamente (para pruebas)
    if not AZURE_KEY:
        print("\n🔧 Modo de prueba - Configura credenciales manualmente:")
        # Aquí puedes poner credenciales de prueba si lo ejecutas directamente
        # configure_credentials("tu_key", "westeurope", "tu_bunny_key", "audios-examen", "listeninggenerator")