#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 31 (entries 3000-3099).

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

BATCH31_DEFINITIONS: dict[int, str] = {
    3000: "Relating to something last in a series or the second choice of two things.",
    3001: "The sound made when someone is happy or a funny thing occurs.",
    3002: "The sound produced by laughing about something funny.",
    3003: "To make something go into motion.",
    3004: "Clothes that have been or need to be washed.",
    3005: "The hot substance made of melted rock that comes out of volcanoes.",
    3006: "A rule made by the legislative body.",
    3007: "An area covered in grass.",
    3008: "A person who works with the legal system and represents people in court.",
    3009: "To put or place in a horizontal or flat position.",
    3010: "A covering over something, or one of several pieces lying on top of each other.",
    3011: "Not wanting to work or use energy.",
    3012: "To go first so that others or something follow you.",
    3013: "A person who guides or directs others.",
    3014: "Most advanced or best in a particular area.",
    3015: "A flat part of a plant that grows from the stem.",
    3016: "A group of sports teams that play against each other.",
    3017: "To bend in a particular direction.",
    3018: "To jump over something.",
    3019: "A jump, especially a long or high one.",
    3020: "To gain knowledge or skill through study or experience.",
    3021: "To rent property, usually an apartment or land.",
    3022: "A rope or chain that is used to control an animal while walking.",
    3023: "Smallest in amount or degree.",
    3024: "A material made from animal skin that is used to make clothing.",
    3025: "To go away from someone or something.",
    3026: "A period of time away from your job or the armed forces.",
    3027: "A talk to a group of people about a particular subject, especially at a college or university.",
    3028: "To give a talk or a series of talks to a group of people, especially students.",
    3029: "A long, educational speech.",
    3030: "The direction that is the opposite of right.",
    3031: "A body part used for standing and walking.",
    3032: "An effect that exists because of a person or thing in the past.",
    3033: "Related to the rules made by government or allowed by those rules.",
    3034: "A story from the past.",
    3035: "To make rules through an official government process.",
    3036: "A rule or set of rules made by a government.",
    3037: "The section of a government that makes rules.",
    3038: "Acceptable according to the rules made by government.",
    3039: "The amount of space in front of your seat in which you can stretch your legs.",
    3040: "Free time when you can relax.",
    3041: "A sour yellow fruit.",
    3042: "To give something to someone for a short time, expecting it back.",
    3043: "How long something is from one end to the other.",
    3044: "Very small beans that people cook and eat.",
    3045: "A smaller amount.",
    3046: "A period of teaching or learning.",
    3047: "To allow.",
    3048: "A written message.",
    3049: "A green vegetable with leaves used in salads.",
    3050: "A point on a scale that measures something.",
    3051: "Very likely to happen.",
    3052: "To give someone the freedom to do what they want, for example by taking them out of a situation in which their behaviour is controlled.",
    3053: "Freedom to do what one wants.",
    3054: "A person who works in a library.",
    3055: "A place where you go to read books.",
    3056: "An official document that gives one permission to do something.",
    3057: "To pass your tongue over something.",
    3058: "A cover for a container.",
    3059: "To say or write something untrue to deceive someone.",
    3060: "A rank in the military or police, or a person with that rank.",
    3061: "The time when a person is alive.",
    3062: "The type of life you have, for example the type of job or house you have or the activities you enjoy.",
    3063: "The period of time when someone is alive.",
    3064: "The length of time that something exists or works.",
    3065: "To move something higher.",
    3066: "A form of energy or brightness that makes it possible to see something.",
    3067: "The bright light seen during a storm.",
    3068: "To find something pleasant.",
    3069: "How certain it is that something will happen.",
    3070: "Probable.",
    3071: "To say that someone or something is similar to someone or something else.",
    3072: "In the same way as someone or something else.",
    3073: "A feeling of enjoying something.",
    3074: "A large branch on a tree.",
    3075: "The largest or smallest amount of something that you allow.",
    3076: "To walk with difficulty because someone's leg or foot is hurt.",
    3077: "A row of people or things.",
    3078: "The words that an actor says in a performance.",
    3079: "Related to each other in some way.",
    3080: "To say or show that two things are related or that one of the things causes the other.",
    3081: "A connection between two or more people, places, facts, or events, especially when one is affected or caused by the other.",
    3082: "A large animal in the cat family.",
    3083: "The edge of the mouth.",
    3084: "A substance that can flow, has no fixed shape, and is not a solid or gas.",
    3085: "In the form of a substance that can flow and has no fixed shape.",
    3086: "A record of information printed with an item on each line.",
    3087: "To pay attention to a sound that you can hear.",
    3088: "A unit of volume.",
    3089: "The most basic meaning of a word, without figurative use.",
    3090: "Exactly as stated.",
    3091: "Involved with books, plays, and poetry in some way.",
    3092: "Books, plays, and poetry.",
    3093: "Trash left in public places.",
    3094: "Small in size or amount.",
    3095: "To be alive.",
    3096: "Full of energy and enthusiasm.",
    3097: "A large organ in the body that produces bile and cleans blood.",
    3098: "Farm animals kept for use or profit.",
    3099: "Alive.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH31_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH31_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH31_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH31_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
