# Phrasal Verbs Academy

An interactive web application for learning English phrasal verbs through a vertical progression map.

## Overview

A "learning tree" style application where users progress through CEFR levels (A2, B1, B2, C1, C2) by completing explanation points and exercises. The interface features a 3-column layout: central progression map with side widgets.

## Features

- **Vertical Progression Map**: Visual learning path with color-coded nodes
  - Blue dots = Explanations (learn new phrasal verbs)
  - Green dots = Exercises (practice what you've learned)
  - Yellow dots = Review points (mixed practice)
  - Trophy = Final challenge (unlock next level)
- **6 Exercise Types**: Fill-in-the-blank, choose-particle, word reorder, dialogue completion, multiple choice, pronoun placement
- **Review Mixer**: Customizable review sessions mixing levels and question types
- **Progress Tracking**: Local storage saves your progress, favorites, and mistakes
- **Responsive Design**: Works on desktop and mobile with collapsible sidebars

## Project Structure

```
src/
├── assets/
│   ├── css/
│   │   └── styles.css          # All styles (map, widgets, exercises, responsive)
│   ├── js/
│   │   ├── main.js             # App initialization, state management, localStorage
│   │   ├── map.js              # Vertical progression map rendering
│   │   ├── widgets.js          # Sidebar widgets (categories, review mixer, favorites)
│   │   └── exercises.js        # Exercise rendering and interaction for all types
│   └── img/                    # Image assets (placeholder)
├── data/
│   ├── index.json              # Master file with all levels structure
│   └── phrasal-verbs/
│       ├── level-A2/           # Elementary level lessons
│       │   ├── lesson-1-daily-routine.json
│       │   ├── lesson-2-home.json
│       │   ├── lesson-3-movement.json
│       │   ├── review-lessons-1-3.json
│       │   └── final-challenge-A2.json
│       ├── level-B1/           # Intermediate level lessons
│       │   └── lesson-1-relationships.json
│       ├── level-B2/           # Upper-Intermediate (coming soon)
│       ├── level-C1/           # Advanced (coming soon)
│       └── level-C2/           # Proficiency (coming soon)
├── index.html                  # Main application page
└── README.md                   # This file
```

## Getting Started

1. Serve the `src/` directory with any static file server:

   ```bash
   cd src
   python3 -m http.server 8080
   ```

2. Open `http://localhost:8080` in your browser.

## JSON Data Format

Each lesson file follows a consistent structure. See `data/phrasal-verbs/level-A2/lesson-1-daily-routine.json` for a complete example.

### Point Types

- **explanation**: Teaches a phrasal verb with definition, grammar, examples, and notes
- **exercises**: Collection of interactive questions to practice

### Exercise Types

| Type | Description |
|------|-------------|
| `fill-blank` | Complete the sentence with the correct phrasal verb |
| `choose-particle` | Select the correct particle (on, off, up, down, etc.) |
| `multiple-choice` | Choose the correct answer from options |
| `reorder` | Arrange scrambled words into the correct order |
| `dialogue` | Complete a dialogue with the appropriate phrasal verb |
| `pronoun-exercise` | Rewrite a sentence placing the pronoun correctly |

## Technical Details

- **Vanilla HTML/CSS/JavaScript** — no build step or framework required
- **Local Storage** for saving progress, favorites, and mistake history
- **Responsive design** with collapsible sidebars on mobile
- **Audio placeholders** for future text-to-speech implementation
- **No external dependencies** besides Google Fonts and Material Symbols

## Adding New Content

To add new lessons:

1. Create a JSON file in the appropriate level directory following the existing format
2. Update `data/index.json` to include the new lesson in the level's `lessons` array
3. Set the `next_lesson` field in the previous lesson to point to the new file

## License

Part of the Cambridge Exams practice platform.
