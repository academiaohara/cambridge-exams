#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 1 (entries 0-99).

Replaces generic placeholder examples with natural sentences that illustrate
each sense. Only entries with placeholder examples are included.
"""

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

BATCH1_EXAMPLES: dict[int, str] = {
    0: "The government voted to abolish the old tax law.",
    2: "His abrupt departure left everyone confused.",
    7: "The novel was so absorbing that I read it in one sitting.",
    8: "Abstract art often uses shapes and colours instead of realistic images.",
    9: "The gallery displayed an abstract by Kandinsky near the entrance.",
    12: "Wildlife is abundant in the national park.",
    14: "She chose an academic path and went to university.",
    15: "He was always an academic student who earned top grades.",
    16: "The academic presented her research at an international conference.",
    18: "The argument remained academic and had little effect on policy.",
    20: "The driver accelerated to merge onto the motorway.",
    42: "She acknowledged that she had made a mistake.",
    43: "The winner acknowledged the support of her family in her speech.",
    44: "He acknowledged his colleague with a nod across the room.",
    46: "She bumped into an old acquaintance at the train station.",
    57: "It took time to adapt to life in a new country.",
    60: "He sought help for his addiction to gambling.",
    67: "Our hotel room was adjacent to the swimming pool.",
    70: "She adjusted the mirror before driving off.",
    72: "The nurse administered the vaccine carefully.",
    78: "Only visitors with a pass were admitted to the ward.",
    81: "The company adopted a new safety policy.",
    82: "They decided to adopt a child from overseas.",
    83: "The children adore their grandmother.",
    95: "The charity advocates for better mental health services.",
}

BATCH_START = 0
BATCH_END = 99


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    out_of_range = [i for i in BATCH1_EXAMPLES if i < BATCH_START or i > BATCH_END]
    if out_of_range:
        print(f"Indices out of range {BATCH_START}-{BATCH_END}: {out_of_range}", file=sys.stderr)
        return 1

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH1_EXAMPLES.items()):
        entry = entries[idx]
        word = entry["word"]
        old_example = entry.get("example", "")

        if not detect_placeholder(old_example):
            errors.append(
                f"  [{idx}] {word}: example is not a placeholder — review before overwriting"
            )
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
