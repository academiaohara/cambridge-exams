#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 39 (entries 3800-3899).

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

BATCH39_DEFINITIONS: dict[int, str] = {
    3800: "Used when you say that something could happen.",
    3801: "Serious danger.",
    3802: "An amount of time during which something happens.",
    3803: "An amount of time when something happens.",
    3804: "Typical of a particular historical time.",
    3805: "A particular time in history.",
    3806: "Happening or existing for a long time or for all time in the future.",
    3807: "Lasting for a long time or forever.",
    3808: "The act of allowing some action.",
    3809: "To allow something.",
    3810: "To treat someone badly.",
    3811: "To continue to do or say something in a determined way.",
    3812: "Not giving up and keeping on working.",
    3813: "A human being.",
    3814: "Relating to a particular person.",
    3815: "Your character and how you behave.",
    3816: "To design something to meet someone's unique needs.",
    3817: "Employees in a business.",
    3818: "A particular way of thinking about something.",
    3819: "To sweat.",
    3820: "To convince someone to agree to do something.",
    3821: "Not hopeful about the future and expecting that bad things will happen.",
    3822: "Thinking that the worst thing will happen in every situation.",
    3823: "An animal or insect that hurts plants or food.",
    3824: "An animal such as a cat or dog that people keep and care for.",
    3825: "A document signed by many people that asks someone in authority to do something.",
    3826: "A liquid natural resource from which many fuels are made.",
    3827: "A ruler in ancient Egypt.",
    3828: "A place where medicine is sold.",
    3829: "A particular period of time during the development of something.",
    3830: "Unusually great.",
    3831: "Something that can be seen as it is happening.",
    3832: "The act of helping others without wanting anything in return.",
    3833: "A way to think about truth and life.",
    3834: "A device used to talk to people far away.",
    3835: "A picture made using a camera.",
    3836: "A person who takes pictures with a camera.",
    3837: "A group of words that have a particular meaning.",
    3838: "Related to your body and not your mind.",
    3839: "A doctor.",
    3840: "A science that deals with energy and how it affects things.",
    3841: "A large musical instrument with black and white keys.",
    3842: "To choose someone or something from a group.",
    3843: "Your choice.",
    3844: "A meal eaten outdoors.",
    3845: "A visual representation of something.",
    3846: "A baked dish with a filling.",
    3847: "A part of something.",
    3848: "A structure built out from the land over water and used for getting on and off boats.",
    3849: "A structure that extends into a body of water.",
    3850: "To make a hole in something using a sharp object.",
    3851: "A farm animal with a snout and curly tail.",
    3852: "A bird with a plump body.",
    3853: "To put a large number of things on top of each other.",
    3854: "A number of things put on top of each other.",
    3855: "A large group of things on top of one another.",
    3856: "A small object that has medicine inside.",
    3857: "A tall, vertical structure used for support.",
    3858: "A soft cushion for the head.",
    3859: "Someone who flies an aircraft.",
    3860: "To fly an aircraft.",
    3861: "A thin piece of metal used to fasten things.",
    3862: "To take a piece of skin between one's fingers and squeeze.",
    3863: "A type of tall, thin tree with needles instead of leaves.",
    3864: "A pale shade of red.",
    3865: "To locate something exactly.",
    3866: "A person who is the first to discover or be involved in something.",
    3867: "A tube used to carry water or gas.",
    3868: "A sailor who steals things from other boats.",
    3869: "A small gun.",
    3870: "A large hole in the ground.",
    3871: "The quality of a sound that makes it high or low.",
    3872: "The feeling of sadness and kindness for those who are suffering.",
    3873: "To turn on a central point.",
    3874: "A flat, round bread topped with cheese and sauce.",
    3875: "A large notice in a public place used for advertising something or carried in order to protest against or support something.",
    3876: "A space or area.",
    3877: "To take someone else's work, ideas, or words and use them as if they were your own.",
    3878: "A serious disease that quickly spreads to many people.",
    3879: "Simple and not decorated.",
    3880: "To think about and arrange the details of something you want to do.",
    3881: "A vehicle that has an engine and wings and flies in the air.",
    3882: "A large round thing in space.",
    3883: "A living thing that grows in the ground.",
    3884: "A big farm that only grows certain kinds of crops.",
    3885: "A thin piece of cloth or plastic that is sticky on one side and that you put on your skin to cover a cut.",
    3886: "When a part of someone's body has a hard cover around it to protect a broken bone.",
    3887: "A smooth paste that gets hard when it dries.",
    3888: "A material made by people.",
    3889: "A flat round thing that you put food on.",
    3890: "Something that allows someone to tell a large number of people about an idea, product, etc.",
    3891: "Believable or reasonable.",
    3892: "Likely to be true, honest, or suitable.",
    3893: "To take part in an activity for enjoyment.",
    3894: "A person who takes part in a game.",
    3895: "A request that is urgent or emotional.",
    3896: "To ask for something you want very badly.",
    3897: "Enjoyable.",
    3898: "Used to make a request polite.",
    3899: "A feeling of happiness or satisfaction.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH39_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH39_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH39_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH39_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
