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
    
    # Aplicando tus CONTENT RULES y SCHEMA para Part 8
    prompt = f"""Generate reading8.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-8",
      "examId": "Test{test_id}",
      "section": "reading",
      "part": 8,
      "type": "multiple-matching",
      "title": "Reading and Use of English – Part 8",
      "description": "You are going to read an article about four people who [theme]. For questions 47–56, choose from the people A–D. The people may be chosen more than once.",
      "time": "12",
      "totalQuestions": 10,
      "content": {{
        "title": "Section title",
        "texts": {{
          "A": "### [Name, Role]\\nFirst-person account. MANDATORY: between 100 and 125 words. Embed [47]evidence[/47] markers.",
          "B": "### [Name, Role]\\nMANDATORY: between 100 and 125 words.",
          "C": "### [Name, Role]\\nMANDATORY: between 100 and 125 words.",
          "D": "### [Name, Role]\\nMANDATORY: between 100 and 125 words."
        }},
        "questions": [
          {{
            "number": 47, 
            "question": "mentions being surprised by how quickly they adapted to a new routine?", 
            "correct": "B", 
            "explanation": "B says: 'I hadn't expected to settle in so fast...'"
          }}
        ]
      }}
    }}

    CONTENT RULES:
    1. Shared Theme: travel, health journey, learning a skill, creative pursuit, or volunteering.
       Avoid: career switches (Test 1) or remote work (Test 2).
    2. CRITICAL — WORD COUNT: Each person's text MUST be between 100 and 125 words (total across A–D: 400–500 words). Count carefully. Do NOT submit fewer than 100 words per person. This requirement is NON-NEGOTIABLE.
    3. 10 questions (47–56) phrased as participial clauses ("mentions doing X?", "describes feeling Y?").
    4. Each question must have EXACTLY ONE correct answer.
    5. Balance: Each person (A-D) should be the correct answer 2 or 3 times.
    6. Embed evidence markers [N]...[/N] in the text at the exact phrase that answers question N.
    7. Ensure the distractors are strong (other people might mention similar topics but not the specific detail asked).
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

MIN_WORDS_TOTAL = 380

def generate(test_id, output_path, api_key, json_only=True, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 8 de Reading (Multiple Matching).
    """
    json_file = output_path / f"reading8.json"
    
    print(f"🕵️ Generando contenido AI para Reading Part 8 (Test {test_id})...")
    
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
        print(f"❌ Error generando Reading 8: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)