import json
import os
from pathlib import Path
from openai import OpenAI

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
        "text": "Engaging article 680–720 words. Enclose each question's key evidence in [31]…[/31] through [36]…[/36]. Use || for paragraph breaks.",
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
    2. Length: 680-720 words. High-level C1 vocabulary and varied structures.
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
            {"role": "system", "content": "You are a Cambridge C1 exam expert. You only output valid JSON."},
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
    Genera el archivo JSON para la Parte 5 de Reading (Multiple Choice Text).
    """
    json_file = output_path / f"reading5.json"
    
    print(f"📖 Generando contenido AI para Reading Part 5 (Test {test_id})...")
    
    try:
        data = get_ai_content(api_key, test_id)
        
        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name}")
        
    except Exception as e:
        print(f"❌ Error generando Reading 5: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)