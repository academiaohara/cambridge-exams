import json
import os
from pathlib import Path
from openai import OpenAI

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    prompt = f"""Generate speaking1.json for Cambridge CAE Test {test_num}.

SCHEMA:
{{
  "title": "Speaking – Part 1: Interview",
  "type": "multiple-choice-text",
  "time": 2,
  "totalQuestions": 6,
  "description": "The examiner asks you and your partner short personal questions. Give full answers – aim for 2–3 sentences each.",
  "content": {{
    "participants": ["examiner", "candidate", "partner"],
    "sections": [
      {{
        "title": "Warm-up",
        "script": [
          {{"role": "examiner", "text": "Good morning/afternoon. My name is [examiner name]. What are your names?"}},
          {{"role": "candidate", "text": ""}},
          {{"role": "partner",   "text": ""}},
          {{"role": "examiner", "text": "Where are you both from?"}}
        ]
      }},
      {{
        "title": "Topic questions",
        "questions": [
          {{"id": 1, "question": "Can you tell me about a hobby or interest you have outside of studying or work?",  "targetCandidate": "A"}},
          {{"id": 2, "question": "How important is it for you to keep up with current events?",                     "targetCandidate": "B"}},
          {{"id": 3, "question": "What kind of environment do you find it easiest to learn in?",                    "targetCandidate": "A"}},
          {{"id": 4, "question": "How has technology changed the way people communicate in your country?",          "targetCandidate": "B"}},
          {{"id": 5, "question": "Do you think it is more important to have a wide circle of acquaintances or a few close friends?", "targetCandidate": "A"}},
          {{"id": 6, "question": "What do you think makes a city a pleasant place to live in?",                    "targetCandidate": "B"}}
        ],
        "script": [
          {{"role": "examiner",  "text": "I'd like to ask you some questions about your daily life and interests."}},
          {{"role": "examiner",  "text": "Can you tell me about a hobby or interest you have outside of studying or work?"}},
          {{"role": "candidate", "text": ""}},
          {{"role": "examiner",  "text": "How important is it for you to keep up with current events?"}},
          {{"role": "partner",   "text": ""}},
          {{"role": "examiner",  "text": "What kind of environment do you find it easiest to learn in?"}},
          {{"role": "candidate", "text": ""}},
          {{"role": "examiner",  "text": "How has technology changed the way people communicate in your country?"}},
          {{"role": "partner",   "text": ""}},
          {{"role": "examiner",  "text": "Do you think it is more important to have a wide circle of acquaintances or a few close friends?"}},
          {{"role": "candidate", "text": ""}},
          {{"role": "examiner",  "text": "What do you think makes a city a pleasant place to live in?"}},
          {{"role": "partner",   "text": ""}},
          {{"role": "examiner",  "text": "Thank you."}}
        ]
      }}
    ]
  }}
}}

CONTENT RULES:
1. 6 questions in the topic section alternating between candidate A and B.
2. Questions progress from personal/concrete (Q1–Q2) to abstract/societal (Q5–Q6).
3. Questions must be open-ended, at C1 level, and allow 2–3 sentence answers.
4. Topics must be different from Test 1 (travel, food, home).
5. Return valid JSON only.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a Cambridge Speaking examiner. Produce valid JSON."},
                  {"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def generate(test_id, output_path, api_key, *args, **kwargs):
    json_file = output_path / f"test_{test_id}_speaking1.json"
    try:
        data = get_ai_content(api_key, test_id)
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ Speaking 1 generado: {json_file.name}")
    except Exception as e:
        print(f"❌ Error Speaking 1: {e}")