#!/usr/bin/env python3
"""
Adapt Review*.json files to the current interactive exercise format.

Changes applied:
1. Strip accidental markdown code fences from JSON files.
2. Replace unicode-ellipsis gap markers (…+) with standard "......".
3. Normalize word-formation hints: "...... **WORD**" → "...... (WORD)".
4. Convert single-item passage exercises to subtype "passage-input".
5. Add subtype "find-extra-word" for extra-word sections.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEVELS = ("B1", "B2", "C1")

GAP_MARKER_RE = re.compile(r"(?:[.\u2026]{5,}|\u2026{2,}|_{4,})")
ELLIPSIS_GAP_RE = re.compile(r"\u2026{2,}")
NUMBERED_GAP_RE = re.compile(r"\(\d+\)\s*(?:\.{6,}|\u2026{2,}|_{4,})")
WF_TRAILING_BOLD_RE = re.compile(r"\s*\*\*([A-Z][A-Z0-9]*)\*\*\s*$")


def load_json(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw.strip())
    return json.loads(raw)


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize_gap_markers(text: str) -> str:
    return ELLIPSIS_GAP_RE.sub("......", text)


def normalize_word_formation_sentence(sentence: str) -> str:
    match = WF_TRAILING_BOLD_RE.search(sentence)
    if not match:
        return sentence

    word = match.group(1)
    body = sentence[: match.start()]

    gap_matches = list(GAP_MARKER_RE.finditer(body))
    if not gap_matches:
        return sentence

    last = gap_matches[-1]
    before = body[: last.start()]
    after = body[last.end() :]
    return f"{before}...... ({word}){after}"


def is_extra_word_section(section: dict) -> bool:
    title = (section.get("title") or "").lower()
    instructions = (section.get("instructions") or "").lower()
    return "extra word" in title or "extra word" in instructions


def should_convert_passage_input(section: dict) -> bool:
    if section.get("subtype") or section.get("passage"):
        return False
    items = section.get("items") or []
    if len(items) != 1:
        return False
    item = items[0]
    answers = item.get("answers")
    if not isinstance(answers, list) or len(answers) < 3:
        return False
    sentence = item.get("sentence") or ""
    numbered_gaps = len(NUMBERED_GAP_RE.findall(sentence))
    return numbered_gaps >= len(answers) - 1 or numbered_gaps >= 3


def convert_passage_input(section: dict) -> None:
    item = section["items"][0]
    section["subtype"] = "passage-input"
    section["passage"] = normalize_gap_markers(item["sentence"])
    section["answers"] = item["answers"]
    del section["items"]


def adapt_section(section: dict, stats: dict) -> None:
    if section.get("type") != "exercise":
        return

    if is_extra_word_section(section) and section.get("subtype") != "find-extra-word":
        section["subtype"] = "find-extra-word"
        stats["find_extra_word"] += 1

    if should_convert_passage_input(section):
        convert_passage_input(section)
        stats["passage_input"] += 1
        return

    for key in ("passage", "instructions"):
        if isinstance(section.get(key), str):
            updated = normalize_gap_markers(section[key])
            if updated != section[key]:
                section[key] = updated
                stats["ellipsis"] += 1

    for item in section.get("items") or []:
        for field in ("sentence", "sentenceA", "sentenceB", "context"):
            if not isinstance(item.get(field), str):
                continue
            original = item[field]
            updated = normalize_gap_markers(original)
            updated = normalize_word_formation_sentence(updated)
            if updated != original:
                item[field] = updated
                stats["ellipsis"] += 1
                if WF_TRAILING_BOLD_RE.search(original):
                    stats["word_formation"] += 1

        if isinstance(item.get("sentences"), list):
            new_sentences = []
            for sentence in item["sentences"]:
                if not isinstance(sentence, str):
                    new_sentences.append(sentence)
                    continue
                updated = normalize_word_formation_sentence(normalize_gap_markers(sentence))
                if updated != sentence:
                    stats["ellipsis"] += 1
                new_sentences.append(updated)
            item["sentences"] = new_sentences


def adapt_review(path: Path) -> dict:
    stats = {"ellipsis": 0, "word_formation": 0, "passage_input": 0, "find_extra_word": 0, "changed": False}
    original = load_json(path)
    data = json.loads(json.dumps(original, ensure_ascii=False))

    for section in data.get("sections") or []:
        adapt_section(section, stats)

    if data != original:
        save_json(path, data)
        stats["changed"] = True
    return stats


def main() -> int:
    total = {"files": 0, "changed": 0, "ellipsis": 0, "word_formation": 0, "passage_input": 0, "find_extra_word": 0}

    for level in LEVELS:
        for path in sorted((ROOT / "data" / "Course" / level).glob("Review*.json")):
            stats = adapt_review(path)
            total["files"] += 1
            if stats["changed"]:
                total["changed"] += 1
            for key in ("ellipsis", "word_formation", "passage_input", "find_extra_word"):
                total[key] += stats[key]
            if stats["changed"]:
                print(
                    f"{path.relative_to(ROOT)}: "
                    f"ellipsis={stats['ellipsis']}, wf={stats['word_formation']}, "
                    f"passage={stats['passage_input']}, extra-word={stats['find_extra_word']}"
                )

    print(
        f"\nDone. {total['changed']}/{total['files']} files updated — "
        f"ellipsis={total['ellipsis']}, wf={total['word_formation']}, "
        f"passage={total['passage_input']}, extra-word={total['find_extra_word']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
