#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 41 (entries 4000-4099).

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

BATCH41_DEFINITIONS: dict[int, str] = {
    4000: "Messages, music, television, or radio programmes that have been recorded in advance so they can be used later.",
    4001: "When a doctor says you should have a particular drug or treatment.",
    4002: "Permission from a doctor to get medicine.",
    4003: "The state of being in a particular place.",
    4004: "Being in a particular place.",
    4005: "Right now; at this moment.",
    4006: "To protect something from harm.",
    4007: "The leader of a country or organization.",
    4008: "To push down on something.",
    4009: "What you apply to make someone do something.",
    4010: "Widespread admiration or respect.",
    4011: "To think something is true because it is likely, although you cannot be certain.",
    4012: "To make believe something is real.",
    4013: "Attractive or pleasant to look at.",
    4014: "To be accepted or very common.",
    4015: "Common.",
    4016: "To stop something from happening or stop someone from doing something.",
    4017: "To stop something from happening.",
    4018: "Medical examinations, treatments, and advice intended to stop illness or discover it before it becomes serious.",
    4019: "An opportunity to see something before it is available to the public.",
    4020: "Happening earlier in time or order.",
    4021: "An animal that is hunted by another animal.",
    4022: "The amount of money needed to pay for something.",
    4023: "Very valuable and impossible to replace.",
    4024: "A feeling of happiness about oneself or one's things.",
    4025: "A person trained to perform religious duties.",
    4026: "Mainly or mostly.",
    4027: "The most important thing.",
    4028: "A type of mammal that includes monkeys, apes, and humans.",
    4029: "Most important, most suitable, or of the highest quality.",
    4030: "At a very simple stage of development before modern technology.",
    4031: "The son of a king.",
    4032: "The daughter of a king.",
    4033: "A person in charge of a school.",
    4034: "A belief about the correct way to behave.",
    4035: "To put something onto paper.",
    4036: "Happening earlier than something else.",
    4037: "Happening, existing, or done before a particular time.",
    4038: "Something that is more important than other things.",
    4039: "A place where criminals are kept.",
    4040: "Changes intended to make the system for keeping criminals fairer or more effective.",
    4041: "Someone who is taken by force and kept somewhere.",
    4042: "The state of being happily away from other people.",
    4043: "Only used by one person or group.",
    4044: "All businesses and services not owned or managed by the government.",
    4045: "A special right given only to a certain person or group of people.",
    4046: "Having advantages and opportunities that other people do not have because of money or high social status.",
    4047: "Something of value that is given to the winner.",
    4048: "Likely to happen.",
    4049: "To ask questions to discover facts about something.",
    4050: "A situation when something goes wrong.",
    4051: "A way of doing something.",
    4052: "To go somewhere or to continue doing something.",
    4053: "The steps to take to do something.",
    4054: "To say something in public.",
    4055: "To make or grow something.",
    4056: "Something grown or made in a factory in order to be sold.",
    4057: "A person's job.",
    4058: "Dealing with work that uses special skills.",
    4059: "A person who teaches in college.",
    4060: "Able to do something well.",
    4061: "An outline of a face, usually as seen from the side.",
    4062: "The extra money you make when you sell something.",
    4063: "Deep or very intelligent.",
    4064: "A doctor's opinion about the way in which a disease or illness is likely to develop.",
    4065: "A set of instructions for a computer.",
    4066: "Someone whose job is to create software for computers.",
    4067: "To continue to develop or move forward.",
    4068: "The process of developing or improving.",
    4069: "To not allow something.",
    4070: "To officially stop something from being done, especially by making it illegal.",
    4071: "A type of work that you do for school or a job.",
    4072: "To make something last for a longer time.",
    4073: "Important and well known.",
    4074: "A declaration that something will happen.",
    4075: "To raise someone to a higher position or rank.",
    4076: "A move to a higher level in a company, institution, or sport.",
    4077: "The activity of encouraging or supporting something.",
    4078: "The process of attracting people's attention to a product or event, for example by advertising.",
    4079: "Immediate or quick.",
    4080: "Happening or arriving at exactly a particular time.",
    4081: "To say the sounds of letters or words.",
    4082: "A fact that shows something is real.",
    4083: "To push or move something somewhere.",
    4084: "Right or correct.",
    4085: "Something that is owned.",
    4086: "A prediction about what will happen in the future.",
    4087: "A person who supports an idea or a plan.",
    4088: "A quantity of something that is a part or share of the whole.",
    4089: "A plan or suggestion.",
    4090: "To say that something should be done.",
    4091: "The force that moves something forward.",
    4092: "To take legal action against someone.",
    4093: "To officially accuse someone of a crime and ask a court of law to judge them.",
    4094: "A possibility that something will happen.",
    4095: "The possibility that something good will happen.",
    4096: "To be successful or make a lot of money.",
    4097: "To stop someone from getting hurt.",
    4098: "A substance that is necessary for the body to grow and be strong.",
    4099: "To express disagreement or objection.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH41_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH41_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH41_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH41_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
