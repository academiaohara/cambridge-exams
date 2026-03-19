import json
import os
from pathlib import Path
from openai import OpenAI

def get_ai_content(api_key, test_id):
    client = OpenAI(api_key=api_key)
    
    # Definimos la lógica de rotación: Test impar (1, 3, 5...) vs Test par (2, 4, 6...)
    genres = ["Report", "Article", "Review"] if test_id % 2 != 0 else ["Email/Letter", "Review", "Report"]
    
    prompt = f"""Generate writing2.json for Cambridge CAE Test {test_id}.
    
    TASK SELECTION:
    Create 3 tasks from these genres: {', '.join(genres)}.

    GENRE GUIDELINES (Apply to Model Answers):
    1. REPORT: 
       - Style: Formal, impersonal, objective.
       - Structure: Title + Headings (e.g., Introduction, Current Situation, Recommendations).
       - Goal: Provide information and suggest improvements.
    2. ARTICLE:
       - Style: Engaging, personal, slightly informal/semi-formal.
       - Structure: Catchy title + Introduction to hook the reader + Anecdotes/Examples.
       - Goal: Inform and entertain a specific readership (magazine/newsletter).
    3. REVIEW:
       - Style: Evaluative, descriptive, persuasive.
       - Structure: Introduction of the subject + Detailed analysis (pros/cons) + Clear recommendation.
       - Goal: Help a reader decide whether to experience the book/film/app/place.
    4. EMAIL/LETTER:
       - Style: Appropriate for the recipient (Formal for a director, Semi-formal for a club).
       - Structure: Correct opening/closing (Dear Sir/Madam, Yours faithfully/sincerely).
       - Goal: Complain, apply, or provide feedback clearly.

    SCHEMA:
    (Usa el SCHEMA de tus instrucciones previas, asegurando que cada 'task' tenga su 'type' y 'modelAnswer' siguiendo estas guías).

    CONTENT RULES:
    1. Topics must be C1 level (e.g., "The impact of tourism on local craftspeople", "Evaluating a new productivity software").
    2. Model answers must be ~250 words with advanced grammar (Inversion, Passive, Modals).
    3. Return valid JSON only."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a Cambridge C1 Writing specialist. You know the exact format and marking criteria for each genre."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def generate(test_id, output_path, api_key, *args, **kwargs):
    json_file = output_path / f"test_{test_id}_writing2.json"
    print(f"✍️ Generando Writing Part 2 (Géneros: Report, Article, Review, Email) para Test {test_id}...")
    try:
        data = get_ai_content(api_key, test_id)
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"✅ Writing 2 generado con éxito.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    generate(3, Path("./"), os.getenv("OPENAI_API_KEY"))