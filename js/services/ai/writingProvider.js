import fetch from "node-fetch";

export async function correctWriting(text) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an English teacher correcting student writing."
        },
        {
          role: "user",
          content: `Correct this writing and return JSON:
{
  "corrected_text": "...",
  "errors": [{"original": "...", "correction": "...", "explanation": "..."}],
  "suggestions": ["..."],
  "score": {"grammar": 0, "vocabulary": 0, "coherence": 0, "task_response": 0},
  "feedback": "..."
}

Writing: ${text}`
        }
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
