# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

This is a static SPA (HTML/CSS/JS) with no build step. The `package.json` dependencies (`dotenv`, `node-fetch`, `openai`) are only for the Vercel serverless functions in `/api/`.

### Running the application

Start a static HTTP server from the repo root:

```bash
python3 -m http.server 8080
```

The app is then available at `http://localhost:8080`. All routing is handled client-side by `js/router.js`.

### Linting / Testing

There is no configured linter (no ESLint/Prettier) and no automated test framework. Validate changes by:
- Checking JavaScript syntax: `node --check js/<file>.js`
- Serving the app and verifying behavior in the browser

### API (Serverless Functions)

The `/api/` directory contains Vercel serverless functions for AI features (writing evaluation, speaking partner, dictionary). These require:
- `OPENAI_API_KEY` environment variable
- `npm install` to install dependencies

To run them locally: `npx vercel dev` (requires Vercel CLI and OpenAI API key). The core exam functionality works without these endpoints.

### Key caveats

- The `<base href="/">` tag in `index.html` means all relative URLs resolve from root; the HTTP server must serve from the repo root directory.
- Exam data lives under `Nivel/{B1,B2,C1}/Exams/` as JSON files; each test is a directory (e.g., `Test1/reading1.json`).
- User progress is stored in `localStorage`; there is no database to configure.
- External CDN resources (Google Fonts, Font Awesome, Supabase JS) require internet access but are not critical for core exam functionality during development.
