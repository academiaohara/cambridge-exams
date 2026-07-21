#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 4 (entries 300-399)."""

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

BATCH4_EXAMPLES: dict[int, str] = {
    308: "The climbers ascended the peak before sunrise.",
    309: "She ascribed her success to years of hard work.",
    316: "Her aspiration is to become a doctor.",
    323: "He asserted that the report was inaccurate.",
    324: "Teachers assess students' progress throughout the year.",
    327: "The manager assigned her to the London office.",
    332: "I assumed the meeting had been cancelled.",
    344: "Please attach the file to your email.",
    356: "Historians attribute the discovery to several scientists.",
    357: "They sold the painting at an auction for a record price.",
    363: "She auditioned for the lead role in the school play.",
    370: "The local authority approved plans for the new road.",
    383: "Temperatures were average for the time of year.",
    384: "The film received average reviews from critics.",
    385: "The average age of the students is nineteen.",
    386: "House prices are well above the national average.",
    387: "His test score was above the class average.",
    388: "We took steps to avoid any delays.",
    389: "She avoided the busy city centre.",
    390: "He avoided making promises he could not keep.",
}

BATCH_START = 300
BATCH_END = 399


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH4_EXAMPLES.items()):
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
