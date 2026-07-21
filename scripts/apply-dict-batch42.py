#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 42 (entries 4100-4199).

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

BATCH42_DEFINITIONS: dict[int, str] = {
    4100: "A system of rules and customs that guides how things are done.",
    4101: "Happy about what you have done.",
    4102: "To show that something is true.",
    4103: "To supply something.",
    4104: "An area that is controlled by a country.",
    4105: "The act of giving something to people in need or want.",
    4106: "Intended to be temporary and likely to be changed when other arrangements are made.",
    4107: "Not yet finally decided; temporary until confirmed.",
    4108: "To annoy someone on purpose to cause violence.",
    4109: "Closeness in time, space, or relationships.",
    4110: "Related to mental illness or its treatment.",
    4111: "The study and treatment of mental illness.",
    4112: "Able to know what will happen or what people think.",
    4113: "Relating to the mind.",
    4114: "Involves the study of how the brain affects our thought and actions.",
    4115: "Having a very serious mental illness.",
    4116: "A place where alcoholic drinks are sold.",
    4117: "Meant for everyone to use.",
    4118: "Industries and services, for example schools and hospitals, that are supported by tax money and controlled by the government.",
    4119: "Something printed, like a newspaper or book.",
    4120: "Attention given to someone or something by the media.",
    4121: "To make something widely known.",
    4122: "To get a book printed and ready to sell.",
    4123: "A sweet, soft dessert.",
    4124: "A pool of liquid on the ground.",
    4125: "A little bit of smoke or steam.",
    4126: "To hold onto something to move it toward you.",
    4127: "A machine that moves liquids or gases.",
    4128: "A large, round orange vegetable.",
    4129: "To hit someone or something with your fist, usually as hard as you can.",
    4130: "To hit with a fist.",
    4131: "Arriving or happening at the time agreed on.",
    4132: "Doing something or arriving at the right time.",
    4133: "To make someone suffer for breaking the rules or laws.",
    4134: "Something that one must endure for any wrongdoing.",
    4135: "A very young dog.",
    4136: "A doll moved by strings or hands.",
    4137: "A very young dog.",
    4138: "To buy something.",
    4139: "Very clear and beautiful.",
    4140: "A colour between blue and red.",
    4141: "The reason that you do something.",
    4142: "A bag in which women keep money, makeup, keys, etc.",
    4143: "To chase or follow someone or something.",
    4144: "The act of chasing or trying to achieve something.",
    4145: "To move something away from you.",
    4146: "To place something in a particular position.",
    4147: "Something that is hard to understand.",
    4148: "A structure with a square base and triangular sides.",
    4149: "Attractively old-fashioned.",
    4150: "To have or do things that are needed for something.",
    4151: "How good something is.",
    4152: "To measure or describe something as an amount.",
    4153: "A certain amount of something.",
    4154: "To argue or fight.",
    4155: "1/4 or 25% of something.",
    4156: "A hard surface next to a sea or river where boats can stop.",
    4157: "A female ruler of a country.",
    4158: "Words you use to ask for information when you are not certain about something.",
    4159: "To ask for information because you have doubts about something.",
    4160: "To ask for information.",
    4161: "A long search for something.",
    4162: "A sentence that asks for information.",
    4163: "A line of people waiting.",
    4164: "To argue or complain about things that are not important.",
    4165: "Fast or rapid.",
    4166: "Not making much sound.",
    4167: "A warm bed covering.",
    4168: "To stop doing something.",
    4169: "Completely or very much.",
    4170: "What someone has said, including saying how much a piece of work will cost.",
    4171: "A small animal with long ears that lives in a hole in the ground.",
    4172: "A contest to see who is the fastest.",
    4173: "Related to groups of people with shared physical characteristics and culture.",
    4174: "An object with shelves that holds things.",
    4175: "A system that detects objects using radio waves.",
    4176: "To send out energy or heat.",
    4177: "Energy that comes from a source.",
    4178: "New and very different from the usual way.",
    4179: "A device that receives sound signals.",
    4180: "Giving off harmful energy from atoms.",
    4181: "A small, red, spicy vegetable.",
    4182: "A flat kind of boat.",
    4183: "A small towel.",
    4184: "A very angry feeling.",
    4185: "To attack a place in a short time in order to cause damage.",
    4186: "A system of tracks on which trains travel.",
    4187: "A track for trains.",
    4188: "Water falling from the sky.",
    4189: "An arc of colours in the sky.",
    4190: "A forest in a place where it rains very often.",
    4191: "To lift or move something upward.",
    4192: "A dried grape.",
    4193: "A tool with teeth used for gathering leaves.",
    4194: "A large public meeting in order to support something.",
    4195: "A male sheep.",
    4196: "A large farm where animals are kept.",
    4197: "Chosen or happening without any particular method, pattern, or purpose.",
    4198: "A number or a set of similar things.",
    4199: "A person who protects forests or parks.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH42_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH42_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH42_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH42_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
