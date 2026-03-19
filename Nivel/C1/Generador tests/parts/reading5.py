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
# = :========================

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    
    # Aplicando tus CONTENT RULES y SCHEMA para Part 5
    prompt = f"""Generate reading5.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-5",
      "examId": "Test{test_id}",
      "section": "reading",
      "part": 5,
      "type": "multiple-choice-text",
      "title": "Reading and Use of English – Part 5",
      "description": "You are going to read an article. For questions 31–36, choose the answer (A, B, C or D) which fits best according to what you read.",
      "time": "15",
      "totalQuestions": 6,
      "content": {{
        "title": "Article headline",
        "subtitle": "Optional subheading",
        "text": "Engaging article. MANDATORY: between 500 and 550 words. Enclose each question's key evidence in [31]…[/31] through [36]…[/36]. Use || for paragraph breaks.",
        "questions": [
          {{
            "number": 31,
            "question": "In the first paragraph, the writer suggests that…",
            "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
            "correct": "B",
            "explanation": "B is supported by [31]key phrase[/31]. A is wrong because… C distorts… D contradicts…"
          }}
        ]
      }}
    }}

    CONTENT RULES:
    1. Topic: memory science, language acquisition, sport psychology, technology ethics, or philosophy.
       Avoid: deep work, cognitive focus, or creativity (used in previous tests).
    2. CRITICAL — WORD COUNT: The "text" field MUST contain between 500 and 550 words. Count carefully before returning. Do NOT submit fewer than 500 words. This requirement is NON-NEGOTIABLE. Write full, detailed paragraphs.
    3. Question types MUST vary: 
       - At least one about author's attitude/tone.
       - At least one about meaning in context (a specific word or phrase).
       - At least one about the purpose of a paragraph.
       - Questions must follow the order of the text.
    4. Distractors must be plausible and based on the text, but logically incorrect.
    5. Return valid JSON only."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": (
            "You are a Cambridge C1 exam expert. You only output valid JSON. "
            "CRITICAL: The 'text' field MUST contain at least 500 words. "
            "Count every word before returning. If the text is under 500 words, expand it before outputting."
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

MIN_WORDS = 480

def generate(test_id, output_path, api_key, json_only=True, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 5 de Reading (Multiple Choice Text).
    """
    json_file = output_path / f"reading5.json"
    
    print(f"📖 Generando contenido AI para Reading Part 5 (Test {test_id})...")
    
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
        print(f"❌ Error generando Reading 5: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)