import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, phases, examLevel } = req.body;
  if (!phases || !Array.isArray(phases) || !phases.length) {
    return res.status(400).json({ error: "No phases provided" });
  }

  const level = examLevel || "C1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const phasesText = phases.map(p =>
    `Fase ${p.id} - ${p.name}:\n${p.questions.map(q => `- ${q}`).join('\n')}`
  ).join('\n\n');

  const systemPrompt = `Eres un examinador de Cambridge ${level}. Tienes 3 fases de preguntas para la entrevista oral.

${phasesText}

REGLAS:
- Puedes repetir o reformular preguntas de la fase actual para que el candidato hable más.
- REGLA DE ORO: Una vez que hayas pasado a una pregunta de la Fase 2, nunca vuelvas a la Fase 1. Cuando pases a la Fase 3, las fases anteriores quedan cerradas.
- Selecciona la pregunta de la fase actual que mejor conecte con la última respuesta del usuario.
- Cuando hayas completado las 3 fases y tengas suficiente material para evaluar al candidato (al menos 2 preguntas por fase respondidas), escribe EXACTAMENTE y únicamente: [END_INTERVIEW]
- Responde SOLO con la siguiente pregunta para el candidato, sin explicaciones adicionales, sin incluir el número de fase ni el nombre de la pregunta.`;

  const conversationMessages = [
    { role: "system", content: systemPrompt },
    ...(messages || []).map(m => ({
      role: m.role === "examiner" ? "assistant" : "user",
      content: m.text || ""
    }))
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content || content === "[END_INTERVIEW]") {
      return res.status(200).json({ end: true });
    }

    return res.status(200).json({ question: content });
  } catch (err) {
    console.error("Speaking interview error:", err);
    return res.status(500).json({ error: "Error generating interview question" });
  }
}
