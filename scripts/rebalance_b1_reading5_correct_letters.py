#!/usr/bin/env python3
"""Rebalance B1 reading5 so correct letters A–D are each exactly 25% of items.

Reading5 options are strings like ``A) word``. This script strips labels, rebuilds
option rows in A–D order, and sets ``correct`` so the same semantic answer stays
right — only letter positions change. Deterministic (fixed RNG seed).

Run from repo root:
  python3 scripts/rebalance_b1_reading5_correct_letters.py
"""
from __future__ import annotations

import json
import random
import re
import sys
from pathlib import Path

LETTERS = ["A", "B", "C", "D"]
OPTION_RE = re.compile(r"^([A-D])\)\s*(.*)$", re.I)


def parse_option(s: str) -> tuple[str, str]:
    m = OPTION_RE.match((s or "").strip())
    if not m:
        raise ValueError(f"Bad option string: {s!r}")
    return m.group(1).upper(), m.group(2)


def rebalance_question(q: dict, target_letter: str) -> None:
    opts = q.get("options")
    if not isinstance(opts, list) or len(opts) != 4:
        raise ValueError("Each question must have exactly four options")
    target_letter = target_letter.strip().upper()
    if target_letter not in LETTERS:
        raise ValueError(f"Bad target letter: {target_letter!r}")

    by_letter: dict[str, str] = {}
    for o in opts:
        letter, text = parse_option(str(o))
        by_letter[letter] = text
    if set(by_letter.keys()) != set(LETTERS):
        raise ValueError(f"Options must cover A–D once each, got {sorted(by_letter)}")

    cur = (str(q.get("correct") or "")).strip().upper()
    if cur not in by_letter:
        raise ValueError(f"correct {cur!r} not in option letters")
    correct_text = by_letter[cur]
    wrong_texts = [by_letter[L] for L in LETTERS if L != cur]
    remaining = [L for L in LETTERS if L != target_letter]
    assert len(wrong_texts) == len(remaining) == 3
    mapping = {target_letter: correct_text}
    for letter, wt in zip(remaining, wrong_texts):
        mapping[letter] = wt
    q["options"] = [f"{L}) {mapping[L]}" for L in LETTERS]
    q["correct"] = target_letter


def main() -> int:
    root = Path(__file__).resolve().parent.parent / "Nivel" / "B1" / "Exams"
    paths = sorted(root.glob("Test*/reading5.json"))
    if not paths:
        print("No reading5.json files found", file=sys.stderr)
        return 1

    by_path: dict[Path, object] = {}
    items: list[tuple[Path, dict]] = []
    for path in paths:
        with path.open(encoding="utf-8-sig") as f:
            data = json.load(f)
        by_path[path] = data
        for block in data.get("tests") or []:
            inner = block.get("content") or {}
            questions = inner.get("questions") or []
            if not isinstance(questions, list):
                continue
            ordered = sorted(questions, key=lambda q: int(q.get("number") or 0))
            for q in ordered:
                if isinstance(q, dict):
                    items.append((path, q))

    n = len(items)
    if n == 0:
        print("No questions found", file=sys.stderr)
        return 1
    if n % 4 != 0:
        print(f"Question count {n} is not divisible by 4; cannot split evenly.", file=sys.stderr)
        return 1
    per = n // 4
    targets = [L for L in LETTERS for _ in range(per)]
    rng = random.Random(20260520)
    rng.shuffle(targets)

    for (_, q), tgt in zip(items, targets):
        rebalance_question(q, tgt)

    for path in paths:
        if path not in by_path:
            continue
        with path.open("w", encoding="utf-8") as f:
            json.dump(by_path[path], f, indent=4, ensure_ascii=False)
            f.write("\n")
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

