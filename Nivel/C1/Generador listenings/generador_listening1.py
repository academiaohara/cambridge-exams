import json
import os
import sys
import requests
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
import html
import time
import math
import struct
import wave
import io
import re

# ==========================
# CONFIG
# ==========================

AZURE_KEY = ""
AZURE_REGION = "westeurope"

BUNNY_STORAGE_ZONE = "audios-examen"
BUNNY_PULL_ZONE = "listeninggenerator"
BUNNY_API_KEY = ""

BUNNY_UPLOAD_URL = f"https://storage.bunnycdn.com/{BUNNY_STORAGE_ZONE}"
BUNNY_PUBLIC_URL = f"https://{BUNNY_PULL_ZONE}.b-cdn.net"

# Buscar Narrador usando variable de entorno o carpeta local
NARRATOR_DIR = os.environ.get('NARRATOR_DIR', os.path.join(os.getcwd(), "Narrador"))

INTRO = "intro_part1.mp3"
REPEAT_PROMPT = "repeat_prompt.mp3"
FINISH = "part_1_finish.mp3"

BEFORE_EXTRACT = 15000
REPEAT_GAP = 5000
AFTER_REPEAT = 5000
BETWEEN_LINES = 400

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

    print("✅ Credenciales configuradas correctamente para Parte 1")

# ==========================
# BUNNY UPLOAD
# ==========================
 
def upload_to_bunny(file_path):
    filename = os.path.basename(file_path)
    url = f"{BUNNY_UPLOAD_URL}/{filename}"
 
    headers = {
        "AccessKey": BUNNY_API_KEY,
        "Content-Type": "application/octet-stream"
    }
 
    with open(file_path, "rb") as f:
        response = requests.put(url, data=f, headers=headers)
    
    if response.status_code in [200, 201]:
        print(f"✅ Archivo subido exitosamente a Bunny")
        return f"{BUNNY_PUBLIC_URL}/{filename}"
    else:
        print(f"❌ Error al subir a Bunny: {response.status_code} - {response.text}")
        return None
 
# ==========================
# BEEP
# ==========================
 
def make_beep(duration_ms=500, freq=880, volume_db=-10):
    sample_rate = 44100
    num_samples = int(sample_rate * duration_ms / 1000)
 
    samples = []
    for n in range(num_samples):
        val = int(32767 * math.sin(2 * math.pi * freq * n / sample_rate))
        samples.append(struct.pack('<h', val))
 
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b''.join(samples))
 
    buf.seek(0)
    beep = AudioSegment.from_wav(buf) + volume_db
    return beep
 
# ==========================
# AZURE TTS
# ==========================
 
def generate_tts(text, voice, filename):
    if not speech_config:
        raise RuntimeError("Error: Credenciales no configuradas. Llama a configure_credentials primero.")

    # Limpiar el texto de marcadores como [1], [/1], etc.
    clean_text = re.sub(r'\[\/?\d+\]', '', text)
    
    # Escapar caracteres especiales XML
    clean_text = html.escape(clean_text)
    
    # Detectar idioma (ej. en-GB) desde el nombre de la voz
    lang = "-".join(voice.split("-")[:2])

    audio_config = speechsdk.audio.AudioOutputConfig(filename=filename)
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, 
        audio_config=audio_config
    )
 
    # SSML simple sin estilos complejos para evitar errores
    ssml_text = f"""
    <speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='{voice}'>
            <prosody rate='-5%'>
                {clean_text}
            </prosody>
        </voice>
    </speak>"""
 
    result = synthesizer.speak_ssml_async(ssml_text).get()
    
    # Liberar recursos
    del synthesizer
    del audio_config
    time.sleep(0.2)
 
    # VERIFICACIÓN CRÍTICA
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        if result.reason == speechsdk.ResultReason.Canceled:
            details = result.cancellation_details
            print(f"❌ Error en Azure TTS: {details.error_details}")
        raise RuntimeError(f"Azure no pudo generar el audio para: {clean_text[:30]}...")
    
    return True
 
# ==========================
# GENERAR DIALOGO
# ==========================
 
def generate_dialogue_audio(extract):
    voices_map = extract["voices"]  # Diccionario: {"man": "en-GB-RyanNeural", "woman": "en-GB-SoniaNeural"}
    dialogue = extract["dialogue"]
    
    print(f"📊 Mapeo de voces: {voices_map}")
    
    final_audio = AudioSegment.silent(duration=0)
    temp_files = []  # Lista para llevar registro de archivos temporales

    for line in dialogue:
        speaker = line["speaker"]
        text = line["text"]
        voice = voices_map.get(speaker)

        if not voice:
            # Si no hay voz específica para este speaker, usar la primera disponible
            voice = list(voices_map.values())[0]
            print(f"⚠️  Advertencia: No hay voz específica para {speaker}, usando {voice}")
        
        temp_file = f"temp_line_{int(time.time()*1000)}_{speaker}.wav"
        temp_files.append(temp_file)
        
        # Eliminar archivo previo si existe para evitar conflictos
        if os.path.exists(temp_file):
            os.remove(temp_file)
 
        generate_tts(text, voice, temp_file)
        
        # Pequeña pausa para que el sistema de archivos termine de escribir
        time.sleep(0.2)
 
        if os.path.exists(temp_file) and os.path.getsize(temp_file) > 0:
            speech = AudioSegment.from_file(temp_file)
            final_audio += speech
            final_audio += AudioSegment.silent(duration=500)  # Pausa entre frases
        else:
            print(f"⚠️ Alerta: El archivo {temp_file} no se generó correctamente.")
    
    # Limpiar archivos temporales
    for temp_file in temp_files:
        try:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        except:
            pass  # Ignorar errores de limpieza
 
    return final_audio
 
# ==========================
# BUILD LISTENING
# ==========================
 
def build_listening():
    # Verificar que las credenciales están configuradas
    if not speech_config:
        print("❌ Error: Credenciales no configuradas. Llama a configure_credentials primero.")
        return None, None, None

    # Buscar el JSON en la carpeta actual (debería ser una carpeta testX)
    json_filename = "listening1.json"
    if not os.path.exists(json_filename):
        print(f"❌ Error: No se encuentra {json_filename} en {os.getcwd()}")
        return None, None, None
    
    with open(json_filename, encoding="utf8") as f:
        data = json.load(f)

    folder_name = os.path.basename(os.getcwd())
    filename = f"listening1_{folder_name}.mp3"
    output_path = os.path.join(os.getcwd(), filename)

    print(f"🎵 Generando audio para: {folder_name}")
    print(f"📁 Usando narrador de: {NARRATOR_DIR}")
    
    # Verificar que existen los archivos de narrador
    intro_path = os.path.join(NARRATOR_DIR, INTRO)
    if not os.path.exists(intro_path):
        print(f"❌ Error: No se encuentra {intro_path}")
        return None, None, None
    
    # Cargar Intro
    print("🔄 Cargando intro...")
    final = AudioSegment.from_file(intro_path)
    beep = make_beep()
 
    for extract in data["extracts"]:
        extract_id = extract["id"]
        print(f"🔊 Generando Extracto {extract_id}...")
 
        start_file = f"extract_{extract_id}_start.mp3"
        end_file = f"extract_{extract_id}_end.mp3"
        
        start_path = os.path.join(NARRATOR_DIR, start_file)
        end_path = os.path.join(NARRATOR_DIR, end_file)
        
        if not os.path.exists(start_path):
            print(f"⚠️ Advertencia: No se encuentra {start_path}")
            continue
 
        # Narrador inicio extracto
        final += AudioSegment.from_file(start_path)
        final += AudioSegment.silent(duration=BEFORE_EXTRACT)
 
        # Primer Beep y Diálogo
        final += beep
        dialogue_audio = generate_dialogue_audio(extract)
        final += dialogue_audio
 
        # Pausa y Narrador Repetición
        final += AudioSegment.silent(duration=REPEAT_GAP)
        repeat_path = os.path.join(NARRATOR_DIR, REPEAT_PROMPT)
        if os.path.exists(repeat_path):
            final += AudioSegment.from_file(repeat_path)
        else:
            print(f"⚠️ Advertencia: No se encuentra {repeat_path}")
 
        # Segundo Beep y Diálogo
        final += beep
        final += dialogue_audio
 
        # Pausa final extracto y Narrador cierre
        final += AudioSegment.silent(duration=AFTER_REPEAT)
        if os.path.exists(end_path):
            final += AudioSegment.from_file(end_path)
        else:
            print(f"⚠️ Advertencia: No se encuentra {end_path}")
 
    # Narrador Final
    finish_path = os.path.join(NARRATOR_DIR, FINISH)
    if os.path.exists(finish_path):
        final += AudioSegment.from_file(finish_path)
    else:
        print(f"⚠️ Advertencia: No se encuentra {finish_path}")
 
    # Exportación temporal
    print(f"💾 Exportando audio temporal...")
    final.export(output_path, format="mp3")
    print(f"✅ Audio generado localmente: {output_path}")
    
    return output_path, data, json_filename

# ==========================
# MAIN
# ==========================
 
if __name__ == "__main__":
    print("="*60)
    print("🎧 GENERADOR LISTENING PARTE 1")
    print("="*60)

    # Leer credenciales desde variables de entorno
    azure_key = os.environ.get('AZURE_SPEECH_KEY', '')
    azure_region = os.environ.get('AZURE_REGION', 'westeurope')
    bunny_key = os.environ.get('BUNNY_API_KEY', '')
    bunny_storage = os.environ.get('BUNNY_STORAGE_ZONE', 'audios-examen')
    bunny_pull = os.environ.get('BUNNY_PULL_ZONE', 'listeninggenerator')

    if not azure_key or not bunny_key:
        print("❌ Error: Faltan credenciales. Configura las variables de entorno:")
        print("   AZURE_SPEECH_KEY=tu_clave_azure")
        print("   BUNNY_API_KEY=tu_clave_bunny")
        sys.exit(1)

    configure_credentials(azure_key, azure_region, bunny_key, bunny_storage, bunny_pull)

    # Generar el audio
    output_path, data, json_filename = build_listening()

    if output_path and data:
        # Subida a Bunny
        print("\n📤 Subiendo a BunnyCDN...")
        bunny_url = upload_to_bunny(output_path)

        if bunny_url:
            print(f"🔗 URL en Bunny: {bunny_url}")

            # Actualizar JSON
            data["audio_source"] = bunny_url
            with open(json_filename, "w", encoding="utf8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"📝 JSON actualizado: {json_filename}")

            # Borrar archivo MP3 local
            try:
                os.remove(output_path)
                print(f"🗑️ Archivo MP3 local eliminado: {os.path.basename(output_path)}")
            except Exception as e:
                print(f"⚠️ No se pudo eliminar el archivo local: {e}")

            print("\n✨ Proceso completado exitosamente!")
        else:
            print("\n❌ Error en la subida a Bunny. El archivo MP3 se mantiene local.")
            sys.exit(1)
    else:
        print("\n❌ Error en la generación del audio.")
        sys.exit(1)