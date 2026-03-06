import fetch from "node-fetch";

export async function correctWriting(text, taskType, taskPrompt, examLevel) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const level = examLevel || "C1";

  const taskContext = taskType && taskPrompt
    ? `\nTask type: ${taskType}\nTask prompt: ${taskPrompt}`
    : '';

  const levelDescriptors = {
    A2: { name: "A2 Key", cefr: "A2", expectation: "Simple, basic language with limited vocabulary. Short, simple sentences. Basic connectors (and, but, because). Expect frequent errors in grammar and spelling." },
    B1: { name: "B1 Preliminary", cefr: "B1", expectation: "Straightforward language with some range. Mostly simple sentences with some complex ones. Basic cohesive devices. Some grammatical errors are acceptable but meaning should be clear." },
    B2: { name: "B2 First", cefr: "B2", expectation: "Good range of vocabulary and structures. Mix of simple and complex sentences. Clear organisation with paragraphing. Errors occur but do not impede communication." },
    C1: { name: "C1 Advanced", cefr: "C1", expectation: "Wide range of sophisticated vocabulary and complex grammatical structures used accurately and appropriately. Effective use of cohesive devices. Minimal errors, and only in less common structures." },
    C2: { name: "C2 Proficiency", cefr: "C2", expectation: "Exceptional command of vocabulary and grammar. Virtually error-free. Highly sophisticated style appropriate to the task. Seamless text organisation." }
  };

  const desc = levelDescriptors[level] || levelDescriptors["C1"];

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
          content: `You are a strict and experienced Cambridge English ${desc.name} (CEFR ${desc.cefr}) examiner. You must evaluate the student's writing using the official Cambridge assessment criteria for the ${desc.cefr} level. Be rigorous and realistic in your scoring.

LEVEL EXPECTATIONS FOR ${desc.cefr}:
${desc.expectation}

CRITICAL SCORING RULES:
- A score of 5/5 means EXCEPTIONAL, near-native performance with virtually no errors. This should be extremely rare.
- A score of 4/5 means GOOD performance with minor issues. This is a strong result.
- A score of 3/5 means SATISFACTORY — adequate but with noticeable weaknesses.
- A score of 2/5 means BELOW STANDARD — significant weaknesses that affect communication.
- A score of 1/5 means POOR — serious deficiencies throughout.
- A score of 0/5 means the criterion is not met at all (e.g., completely off-topic for Content).

IMPORTANT — LEVEL MISMATCH DETECTION:
If the writing clearly demonstrates a LOWER proficiency level than ${desc.cefr} (e.g., using only basic B1-level vocabulary and grammar in a ${desc.cefr} exam), you MUST score harshly:
- Simple vocabulary where sophisticated lexis is expected → Language: max 2/5
- Only basic sentence structures (no subordination, no inversions, no cleft sentences for C1/C2) → Language: max 2/5
- Generic, undeveloped ideas without depth or nuance → Content: max 3/5
- Lack of register awareness or inappropriate tone for the task type → Communicative Achievement: max 2/5
- AI-generated or overly generic/formulaic writing that lacks genuine engagement with the topic → max 3/5 per criterion

Award 0-5 marks (whole numbers only) for each of these 4 criteria:
1. Content — Has the candidate addressed ALL parts of the task with relevant, well-developed ideas? Is the target reader fully informed? Penalise superficial treatment.
2. Communicative Achievement — Is the writing appropriate for the task type and register? Does it use conventions of the task type effectively? Does it hold the reader's attention and achieve its communicative purpose?
3. Organisation — Is the text well-structured with clear paragraphing, effective use of cohesive devices, and logical progression? Are ideas linked coherently?
4. Language — Is there a WIDE range of vocabulary and grammatical structures appropriate for ${desc.cefr}? How accurate is the language? Penalise repetitive or basic vocabulary.

If the student's writing is completely off-topic, ALL scores must be 0/5 (Total: 0/20).

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
[Your detailed feedback on content — explain what was done well and what was lacking]

Communicative Achievement:
[Your detailed feedback — was the register appropriate? Did it achieve its purpose?]

Organisation:
[Your detailed feedback — comment on paragraphing, cohesion, logical flow]

Language:
[Your detailed feedback — comment on vocabulary range, grammatical accuracy, sophistication level relative to ${desc.cefr}]

✅ STRENGTHS
[List 2-4 specific strengths with examples from the text]

⚠️ AREAS FOR IMPROVEMENT
[List 3-5 specific areas to improve with concrete suggestions and examples of how to enhance the writing to ${desc.cefr} level]`
        },
        {
          role: "user",
          content: `Evaluate this Cambridge ${desc.name} (${desc.cefr}) writing:${taskContext}

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
