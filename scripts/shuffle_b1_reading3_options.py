#!/usr/bin/env python3
"""Permute A–D option order per question in B1 batch reading3.json (deterministic per test+q)."""
import json
import re
import sys
from pathlib import Path

LETTERS = ["A", "B", "C", "D"]


def shuffle_question(q: dict, seed: int) -> None:
    opts = q.get("options")
    if not isinstance(opts, dict):
        return
    ans = (str(q.get("answer") or q.get("correct") or "A")).strip().upper()[:1]
    if ans not in opts:
        ans = "A"
    correct_text = opts.get(ans)
    pairs = [(k, opts[k]) for k in LETTERS if k in opts]
    if len(pairs) != 4 or correct_text is None:
        return
    values = [v for _, v in pairs]
    rng = __import__("random").Random(seed)
    rng.shuffle(values)
    new_opts = {LETTERS[i]: values[i] for i in range(4)}
    for letter in LETTERS:
        if new_opts[letter] == correct_text:
            q["answer"] = letter
            break
    q["options"] = new_opts


def main() -> int:
    root = Path(__file__).resolve().parent.parent / "Nivel" / "B1" / "Exams"
    paths = sorted(root.glob("Test*/reading3.json"))
    if not paths:
        print("No reading3.json files found", file=sys.stderr)
        return 1
    for path in paths:
        m = re.search(r"Test(\d+)", path.parent.name)
        test_num = int(m.group(1)) if m else 0
        with path.open(encoding="utf-8-sig") as f:
            data = json.load(f)
        for block in data.get("tests") or []:
            for q in block.get("questions") or []:
                num = int(q.get("number") or 0)
                seed = test_num * 1000 + num * 17 + 42
                shuffle_question(q, seed)
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.write("\n")
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
