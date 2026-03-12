import { evaluateSpeaking } from "../js/services/ai/speakingProvider.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { transcripts, allMessages, partType, examLevel } = req.body;
  if (!transcripts || !Array.isArray(transcripts) || !transcripts.length) {
    return res.status(400).json({ error: "No transcripts provided" });
  }

  const candidateText = transcripts.join(' ').trim();
  if (candidateText.length < 5) {
    return res.status(400).json({ error: "Speaking response too short" });
  }

  try {
    const evaluation = await evaluateSpeaking(transcripts, allMessages, partType, examLevel);
    res.status(200).json({ evaluation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error evaluating speaking" });
  }
}
