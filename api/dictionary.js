import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { word } = req.body;
  if (!word || !word.trim()) return res.status(400).json({ error: "No word provided" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Dictionary service is not configured" });
  }

  const query = word.trim().slice(0, 150);
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const systemPrompt = `You are a professional English dictionary. Given a word, phrase, idiom, or phrasal verb, return a structured dictionary entry as a JSON object.

Return ONLY a valid JSON object with this exact structure:
{
  "word": "the word or phrase as supplied",
  "phonetic": "/IPA transcription/",
  "meanings": [
    {
      "partOfSpeech": "noun",
      "definitions": [
        {
          "definition": "clear definition suitable for B2/C1 English learners",
          "example": "a natural example sentence using the word in context"
        }
      ],
      "synonyms": ["synonym1", "synonym2"]
    }
  ]
}

Rules:
- Include 1–3 of the most important meanings / parts of speech
- Provide 1–2 definitions per meaning
- Always include at least one example sentence per definition
- Include 2–4 relevant synonyms per part of speech when applicable
- Use standard IPA notation for phonetics (e.g. /ˈwɜːrd/)
- Definitions should be clear and appropriate for B2/C1 English learners
- For phrasal verbs and idioms, treat the whole phrase as a single headword
- Return ONLY the JSON object with no extra text or markdown`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Look up: "${query}"` },
        ],
        max_tokens: 700,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from OpenAI");

    const entry = JSON.parse(content);
    // Return as array to stay compatible with dictionaryapi.dev response shape
    return res.status(200).json([entry]);
  } catch (err) {
    console.error("Dictionary error:", err);
    return res.status(500).json({ error: "Error looking up word" });
  }
}
