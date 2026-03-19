import json
import os
from pathlib import Path
from openai import OpenAI

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
        "text": "Continuous article ~250 words. Number gaps (0) through (8). Gap (0) is the worked example.",
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
    7. Return valid JSON only."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a Cambridge C1 exam creator expert. You produce only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================
# FUNCIÓN PRINCIPAL
# ==========================

def generate(test_id, output_path, api_key, json_only=True, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 1 de Reading.
    """
    json_file = output_path / f"test_{test_id}_reading1.json"
    
    print(f"📖 Generando contenido AI para Reading Part 1 (Test {test_id})...")
    
    try:
        data = get_ai_content(api_key, test_id)
        
        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name}")
        
    except Exception as e:
        print(f"❌ Error generando Reading 1: {e}")

if __name__ == "__main__":
    # Para pruebas locales rápidas
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)