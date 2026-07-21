#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 47 (entries 4600-4622).

Final batch: 23 entries (vulnerable → yearn). Every entry is reviewed against
the original sense and example, not only leak cases.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "dict_leak_detector", ROOT / "scripts" / "detect-dict-definition-leaks.py"
)
_detector = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_detector)

find_matches = _detector.find_matches_in_definition
entry_tier = _detector.entry_tier

BATCH47_DEFINITIONS: dict[int, str] = {
    4600: "Weak or easy to hurt physically or mentally.",
    4601: "To travel from place to place, especially on foot, without a particular direction or purpose.",
    4602: "A large room in a hospital with beds for people to stay in.",
    4603: "To move your hand to say hello or goodbye or as a signal.",
    4604: "A movement of your hand used for saying hello or goodbye to someone or for giving a signal.",
    4605: "The temperature and the state of the outdoors.",
    4606: "A period of time that is seven days long.",
    4607: "How heavy something or someone is.",
    4608: "Pleased to receive or accept a visitor at a place.",
    4609: "To say that you are pleased to accept or consider something such as an opportunity or a question.",
    4610: "Happening or existing in many places or affecting many people.",
    4611: "An alcoholic drink made from grapes.",
    4612: "To take money from a bank account.",
    4613: "To rock slightly from side to side, or to make something do this.",
    4614: "Something such as a painting or sculpture that is of very high quality.",
    4615: "Something that is made or done in a skilful or attractive way.",
    4616: "Of poorer quality than another thing.",
    4617: "To become poorer in quality or to make something poorer in quality.",
    4618: "Not having any value or good qualities; not useful.",
    4619: "Worth the time, money, or effort that you spend on it.",
    4620: "Something that has been badly damaged.",
    4621: "To severely damage something.",
    4622: "To want something a lot, especially something that you know you may not be able to have.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    expected = 4622 - 4600 + 1
    if len(BATCH47_DEFINITIONS) != expected:
        print(
            f"Expected {expected} definitions, got {len(BATCH47_DEFINITIONS)}",
            file=sys.stderr,
        )
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH47_DEFINITIONS.items():
        entry = entries[idx]
        word = entry["word"]
        old_def = entry["definition"]
        entry["definition"] = new_def

        matches = find_matches(
            new_def,
            [("term", word)],
            dict_id="vocab",
            is_multi_word_dict=False,
        )
        if entry_tier(matches) == "strong":
            leaks.append(f"  [{idx}] {word}: {new_def} -> {matches}")

        if old_def != new_def:
            changed += 1
            print(f"[{idx:3d}] {word}")
            print(f"  - {old_def}")
            print(f"  + {new_def}")

    if leaks:
        print("\nSTRONG LEAKS DETECTED:", file=sys.stderr)
        print("\n".join(leaks), file=sys.stderr)
        return 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nUpdated {changed} of {len(BATCH47_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
