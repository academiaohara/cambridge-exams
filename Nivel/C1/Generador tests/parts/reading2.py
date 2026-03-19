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
    
    # Aplicando tus CONTENT RULES y SCHEMA para Part 2
    prompt = f"""Generate reading2.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-2",
      "examId": "Test{test_id}",
      "section": "reading",
      "part": 2,
      "type": "open-cloze",
      "title": "Reading and Use of English – Part 2",
      "description": "For questions 9–16, read the text below and think of the word which best fits each gap. Use only ONE word in each gap.",
      "time": "10",
      "totalQuestions": 8,
      "content": {{
        "articleTitle": "Short headline",
        "text": "Continuous passage. MANDATORY: exactly 200 words. Number gaps (0), (9)–(16) inline in the sentence with NO underscores. Include paragraph breaks with ||.",
        "example": {{"text": "Opening sentence with (0) gap.", "correct": "which", "explanation": "Relative pronoun introducing a defining relative clause."}},
        "questions": [
          {{"number": 9, "correct": "word", "explanation": "Grammatical reason in English."}}
        ]
      }}
    }}

    CONTENT RULES:
    1. Topic: science, culture, history, geography, or psychology (e.g., archaeology, linguistics, marine biology). 
       Avoid: social mirroring, digital addiction, or topics from Reading Part 1.
    2. Each gap must be a FUNCTION WORD: article, preposition, relative pronoun, conjunction, auxiliary, quantifier, linker (however, meanwhile), or reflexive pronoun.
    3. NO content words (nouns/verbs/adjectives) allowed in gaps.
    4. Ensure there is only one logically and grammatically possible answer for each gap.
    5. The text must be sophisticated (C1 level).
    6. CRITICAL — WORD COUNT: The "text" field MUST contain exactly 200 words. Count carefully before returning. Do NOT submit fewer than 200 words. This requirement is NON-NEGOTIABLE.
    7. Gap format: write gaps as (9), (10)… with NO underscores, dashes or blank lines around the number.
    8. Return valid JSON only."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": (
            "You are a Cambridge C1 exam expert. You only output valid JSON. "
            "CRITICAL: The 'text' field MUST contain at least 200 words. "
            "Count every word before returning. If the text is under 200 words, expand it before outputting."
        )},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================
# EXPANSIÓN DE CONTENIDO
# ==========================

def _expand_text(client, data, field_path, min_words, context_hint):
    """Expands a short text field in-place without regenerating the full JSON."""
    obj = data
    for key in field_path[:-1]:
        obj = obj[key]
    short_text = obj[field_path[-1]]
    current_count = count_words(short_text)

    expand_prompt = (
        f"The following {context_hint} is too short ({current_count} words, minimum required: {min_words}). "
        f"Expand it by adding more detail, examples, and elaboration. "
        f"Keep ALL existing gap markers (e.g. (1), (9), [37]...[/37], ||(41)||) exactly in place. "
        f"Do NOT change the questions, answers, or any other field. "
        f"Return the COMPLETE original JSON with only the '{field_path[-1]}' field expanded.\n\n"
        f"Full JSON to patch:\n{json.dumps(data)}"
    )
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a Cambridge C1 exam expert. Output valid JSON only."},
            {"role": "user", "content": expand_prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(resp.choices[0].message.content)

# ==========================
# FUNCIÓN PRINCIPAL
# ==========================

MIN_WORDS = 180

def generate(test_id, output_path, api_key, json_only=True, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 2 de Reading (Open Cloze).
    """
    json_file = output_path / f"reading2.json"
    
    print(f"📝 Generando contenido AI para Reading Part 2 (Test {test_id})...")
    
    try:
        MAX_ATTEMPTS = 5
        client = OpenAI(api_key=api_key)
        data = None
        word_count = 0
        for attempt in range(1, MAX_ATTEMPTS + 1):
            if attempt <= 3:
                data = get_ai_content(api_key, test_id)
            else:
                data = _expand_text(client, data, ("content", "text"), MIN_WORDS, "open-cloze passage")
            word_count = count_words(data.get("content", {}).get("text", ""))
            if word_count >= MIN_WORDS:
                break
            if attempt < MAX_ATTEMPTS:
                print(f"⚠️ Intento {attempt}: Solo {word_count} palabras (mínimo {MIN_WORDS}). {'Regenerando' if attempt < 3 else 'Expandiendo'}...")
            else:
                print(f"⚠️ Texto corto tras {MAX_ATTEMPTS} intentos ({word_count} palabras). Guardando de todas formas.")

        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name} ({word_count} palabras)")
        
    except Exception as e:
        print(f"❌ Error generando Reading 2: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)