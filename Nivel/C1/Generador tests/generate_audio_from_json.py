"""
generate_audio_from_json.py
----------------------------
Generador alternativo de audios para listenings del examen Cambridge CAE.

NO requiere OpenAI. El usuario crea manualmente la carpeta del test con los
JSON de los listenings ya preparados, y este script se encarga de:
  1. Leer los JSON existentes (listening1.json ... listening4.json)
  2. Generar los audios con Azure TTS
  3. Combinar los audios con las grabaciones del narrador
  4. Subir el audio final a Bunny CDN
  5. Actualizar el JSON con el enlace del audio

Variables de entorno necesarias (en .env o en el sistema):
  AZURE_SPEECH_KEY   - Clave de Azure Cognitive Services Speech
  AZURE_REGION       - Región de Azure (por defecto: westeurope)
  BUNNY_API_KEY      - Clave de Bunny CDN
  BUNNY_STORAGE_ZONE - Zona de almacenamiento de Bunny (por defecto: audios-examen)
  BUNNY_PULL_ZONE    - Zona de descarga de Bunny (por defecto: listeninggenerator)
  NARRATOR_DIR       - Ruta a la carpeta con los audios pre-grabados del narrador

Uso:
    python generate_audio_from_json.py --folder Test14
    python generate_audio_from_json.py --folder "C:/ruta/a/mi/carpeta/Test14"
    python generate_audio_from_json.py --folder Test14 --parts listening1 listening2
    python generate_audio_from_json.py --folder Test14 --no-upload
    python generate_audio_from_json.py --folder MiTest --test-id 14

Estructura esperada de la carpeta:
    Test14/
        listening1.json   (Part 1: Multiple choice, 3 extracts)
        listening2.json   (Part 2: Sentence completion, monologue)
        listening3.json   (Part 3: Interview, multiple choice)
        listening4.json   (Part 4: Dual matching, 5 speakers)
"""

import argparse
import importlib
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

LISTENING_PARTS = ["listening1", "listening2", "listening3", "listening4"]


def extract_test_id(folder_path: Path):
    """Intenta extraer el número de test del nombre de la carpeta (ej: 'Test14' -> 14)."""
    match = re.search(r"(\d+)", folder_path.name)
    return int(match.group(1)) if match else None


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Generador alternativo de audio para listenings Cambridge CAE (sin OpenAI). "
            "Lee los JSONs de la carpeta indicada y genera los audios con Azure TTS."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python generate_audio_from_json.py --folder Test14
  python generate_audio_from_json.py --folder Test14 --parts listening1 listening2
  python generate_audio_from_json.py --folder Test14 --no-upload
  python generate_audio_from_json.py --folder MiTest --test-id 14
        """,
    )
    parser.add_argument(
        "--folder",
        required=True,
        help=(
            "Carpeta que contiene los JSON de listening "
            "(ej: 'Test14' o '/ruta/absoluta/al/test')"
        ),
    )
    parser.add_argument(
        "--test-id",
        type=int,
        help=(
            "ID numérico del test, usado en el nombre del archivo de audio "
            "(ej: 14 → test_14_listening1.mp3). "
            "Si no se indica, se extrae automáticamente del nombre de la carpeta."
        ),
    )
    parser.add_argument(
        "--parts",
        nargs="+",
        choices=LISTENING_PARTS,
        help=(
            "Partes específicas a procesar. "
            "Por defecto se procesan todas las que tengan JSON en la carpeta."
        ),
    )
    parser.add_argument(
        "--no-upload",
        action="store_true",
        help="No subir a Bunny CDN. El archivo MP3 se mantiene en la carpeta local.",
    )

    args = parser.parse_args()

    # --- Resolver la ruta de la carpeta ---
    folder = Path(args.folder)
    if not folder.is_absolute():
        # Relativa al directorio de trabajo actual
        folder = Path.cwd() / folder

    if not folder.exists() or not folder.is_dir():
        print(f"❌ Error: La carpeta '{folder}' no existe o no es un directorio.")
        sys.exit(1)

    # --- Determinar el test_id ---
    test_id = args.test_id
    if test_id is None:
        test_id = extract_test_id(folder)
        if test_id is None:
            print(
                f"❌ Error: No se pudo extraer el número de test del nombre de carpeta "
                f"'{folder.name}'.\n"
                f"  Usa --test-id para especificarlo manualmente."
            )
            sys.exit(1)

    # --- Determinar qué partes procesar ---
    parts_to_run = args.parts if args.parts else LISTENING_PARTS

    print(f"\n{'='*60}")
    print("🎙️  Generador Alternativo de Audio para Listenings")
    print(f"{'='*60}")
    print(f"📁 Carpeta : {folder}")
    print(f"🔢 Test ID : {test_id}")
    print(f"📋 Partes  : {', '.join(parts_to_run)}")
    print(f"☁️  Bunny   : {'No subir (--no-upload)' if args.no_upload else 'Sí'}")
    print(f"{'='*60}\n")

    processed = []
    skipped = []
    errors = []

    for part_name in parts_to_run:
        json_file = folder / f"{part_name}.json"

        if not json_file.exists():
            skipped.append(part_name)
            print(f"⏭️  Saltando {part_name.upper()}: no se encontró '{json_file.name}'")
            continue

        print(f"\n--- Procesando: {part_name.upper()} ---")
        try:
            module = importlib.import_module(f"parts.{part_name}")
            module.generate(
                test_id=test_id,
                output_path=folder,
                api_key=None,       # No se usa en modo audio_only
                json_only=False,
                audio_only=True,    # Leer JSON existente, no generar con OpenAI
                no_upload=args.no_upload,
            )
            processed.append(part_name)
            print(f"✅ {part_name.upper()} completado.")
        except Exception as e:
            errors.append((part_name, str(e)))
            print(f"💥 Error en {part_name.upper()}: {e}")

    # --- Resumen final ---
    print(f"\n{'='*60}")
    print("📊 Resumen:")
    if processed:
        print(f"  ✅ Completados : {', '.join(processed)}")
    if skipped:
        print(f"  ⏭️  Sin JSON    : {', '.join(skipped)}")
    if errors:
        for part, msg in errors:
            print(f"  ❌ {part} → {msg}")
    print(f"{'='*60}")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
