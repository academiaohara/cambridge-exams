# Test Generator Scripts

## `generate_test.py`

Generates a complete Cambridge CAE (C1 Advanced) practice test automatically using:

- **OpenAI API** – generates all 18 JSON exercise files
- **Azure Cognitive Services (TTS)** – generates the 4 listening audio files (MP3)
- **Bunny CDN** – uploads the audio files to the CDN

### Installation

```bash
pip install -r scripts/requirements.txt
```

> **Note:** `ffmpeg` is required by `pydub` for MP3 export.  
> Install it with: `apt install ffmpeg` (Linux) or `brew install ffmpeg` (macOS).

### Configuration

Create a `.env` file in the project root (or set environment variables):

```env
OPENAI_API_KEY=sk-...
AZURE_SPEECH_KEY=...
AZURE_REGION=westeurope
BUNNY_API_KEY=...
BUNNY_STORAGE_ZONE=audios-examen
BUNNY_PULL_ZONE=listeninggenerator
```

### Usage

```bash
# Generate the next test automatically (e.g. Test16 if Test15 is the last)
python scripts/generate_test.py

# Generate a specific test number
python scripts/generate_test.py --test-number 16

# Generate only JSON files (no audio)
python scripts/generate_test.py --json-only

# Generate only audio from existing JSON (no new JSON)
python scripts/generate_test.py --audio-only

# Generate specific parts only
python scripts/generate_test.py --parts listening4
python scripts/generate_test.py --parts listening1 listening2 reading1

# Generate JSON and audio but do NOT upload to Bunny
python scripts/generate_test.py --no-upload
```

### What gets generated

| File | Type | Description |
|------|------|-------------|
| `listening1.json` | Multiple choice | 3 short extracts, 6 questions |
| `listening2.json` | Sentence completion | 1 monologue, 8 questions |
| `listening3.json` | Multiple choice | 1 interview, 6 questions |
| `listening4.json` | Dual matching | 5 speakers, 10 questions |
| `reading1.json` | Multiple-choice cloze | 8 gaps |
| `reading2.json` | Open cloze | 8 gaps |
| `reading3.json` | Word formation | 8 gaps |
| `reading4.json` | Key word transformations | 6 questions |
| `reading5.json` | Multiple choice long text | 6 questions |
| `reading6.json` | Cross-text matching | 4 texts, 4 questions |
| `reading7.json` | Gapped text | 6 paragraphs to insert |
| `reading8.json` | Multiple matching | 4 texts, 10 questions |
| `speaking1.json` | Interview | 3 phases |
| `speaking2.json` | Long turn (photos) | 2 tasks, 6 images |
| `speaking3.json` | Collaborative discussion | 5 options |
| `speaking4.json` | Discussion | 3 questions |
| `writing1.json` | Essay (compulsory) | model answer included |
| `writing2.json` | Optional tasks | report, letter, review |

Audio files generated and uploaded to Bunny CDN:

- `listening1_Test N.mp3`
- `listening2_Test N.mp3`
- `listening3_Test N.mp3`
- `listening4_Test N.mp3`

### Speaking Part 2 – Images

`speaking2.json` image URLs follow the pattern:

```
https://listeninggenerator.b-cdn.net/testN_1a.jpg  (through _1f.jpg)
```

**The images are NOT generated automatically.** You must:

1. Read the `description` field for each image in `speaking2.json` to understand what scene is needed.
2. Search Google Images (or a stock-photo site) for a suitable photo.
3. Download and upload the 6 image files to Bunny CDN as:
   - `testN_1a.jpg`, `testN_1b.jpg`, `testN_1c.jpg` (Candidate A's images)
   - `testN_1d.jpg`, `testN_1e.jpg`, `testN_1f.jpg` (Candidate B's images)

### Notes

- If a JSON file already exists, it is **skipped** (delete it to regenerate).
- `Nivel/C1/Exams/index.json` is updated automatically to include the new test.
- All API calls use environment variables; keys are **never** hard-coded.
