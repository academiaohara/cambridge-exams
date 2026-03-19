import json
import os
from pathlib import Path
from openai import OpenAI

# ==========================
# GENERACIÓN DE CONTENIDO (AI)
# ==========================

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    
    # Aplicando tus CONTENT RULES y SCHEMA para Part 4
    prompt = f"""Generate reading4.json for Cambridge CAE Test {test_id}.

    SCHEMA:
    {{
      "id": "Test{test_id}-reading-4",
      "examId": "Test{test_id}",
      "section": "use-of-english",
      "part": 4,
      "type": "transformations",
      "title": "Reading and Use of English – Part 4",
      "description": "For questions 25–30, complete the second sentence so that it has a similar meaning to the first, using the word given. Do not change the word given. You must use between THREE and SIX words, including the word given.",
      "time": "10",
      "totalQuestions": 6,
      "content": {{
        "questions": [
          {{
            "number": 25,
            "firstSentence": "The concert was so popular that tickets sold out immediately.",
            "keyWord": "DEMAND",
            "beforeGap": "There was",
            "afterGap": "the concert that tickets sold out immediately.",
            "routes": [
              {{"p1": "such", "p2": "high demand for"}},
              {{"p1": "such", "p2": "a demand for"}}
            ],
            "explanation": "Tests 'such + adj + noun' structure expressing high degree."
          }}
        ]
      }}
    }}

    CONTENT RULES:
    1. Six questions (25–30). Each MUST test a DIFFERENT advanced grammar structure.
    2. REQUIRED COVERAGE (use all 6):
       - Passive voice (complex or causative).
       - Reported speech or reporting verbs with gerund/infinitive.
       - Wish/Regret or Hypothetical meaning (Conditional 3/Mixed).
       - Modal perfects (must have been, etc.).
       - Inversion (Never before, Seldom, etc.) or Phrasal Verbs.
       - Comparison structures or Gerund/Infinitive alternation.
    3. The keyword in CAPITALS must remain unchanged.
    4. The answer (gap) must be between 3 and 6 words total.
    5. 'routes' should contain 1 or 2 correct variations if they are genuinely interchangeable.
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
    Genera el archivo JSON para la Parte 4 de Reading (Transformations).
    """
    json_file = output_path / f"reading4.json"
    
    print(f"🔄 Generando contenido AI para Reading Part 4 (Test {test_id})...")
    
    try:
        data = get_ai_content(api_key, test_id)
        
        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name}")
        
    except Exception as e:
        print(f"❌ Error generando Reading 4: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)