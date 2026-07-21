#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 34 (entries 3300-3399).

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

BATCH34_DEFINITIONS: dict[int, str] = {
    3300: "A person who has at least a million dollars.",
    3301: "To copy the way something sounds, moves, looks, etc.",
    3302: "The part of a person that thinks and feels.",
    3303: "Used to show that something belongs to me.",
    3304: "A person who works underground to extract coal, gold, or other materials.",
    3305: "A natural substance in the earth, for example coal, salt, gold, or diamonds.",
    3306: "To mix or associate with others.",
    3307: "Very small in amount or degree.",
    3308: "To reduce something to the lowest possible level.",
    3309: "The smallest amount.",
    3310: "An official in charge of a government department in the UK and other countries.",
    3311: "A government department.",
    3312: "Not very important in comparison with people or things of the same type.",
    3313: "Very small and unimportant.",
    3314: "A small group of people within a larger group.",
    3315: "A unit of time equal to 60 seconds.",
    3316: "Very small.",
    3317: "An unexpected blessing which seems almost impossible, like a gift from heaven.",
    3318: "Usually made of glass, and you can see yourself in it.",
    3319: "Behavior that is meant to trick or cause trouble for people.",
    3320: "Very unhappy.",
    3321: "Extreme suffering.",
    3322: "Bad luck or an unlucky event.",
    3323: "Based on bad judgment or wrong beliefs.",
    3324: "A minor mistake or accident.",
    3325: "To lose something temporarily by putting it in the wrong place.",
    3326: "To fail to hit or catch something.",
    3327: "An important job that is sometimes far away.",
    3328: "Water that can be seen in the air or on a surface.",
    3329: "Something you do wrong.",
    3330: "Different things put together.",
    3331: "Something that is made by combining other things together.",
    3332: "An annoying complaint, especially about something that is not important.",
    3333: "A long low sound you make because of pain, sadness, or pleasure.",
    3334: "To complain about something in an annoying way.",
    3335: "To make a long low sound because of pain, sadness, or pleasure.",
    3336: "A large crowd of people that often wants to cause violence.",
    3337: "Able to be moved easily.",
    3338: "To prepare an army to fight in a war.",
    3339: "To laugh at someone or something in a way that is not kind.",
    3340: "An examination you take for practice before an important examination.",
    3341: "A setting or condition on a machine.",
    3342: "An example or a person who poses for art.",
    3343: "Not too big or too small in size or amount.",
    3344: "Belonging to the current time.",
    3345: "Not thinking that you are too important.",
    3346: "To change something slightly, especially in order to improve it or to make it less extreme.",
    3347: "Slightly wet.",
    3348: "Small drops of water in the air or on a surface.",
    3349: "A hollow container that is used to make certain shapes.",
    3350: "The smallest basic unit that makes up a physical substance.",
    3351: "A familiar word for a female parent.",
    3352: "A very short period of time.",
    3353: "A king or queen.",
    3354: "A building in which monks live.",
    3355: "The day of the week after Sunday.",
    3356: "Relating to money.",
    3357: "What you use to buy things.",
    3358: "To watch someone or something closely.",
    3359: "A religious person who lives a simple life.",
    3360: "An animal with a long tail that lives in trees.",
    3361: "Speaking only one language.",
    3362: "A large, scary imaginary creature.",
    3363: "One of 12 periods of time in one year.",
    3364: "A structure that is built to remind people of a person or event.",
    3365: "The way you are feeling.",
    3366: "An object that travels around our Earth.",
    3367: "A message at the end of a story that teaches you something.",
    3368: "The amount of hope that people have during a difficult situation.",
    3369: "A greater amount.",
    3370: "Used to introduce information that adds to or supports what has previously been said.",
    3371: "The time from sunrise to noon.",
    3372: "Unable to live forever.",
    3373: "A legal agreement in which you borrow money from a bank in order to buy a house.",
    3374: "A loan for property, especially a home or a business.",
    3375: "A small flying insect that bites.",
    3376: "The greatest amount or number.",
    3377: "Almost all or mainly.",
    3378: "An insect similar to a butterfly that flies at night.",
    3379: "A female parent.",
    3380: "A movement that someone makes.",
    3381: "To give someone a reason to do something.",
    3382: "The reason you do something.",
    3383: "A machine that makes something move.",
    3384: "A two-wheeled vehicle with an engine.",
    3385: "To give something a particular shape or form.",
    3386: "A shaped container into which you pour a liquid that then becomes solid in the shape of the container.",
    3387: "A large pile of something.",
    3388: "A very high hill.",
    3389: "To show or feel great sadness when you lose someone.",
    3390: "A small rodent with a long tail.",
    3391: "The opening in the face used for eating and speaking.",
    3392: "To change position or place.",
    3393: "A series of organized activities in which people work together to do or achieve something.",
    3394: "A recorded story shown on a screen.",
    3395: "To cut grass or plants to make them short.",
    3396: "A title for a man.",
    3397: "A title for a married woman.",
    3398: "A title for a woman.",
    3399: "A large amount.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH34_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH34_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH34_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH34_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
