import json
import os
from pathlib import Path
from openai import OpenAI

def get_ai_content(api_key, test_id, bunny_url):
    client = OpenAI(api_key=api_key)
    # Helper para las URLs de imágenes según tu estructura
    def img_url(label): return f"{bunny_url}/test{test_id}_{label}.jpg"

    prompt = f"""Generate speaking2.json for Cambridge CAE Test {test_id}.

SCHEMA:
{{
  "title": "Speaking – Part 2: Long Turn",
  "type": "multiple-choice-text",
  "time": 2,
  "totalQuestions": 2,
  "description": "Each candidate compares two of three photographs and answers two questions about them. You have about one minute. Then your partner answers a brief question.",
  "content": {{
    "tasks": [
      {{
        "id": "2A",
        "candidate": "Candidate A",
        "topic": "[Abstract thematic label, e.g. 'Facing a challenge']",
        "instructions": "Compare two of the photographs and say what challenge the people might be facing and how they might be feeling.",
        "mainQuestion": "What challenge might the people be facing, and how might they be feeling?",
        "followUpQuestion": "Which situation would you find most challenging?",
        "followUpRecipient": "Candidate B",
        "images": [
          {{"label": "a", "url": "{img_url('a')}", "description": "Detailed, searchable description of photo A (real-world scene, no text, ~30 words)."}},
          {{"label": "b", "url": "{img_url('b')}", "description": "Description of photo B."}},
          {{"label": "c", "url": "{img_url('c')}", "description": "Description of photo C."}}
        ]
      }},
      {{
        "id": "2B",
        "candidate": "Candidate B",
        "topic": "[Different abstract theme, e.g. 'Making a decision']",
        "instructions": "Compare two of the photographs and say what decision the people might be making and what factors they might be considering.",
        "mainQuestion": "What decision might the people be making, and what factors might they be considering?",
        "followUpQuestion": "Which decision would be hardest for you to make?",
        "followUpRecipient": "Candidate A",
        "images": [
          {{"label": "d", "url": "{img_url('d')}", "description": "Description of photo D."}},
          {{"label": "e", "url": "{img_url('e')}", "description": "Description of photo E."}},
          {{"label": "f", "url": "{img_url('f')}", "description": "Description of photo F."}}
        ]
      }}
    ]
  }}
}}

CONTENT RULES:
1. Two DIFFERENT abstract themes (one per candidate task).
2. Each theme generates two genuine comparison questions (one main, one follow-up).
3. Images must depict real, findable photographic scenes (NOT illustrations). Be specific:
   e.g. 'A woman in her 30s sitting at a cluttered office desk at night, rubbing her temples under fluorescent light.'
4. Photos within each set (A/B/C and D/E/F) must be thematically linked but visually different (different settings, ages, cultures).
5. Avoid Test 1 themes (precision/accuracy, water leisure).
6. Image URLs follow exactly: {img_url('a')} through {img_url('f')}.
7. Return valid JSON only.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a Cambridge exam designer. Produce valid JSON."},
                  {"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def generate(test_id, output_path, api_key, bunny_url=None, *args, **kwargs):
    if bunny_url is None:
        bunny_pull_zone = os.getenv("BUNNY_PULL_ZONE", "listeninggenerator")
        bunny_url = f"https://{bunny_pull_zone}.b-cdn.net"
    json_file = output_path / f"test_{test_id}_speaking2.json"
    try:
        data = get_ai_content(api_key, test_id, bunny_url)
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ Speaking 2 generado: {json_file.name}")
    except Exception as e:
        print(f"❌ Error Speaking 2: {e}")