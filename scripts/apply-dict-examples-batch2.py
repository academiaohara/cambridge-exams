#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 2 (entries 100-199)."""

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

BATCH2_EXAMPLES: dict[int, str] = {
    113: "Loud noise can aggravate a headache.",
    114: "The coach warned the team about unnecessary aggression on the pitch.",
    116: "She agonised over which university to choose.",
    117: "He screamed in agony after breaking his leg.",
    118: "She was in agony waiting for the test results.",
    121: "Much of the region's economy depends on agriculture.",
    130: "We booked our flights with a budget airline.",
    144: "The newspaper alleged that the minister had accepted bribes.",
    145: "Painkillers helped alleviate her symptoms.",
    162: "Rain and sunshine alternated throughout the day.",
    163: "Buses run on alternate days during the holiday.",
    164: "If the restaurant is full, we can try an alternative nearby.",
    165: "We took an alternative route to avoid the traffic.",
    176: "The contract contained several ambiguous clauses.",
    181: "Parliament voted to amend the existing law.",
    186: "There was ample time to finish the project.",
    188: "A horse-drawn carriage looked like an anachronism on the busy street.",
    192: "She traced her ancestors back to Ireland.",
    193: "The news anchor introduced the evening bulletin.",
    194: "She anchored the breakfast show for five years.",
}

BATCH_START = 100
BATCH_END = 199


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH2_EXAMPLES.items()):
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
