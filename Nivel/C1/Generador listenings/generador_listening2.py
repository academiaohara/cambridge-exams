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


# Buscar Narrador en la carpeta actual (donde se ejecuta el script)
NARRATOR_DIR = os.environ.get('NARRATOR_DIR', os.path.join(os.getcwd(), "Narrador"))

INTRO = "intro_part2.mp3"
REPEAT_PROMPT = "repeat_prompt_p2.mp3"
FINISH = "part_2_finish.mp3"

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
    
    print("✅ Credenciales configuradas correctamente")

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
# BEEP GENERATOR
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
# AZURE TTS SIMPLIFICADO
# ==========================

def generate_tts_clean(text, voice, filename):
    # 1. Limpiar marcas de examen [7], [/7] del audio
    clean_text = re.sub(r'\[/?\d+\]', '', text)
    
    # 2. Escapar caracteres XML (evita error en R&D)
    clean_text = html.escape(clean_text)

    # 3. Detectar idioma
    lang = "-".join(voice.split("-")[:2])

    audio_config = speechsdk.audio.AudioOutputConfig(filename=filename)
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, 
        audio_config=audio_config
    )

    # SSML lineal sin estilos complejos
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

    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        if result.reason == speechsdk.ResultReason.Canceled:
            print(f"Error Azure: {result.cancellation_details.error_details}")
        raise RuntimeError("Fallo en la síntesis de Azure")
    
    return True

# ==========================
# GENERAR MONÓLOGO
# ==========================

def generate_monologue_audio(extract):
    # Obtenemos la primera voz disponible en el JSON
    voice_name = list(extract["voices"].values())[0]
    # En la Parte 2 el texto suele estar en el primer elemento del diálogo
    text_content = extract["dialogue"][0]["text"]

    temp_file = f"temp_monologue_{int(time.time()*1000)}.wav"
    if os.path.exists(temp_file):
        os.remove(temp_file)

    generate_tts_clean(text_content, voice_name, temp_file)
    
    # Pausa de seguridad para el sistema de archivos
    time.sleep(0.5)

    if os.path.exists(temp_file) and os.path.getsize(temp_file) > 0:
        speech = AudioSegment.from_file(temp_file)
        try:
            os.remove(temp_file)
        except:
            pass  # Ignorar errores de limpieza
        return speech
    else:
        raise FileNotFoundError("El audio temporal no se generó correctamente.")

# ==========================
# BUILD LISTENING PART 2
# ==========================

def build_listening():
    # Verificar que las credenciales están configuradas
    if not speech_config:
        print("❌ Error: Credenciales no configuradas. Llama a configure_credentials primero.")
        return None, None, None
    
    # Buscar el JSON en la carpeta actual
    json_path = "listening2.json"
    if not os.path.exists(json_path):
        print(f"❌ Error: No se encuentra {json_path} en {os.getcwd()}")
        return None, None, None
    
    with open(json_path, encoding="utf8") as f:
        data = json.load(f)

    folder_name = os.path.basename(os.getcwd())
    output_filename = f"listening2_{folder_name}.mp3"
    output_path = os.path.join(os.getcwd(), output_filename)

    print(f"🎵 Generando audio para: {folder_name}")
    print(f"📁 Usando narrador de: {NARRATOR_DIR}")
    
    # Verificar que existen los archivos de narrador
    intro_path = os.path.join(NARRATOR_DIR, INTRO)
    if not os.path.exists(intro_path):
        print(f"❌ Error: No se encuentra {intro_path}")
        return None, None, None

    # Iniciar audio final con Intro
    print("🔄 Iniciando generación de audio...")
    final_audio = AudioSegment.from_file(intro_path)
    beep = make_beep()

    # Procesar extracto (Normalmente solo 1 en Part 2)
    for extract in data["extracts"]:
        print(f"Procesando monólogo de {list(extract['voices'].keys())[0]}...")
        
        # Tiempo para leer
        final_audio += AudioSegment.silent(duration=BEFORE_EXTRACT)
        
        # Primera vez
        final_audio += beep
        monologue = generate_monologue_audio(extract)
        final_audio += monologue
        
        # Pausa y Repetición
        final_audio += AudioSegment.silent(duration=REPEAT_GAP)
        repeat_path = os.path.join(NARRATOR_DIR, REPEAT_PROMPT)
        if os.path.exists(repeat_path):
            final_audio += AudioSegment.from_file(repeat_path)
        else:
            print(f"⚠️  Advertencia: No se encuentra {repeat_path}")
        final_audio += beep
        final_audio += monologue
        
        # Pausa tras repetir
        final_audio += AudioSegment.silent(duration=AFTER_REPEAT)

    # Cierre del examen
    finish_path = os.path.join(NARRATOR_DIR, FINISH)
    if os.path.exists(finish_path):
        final_audio += AudioSegment.from_file(finish_path)
    else:
        print(f"⚠️  Advertencia: No se encuentra {finish_path}")

    # Exportación
    print(f"💾 Exportando audio temporal...")
    final_audio.export(output_path, format="mp3")
    print(f"✅ Audio generado localmente: {output_path}")
    
    return output_path, data, json_path

# ==========================
# MAIN
# ==========================
 
if __name__ == "__main__":
    print("="*60)
    print("🎧 GENERADOR LISTENING PARTE 2")
    print("="*60)
    print("⚠️  Este script está diseñado para ser llamado desde generador_global.py")
    print("⚠️  Las credenciales deben configurarse mediante configure_credentials()")
    
    # Ejemplo de uso si se ejecuta directamente (para pruebas)
    if not AZURE_KEY:
        print("\n🔧 Modo de prueba - Configura credenciales manualmente:")
        # Aquí puedes poner credenciales de prueba si lo ejecutas directamente
        # configure_credentials("tu_key", "westeurope", "tu_bunny_key", "audios-examen", "listeninggenerator")