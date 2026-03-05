import { correctWriting } from "../js/services/ai/writingProvider.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: "No text provided" });

  // Word count validation
  const words = text.trim().split(/\s+/).length;
  const minWords = 120;
  const maxWords = 250;

  if (words < minWords) return res.status(400).json({ error: "Writing too short" });
  if (words > maxWords) return res.status(400).json({ error: "Writing too long" });

  try {
    const corrected = await correctWriting(text);
    res.status(200).json({ corrected });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error correcting writing" });
  }
}
