#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 14 (final 51 placeholders)."""

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

BATCH14_EXAMPLES: dict[int, str] = {
    4562: "There is a growing trend towards healthier eating.",
    4563: "She tripped on the step and nearly fell.",
    4564: "Do not waste time on trivial details.",
    4565: "She pays tuition for private piano lessons.",
    4566: "We discussed the essay in a small tutorial group.",
    4568: "The ultimate decision rests with the board.",
    4569: "Winning the championship was the ultimate goal.",
    4570: "There is considerable uncertainty about the outcome.",
    4571: "Constant criticism can undermine your confidence.",
    4573: "The path was uneven and difficult to walk on.",
    4574: "The sauce should be a uniform colour throughout.",
    4575: "He joined the teachers' union last year.",
    4576: "Political unrest spread across the capital.",
    4577: "She likes to unwind with a book after work.",
    4578: "Please upload your assignment by Friday.",
    4579: "Urban areas tend to have higher living costs.",
    4580: "Doctors urged people to get vaccinated.",
    4581: "He felt a sudden urge to leave the room.",
    4582: "She uttered a few words of thanks.",
    4583: "The dog uttered a low growl.",
    4584: "Children receive several vaccines in their first years.",
    4585: "His instructions were vague and confusing.",
    4586: "The desert covers a vast area of the country.",
    4587: "The car was travelling at high velocity.",
    4588: "The concert venue holds ten thousand people.",
    4589: "Workers claimed they were being victimised by management.",
    4592: "They shared a bottle of vintage champagne.",
    4593: "She collects vintage furniture from the 1950s.",
    4594: "The 2015 vintage was one of the best in decades.",
    4595: "Clothes from that vintage are highly sought after.",
    4596: "The performance was vintage Federer at his best.",
    4598: "Sales volume increased during the holiday season.",
    4599: "Calculate the volume of the container in cubic metres.",
    4600: "Young children are especially vulnerable to infection.",
    4601: "We wandered through the streets without a map.",
    4602: "He was moved to a ward with six other patients.",
    4603: "She waved goodbye from the train window.",
    4604: "He gave a friendly wave to his neighbour.",
    4608: "Visitors are always welcome at our home.",
    4609: "The committee welcomed suggestions from the public.",
    4610: "There is widespread support for the new law.",
    4612: "I withdrew fifty pounds from the cash machine.",
    4613: "The table began to wobble on the uneven floor.",
    4614: "The painting is considered a genuine work of art.",
    4615: "Her presentation was a work of art in itself.",
    4617: "The weather is expected to worsen overnight.",
    4618: "The old coins turned out to be worthless.",
    4619: "Volunteering can be a very worthwhile experience.",
    4620: "The car was a wreck after the collision.",
    4621: "The storm wrecked several boats in the harbour.",
    4622: "She yearned for a life by the sea.",
}


def main() -> int:
    expected = 51
    if len(BATCH14_EXAMPLES) != expected:
        print(f"Expected {expected} examples, got {len(BATCH14_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH14_EXAMPLES.items()):
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

    if errors:
        print("\nVALIDATION ERRORS:", file=sys.stderr)
        print("\n".join(errors), file=sys.stderr)
        return 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {changed} placeholder examples (indices {min(BATCH14_EXAMPLES)}–{max(BATCH14_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
