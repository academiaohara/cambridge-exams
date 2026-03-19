import json
import os
from pathlib import Path
from openai import OpenAI

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)

    prompt = f"""Generate speaking3.json for Cambridge CAE Test {test_num}.

SCHEMA:
{{
  "title": "Speaking – Part 3: Collaborative Task",
  "type": "multiple-choice-text",
  "time": 3,
  "totalQuestions": 5,
  "description": "Discuss the options shown with your partner for about two minutes, then decide together which two would be most effective.",
  "content": {{
    "centralQuestion": "What are the benefits and drawbacks of [TOPIC ASPECT] in [CONTEXT]?",
    "decisionTask": "Now decide which TWO options would be most [CRITERION] for [REASON].",
    "options": [
      "Option 1 (specific and concrete)",
      "Option 2",
      "Option 3",
      "Option 4",
      "Option 5"
    ],
    "participants": ["examiner", "candidate", "partner"],
    "script": [
      {{"role": "examiner",  "text": "Now, I'd like you to talk about something together for about two minutes.", "showOptions": false}},
      {{"role": "examiner",  "text": "Here are some [suggestions/options/factors] about [TOPIC]. [Shows task card]", "showOptions": true}},
      {{"role": "examiner",  "text": "First, discuss the advantages and disadvantages of each option. Then decide which two would be most [CRITERION]. You have about two minutes."}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "examiner",  "text": "Now decide together which two options would be most [CRITERION]."}},
      {{"role": "partner",   "text": ""}},
      {{"role": "candidate", "text": ""}},
      {{"role": "examiner",  "text": "Thank you."}}
    ]
  }}
}}

CONTENT RULES:
1. Topic must thematically link to Speaking Part 2 of THIS test (same broad theme, different focus).
2. 5 distinct, concrete options – varied enough to generate genuine debate.
3. Decision criterion must be evaluable (e.g. 'effective for motivating young people', 'cost-efficient for a small organisation').
4. Script: 3 examiner turns framing the task; 3 pairs of alternating partner/candidate empty turns.
5. Avoid Test 1 topic (environmental measures for cities).
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
    json_file = output_path / f"test_{test_id}_speaking3.json"
    try:
        data = get_ai_content(api_key, test_id)
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ Speaking 3 generado: {json_file.name}")
    except Exception as e:
        print(f"❌ Error Speaking 3: {e}")