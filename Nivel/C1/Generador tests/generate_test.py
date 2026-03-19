import argparse
import os
import importlib
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DEFAULT_ORDER = [
    *[f"reading{i}" for i in range(1, 9)],
    *[f"writing{i}" for i in range(1, 3)],
    *[f"listening{i}" for i in range(1, 5)],
    *[f"speaking{i}" for i in range(1, 5)]
]

def get_next_test_number():
    """Busca en el directorio actual carpetas tipo 'TestX' y devuelve el siguiente X."""
    folders = [d for d in os.listdir('.') if os.path.isdir(d) and d.startswith('Test')]
    test_numbers = []
    for f in folders:
        match = re.search(r"Test(\d+)", f)
        if match:
            test_numbers.append(int(match.group(1)))
    
    return max(test_numbers) + 1 if test_numbers else 1

def main():
    parser = argparse.ArgumentParser(description="Cambridge Test Generator")
    parser.add_argument("--test-number", type=int, help="Número de test específico")
    parser.add_argument("--parts", nargs='+', help="Partes a generar")
    parser.add_argument("--json-only", action="store_true")
    parser.add_argument("--audio-only", action="store_true")
    parser.add_argument("--no-upload", action="store_true")

    args = parser.parse_args()

    # 1. Determinar número de test y crear carpeta
    test_id = args.test_number if args.test_number else get_next_test_number()
    test_folder = Path(f"Test{test_id}")
    test_folder.mkdir(parents=True, exist_ok=True)
    
    parts_to_run = args.parts if args.parts else DEFAULT_ORDER

    print(f"🚀 Generando TEST {test_id} en la carpeta: {test_folder}/")

    for part_name in parts_to_run:
        try:
            module = importlib.import_module(f"parts.{part_name}")
            print(f"\n--- Ejecutando: {part_name.upper()} ---")
            
            # Pasamos la ruta de la carpeta del test al módulo
            module.generate(
                test_id=test_id,
                output_path=test_folder,
                api_key=os.getenv("OPENAI_API_KEY"),
                json_only=args.json_only,
                audio_only=args.audio_only,
                no_upload=args.no_upload
            )
        except ModuleNotFoundError:
            print(f"❌ Error: El archivo 'parts/{part_name}.py' no existe.")
        except Exception as e:
            print(f"💥 Error en {part_name}: {str(e)}")

if __name__ == "__main__":
    main()