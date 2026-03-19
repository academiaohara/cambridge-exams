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

def generate_single_test(test_id, parts, args):
    """Genera un test individual"""
    test_folder = Path(f"Test{test_id}")
    test_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"\n{'='*50}")
    print(f"🚀 Generando TEST {test_id} en: {test_folder}/")
    print(f"{'='*50}")
    
    for part_name in parts:
        try:
            module = importlib.import_module(f"parts.{part_name}")
            print(f"\n--- Ejecutando: {part_name.upper()} ---")
            
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

def main():
    parser = argparse.ArgumentParser(description="Cambridge Test Generator")
    
    # Argumentos para tests específicos
    parser.add_argument("--test-number", type=int, help="Número de test específico")
    parser.add_argument("--test-range", nargs=2, type=int, metavar=('START', 'END'), 
                       help="Rango de tests: --test-range 1 5 (genera tests 1,2,3,4,5)")
    parser.add_argument("--test-list", nargs='+', type=int, 
                       help="Lista de tests: --test-list 1 3 5 7")
    parser.add_argument("--count", type=int, 
                       help="Número de tests a generar (empezando desde el siguiente disponible)")
    
    # Argumentos para partes
    parser.add_argument("--parts", nargs='+', help="Partes a generar")
    parser.add_argument("--json-only", action="store_true")
    parser.add_argument("--audio-only", action="store_true")
    parser.add_argument("--no-upload", action="store_true")
    
    # Argumento para delay entre tests (evitar rate limiting)
    parser.add_argument("--delay", type=int, default=5, 
                       help="Segundos de espera entre tests (default: 5)")

    args = parser.parse_args()
    
    parts_to_run = args.parts if args.parts else DEFAULT_ORDER
    
    # Determinar qué tests generar
    test_ids = []
    
    if args.test_number:
        test_ids = [args.test_number]
    elif args.test_range:
        start, end = args.test_range
        test_ids = list(range(start, end + 1))
    elif args.test_list:
        test_ids = args.test_list
    elif args.count:
        next_test = get_next_test_number()
        test_ids = list(range(next_test, next_test + args.count))
        print(f"📊 Generando {args.count} tests desde Test{next_test} hasta Test{next_test + args.count - 1}")
    else:
        # Si no se especifica nada, generar el siguiente test
        test_ids = [get_next_test_number()]
    
    # Generar cada test
    for i, test_id in enumerate(test_ids):
        if i > 0 and args.delay > 0:
            print(f"\n⏱️  Esperando {args.delay} segundos antes del siguiente test...")
            import time
            time.sleep(args.delay)
        
        generate_single_test(test_id, parts_to_run, args)
    
    print(f"\n{'='*50}")
    print(f"✅ Proceso completado. Se generaron {len(test_ids)} tests.")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()