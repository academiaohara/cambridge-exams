import json
import os
from pathlib import Path
from openai import OpenAI

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
        "text": "Main article ~600 words with 6 gaps marked [41] [42] [43] [44] [45] [46]. Use || for paragraph breaks.",
        "paragraphs": {{
          "A": "Removed paragraph A ~70 words. Contains [41]linking phrase[/41] or evidence markers.",
          "B": "...", "C": "...", "D": "...", "E": "...", "F": "...", 
          "G": "Extra/distractor paragraph ~70 words. Thematically related but incorrect for ALL six gaps."
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
    2. Cohesion devices are MANDATORY at each gap: 
       - Pronoun reference (it, they, this, these).
       - Lexical chains (repeating a concept with different words).
       - Discourse markers (However, As a result, In contrast).
    3. Paragraph G must be a distractor: it must seem to fit the topic but fail the local cohesion check of every gap.
    4. Explanations must explicitly mention the grammatical or lexical link that justifies the answer.
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
    Genera el archivo JSON para la Parte 7 de Reading (Gapped Text).
    """
    json_file = output_path / f"test_{test_id}_reading7.json"
    
    print(f"🧩 Generando contenido AI para Reading Part 7 (Test {test_id})...")
    
    try:
        data = get_ai_content(api_key, test_id)
        
        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name}")
        
    except Exception as e:
        print(f"❌ Error generando Reading 7: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)