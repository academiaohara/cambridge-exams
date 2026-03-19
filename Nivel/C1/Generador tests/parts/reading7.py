import json
import os
from pathlib import Path
from openai import OpenAI

# ==========================
# UTILIDADES
# ==========================

def count_words(text):
    """Cuenta las palabras de un texto ignorando marcadores de examen y separadores de párrafo."""
    import re
    clean = re.sub(r'\[/?[\d\w]+\]', ' ', text)
    clean = re.sub(r'\|\|\(\d+\)\|\|', ' ', clean)   # Elimina ||(41)|| etc.
    clean = re.sub(r'\|\|', ' ', clean)
    return len(clean.split())

# ==========================
# GENERACIÓN DE CONTENIDO (AI)
# ==========================

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    
    # Aplicando tus CONTENT RULES y SCHEMA para Part 7
    prompt = f"""Generate reading7.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-7",
      "examId": "Test{test_id}",
      "section": "reading",
      "part": 7,
      "type": "gapped-text",
      "title": "Reading and Use of English – Part 7",
      "description": "You are going to read an article from which six paragraphs have been removed. Choose from paragraphs A–G which fits each gap. There is one extra paragraph you do not need to use.",
      "time": "12",
      "totalQuestions": 6,
      "content": {{
        "articleTitle": "Article headline",
        "text": "Main article body. MANDATORY: exactly 400 words (do NOT count the gap markers). Mark each removed paragraph with ||(41)||, ||(42)||, ||(43)||, ||(44)||, ||(45)||, ||(46)|| at the paragraph boundary. Use || for regular paragraph breaks (not containing a gap). The number inside the marker indicates the gap number. Example structure: 'First paragraph text. ||(41)|| Second paragraph text continues here. ||(42)|| Third paragraph...'",
        "paragraphs": {{
          "A": "Removed paragraph A. MANDATORY: approximately 50 words. Contains [41]key linking phrase[/41] that proves it belongs at gap 41.",
          "B": "Removed paragraph B ~50 words. Contains [42]evidence[/42] or [43]evidence[/43] etc.",
          "C": "~50 words.",
          "D": "~50 words.",
          "E": "~50 words.",
          "F": "~50 words.",
          "G": "Extra/distractor paragraph ~50 words. Thematically related but incorrect for ALL six gaps."
        }},
        "questions": [
          {{
            "number": 41, 
            "correct": "C", 
            "explanation": "C opens with 'This discovery' which refers back to the specific event mentioned before gap 41."
          }}
        ]
      }}
    }}

    CONTENT RULES:
    1. Topic: history, biography, science, travel, or culture. 
       Avoid: underwater archaeology (used in Test 1).
    2. CRITICAL — WORD COUNT: The "text" field (main article body) MUST be exactly 400 words, NOT counting the gap markers like ||(41)||. Count the prose words only. This is NON-NEGOTIABLE.
    3. Each removed paragraph (A–F) MUST be approximately 50 words. Paragraph G (distractor) also ~50 words.
    4. Gap format in the main text: ||(41)||, ||(42)||… at the paragraph boundary where the paragraph was removed. Do NOT use [41] or plain (41) alone in the main text.
    5. Evidence markers in the removed paragraphs (A–G): use properly closed tags [41]key phrase[/41], [42]key phrase[/42]… The opening tag and closing tag MUST both be present.
    6. Cohesion devices are MANDATORY at each gap: 
       - Pronoun reference (it, they, this, these).
       - Lexical chains (repeating a concept with different words).
       - Discourse markers (However, As a result, In contrast).
    7. Paragraph G must be a distractor: it must seem to fit the topic but fail the local cohesion check of every gap.
    8. Explanations must explicitly mention the grammatical or lexical link that justifies the answer.
    9. Return valid JSON only."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": (
            "You are a Cambridge C1 exam expert. You only output valid JSON. "
            "CRITICAL: The 'text' field MUST contain at least 400 words. "
            "Count every word before returning. If the text is under 400 words, expand it before outputting."
        )},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================
# EXPANSIÓN DE CONTENIDO
# ==========================

def _expand_reading7(client, data, min_words=350):
    """Expands the main article text without touching gap markers."""
    text = data.get("content", {}).get("text", "")
    expand_prompt = (
        f"The main article text is too short ({count_words(text)} words, need ≥{min_words}). "
        f"Expand the 'text' field by adding more sentences/detail to existing paragraphs. "
        f"Do NOT add new gap markers or remove existing ||(41)||…||(46)|| markers. "
        f"Return the COMPLETE original JSON with only the 'text' field expanded:\n\n"
        f"{json.dumps(data)}"
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

MIN_WORDS_MAIN = 350

def generate(test_id, output_path, api_key, json_only=True, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 7 de Reading (Gapped Text).
    """
    json_file = output_path / f"reading7.json"
    
    print(f"🧩 Generando contenido AI para Reading Part 7 (Test {test_id})...")
    
    try:
        MAX_ATTEMPTS = 5
        client = OpenAI(api_key=api_key)
        data = None
        word_count = 0
        for attempt in range(1, MAX_ATTEMPTS + 1):
            if attempt <= 3:
                data = get_ai_content(api_key, test_id)
            else:
                data = _expand_reading7(client, data, MIN_WORDS_MAIN)
            word_count = count_words(data.get("content", {}).get("text", ""))
            if word_count >= MIN_WORDS_MAIN:
                break
            if attempt < MAX_ATTEMPTS:
                print(f"⚠️ Intento {attempt}: Solo {word_count} palabras en el texto principal (mínimo {MIN_WORDS_MAIN}). {'Regenerando' if attempt < 3 else 'Expandiendo'}...")
            else:
                print(f"⚠️ Texto corto tras {MAX_ATTEMPTS} intentos ({word_count} palabras). Guardando de todas formas.")

        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name} ({word_count} palabras en texto principal)")
        
    except Exception as e:
        print(f"❌ Error generando Reading 7: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)