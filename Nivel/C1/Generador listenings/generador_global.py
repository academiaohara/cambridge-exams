import os
import sys
import subprocess
import argparse
from pathlib import Path

def get_test_folders(base_path, start, end):
    """
    Obtiene las carpetas de test en el rango especificado
    """
    test_folders = []
    for i in range(start, end + 1):
        folder_name = f"test{i}"
        folder_path = os.path.join(base_path, folder_name)
        if os.path.exists(folder_path) and os.path.isdir(folder_path):
            test_folders.append(folder_path)
        else:
            print(f"⚠️  Advertencia: No se encuentra la carpeta {folder_path}")
    return test_folders

def run_generator(test_folder, generator_script, part_num, global_script_dir, narrator_dir):
    """
    Ejecuta un generador específico en la carpeta del test
    """
    print(f"\n{'='*60}")
    print(f"📁 Test: {os.path.basename(test_folder)} - Parte {part_num}")
    print(f"{'='*60}")
    
    # Cambiar al directorio del test
    original_dir = os.getcwd()
    os.chdir(test_folder)
    
    try:
        # Verificar que existe el JSON correspondiente
        json_file = f"listening{part_num}.json"
        if not os.path.exists(json_file):
            print(f"❌ Error: No se encuentra {json_file} en {test_folder}")
            return False
        
        # Modificar temporalmente el script del generador para que apunte al Narrador correcto
        # pero ejecutamos el script original desde su ubicación
        script_path = os.path.join(global_script_dir, generator_script)
        
        print(f"🚀 Ejecutando: {generator_script}")
        print(f"📄 Usando: {json_file}")
        print(f"🎤 Narrador: {narrator_dir}")
        
        # Establecer variable de entorno para que los generadores puedan encontrar el Narrador
        env = os.environ.copy()
        env['NARRATOR_DIR'] = narrator_dir
        
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            cwd=test_folder,
            env=env
        )
        
        # Mostrar output
        if result.stdout:
            print("📝 Output:")
            for line in result.stdout.split('\n'):
                if line.strip():
                    print(f"   {line}")
        
        if result.stderr:
            print("⚠️  Errores/Advertencias:")
            for line in result.stderr.split('\n'):
                if line.strip():
                    print(f"   {line}")
        
        if result.returncode == 0:
            print(f"✅ Parte {part_num} completada exitosamente")
            return True
        else:
            print(f"❌ Parte {part_num} falló con código: {result.returncode}")
            return False
            
    except Exception as e:
        print(f"❌ Error ejecutando parte {part_num}: {str(e)}")
        return False
    finally:
        # Volver al directorio original
        os.chdir(original_dir)

def main():
    # Configurar argumentos de línea de comandos
    parser = argparse.ArgumentParser(
        description='Generador automático de listening tests (Partes 1-4)'
    )
    parser.add_argument(
        'start',
        type=int,
        help='Número de test inicial (ej: 1)'
    )
    parser.add_argument(
        'end',
        type=int,
        help='Número de test final (ej: 10)'
    )
    parser.add_argument(
        '--parts',
        type=str,
        default='1,2,3,4',
        help='Partes a generar separadas por comas (ej: 1,2,3,4). Por defecto: todas'
    )
    parser.add_argument(
        '--path',
        type=str,
        default='.',
        help='Ruta base donde están las carpetas test[numero] y Narrador. Por defecto: directorio actual'
    )
    
    args = parser.parse_args()
    
    # Obtener directorio base
    base_path = os.path.abspath(args.path)
    
    # Verificar que existe la carpeta Narrador
    narrator_dir = os.path.join(base_path, "Narrador")
    if not os.path.exists(narrator_dir) or not os.path.isdir(narrator_dir):
        print(f"❌ Error: No se encuentra la carpeta Narrador en {narrator_dir}")
        print("   Asegúrate de que existe la subcarpeta 'Narrador' con los archivos de audio")
        return
    
    # Directorio donde están los scripts generadores (donde está este script)
    global_script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Parsear qué partes generar
    parts_to_generate = [p.strip() for p in args.parts.split(',')]
    
    # Validar partes
    valid_parts = ['1', '2', '3', '4']
    for part in parts_to_generate:
        if part not in valid_parts:
            print(f"❌ Error: Parte {part} no válida. Las partes válidas son: 1,2,3,4")
            return
    
    # Mapeo de scripts (todos en el mismo directorio que este script)
    generator_scripts = {
        '1': 'generador_listening1.py',
        '2': 'generador_listening2.py',
        '3': 'generador_listening3.py',
        '4': 'generador_listening4.py'
    }
    
    # Verificar que existen los scripts en el directorio global
    missing_scripts = []
    for part in parts_to_generate:
        script_path = os.path.join(global_script_dir, generator_scripts[part])
        if not os.path.exists(script_path):
            missing_scripts.append(generator_scripts[part])
    
    if missing_scripts:
        print(f"❌ Error: No se encuentran los siguientes scripts en {global_script_dir}:")
        for script in missing_scripts:
            print(f"   - {script}")
        return
    
    # Obtener carpetas de test
    test_folders = get_test_folders(base_path, args.start, args.end)
    
    if not test_folders:
        print(f"❌ No se encontraron carpetas de test en el rango {args.start}-{args.end}")
        print(f"   Buscando en: {base_path}")
        return
    
    print(f"\n{'='*60}")
    print(f"🚀 INICIANDO GENERACIÓN MASIVA DE LISTENINGS")
    print(f"{'='*60}")
    print(f"📊 Rango de tests: {args.start} - {args.end}")
    print(f"📋 Partes a generar: {', '.join(parts_to_generate)}")
    print(f"📁 Carpeta base: {base_path}")
    print(f"🎤 Carpeta Narrador: {narrator_dir}")
    print(f"📁 Scripts generadores: {global_script_dir}")
    print(f"🎯 Tests encontrados: {len(test_folders)}")
    print(f"{'='*60}\n")
    
    # Estadísticas
    total_tests = len(test_folders)
    total_parts = len(parts_to_generate)
    completed = 0
    failed = []
    
    # Procesar cada test
    for i, test_folder in enumerate(test_folders, 1):
        test_name = os.path.basename(test_folder)
        print(f"\n📌 Procesando test {i}/{total_tests}: {test_name}")
        print("-" * 40)
        
        test_success = True
        
        # Ejecutar cada parte en orden
        for part_num in parts_to_generate:
            script_name = generator_scripts[part_num]
            success = run_generator(
                test_folder, 
                script_name, 
                part_num,
                global_script_dir,
                narrator_dir
            )
            
            if not success:
                test_success = False
                failed.append(f"{test_name} - Parte {part_num}")
                
                # Preguntar si continuar con las siguientes partes del mismo test
                if part_num != parts_to_generate[-1]:
                    response = input(f"\n❓ ¿Continuar con las siguientes partes de {test_name}? (s/n): ").lower()
                    if response != 's':
                        print(f"⏹️  Saltando resto de partes de {test_name}")
                        break
        
        if test_success:
            completed += 1
            print(f"\n✅ Test {test_name} completado exitosamente!")
        
        # Preguntar si continuar con el siguiente test (si no es el último)
        if i < total_tests:
            response = input(f"\n❓ ¿Continuar con el siguiente test? (s/n): ").lower()
            if response != 's':
                print("⏹️  Generación detenida por el usuario")
                break
    
    # Resumen final
    print(f"\n{'='*60}")
    print("📊 RESUMEN FINAL")
    print(f"{'='*60}")
    print(f"✅ Tests completados exitosamente: {completed}/{i}")  # i es el número real procesado
    if failed:
        print(f"❌ Tests/Partes con errores: {len(failed)}")
        for fail in failed:
            print(f"   - {fail}")
    print(f"{'='*60}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Generación interrumpida por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)