#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 3 (entries 200-299)."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "example_placeholder_detector",
    ROOT / "scripts" / "detect-dict-example-placeholders.py",
)
_detector = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_detector)

detect_placeholder = _detector.detect_placeholder

BATCH3_EXAMPLES: dict[int, str] = {
    208: "The town holds an annual music festival in July.",
    209: "Her annual salary increased after the promotion.",
    219: "The children waited in anticipation of the school trip.",
    220: "Doctors gave him the antidote after the snake bite.",
    221: "They bought an antique clock at the market.",
    222: "The shop specialises in antiques from the nineteenth century.",
    232: "Voter apathy led to a very low turnout.",
    237: "The charity appealed for donations after the flood.",
    238: "The idea of working abroad really appeals to her.",
    239: "The film has wide appeal for younger audiences.",
    240: "The mayor made an appeal for calm after the protest.",
    250: "I really appreciate your help with the project.",
    251: "She appreciated how difficult the decision would be.",
    253: "As winter approaches, the days get shorter.",
    255: "Several companies approached her with job offers.",
    256: "We need a new approach to solving this problem.",
    257: "The pilot announced our approach to the airport.",
    261: "The repair will cost approximately two hundred pounds.",
    262: "Give me an approximate number of guests.",
    268: "The choice of colour seemed completely arbitrary.",
    278: "He injured the area around his knee.",
    279: "The room has an area of about twenty square metres.",
}

BATCH_START = 200
BATCH_END = 299


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH3_EXAMPLES.items()):
        if idx < BATCH_START or idx > BATCH_END:
            errors.append(f"  [{idx}] out of range")
            continue
        entry = entries[idx]
        word = entry["word"]
        old_example = entry.get("example", "")

        if not detect_placeholder(old_example):
            errors.append(f"  [{idx}] {word}: example is not a placeholder")
            continue
        if detect_placeholder(new_example):
            errors.append(f"  [{idx}] {word}: new example is still a placeholder")
            continue

        if old_example != new_example:
            changed += 1
            entry["example"] = new_example
            print(f"[{idx:3d}] {word}")
            print(f"  - {old_example}")
            print(f"  + {new_example}")

    if errors:
        print("\nVALIDATION ERRORS:", file=sys.stderr)
        print("\n".join(errors), file=sys.stderr)
        return 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nUpdated {changed} examples in entries {BATCH_START}-{BATCH_END}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
