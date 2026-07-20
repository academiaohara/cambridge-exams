#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 1 (entries 0-99).

Every entry is reviewed against the original sense and example, not only leak cases.
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

# All 100 entries reviewed; definitions avoid the headword and read as complete phrases.
BATCH1_DEFINITIONS: dict[int, str] = {
    0: "To officially end or cancel a law, system, or practice.",
    1: "In or to a foreign country.",
    2: "Sudden and unexpected, often in an unpleasant way.",
    3: "The state of not being present, or a lack of something.",
    4: "Not present in a place where someone is expected to be.",
    5: "Complete or total.",
    6: "To take in and hold a liquid, substance, or information.",
    7: "So entertaining that it holds all your attention.",
    8: "Relating to art that expresses ideas or feelings rather than showing realistic images.",
    9: "A painting or design that does not represent real objects in a realistic way.",
    10: "Extremely silly or unreasonable.",
    11: "Available in very large quantities.",
    12: "Existing in large quantities; plentiful.",
    13: "To treat someone or something badly or cruelly on purpose.",
    14: "Relating to education, especially at colleges and universities.",
    15: "Good at learning and performing well in school.",
    16: "A teacher or researcher at a college or university.",
    17: "Relating to schools and formal education.",
    18: "Theoretical rather than practical or relevant to real life.",
    19: "A school or institution that offers specialized training or instruction.",
    20: "To happen or move at a faster rate, or to make something do so.",
    21: "A way of pronouncing words that shows where someone is from.",
    22: "To agree to take something that is offered.",
    23: "Agreement that an idea or statement is true, or willingness to receive something offered.",
    24: "The right or ability to enter, reach, or use something.",
    25: "An extra item added to something to make it look better or more useful.",
    26: "An unexpected event, often causing injury or damage.",
    27: "To have or provide enough space for someone or something.",
    28: "To go somewhere with someone as a companion.",
    29: "To succeed in doing or completing something.",
    30: "In a way that matches what has been said or done.",
    31: "An arrangement with a bank for keeping your money.",
    32: "Required to explain your actions and accept responsibility for them.",
    33: "A person whose job is to manage financial records for a business.",
    34: "The profession or study of managing money and financial records.",
    35: "To gather or collect things gradually over time.",
    36: "Correct and without mistakes.",
    37: "To say that someone has done something wrong.",
    38: "To get used to something new.",
    39: "To feel a continuous dull pain.",
    40: "To succeed in doing something after trying hard.",
    41: "A chemical substance that can burn or dissolve other materials.",
    42: "To accept or admit that something exists or is true.",
    43: "To thank someone publicly for what they have done or given.",
    44: "To show that you have noticed someone, for example by greeting them.",
    45: "To get to know something or someone.",
    46: "A person you know slightly but who is not a close friend.",
    47: "To get or obtain something.",
    48: "Something that someone has gained or bought.",
    49: "A unit of area equal to about 4,047 square metres.",
    50: "A performer who does difficult gymnastic or circus tricks.",
    51: "On or to the other side of something.",
    52: "A single thing that someone does.",
    53: "Moving around a lot or doing many things.",
    54: "Real; existing in fact rather than imagined.",
    55: "In fact; used to emphasize what is true.",
    56: "Very severe or intense, especially of pain or illness.",
    57: "To change your behaviour or ideas to suit a new situation.",
    58: "To change or adjust in order to fit a new situation or environment.",
    59: "A person who regularly does or uses something and finds it hard to stop.",
    60: "A strong need to keep doing something or using something, especially something harmful.",
    61: "Making someone want to keep doing or using it and unable to stop easily.",
    62: "Something extra added to something else.",
    63: "The details of where someone lives or works, such as street and town.",
    64: "Good enough for a particular purpose.",
    65: "To act according to a rule, agreement, or belief.",
    66: "Next to or very near something else.",
    67: "Located next to or beside something else.",
    68: "To be next to or share a border with something else.",
    69: "Sharing a border with another room or building.",
    70: "To change something slightly to make it better, more accurate, or more effective.",
    71: "To be responsible for organizing and managing something.",
    72: "To give someone medicine or medical treatment.",
    73: "The department or work of managing an organization.",
    74: "Relating to the management of a company or organization.",
    75: "A person who manages a business or organization.",
    76: "A high-ranking officer who commands ships in a navy.",
    77: "Permission to enter a place, or the price paid to enter.",
    78: "To allow someone to enter a hospital or other institution for care.",
    79: "To warn or criticize someone gently for bad behaviour.",
    80: "A young person between childhood and adulthood.",
    81: "To start using an idea, plan, or method.",
    82: "To legally take another person's child into your family.",
    83: "To love someone or something very much.",
    84: "A fully grown person who is no longer a child.",
    85: "To move forward.",
    86: "Something that helps you do better than others.",
    87: "The arrival or start of something important.",
    88: "An exciting and unusual experience.",
    89: "Likely to cause harm or make a situation worse.",
    90: "To describe or draw public attention to a product or event.",
    91: "An opinion or suggestion about what someone should do.",
    92: "To tell someone what you think they should do.",
    93: "Active public support for a cause or idea.",
    94: "To publicly support a particular cause or policy.",
    95: "To speak or act in favour of a particular policy or way of doing things.",
    96: "Relating to the air or to flying.",
    97: "Relating to beauty or the appreciation of art and style.",
    98: "A formal or special social event.",
    99: "To produce a change in someone or something.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH1_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH1_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH1_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH1_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
