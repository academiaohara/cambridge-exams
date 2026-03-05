import fetch from "node-fetch";

export async function correctWriting(text, taskType, taskPrompt) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const taskContext = taskType && taskPrompt
    ? `\nTask type: ${taskType}\nTask prompt: ${taskPrompt}`
    : '';

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `You are a Cambridge English C1 Advanced examiner. Evaluate the student's writing using the official Cambridge assessment criteria. Award 0-5 marks (whole numbers only) for each criterion:

1. Content — Has the candidate dealt with all parts of the task? Is the target reader fully informed?
2. Communicative Achievement — Is the writing appropriate for the task type? Does it hold the reader's attention?
3. Organisation — Is the text well-organised with clear paragraphing and cohesive devices?
4. Language — Is there a range of vocabulary and grammatical structures? How accurate is the language?

IMPORTANT: If the student's writing is completely off-topic and does not address the task prompt at all, ALL scores must be 0/5 (Total: 0/20). Clearly state this is because the writing does not address the required topic.

Respond in plain natural language (NOT JSON). Structure your response exactly like this:

📊 SCORES

• Content: X/5
• Communicative Achievement: X/5
• Organisation: X/5
• Language: X/5
• Total: XX/20

✏️ CORRECTED TEXT
[Reproduce the student's full text but mark corrections: use ~~wrong text~~ for errors/text to remove and ++corrected text++ for the correct replacement. Only mark actual errors. Keep correct parts unchanged.]

📝 DETAILED FEEDBACK

Content:
[Your feedback on content]

Communicative Achievement:
[Your feedback on communicative achievement]

Organisation:
[Your feedback on organisation]

Language:
[Your feedback on language]

✅ STRENGTHS
[List main strengths]

⚠️ AREAS FOR IMPROVEMENT
[List areas to work on with specific suggestions]`
        },
        {
          role: "user",
          content: `Evaluate this Cambridge C1 writing:${taskContext}

Student's writing:
${text}`
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
