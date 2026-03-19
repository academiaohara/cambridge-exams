import os
import json
import html
import time
import re
import requests
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
import math
import struct
import wave
import io

# =================================================
# CONFIG - Estos valores se inyectarán desde el script global
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

# Archivos de audio del narrador
INTRO = "intro_part3.mp3"
READING_TIME_VOICE = "reading_time_p3.mp3"
REPEAT_PROMPT = "repeat_prompt_p3.mp3"
FINISH = "part_3_finish.mp3"

# Tiempos estándar Cambridge
BEFORE_EXTRACT = 70000  # 70 segundos para leer preguntas en Parte 3
REPEAT_GAP = 5000
AFTER_REPEAT = 5000
BETWEEN_LINES = 600     # Pausa natural entre interlocutores (ms)

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
    
    print("✅ Credenciales configuradas correctamente para Parte 3")

# ==========================
# UTILIDADES (BEEP & BUNNY)
# ==========================

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

# ==========================
# GENERAR DIÁLOGO MULTI-VOZ
# ==========================

def generate_tts_line(text, voice):
    # Verificar que las credenciales están configuradas
    if not speech_config:
        raise RuntimeError("Error: Credenciales no configuradas. Llama a configure_credentials primero.")
    
    clean_text = re.sub(r'\[/?\d+\]', '', text)
    clean_text = html.escape(clean_text)
    lang = "-".join(voice.split("-")[:2])
    
    temp_filename = f"temp_line_{int(time.time()*1000)}_{hash(text)%10000}.wav"
    audio_config = speechsdk.audio.AudioOutputConfig(filename=temp_filename)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

    ssml_text = f"""
    <speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='{voice}'>
            <prosody rate='-3%'> {clean_text} </prosody>
        </voice>
    </speak>"""

    result = synthesizer.speak_ssml_async(ssml_text).get()
    
    # Liberar recursos
    del synthesizer
    del audio_config
    
    # Pequeño margen para que Windows libere el lock del archivo
    time.sleep(0.2) 

    if os.path.exists(temp_filename):
        line_audio = AudioSegment.from_file(temp_filename)
        
        # Intentar eliminar el archivo temporal
        try:
            os.remove(temp_filename)
        except PermissionError:
            time.sleep(0.5)
            try:
                os.remove(temp_filename)
            except:
                pass  # Ignorar si no se puede eliminar
            
        return line_audio
    else:
        raise FileNotFoundError(f"Azure no generó el archivo {temp_filename}")

def build_full_interview(extract):
    """Ensambla todas las líneas del diálogo con sus respectivas voces."""
    combined_interview = AudioSegment.empty()
    voices_map = extract["voices"]  # Diccionario: {"interviewer": "voz1", "simon": "voz2"...}

    for entry in extract["dialogue"]:
        speaker_role = entry["speaker"]
        text = entry["text"]
        voice_to_use = voices_map.get(speaker_role)

        if not voice_to_use:
            print(f"⚠️  Advertencia: No se encontró voz para {speaker_role}, usando la primera disponible")
            voice_to_use = list(voices_map.values())[0]

        print(f"   Generando línea de: {speaker_role}")
        line_audio = generate_tts_line(text, voice_to_use)
        
        combined_interview += line_audio
        combined_interview += AudioSegment.silent(duration=BETWEEN_LINES)
    
    return combined_interview

# ==========================
# MAIN BUILDER PARTE 3
# ==========================

def build_listening():
    # Verificar que las credenciales están configuradas
    if not speech_config:
        print("❌ Error: Credenciales no configuradas. Llama a configure_credentials primero.")
        return None, None, None
    
    # Buscar el JSON en la carpeta actual
    json_path = "listening3.json" 
    if not os.path.exists(json_path):
        print(f"❌ Error: No se encuentra {json_path} en {os.getcwd()}")
        return None, None, None

    with open(json_path, encoding="utf8") as f:
        data = json.load(f)

    folder_name = os.path.basename(os.getcwd())
    output_filename = f"listening3_{folder_name}.mp3"
    output_path = os.path.join(os.getcwd(), output_filename)

    print(f"\n🎵 Generando Listening Parte 3 para: {folder_name}")
    print(f"📁 Usando narrador de: {NARRATOR_DIR}")
    
    # Verificar que existen los archivos de narrador
    intro_path = os.path.join(NARRATOR_DIR, INTRO)
    if not os.path.exists(intro_path):
        print(f"❌ Error: No se encuentra {intro_path}")
        return None, None, None
    
    # 1. Intro General
    print("🔄 Cargando intro...")
    final_audio = AudioSegment.from_file(intro_path)
    beep = make_beep()

    for extract in data["extracts"]:
        # 2. Locución: "Ahora tienes 70 segundos..."
        print("🎤 Locución: Tiempo de lectura...")
        reading_path = os.path.join(NARRATOR_DIR, READING_TIME_VOICE)
        if os.path.exists(reading_path):
            final_audio += AudioSegment.from_file(reading_path)
        else:
            print(f"⚠️  Advertencia: No se encuentra {reading_path}")
        
        # 3. Silencio de 70 segundos
        print(f"⏸️  Insertando {BEFORE_EXTRACT//1000}s de silencio...")
        final_audio += AudioSegment.silent(duration=BEFORE_EXTRACT)
        
        # 4. Preparar entrevista
        print("🔊 Sintetizando diálogo...")
        full_interview = build_full_interview(extract)
        
        # 5. Primera pasada
        final_audio += beep
        final_audio += full_interview
        
        # 6. Pausa y "Now listen again"
        final_audio += AudioSegment.silent(duration=REPEAT_GAP)
        repeat_path = os.path.join(NARRATOR_DIR, REPEAT_PROMPT)
        if os.path.exists(repeat_path):
            final_audio += AudioSegment.from_file(repeat_path)
        else:
            print(f"⚠️  Advertencia: No se encuentra {repeat_path}")
        
        # 7. Segunda pasada
        final_audio += beep
        final_audio += full_interview
        
        # 8. Pausa tras repetición
        final_audio += AudioSegment.silent(duration=AFTER_REPEAT)

    # 9. Cierre
    finish_path = os.path.join(NARRATOR_DIR, FINISH)
    if os.path.exists(finish_path):
        final_audio += AudioSegment.from_file(finish_path)
    else:
        print(f"⚠️  Advertencia: No se encuentra {finish_path}")

    # Exportar local
    print(f"💾 Exportando audio temporal...")
    final_audio.export(output_path, format="mp3")
    print(f"✅ Audio generado localmente: {output_path}")
    
    return output_path, data, json_path

# ==========================
# MAIN
# ==========================

if __name__ == "__main__":
    print("="*60)
    print("🎧 GENERADOR LISTENING PARTE 3")
    print("="*60)
    print("⚠️  Este script está diseñado para ser llamado desde generador_global.py")
    print("⚠️  Las credenciales deben configurarse mediante configure_credentials()")
    
    # Ejemplo de uso si se ejecuta directamente (para pruebas)
    if not AZURE_KEY:
        print("\n🔧 Modo de prueba - Configura credenciales manualmente:")
        # Aquí puedes poner credenciales de prueba si lo ejecutas directamente
        # configure_credentials("tu_key", "westeurope", "tu_bunny_key", "audios-examen", "listeninggenerator")