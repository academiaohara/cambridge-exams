#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 35 (entries 3400-3499).

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

BATCH35_DEFINITIONS: dict[int, str] = {
    3400: "Soft, wet dirt.",
    3401: "Relating to many different cultures.",
    3402: "A large company that has offices, shops, or factories in several countries.",
    3403: "Having offices, shops, or factories in several countries.",
    3404: "Involving or consisting of many people, things, or parts.",
    3405: "A number that you can divide by a smaller number an exact number of times.",
    3406: "To increase in number.",
    3407: "A very large number of things or people.",
    3408: "The saying of something in a way that is not loud or clear enough so that your words are difficult to understand.",
    3409: "To say something in a way that is not loud or clear enough so that your words are difficult to understand.",
    3410: "Ordinary and not interesting or exciting, especially because it happens too regularly.",
    3411: "Belonging to a city or local government.",
    3412: "Something that is said in a very quiet voice.",
    3413: "A quiet continuous sound.",
    3414: "To say something in a very quiet voice.",
    3415: "A mass of tissue attached to bone that helps you move.",
    3416: "Very fit and strong.",
    3417: "A building that displays cultural, social, and scientific objects.",
    3418: "A fungus with a stem and a cap.",
    3419: "The sound made by singing or playing musical instruments.",
    3420: "Relating to songs and instruments such as pianos or guitars.",
    3421: "Used to show that something is necessary.",
    3422: "To become physically different from other plants or animals of the same type as a result of a genetic change.",
    3423: "Felt or done in the same way by each of two or more people.",
    3424: "Used to show that something belongs to me.",
    3425: "Something that is difficult to understand or explain.",
    3426: "A traditional story that explains a culture's history and beliefs.",
    3427: "A thin piece of metal used to attach things.",
    3428: "A word used to identify a person or thing.",
    3429: "Thin and not wide.",
    3430: "Not nice or pleasant.",
    3431: "A large area of land that is controlled by its own government.",
    3432: "Relating to a whole country.",
    3433: "An identity based on the country from which you come.",
    3434: "Referring to the place where someone was born and raised.",
    3435: "Not made by people.",
    3436: "An event such as a flood, earthquake, or storm that causes great damage or loss of life.",
    3437: "Everything in the physical world that is not made by people.",
    3438: "Behaving badly or not doing what you are told.",
    3439: "The feeling of being sick to your stomach.",
    3440: "Relating to a country's warships or sea-based military forces.",
    3441: "To control the way something moves or goes.",
    3442: "The part of a country's military that fights at sea.",
    3443: "Lacking experience of life and tending to trust other people and believe things too easily.",
    3444: "Close to something.",
    3445: "Not far away.",
    3446: "Almost but not completely.",
    3447: "Tidy and orderly.",
    3448: "Required and must be done.",
    3449: "Something that is needed.",
    3450: "The part of the body that connects the head to the torso.",
    3451: "A piece of jewelry that people wear around their necks.",
    3452: "A sweet liquid produced by flowers that bees and other insects collect.",
    3453: "To require something because it is necessary.",
    3454: "A small, sharp piece of metal used to make or fix clothes.",
    3455: "Very poor.",
    3456: "Unpleasant or sad.",
    3457: "To fail to take care of someone or something properly.",
    3458: "The failure to give someone or something the care or attention they need.",
    3459: "To fail to look after someone when you are responsible for them.",
    3460: "Extremely small and not important.",
    3461: "To discuss something in order to reach an agreement.",
    3462: "To try to reach an agreement by discussing something in a formal way, especially in a business or political situation.",
    3463: "A person who lives near you.",
    3464: "A district or area where people live.",
    3465: "Used to connect two negative possibilities.",
    3466: "A bundle of fibers that carries messages between the brain and other parts of the body.",
    3467: "Worried that something bad will happen.",
    3468: "A structure built by birds to hold their eggs.",
    3469: "A bag made of strong thread used to catch animals.",
    3470: "To connect computers together so that each can send and receive information to and from the others.",
    3471: "A set of computers connected to each other so that each can send and receive information to and from the others.",
    3472: "Not helping either of the two fighting sides.",
    3473: "At no time; not ever.",
    3474: "Despite what has just been said.",
    3475: "Not existing before.",
    3476: "A person who has recently arrived at a place or a group.",
    3477: "Information about recent events.",
    3478: "A publication with news and articles.",
    3479: "Coming immediately after.",
    3480: "Pleasant or good.",
    3481: "To cut something or someone slightly with a sharp object.",
    3482: "A familiar name for a person.",
    3483: "The time from sunset to sunrise.",
    3484: "A bad or scary dream.",
    3485: "The number 9.",
    3486: "The number 90.",
    3487: "The number 9 in a sequence.",
    3488: "Used to give a negative answer.",
    3489: "A rich and powerful person.",
    3490: "No person.",
    3491: "To move your head up and down.",
    3492: "An unpleasant sound.",
    3493: "Producing a lot of sound.",
    3494: "Not any of something.",
    3495: "Despite what has just been said or done.",
    3496: "Words or ideas that are silly or foolish.",
    3497: "A thin strip of pasta.",
    3498: "Twelve o'clock in the daytime.",
    3499: "Used to connect two negative ideas.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH35_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH35_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH35_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH35_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
