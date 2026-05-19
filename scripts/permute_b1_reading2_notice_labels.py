#!/usr/bin/env python3
"""
Apply a fixed random permutation of notice letters (A–H) in B1 batch Reading Part 2 JSON.

The app keeps dropdowns and the letter strip in alphabetical order; permuting which text
carries which label changes the question→letter key without per-user state.

Seed is derived from the file path (and test index), so re-running the script yields the
same permutation for the same inputs.

Usage:
  python3 scripts/permute_b1_reading2_notice_labels.py
  python3 scripts/permute_b1_reading2_notice_labels.py Nivel/B1/Exams/Test1/reading2.json
  python3 scripts/permute_b1_reading2_notice_labels.py --mark-only   # add skip marker only (no shuffle)
  python3 scripts/permute_b1_reading2_notice_labels.py --force ...   # permute even if already marked
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

MARKER_KEY = "_reading2_notice_labels_permuted"


def letter_key(raw: object) -> str:
    s = str(raw or "").strip().upper()
    return s[0] if s else ""


def _collect_letters(test_block: dict) -> list[str]:
    letters: set[str] = set()
    for t in test_block.get("texts") or []:
        L = letter_key(t.get("letter"))
        if L:
            letters.add(L)
    for a in test_block.get("answers") or []:
        L = letter_key(a.get("answer"))
        if L:
            letters.add(L)
    return sorted(letters)


def _permutation_map(letters: list[str], seed: int) -> dict[str, str]:
    """Map each old letter to its new label (same set, bijection)."""
    rng = random.Random(seed)
    shuffled = letters[:]
    rng.shuffle(shuffled)
    if len(shuffled) > 1 and shuffled == letters:
        shuffled[0], shuffled[1] = shuffled[1], shuffled[0]
    return {letters[i]: shuffled[i] for i in range(len(letters))}


def apply_to_test_block(block: dict, seed: int) -> bool:
    letters = _collect_letters(block)
    if len(letters) < 2:
        return False

    pi = _permutation_map(letters, seed)

    for t in block.get("texts") or []:
        old = letter_key(t.get("letter"))
        if old in pi:
            t["letter"] = pi[old]

    for a in block.get("answers") or []:
        old = letter_key(a.get("answer"))
        if old in pi:
            a["answer"] = pi[old]

    texts = block.get("texts")
    if isinstance(texts, list):
        texts.sort(key=lambda x: letter_key(x.get("letter")))

    return True


def process_file(path: Path, *, force: bool = False, mark_only: bool = False) -> bool:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    tests = data.get("tests")
    if not isinstance(tests, list) or not tests:
        return False

    if mark_only:
        if data.get(MARKER_KEY):
            return False
        data[MARKER_KEY] = True
        path.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
        return True

    if data.get(MARKER_KEY) and not force:
        return False

    base = str(path.resolve())
    changed = False
    for i, block in enumerate(tests):
        if not isinstance(block, dict):
            continue
        digest = hashlib.sha256(f"{base}|tests[{i}]".encode()).hexdigest()
        seed = int(digest[:16], 16)
        if apply_to_test_block(block, seed):
            changed = True

    if changed:
        data[MARKER_KEY] = True
        path.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    ap = argparse.ArgumentParser(description="Permute B1 Reading Part 2 notice letters in batch JSON.")
    ap.add_argument("paths", nargs="*", type=Path, help="reading2.json files (default: all under Nivel/B1/Exams)")
    ap.add_argument("--force", action="store_true", help="permute again even if " + MARKER_KEY + " is set")
    ap.add_argument("--mark-only", action="store_true", help="only add " + MARKER_KEY + " (no shuffle)")
    args = ap.parse_args()

    if args.paths:
        paths = [root / p if not p.is_absolute() else p for p in args.paths]
    else:
        paths = sorted((root / "Nivel" / "B1" / "Exams").glob("**/reading2.json"))

    n = 0
    for p in paths:
        p = p.resolve()
        if not p.is_file():
            print("skip (not a file):", p)
            continue
        try:
            rel = p.relative_to(root)
        except ValueError:
            rel = p
        if process_file(p, force=args.force, mark_only=args.mark_only):
            n += 1
            print("updated", rel)
    print(f"done: {n} file(s) updated")


if __name__ == "__main__":
    main()
