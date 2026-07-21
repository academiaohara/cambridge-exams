#!/usr/bin/env python3
"""
Detect vocabulary entries whose example sentence is a generic placeholder.

Read-only: does not modify dictionary JSON files.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB_PATH = ROOT / "data" / "vocabulary" / "dictionary.json"
REPORT_DIR = ROOT / "scripts" / "reports"

PLACEHOLDER_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "placeholder_task",
        re.compile(
            r"I try to .+ this task carefully when I practise English\.?",
            re.IGNORECASE,
        ),
    ),
    (
        "meta_word",
        re.compile(
            r"We often use the word .+ in everyday conversations\.?",
            re.IGNORECASE,
        ),
    ),
    (
        "teacher_example",
        re.compile(
            r"The teacher gave us a clear example of .+ in class\.?",
            re.IGNORECASE,
        ),
    ),
    (
        "very_situation",
        re.compile(
            r"It was a very .+ situation for everyone in the room\.?",
            re.IGNORECASE,
        ),
    ),
]


def detect_placeholder(example: str) -> str | None:
    for name, pattern in PLACEHOLDER_PATTERNS:
        if pattern.search(example or ""):
            return name
    return None


def scan_entries(entries: list[dict]) -> list[dict]:
    findings: list[dict] = []
    for index, entry in enumerate(entries):
        example = str(entry.get("example", ""))
        pattern = detect_placeholder(example)
        if pattern:
            findings.append(
                {
                    "index": index,
                    "word": entry.get("word", ""),
                    "level": entry.get("level", ""),
                    "definition": entry.get("definition", ""),
                    "example": example,
                    "pattern": pattern,
                }
            )
    return findings


def main() -> int:
    data = json.loads(VOCAB_PATH.read_text(encoding="utf-8"))
    entries = data["entries"]
    findings = scan_entries(entries)

    by_pattern: dict[str, int] = {}
    for row in findings:
        by_pattern[row["pattern"]] = by_pattern.get(row["pattern"], 0) + 1

    summary = {
        "generatedBy": "scripts/detect-dict-example-placeholders.py",
        "path": str(VOCAB_PATH.relative_to(ROOT)),
        "totalEntries": len(entries),
        "placeholderCount": len(findings),
        "byPattern": by_pattern,
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / "dict-example-placeholders.json"
    payload = {"summary": summary, "findings": findings}
    report_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(json.dumps(summary, indent=2))
    print(f"\nReport: {report_path.relative_to(ROOT)}")
    return 0 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
