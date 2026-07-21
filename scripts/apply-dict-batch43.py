#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 43 (entries 4200-4299).

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

BATCH43_DEFINITIONS: dict[int, str] = {
    4200: "A person's place in an order of people.",
    4201: "A sum of money paid to a kidnapper to set the person free.",
    4202: "A long, loud, and angry complaint about something.",
    4203: "To complain or talk loudly and angrily for a long time, sometimes saying unreasonable things.",
    4204: "Moving or changing very quickly.",
    4205: "Happening very fast.",
    4206: "Not common or unusual.",
    4207: "Not often.",
    4208: "A rodent similar to a mouse but larger.",
    4209: "The speed at which something happens.",
    4210: "The number of times something happens within a particular period of time.",
    4211: "The speed at which something happens within a particular period of time.",
    4212: "To consider that someone or something has a particular quality or has achieved a particular standard or level.",
    4213: "Used when you want to do one thing but not the other.",
    4214: "A relationship between two things expressed as two numbers or amounts.",
    4215: "A limited amount of something, especially food, that you are allowed to have.",
    4216: "To control the supply of something so that people are allowed only a fixed amount.",
    4217: "Based on reason or logic.",
    4218: "To talk in an angry and uncontrolled way.",
    4219: "To speak or write in a very enthusiastic way about something or someone.",
    4220: "Natural and not yet processed.",
    4221: "A line of light that comes from a bright object.",
    4222: "A tool used for shaving.",
    4223: "To arrive at or get to something.",
    4224: "To respond by acting in a certain way.",
    4225: "To look at and understand written words.",
    4226: "A person who looks at written words.",
    4227: "Prepared for something.",
    4228: "Actually exists.",
    4229: "Shown as it is in actual life.",
    4230: "The state of things as they actually exist.",
    4231: "To suddenly understand.",
    4232: "Very or actually.",
    4233: "Any area of activity or interest.",
    4234: "The back part of something.",
    4235: "A statement or fact that explains why something is the way it is, or why someone does, thinks, or says something.",
    4236: "Fair and sensible.",
    4237: "A person who fights the government in order to change it.",
    4238: "To remember something.",
    4239: "A paper that proves that something was received or bought.",
    4240: "To get something.",
    4241: "Happening a short time ago.",
    4242: "A social gathering.",
    4243: "A set of instructions for cooking a certain type of food.",
    4244: "The person who receives something.",
    4245: "A performance of music or poetry.",
    4246: "Acting in an unsafe way.",
    4247: "To believe that something is true.",
    4248: "The act of getting praise from other people.",
    4249: "To know something because you have seen it before.",
    4250: "To give advice based on experience.",
    4251: "To return to a friendly relationship.",
    4252: "To write down or store information.",
    4253: "A new member of a military force or an organisation, especially someone who has recently joined.",
    4254: "To get someone to work in a company or join an organisation.",
    4255: "To get someone to help you do something.",
    4256: "To use the parts of an object to make something else.",
    4257: "The colour of blood.",
    4258: "A positive quality that improves something that is not very good.",
    4259: "To make something smaller in size or fewer in number.",
    4260: "Told to leave a job because you are no longer needed.",
    4261: "To mention or call attention to something.",
    4262: "A person who makes sure that the rules are followed in sports.",
    4263: "The act of mentioning something or someone.",
    4264: "To make some changes to something in order to improve it.",
    4265: "To think about something carefully and seriously.",
    4266: "When a surface sends back light, heat, sound, or an image.",
    4267: "An image that is seen in a mirror or other shiny surface.",
    4268: "An unconscious action in which a body part responds to an event.",
    4269: "To improve a situation by correcting things that are wrong or unfair.",
    4270: "A change intended to correct a situation that is wrong or unfair.",
    4271: "To avoid doing something.",
    4272: "To make something cold.",
    4273: "A large electrical machine used to keep food cold.",
    4274: "A place of safety.",
    4275: "Someone who leaves their country, especially during a war or other threatening event.",
    4276: "Money given back to a person when an item is returned to a store.",
    4277: "To improve a room or a building by cleaning and painting it and adding new furniture or equipment.",
    4278: "To say no to something.",
    4279: "To show that something is false or incorrect.",
    4280: "To think of someone in a certain way.",
    4281: "Concerning or about.",
    4282: "Without attention to something.",
    4283: "A system of government or management.",
    4284: "A large area of land usually based on some common feature.",
    4285: "An official list or record of people or things.",
    4286: "To wish that something had not happened.",
    4287: "Happening often and at equal intervals of time.",
    4288: "To control how something happens.",
    4289: "To practice and prepare for a performance in front of people.",
    4290: "When a king or queen officially rules a country.",
    4291: "The period of time when a king or queen rules a country.",
    4292: "To make an idea, belief, or feeling stronger.",
    4293: "To make an idea, belief, or feeling stronger.",
    4294: "To make a building, structure, or object stronger.",
    4295: "To refuse to accept, believe in, or agree with something.",
    4296: "To feel very happy about something or to celebrate something in a happy way.",
    4297: "To have a connection with something.",
    4298: "Connected to each other.",
    4299: "A connection or relative.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH43_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH43_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH43_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH43_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
