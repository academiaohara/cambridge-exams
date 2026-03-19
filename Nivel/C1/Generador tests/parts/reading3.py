import json
import os
from pathlib import Path
from openai import OpenAI

# ==========================
# UTILIDADES
# ==========================

def count_words(text):
    """Cuenta las palabras de un texto ignorando marcadores de examen."""
    import re
    clean = re.sub(r'\[/?[\d\w]+\]', ' ', text)
    return len(clean.split())

# ==========================
# GENERACIÓN DE CONTENIDO (AI)
# ==========================

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    
    # Aplicando tus CONTENT RULES y SCHEMA para Part 3
    prompt = f"""Generate reading3.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-3",
      "examId": "Test{test_id}",
      "section": "use-of-english",
      "part": 3,
      "type": "word-formation",
      "title": "Reading and Use of English – Part 3",
      "description": "For questions 17–24, read the text below. Use the word given in CAPITALS at the end of some of the lines to form a word that fits in the gap in the same line.",
      "time": "10",
      "totalQuestions": 8,
      "content": {{
        "articleTitle": "Short headline",
        "text": "Continuous passage. MANDATORY: exactly 150 words. Mark gaps as (0), (17)–(24) inline with NO underscores. After each gap line, append the base word in CAPITALS in parentheses, e.g. '(17) TEND'. Use || for paragraph breaks.",
        "example": {{
            "text": "First sentence with (0) gap.", 
            "correct": "TRADITIONALLY", 
            "word": "TRADITION", 
            "explanation": "Adverb required to modify the main verb; TRADITION → TRADITIONALLY."
        }},
        "questions": [
          {{
            "number": 17, 
            "word": "BASE_WORD", 
            "correct": "TRANSFORMED_WORD", 
            "explanation": "Noun/Adj/Verb/Adv required... suffix/prefix rule."
          }}
        ]
      }}
    }}

    CONTENT RULES:
    1. Topic: society, science, arts, environment, or sport. 
       Avoid: urban stress, metropolis, or topics from Reading Parts 1 & 2.
    2. Each base word requires C1-level derivation:
       - Prefixes (un-, in-, dis-, over-, under-, re-, mis-)
       - Suffixes (-tion, -ity, -ness, -ment, -ance, -able, -ous, -al, -ly).
    3. Mix parts of speech: Include nouns, adjectives, adverbs, and verbs.
    4. Mandatory: Include at least ONE negative prefix (e.g., 'misunderstanding', 'irrelevant').
    5. Each answer is exactly ONE word.
    6. CRITICAL — WORD COUNT: The "text" field MUST contain exactly 150 words. Count carefully before returning. Do NOT submit fewer than 150 words. This requirement is NON-NEGOTIABLE.
    7. Gap format: write gaps as (17), (18)… with NO underscores, dashes or blank lines around the number.
    8. Return valid JSON only."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a Cambridge C1 exam expert. You only output valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================
# FUNCIÓN PRINCIPAL
# ==========================

MIN_WORDS = 130

def generate(test_id, output_path, api_key, json_only=True, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 3 de Reading (Word Formation).
    """
    json_file = output_path / f"reading3.json"
    
    print(f"🏗️ Generando contenido AI para Reading Part 3 (Test {test_id})...")
    
    try:
        max_attempts = 3
        data = None
        word_count = 0
        for attempt in range(1, max_attempts + 1):
            data = get_ai_content(api_key, test_id)
            word_count = count_words(data.get("content", {}).get("text", ""))
            if word_count >= MIN_WORDS:
                break
            if attempt < max_attempts:
                print(f"⚠️ Intento {attempt}: Solo {word_count} palabras (mínimo {MIN_WORDS}). Regenerando...")
            else:
                print(f"⚠️ Texto corto tras {max_attempts} intentos ({word_count} palabras). Guardando de todas formas.")

        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name} ({word_count} palabras)")
        
    except Exception as e:
        print(f"❌ Error generando Reading 3: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)