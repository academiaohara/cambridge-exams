#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 1 (entries 0-99)."""

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

BATCH1_DEFINITIONS: dict[int, str] = {
    0: "To officially end or cancel a law, system, or practice.",
    1: "In or to a foreign country.",
    2: "Sudden and unexpected, often in an unpleasant way.",
    3: "The state of being away or not present.",
    4: "Not present in a place where someone is expected to be.",
    5: "Complete or total.",
    6: "To take in a liquid or other substance.",
    7: "So interesting that it holds all your attention.",
    8: "Relating to art that expresses ideas or feelings rather than showing realistic images.",
    9: "A type of painting or design that does not show realistic images.",
    10: "Extremely silly or unreasonable.",
    11: "Available in very large quantities.",
    12: "Existing in large quantities; plentiful.",
    13: "To treat someone or something badly or cruelly.",
    14: "Relating to education, especially at colleges and universities.",
    15: "Relating to studying and scholarly work.",
    16: "A teacher or researcher at a college or university.",
    17: "Relating to schools and formal education.",
    18: "Theoretical rather than practical or relevant to real life.",
    19: "A school or institution for specialized training.",
    20: "To happen faster or make something happen more quickly.",
    21: "A way of pronouncing words that shows where someone is from.",
    22: "To agree to receive or take something offered.",
    23: "Agreement that something is correct or true.",
    24: "The right or ability to enter or use something.",
    25: "An extra item that completes or decorates something.",
    26: "An unexpected event that causes harm or damage.",
    27: "To provide enough space for someone or something.",
    28: "To go somewhere with someone as a companion.",
    29: "To succeed in doing or completing something.",
    30: "In a way that matches what was said or expected.",
    31: "An arrangement with a bank for keeping your money.",
    32: "Required to explain your actions and accept responsibility for them.",
    33: "A person whose job is to manage financial records.",
    34: "The profession or study of keeping financial records.",
    35: "To gather or collect things gradually over time.",
    36: "Correct and without mistakes.",
    37: "To say that someone has done something wrong.",
    38: "To make yourself or someone familiar with something new.",
    39: "To feel a continuous dull pain.",
    40: "To reach a goal after effort.",
    41: "A chemical substance that can burn or dissolve materials.",
    42: "To accept or admit that something is true.",
    43: "To thank someone publicly for what they have done.",
    44: "To show that you have noticed someone, for example by greeting them.",
    45: "To make yourself familiar with something or someone.",
    46: "A person you know slightly but who is not a close friend.",
    47: "To get or obtain something.",
    48: "Something that someone has gained or bought.",
    49: "A unit of area equal to about 4,047 square metres.",
    50: "A performer who does difficult gymnastic or circus tricks.",
    51: "From one side to the other side of something.",
    52: "A single thing that someone does.",
    53: "Moving around a lot or doing many things.",
    54: "Real and not imagined or false.",
    55: "In fact; used to emphasize what is true.",
    56: "Very severe or intense.",
    57: "To change your behaviour or ideas to suit a new situation.",
    58: "To change so as to fit a new situation.",
    59: "A person who cannot stop a harmful habit.",
    60: "A strong need to keep taking a harmful substance or doing a harmful activity.",
    61: "Likely to make people unable to stop doing or using something.",
    62: "The process of putting something together with something else.",
    63: "The street number, town, and other details of where someone lives.",
    64: "Good enough for a particular purpose.",
    65: "To follow a rule or agreement.",
    66: "Next to or very near something else.",
    67: "Located next to or beside something else.",
    68: "To be next to or connected to something else.",
    69: "Sharing a border with another room or building.",
    70: "To change something slightly to make it better or more suitable.",
    71: "To organize and be in charge of something.",
    72: "To give someone medicine or medical treatment.",
    73: "The people who manage a company or organization.",
    74: "Relating to the management of a company or organization.",
    75: "A person who manages a business or organization.",
    76: "A high-ranking officer in a navy.",
    77: "Permission to enter a place, or the price paid to enter.",
    78: "To allow someone to enter a hospital for treatment.",
    79: "To warn or criticize someone gently for bad behaviour.",
    80: "A young person between childhood and adulthood.",
    81: "To start using an idea, plan, or method.",
    82: "To legally take another person's child into your family.",
    83: "To love someone or something very much.",
    84: "A fully grown person who is no longer a child.",
    85: "To move forward.",
    86: "Something that puts you in a better position than others.",
    87: "The arrival or start of something important.",
    88: "An exciting and unusual experience.",
    89: "Harmful, dangerous, or unfavourable in effect.",
    90: "To promote a product or event to the public.",
    91: "An opinion or suggestion about what someone should do.",
    92: "To give someone guidance about what they should do.",
    93: "Active public support for a cause or idea.",
    94: "To publicly support a particular cause or policy.",
    95: "To support a policy or way of doing things in public.",
    96: "Relating to the air or to flying.",
    97: "Concerned with beauty or artistic taste.",
    98: "A planned or formal event.",
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
            print(f"[{idx:3d}] {word}")
            print(f"  - {old_def}")
            print(f"  + {new_def}")

    if leaks:
        print("\nSTRONG LEAKS DETECTED:", file=sys.stderr)
        print("\n".join(leaks), file=sys.stderr)
        return 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nUpdated {len(BATCH1_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
