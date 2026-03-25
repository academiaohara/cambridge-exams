import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, taskInstructions, imageDescriptions, isMainTurn, followUpQuestion, examLevel, mode, task, options } = req.body;
  const level = examLevel || "C1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  let systemPrompt;
  if (mode === 'collaborative') {
    const recentContext = (messages || []).slice(-8)
      .map(m => `${m.role.toUpperCase()}: ${m.text || ""}`)
      .join("\n");
    const optionsList = (options || []).map((o, i) => `${i + 1}. ${o}`).join("\n");
    systemPrompt = `You are a ${level} level English language learner in a Cambridge C1 Speaking exam (Part 3: Collaborative Task). You are having a discussion with another candidate about a set of options.

TASK: ${task || "Discuss the options and reach a decision together."}

OPTIONS:
${optionsList || "The various options presented."}

RECENT CONVERSATION:
${recentContext}

Generate a natural, engaged contribution of 40-80 words. Express an opinion about one or more options, build on what was already said, ask your partner's view, or help move the discussion forward. Use ${level}-level vocabulary and discourse markers. Sound spontaneous and collaborative. Output only the spoken text with no meta-commentary.`;
  } else if (mode === 'discussion') {
    const recentContext = (messages || []).slice(-6)
      .map(m => `${m.role.toUpperCase()}: ${m.text || ""}`)
      .join("\n");
    systemPrompt = `You are a ${level} level English language learner in a Cambridge C1 Speaking exam (Part 4: Discussion). The examiner is asking questions on a topic and you are discussing with another candidate.

RECENT CONVERSATION:
${recentContext}

Generate a natural, thoughtful response of 40-80 words. Develop an opinion, use examples or reasons, and engage genuinely with the topic. Use ${level}-level vocabulary and grammar. Sound natural and spontaneous. Output only the spoken text with no meta-commentary.`;
  } else if (isMainTurn) {
    systemPrompt = `You are a ${level} level English language learner in a Cambridge Speaking exam (Part 2 Long Turn). Your task is to compare two photographs and address the task question.

TASK: ${taskInstructions || "Compare the two pictures."}

PHOTOS (descriptions for context):
${imageDescriptions || "Two photographs."}

Generate a realistic, natural spoken response of about 120-150 words (roughly one minute of speech). Compare both photos, addressing the task question. Use ${level}-level vocabulary and grammar. Sound natural and spontaneous — include discourse markers, hedging language, and coherent comparisons. Vary your opening; don't always start the same way. Output only the spoken text with no meta-commentary.`;
  } else {
    const recentContext = (messages || []).slice(-6)
      .map(m => `${m.role.toUpperCase()}: ${m.text || ""}`)
      .join("\n");
    systemPrompt = `You are a ${level} level English language learner in a Cambridge Speaking exam. The examiner has asked you a brief follow-up question about photographs your partner just described. Give a short, natural 2-4 sentence response (20-40 words). Do not repeat the question. Sound genuine.

QUESTION: ${followUpQuestion || "What do you think?"}

PHOTOS CONTEXT:
${imageDescriptions || ""}

RECENT CONVERSATION:
${recentContext}

Output only the spoken text.`;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the candidate's spoken response now." }
        ],
        max_tokens: 350,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from OpenAI");

    return res.status(200).json({ response: content });
  } catch (err) {
    console.error("Speaking partner error:", err);
    return res.status(500).json({ error: "Error generating partner response" });
  }
}
