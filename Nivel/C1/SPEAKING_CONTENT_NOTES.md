# Speaking Content Notes — C1 Level (Tests 16–50)

This file is a reference for AI agents to quickly understand the speaking content structure
and resume work on Tests 26–50 without needing to re-read all existing files.

---

## File Structure Reference

Each test (TestN) needs **3 files**: `speaking2.json`, `speaking3.json`, `speaking4.json`.
(speaking1.json uses a different format — phases/questions — and is handled separately.)

### speaking2.json — Part 2: Photo Comparison
```json
{
  "title": "Speaking - Part 2",
  "time": 1.5,
  "totalQuestions": 2,
  "description": "Compare the photographs and answer the questions.",
  "content": {
    "tasks": [
      {
        "id": "NA",                  // e.g. "26A"
        "candidate": "Candidate A",
        "topic": "Topic label",
        "instructions": "Compare two of the pictures, and say ...",
        "images": [
          { "label": "A", "url": "https://listeninggenerator.b-cdn.net/testN_1a.jpg", "description": "..." },
          { "label": "B", "url": "https://listeninggenerator.b-cdn.net/testN_1b.jpg", "description": "..." },
          { "label": "C", "url": "https://listeninggenerator.b-cdn.net/testN_1c.jpg", "description": "..." }
        ],
        "followUp": { "recipient": "Candidate B", "question": "...? (Why?)" }
      },
      {
        "id": "NB",                  // e.g. "26B"
        "candidate": "Candidate B",
        "topic": "Topic label",
        "instructions": "Compare two of the pictures, and say ...",
        "images": [
          { "label": "D", "url": "https://listeninggenerator.b-cdn.net/testN_1d.jpg", "description": "..." },
          { "label": "E", "url": "https://listeninggenerator.b-cdn.net/testN_1e.jpg", "description": "..." },
          { "label": "F", "url": "https://listeninggenerator.b-cdn.net/testN_1f.jpg", "description": "..." }
        ],
        "followUp": { "recipient": "Candidate A", "question": "...? (Why?)" }
      }
    ]
  }
}
```
- **Image URLs**: `https://listeninggenerator.b-cdn.net/testN_1{a|b|c|d|e|f}.jpg`
  (Task A uses labels A/B/C and suffix a/b/c; Task B uses labels D/E/F and suffix d/e/f)
- **Instructions** must start with: `"Compare two of the pictures, and say ..."`
- **Follow-up** questions end with `(Why?)` or similar prompt.

### speaking3.json — Part 3: Collaborative Discussion
```json
{
  "title": "Speaking - Part 3",
  "type": "multiple-choice-text",
  "time": 1.5,
  "totalQuestions": 6,
  "description": "Discuss the options shown with your partner for about two minutes, then decide together which two would be most effective.",
  "content": {
    "task": "Discuss the following [X], then decide which two [Y].",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"],
    "participants": ["examiner", "candidate", "partner"],
    "script": [
      { "role": "examiner", "text": "Now, I'd like you to talk about something together for about two minutes. ..." },
      { "role": "partner", "text": "" },
      { "role": "candidate", "text": "" },
      { "role": "examiner", "text": "Now decide which two ..." },
      { "role": "partner", "text": "" },
      { "role": "candidate", "text": "" }
    ]
  }
}
```
- Always **5 options** to discuss.
- Script always has 6 turns: examiner → partner → candidate → examiner → partner → candidate.
- Part 3 and Part 4 of the **same test must share the same broad topic/theme**.

### speaking4.json — Part 4: Extended Discussion
```json
{
  "title": "Speaking - Part 4",
  "type": "multiple-choice-text",
  "time": 2.5,
  "totalQuestions": 6,
  "description": "The examiner will ask you questions related to the theme from Part 3. Express and develop your opinions with your partner.",
  "content": {
    "task": "Discussion on [theme from Part 3].",
    "questions": [
      { "number": 1, "question": "Question 1?" },
      { "number": 2, "question": "Question 2?" }
    ],
    "participants": ["examiner", "candidate", "partner"],
    "script": [
      { "role": "examiner", "text": "Opening statement/question for discussion." },
      { "role": "candidate", "text": "" },
      { "role": "partner", "text": "" },
      { "role": "examiner", "text": "Thank you. That is the end of the test." }
    ]
  }
}
```
- Usually **2 questions** (some tests have 3, e.g. Test 13).
- Script: examiner opens → candidate → partner → examiner closes with "Thank you. That is the end of the test."

---

## Topics Already Used (Tests 1–25)

| Test | Part 2 Task A         | Part 2 Task B               | Part 3/4 Theme              |
|------|-----------------------|-----------------------------|------------------------------|
| 1    | (see file)            | (see file)                  | (see file)                   |
| 2    | (see file)            | (see file)                  | (see file)                   |
| ...  | ...                   | ...                         | ...                          |
| 13   | Facing difficulties   | Living in different climates| Art & creativity             |
| 14   | (see file)            | (see file)                  | (see file)                   |
| 15   | Memorable moments     | Looking at art              | Space exploration            |
| 16   | Types of workplaces   | Job applications            | Work & career / future of work|
| 17   | Staying active        | Relaxation and rest         | Public health                |
| 18   | People using technology| Technology in education    | Technology & communication   |
| 19   | Types of holiday      | Ways of travelling          | Travel & tourism             |
| 20   | Preparing food        | Eating experiences          | Food choices & sustainability|
| 21   | Learning environments | Approaches to learning      | Education system & purpose   |
| 22   | Environmental challenges| People and nature          | Climate change & environment |
| 23   | Live entertainment    | Ways of consuming media     | Social media & entertainment |
| 24   | Community involvement | Urban and rural life        | Social inequality            |
| 25   | Scientific research   | Modern innovations          | Science, ethics & society    |

---

## Suggested Topics for Tests 26–50

The following topics have NOT been used yet and are suitable for C1-level speaking exams.
Each row suggests coherent Part 2 photo topics and a linked Part 3/4 discussion theme.

| Test | Part 2 Task A (Candidate A)       | Part 2 Task B (Candidate B)          | Part 3/4 Theme                        |
|------|-----------------------------------|--------------------------------------|---------------------------------------|
| 26   | Volunteering abroad               | Cultural exchange programmes         | Globalisation & cultural identity     |
| 27   | Working in a team / meetings      | Leadership styles                    | Business & entrepreneurship           |
| 28   | Elderly people & technology       | Intergenerational activities         | Ageing population & society           |
| 29   | People reading / in libraries     | Digital reading / e-books            | Books, reading & literacy             |
| 30   | Types of housing                  | Moving to a new place                | Housing & urban planning              |
| 31   | Children playing outdoors         | Children using screens               | Childhood & parenting                 |
| 32   | Fashion and shopping              | Sustainable clothing                 | Fashion industry & consumerism        |
| 33   | Charity work / fundraising        | Non-profit organisations             | Charities & social responsibility     |
| 34   | Public transport                  | Cars & cycling in cities             | Urban mobility & transport policy     |
| 35   | Journalism & news reporting       | Fake news / online information       | Media literacy & freedom of press     |
| 36   | Museum / cultural heritage        | Preserving historic buildings        | Heritage, culture & identity          |
| 37   | Competitive sports                | Non-competitive / recreational sport | Sport, competition & values           |
| 38   | Immigration & new arrivals        | Multicultural communities            | Migration & cultural diversity        |
| 39   | Healthcare workers / hospitals    | Alternative medicine                 | Healthcare & wellbeing systems        |
| 40   | Languages & language learning     | Bilingual education                  | Language, identity & communication    |
| 41   | Water scarcity                    | Recycling & waste management         | Natural resources & sustainability    |
| 42   | Prison & rehabilitation           | Crime prevention in communities      | Crime, justice & rehabilitation       |
| 43   | Protests & activism               | Voting & political participation     | Democracy & civic engagement          |
| 44   | Rural poverty                     | Urban homelessness                   | Poverty, welfare & social support     |
| 45   | Remote communities                | Aid workers in developing regions    | International development & aid       |
| 46   | People celebrating traditions     | Cultural festivals                   | Traditions, identity & globalisation  |
| 47   | Robots in factories               | AI in service industries             | Automation & the future of jobs       |
| 48   | Extreme sports / risk-taking      | Pushing personal limits              | Risk, courage & personal development  |
| 49   | Conflicts & peacekeeping          | Diplomacy & international relations  | War, peace & international cooperation|
| 50   | Wildlife conservation             | Biodiversity & endangered species    | Conservation & human impact on nature |

---

## How to Create a New Test Quickly

1. Pick the test number N (26–50) from the table above.
2. Copy the schemas from the "File Structure Reference" section above.
3. Fill in:
   - **speaking2.json**: Replace N in IDs and image URLs. Write 6 image descriptions (A–F). Set topics, instructions, and follow-up questions.
   - **speaking3.json**: Write a `task` sentence (discuss X, decide which two Y), add 5 options, use the fixed script structure.
   - **speaking4.json**: Write 2 discussion questions linked to the Part 3 theme, add an examiner opening statement for the script.
4. Make sure Part 3 and Part 4 share the same broad theme.
5. Save files to `Nivel/C1/Exams/TestN/`.

**No changes to index.json are needed** — all 50 tests are already registered as "available".

---

## Quick Validation Checklist

Before committing:
- [ ] speaking2: 2 tasks, each with exactly 3 images (labels A/B/C and D/E/F)
- [ ] speaking2: Image URLs follow `testN_1{a-f}.jpg` pattern
- [ ] speaking2: Each task has a `followUp` with `recipient` and `question`
- [ ] speaking3: Exactly 5 options
- [ ] speaking3: Script has 6 turns (examiner, partner, candidate, examiner, partner, candidate)
- [ ] speaking4: 2 questions (or 3 if desired)
- [ ] speaking4: Script ends with `"Thank you. That is the end of the test."`
- [ ] Parts 3 and 4 share the same broad topic
- [ ] All JSON is valid (no trailing commas, proper quotes)
