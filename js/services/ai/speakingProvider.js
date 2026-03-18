import fetch from "node-fetch";

export async function evaluateSpeaking(transcripts, allMessages, partType, examLevel) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const level = examLevel || "C1";

  const levelDescriptors = {
    A2: { name: "A2 Key", cefr: "A2", expectation: "Simple, basic language with limited vocabulary. Short responses. Basic connectors." },
    B1: { name: "B1 Preliminary", cefr: "B1", expectation: "Straightforward language. Some extended responses. Basic cohesive devices." },
    B2: { name: "B2 First", cefr: "B2", expectation: "Good range of vocabulary and structures. Can sustain interaction. Clear and detailed responses." },
    C1: { name: "C1 Advanced", cefr: "C1", expectation: "Wide range of sophisticated vocabulary and complex grammatical structures. Fluent interaction with minimal hesitation. Effective discourse management." },
    C2: { name: "C2 Proficiency", cefr: "C2", expectation: "Exceptional command. Near-native fluency. Sophisticated interaction with nuanced expression." }
  };

  const partDescriptions = {
    1: "Part 1 (Interview): The examiner asks the candidate personal questions about themselves, opinions, and experiences.",
    2: "Part 2 (Long Turn): The candidate compares photographs and answers a question about them, speaking for about 1 minute.",
    3: "Part 3 (Collaborative Task): The candidate discusses options with a partner, negotiating and reaching a decision together.",
    4: "Part 4 (Discussion): The examiner leads a discussion on topics related to the collaborative task, requiring extended and substantiated opinions."
  };

  const desc = levelDescriptors[level] || levelDescriptors["C1"];
  const partDesc = partDescriptions[partType] || "Speaking exercise";

  // Build conversation transcript
  const conversationText = allMessages
    ? allMessages.map(m => `${m.role.toUpperCase()}: ${m.text || '(no response)'}`).join('\n')
    : transcripts.join('\n');

  const candidateText = transcripts.join(' ');

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
          content: `You are a strict and experienced Cambridge English ${desc.name} (CEFR ${desc.cefr}) speaking examiner. You must evaluate the candidate's speaking performance using the official Cambridge assessment criteria.

EXAM CONTEXT: ${partDesc}

LEVEL EXPECTATIONS FOR ${desc.cefr}:
${desc.expectation}

NOTE: You are evaluating a text transcript of the candidate's speech. For pronunciation, assess based on what you can infer from the text (e.g., word choice suggesting awareness of phonological features, appropriate stress patterns in word usage). If pronunciation cannot be properly assessed from text alone, give a moderate score (5/10) and note this limitation.

ASSESSMENT CRITERIA (Cambridge Speaking Assessment Scale):

The assessor awards marks for each of 5 analytical criteria (0-5 each, then DOUBLED to give 0-10 per criterion):
1. Grammatical Resource (0-5, doubled = 0-10): Range and accuracy of grammatical forms. Does the candidate use a variety of structures appropriate to ${desc.cefr}?
2. Lexical Resource (0-5, doubled = 0-10): Range and appropriacy of vocabulary. Does the candidate use vocabulary appropriate to ${desc.cefr} with precision?
3. Discourse Management (0-5, doubled = 0-10): Coherence, extent, and relevance of contributions. Does the candidate produce extended stretches of language with ease?
4. Pronunciation (0-5, doubled = 0-10): Intelligibility, phonological features, stress and intonation. (Assess from text where possible.)
5. Interactive Communication (0-5, doubled = 0-10): Ability to interact, initiate, and respond appropriately. Does the candidate maintain and develop the interaction?

The interlocutor awards a mark for Global Achievement (0-5, multiplied by 5 = 0-25):
6. Global Achievement (0-5, ×5 = 0-25): Overall effectiveness of the candidate's communication. How well does the candidate handle communication at ${desc.cefr} level?

Half marks (e.g., 3.5/5) are allowed for the raw criteria scores.

Total marks available: (5×10) + 25 = 75

SCORING GUIDELINES:
- 5/5 = Exceptional performance at this level
- 4/5 = Good, competent performance
- 3/5 = Satisfactory, adequate
- 2/5 = Below standard, noticeable weaknesses
- 1/5 = Poor, serious deficiencies
- 0/5 = Not assessable / no meaningful attempt

Respond in plain natural language (NOT JSON). Structure your response exactly like this:

📊 SCORES

• Grammatical Resource: X/10 (raw: Y/5 ×2)
• Lexical Resource: X/10 (raw: Y/5 ×2)
• Discourse Management: X/10 (raw: Y/5 ×2)
• Pronunciation: X/10 (raw: Y/5 ×2)
• Interactive Communication: X/10 (raw: Y/5 ×2)
• Global Achievement: X/25 (raw: Y/5 ×5)
• Total: XX/75

📝 DETAILED FEEDBACK

Grammatical Resource:
[Feedback on grammar range and accuracy]

Lexical Resource:
[Feedback on vocabulary range and precision]

Discourse Management:
[Feedback on coherence and extended speech]

Pronunciation:
[Feedback on what can be assessed from text, note limitations]

Interactive Communication:
[Feedback on interaction quality]

Global Achievement:
[Overall assessment of communication effectiveness]

✅ STRENGTHS
[List 2-3 specific strengths with examples from the transcript]

⚠️ AREAS FOR IMPROVEMENT
[List 2-4 specific areas to improve with concrete suggestions]

🔍 FILLERS & VAGUE LANGUAGE
[Identify any simple fillers or vague language used (e.g., "like", "ehh", "umm", "stuff", "things", "kind of", "sort of", "you know"). For each one found, suggest a natural C1-level alternative (e.g., "What I mean to say is...", "To put it another way...", "That is to say...", "What springs to mind is...", "In other words..."). If no significant fillers were detected in the transcript, state this positively.]

📈 THE UPGRADE LIST
[List exactly 5 C1/C2 expressions or phrases that would have fitted naturally into what the candidate said. For each one, briefly note in which part of their response they could have used it and why it would enhance their score.]${partType === 2 ? `

🎯 SPECULATION CHECK
[Assess whether the candidate speculated about feelings, motivations, and situations in the photographs (correct approach) or merely described what they could see literally (incorrect approach). Quote specific examples from the transcript. If they speculated well, confirm this with examples. If they only described, give 2 examples of how they could have rephrased their descriptions as speculations using modal verbs such as "must be", "could be experiencing", "might suggest", "appears to be", "seems as though".]` : ''}${partType === 3 ? `

💬 INTERACTIVE CHECK
[Assess whether the candidate invited their partner to speak and managed turn-taking effectively (correct approach) or monopolised the conversation (incorrect approach). Quote specific examples from the transcript. Count or estimate how many times they used inviting phrases (e.g., "What do you think?", "I'd be curious to hear your view on...", "Don't you think that...?"). If they did not invite the partner to speak, provide 3 example phrases they could have used.]` : ''}`
        },
        {
          role: "user",
          content: `Evaluate this Cambridge ${desc.name} (${desc.cefr}) speaking performance.

${partDesc}

Full conversation transcript:
${conversationText}

Candidate's responses only:
${candidateText}`
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
