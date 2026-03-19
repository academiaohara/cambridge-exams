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
    
    # Aplicando tus CONTENT RULES y SCHEMA para Part 6
    prompt = f"""Generate reading6.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-6",
      "examId": "Test{test_id}",
      "section": "reading",
      "part": 6,
      "type": "cross-text-matching",
      "title": "Reading and Use of English – Part 6",
      "description": "You are going to read four short extracts about [shared topic]. For questions 37–40, choose from writers A–D. A writer may be chosen more than once.",
      "time": "10",
      "totalQuestions": 4,
      "content": {{
        "title": "Shared thematic heading",
        "texts": {{
          "A": "Writer A text. MANDATORY: between 125 and 140 words. Embed [37]evidence[/37] and/or [38]evidence[/38] markers where relevant.",
          "B": "Writer B text. MANDATORY: between 125 and 140 words.",
          "C": "Writer C text. MANDATORY: between 125 and 140 words.",
          "D": "Writer D text. MANDATORY: between 125 and 140 words."
        }},
        "questions": [
          {{
            "number": 37,
            "question": "Which writer expresses a similar opinion to Writer B about the role of [aspect]?",
            "options": ["A", "B", "C", "D"],
            "correct": "A",
            "explanation": "A and B both believe X because… C disagrees because… D is neutral…"
          }}
        ]
      }}
    }}

    CONTENT RULES:
    1. Topic: shared thematic issue (e.g., urban planning, the value of history, modern architecture, or competitive sports). 
       Avoid: AI and privacy (Test 1).
    2. Four writers (A, B, C, D) must provide distinct but related perspectives.
    3. CRITICAL — WORD COUNT: Each writer's text MUST be between 125 and 140 words (total across all four texts: 500–550 words). Count carefully. Do NOT submit fewer than 125 words per text. This requirement is NON-NEGOTIABLE.
    4. Questions (37–40) must require cross-referencing:
       - "Which writer shares Writer X's view on..."
       - "Which writer has a different opinion from Writer Y regarding..."
    5. Each question must target a SPECIFIC sub-topic mentioned by at least two writers.
    6. Embed evidence markers [37]...[/37] within the relevant parts of the texts.
    7. Ensure only one writer is the correct answer for each question.
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

MIN_WORDS_TOTAL = 480

def generate(test_id, output_path, api_key, json_only=True, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 6 de Reading (Cross-text Matching).
    """
    json_file = output_path / f"reading6.json"
    
    print(f"⚖️ Generando contenido AI para Reading Part 6 (Test {test_id})...")
    
    try:
        max_attempts = 3
        data = None
        word_count = 0
        for attempt in range(1, max_attempts + 1):
            data = get_ai_content(api_key, test_id)
            texts = data.get("content", {}).get("texts", {})
            word_count = sum(count_words(texts.get(letter, "")) for letter in ["A", "B", "C", "D"])
            if word_count >= MIN_WORDS_TOTAL:
                break
            if attempt < max_attempts:
                print(f"⚠️ Intento {attempt}: Solo {word_count} palabras en total (mínimo {MIN_WORDS_TOTAL}). Regenerando...")
            else:
                print(f"⚠️ Texto corto tras {max_attempts} intentos ({word_count} palabras). Guardando de todas formas.")

        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name} ({word_count} palabras totales)")
        
    except Exception as e:
        print(f"❌ Error generando Reading 6: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)