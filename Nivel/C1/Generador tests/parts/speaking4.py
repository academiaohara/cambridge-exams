import json
import os
from pathlib import Path
from openai import OpenAI

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    prompt = f"""Generate speaking4.json for Cambridge CAE Test {test_id}.

SCHEMA:
{{
  "title": "Speaking – Part 4: Discussion",
  "type": "multiple-choice-text",
  "time": 5,
  "totalQuestions": 6,
  "description": "The examiner asks broader questions related to the Part 3 theme.",
  "content": {{
    "theme": "[Broader theme connecting to Part 3, e.g. 'the role of [X] in society']",
    "questions": [
      {{"number": 1, "question": "To what extent do you think [broad societal question]?"}},
      {{"number": 2, "question": "Some people argue that [claim]. Do you agree?"}},
      {{"number": 3, "question": "How might [trend] change [aspect of life] in the future?"}},
      {{"number": 4, "question": "Is it the responsibility of [government / individuals / organisations] to [action]?"}},
      {{"number": 5, "question": "What role does [factor] play in shaping people's attitudes towards [topic]?"}},
      {{"number": 6, "question": "Do you think younger and older generations have different views on [topic]? Why might that be?"}}
    ],
    "participants": ["examiner", "candidate", "partner"],
    "script": [
      {{"role": "examiner",  "text": "Now I'd like to ask you some more general questions related to [THEME]."}},
      {{"role": "examiner",  "text": "Question 1 text?"}},
      {{"role": "candidate", "text": ""}},
      {{"role": "partner",   "text": ""}},
      {{"role": "examiner",  "text": "Question 2 text?"}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "examiner",  "text": "Question 3 text?"}},
      {{"role": "candidate", "text": ""}},
      {{"role": "partner",   "text": ""}},
      {{"role": "examiner",  "text": "Question 4 text?"}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "examiner",  "text": "Question 5 text?"}},
      {{"role": "candidate", "text": ""}},
      {{"role": "partner",   "text": ""}},
      {{"role": "examiner",  "text": "Question 6 text?"}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "examiner",  "text": "Thank you very much. That is the end of the speaking test."}}
    ]
  }}
}}

CONTENT RULES:
1. Theme must be the BROADER version of Speaking Part 3 topic (more abstract/societal).
2. 6 questions escalating from personal/experiential → societal → philosophical.
3. Questions alternate between candidate and partner (examiner addresses both).
4. Script examiner question turns (indices 1, 4, 7, 10, 13, 16) must match questions 1–6 exactly.
5. Avoid Test 1 topic (environment, government vs. individual responsibility).
6. Return valid JSON only.
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a Cambridge examiner. Produce valid JSON."},
                  {"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def generate(test_id, output_path, api_key, *args, **kwargs):
    json_file = output_path / f"speaking4.json"
    try:
        data = get_ai_content(api_key, test_id)
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ Speaking 4 generado: {json_file.name}")
    except Exception as e:
        print(f"❌ Error Speaking 4: {e}")