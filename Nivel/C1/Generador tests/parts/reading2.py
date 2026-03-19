import json
import os
from pathlib import Path
from openai import OpenAI

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
        "text": "Continuous passage ~200 words. Number gaps (0), (9)–(16). Include paragraph breaks with ||.",
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
    6. Return valid JSON only."""

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
    Genera el archivo JSON para la Parte 2 de Reading (Open Cloze).
    """
    json_file = output_path / f"reading2.json"
    
    print(f"📝 Generando contenido AI para Reading Part 2 (Test {test_id})...")
    
    try:
        data = get_ai_content(api_key, test_id)
        
        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name}")
        
    except Exception as e:
        print(f"❌ Error generando Reading 2: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)