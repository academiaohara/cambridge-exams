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
    
    # Aplicando tus CONTENT RULES y SCHEMA
    prompt = f"""Generate reading1.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-1",
      "examId": "Test{test_id}",
      "section": "reading",
      "part": 1,
      "type": "multiple-choice",
      "title": "Reading and Use of English – Part 1",
      "description": "Read the text below and decide which answer (A, B, C or D) best fits each gap.",
      "time": "10",
      "totalQuestions": 8,
      "content": {{
        "articleTitle": "Short headline for the text",
        "text": "Continuous article. MANDATORY: exactly 200 words. Mark each gap as (0), (1), (2)… (8) inline in the sentence — NO underscores, NO dashes before or after the number. Gap (0) is the worked example.",
        "example": {{
          "number": 0,
          "options": ["A) word1", "B) word2", "C) word3", "D) word4"],
          "correct": "A",
          "explanation": "Reason for A (collocation / fixed phrase)."
        }},
        "questions": [
          {{
            "number": 1,
            "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
            "correct": "B",
            "explanation": "B collocates with X because… Distractors: A is wrong because…"
          }}
        ]
      }}
    }}

    CONTENT RULES:
    1. Topic: genuine journalistic/academic text (science, culture, psychology, history, nature).
       Forbidden: digital attention, social media addiction, farming, deep work, creativity.
    2. Each gap tests ONE of: collocation (verb+noun, adj+noun), fixed phrase, idiom, phrasal verb.
    3. Four options per gap; only one is correct based on collocation/fixed usage.
    4. Distractors must be plausible (same word class, similar meaning) but wrong in context.
    5. Explanations must name the collocation/idiom principle.
    6. Questions 1–8 (gap 0 = example only).
    7. CRITICAL — WORD COUNT: The "text" field MUST contain exactly 200 words. Count carefully before returning. Do NOT submit fewer than 200 words. This requirement is NON-NEGOTIABLE.
    8. Gap format: write gaps as (1), (2)… with NO underscores, dashes or blank lines around the number.
    9. Return valid JSON only."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": (
            "You are a Cambridge C1 exam creator expert. You produce only valid JSON. "
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
    Genera el archivo JSON para la Parte 1 de Reading.
    """
    json_file = output_path / f"reading1.json"
    
    print(f"📖 Generando contenido AI para Reading Part 1 (Test {test_id})...")
    
    try:
        MAX_ATTEMPTS = 5
        client = OpenAI(api_key=api_key)
        data = None
        word_count = 0
        for attempt in range(1, MAX_ATTEMPTS + 1):
            if attempt <= 3:
                data = get_ai_content(api_key, test_id)
            else:
                data = _expand_text(client, data, ("content", "text"), MIN_WORDS, "article text")
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
        print(f"❌ Error generando Reading 1: {e}")

if __name__ == "__main__":
    # Para pruebas locales rápidas
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)