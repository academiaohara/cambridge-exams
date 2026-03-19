import json
import os
from pathlib import Path
from openai import OpenAI

# ==========================
# GENERACIÓN DE CONTENIDO (AI)
# ==========================

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    
    # Aplicando tus CONTENT RULES y SCHEMA para Writing Part 1
    prompt = f"""Generate writing1.json for Cambridge CAE Test {test_id}.

SCHEMA:
{{
  "title": "Writing - Part 1: [TOPIC TITLE]",
  "time": 45,
  "totalQuestions": 1,
  "description": "Your class has attended a [lecture/panel discussion/seminar] on [TOPIC]. Write an essay for your tutor, discussing two of the points in your notes and explaining which you think is more important, giving reasons for your opinion.",
  "content": {{
    "question": "Write an essay discussing two of the methods in your notes. You should explain which method is more important, giving reasons for your opinion. You may, if you wish, make use of the opinions expressed during the discussion, but you should use your own words as far as possible.",
    "notes": {{
      "methods": [
        "Method/approach 1 – specific and actionable",
        "Method/approach 2 – contrasting angle",
        "Method/approach 3 – alternative perspective"
      ],
      "opinions": [
        "Opinion A from the discussion (direct speech style, ~15 words).",
        "Opinion B (~15 words).",
        "Opinion C (~15 words)."
      ]
    }},
    "wordLimit": "220-260 words",
    "structure": {{
      "introduction": "Introduce the topic and the two methods you will discuss.",
      "bodyParagraph1": "Discuss the first method and its impact.",
      "bodyParagraph2": "Discuss the second method and its effectiveness.",
      "conclusion": "Evaluate both and state which is more effective."
    }},
    "modelAnswer": "Full model essay ~250 words. Formal register. Intro that paraphrases the task. Two body paragraphs each opening with a clear topic sentence, developing the argument with an example or supporting point, and linking to the opposing method. Conclusion that clearly states which method is more important and why. Uses cohesive devices: 'Although…', 'While it is true that…', 'On the other hand…', 'Perhaps the most significant factor is…', 'Ultimately…'."
  }}
}}

CONTENT RULES:
1. Topic: social issue, education reform, health, technology, work culture, or environmental policy.
   Must differ from Test 1 (environmental protection methods).
2. Three methods in notes: genuinely different approaches to the same issue.
3. Discussion opinions: informal, first-person quotes that contrast with each other.
4. Model answer: ~250 words, genuine C1 complexity, specific examples (not vague generalities).
5. Return valid JSON only.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a Cambridge Writing examiner. You produce only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# ==========================
# FUNCIÓN PRINCIPAL
# ==========================

def generate(test_id, output_path, api_key, *args, **kwargs):
    """
    Genera el archivo JSON para la Parte 1 de Writing (Essay).
    """
    json_file = output_path / f"test_{test_id}_writing1.json"
    
    print(f"✍️ Generando contenido AI para Writing Part 1 (Test {test_id})...")
    
    try:
        data = get_ai_content(api_key, test_id)
        
        # Guardar el archivo
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        print(f"✅ Archivo generado: {json_file.name}")
        
    except Exception as e:
        print(f"❌ Error generando Writing 1: {e}")

if __name__ == "__main__":
    # Test local
    from dotenv import load_dotenv
    load_dotenv()
    
    TEST_API_KEY = os.getenv("OPENAI_API_KEY")
    OUTPUT = Path("./")
    generate(3, OUTPUT, TEST_API_KEY)