import fetch from "node-fetch";

export async function correctWriting(text) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an English teacher correcting student writing. Always respond in valid JSON."
        },
        {
          role: "user",
          content: `Correct this writing and return JSON:
{
  "corrected_text": "...",
  "errors": [{"original": "...", "correction": "...", "explanation": "..."}],
  "suggestions": ["..."],
  "score": {"grammar": 0-10, "vocabulary": 0-10, "coherence": 0-10, "task_response": 0-10},
  "feedback": "..."
}

Writing: ${text}`
        }
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error("Empty response from OpenAI");
  }
  return data.choices[0].message.content;
}
