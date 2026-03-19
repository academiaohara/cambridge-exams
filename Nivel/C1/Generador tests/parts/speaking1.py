import json
import os
from pathlib import Path
from openai import OpenAI

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    prompt = f"""Generate speaking1.json for Cambridge CAE Test {test_id}.

SCHEMA:
{{
  "title": "Speaking Interview",
  "time": 1,
  "totalQuestions": 6,
  "description": "The examiner asks you questions about yourself, your opinions and your experiences. Answer naturally and try to develop your responses.",
  "content": {{
    "phases": [
      {{
        "id": 1,
        "name": "Socializing / Basics",
        "questions": [
          "Personal question 1 (simple, concrete)",
          "Personal question 2",
          "Personal question 3",
          "Personal question 4"
        ]
      }},
      {{
        "id": 2,
        "name": "Current Lifestyle",
        "questions": [
          "Lifestyle question 1 (opinions/habits)",
          "Lifestyle question 2",
          "Lifestyle question 3",
          "Lifestyle question 4",
          "Lifestyle question 5"
        ]
      }},
      {{
        "id": 3,
        "name": "Abstract / Personal Growth",
        "questions": [
          "Abstract question 1 (personal development, values)",
          "Abstract question 2",
          "Abstract question 3"
        ]
      }}
    ]
  }}
}}

CONTENT RULES:
1. 3 phases progressing from concrete/personal (Phase 1) to abstract (Phase 3).
2. Questions must be open-ended, at C1 level, and allow 2–3 sentence answers.
3. Topics must be different from Test 1 (travel, food, home).
4. Return valid JSON only.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a Cambridge Speaking examiner. Produce valid JSON."},
                  {"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def generate(test_id, output_path, api_key, *args, **kwargs):
    json_file = output_path / f"speaking1.json"
    try:
        data = get_ai_content(api_key, test_id)
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ Speaking 1 generado: {json_file.name}")
    except Exception as e:
        print(f"❌ Error Speaking 1: {e}")