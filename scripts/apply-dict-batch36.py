#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 36 (entries 3500-3599).

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

BATCH36_DEFINITIONS: dict[int, str] = {
    3500: "A way of behaving that is considered normal in a particular society.",
    3501: "Usual and not strange.",
    3502: "The direction that is to the left when facing the rising sun.",
    3503: "The direction between north and west.",
    3504: "The part of the face used for smelling.",
    3505: "Used to make a negative.",
    3506: "A short piece of writing.",
    3507: "A book of blank pages for writing in.",
    3508: "Not anything.",
    3509: "To become aware of something by seeing or hearing it.",
    3510: "To tell someone officially about something.",
    3511: "An idea or understanding of something.",
    3512: "Well known because of something bad.",
    3513: "Despite something; in spite of something.",
    3514: "To give someone or something the food needed to live.",
    3515: "A book that tells a story.",
    3516: "New or unusual.",
    3517: "Someone who writes long fictional books.",
    3518: "Something new, original, or strange.",
    3519: "The eleventh month of the year.",
    3520: "At the present time.",
    3521: "At the present time.",
    3522: "No place or not existing.",
    3523: "Relating to energy produced by changing the structure of the central part of an atom.",
    3524: "The central part of an atom or cell.",
    3525: "Having no feeling in a part of your body.",
    3526: "Not able to react or to show your emotions, often because of an extreme shock.",
    3527: "A word or symbol that represents an amount.",
    3528: "Existing in large numbers.",
    3529: "A person who helps sick people in the hospital.",
    3530: "A room where babies and children sleep, play, or are cared for.",
    3531: "An institution where elderly people live when they need help looking after themselves.",
    3532: "To care for something as it grows or develops.",
    3533: "A hard seed or fruit that comes from some trees and bushes.",
    3534: "The process of eating the right kind of food in order to stay healthy.",
    3535: "Helping the body stay healthy.",
    3536: "A large tree that produces acorns.",
    3537: "A long pole with a flat end used for rowing a boat.",
    3538: "A place in the desert with water and plants.",
    3539: "A formal, often public, promise.",
    3540: "To follow what a law or a person says to do.",
    3541: "A non-living thing that you can see or touch.",
    3542: "To feel or say that you oppose or disapprove of something.",
    3543: "A goal or plan that someone has.",
    3544: "A duty or commitment.",
    3545: "To require someone to do something.",
    3546: "Not well known.",
    3547: "To watch something carefully.",
    3548: "To think about something all of the time.",
    3549: "Considering someone or something so important that you are always thinking about them in a way that seems extreme to other people.",
    3550: "No longer used because something better exists.",
    3551: "No longer used because of being replaced by something newer and more effective.",
    3552: "An object or a problem that stops you from doing something.",
    3553: "To block or get in the way of something.",
    3554: "To get something you want or need.",
    3555: "Clear or easy to see.",
    3556: "A particular time when something happens.",
    3557: "Happening from time to time.",
    3558: "To use a room, building, area of land, seat, or other place during a period of time.",
    3559: "To live, work, or be in a place.",
    3560: "To happen.",
    3561: "All of the salt water that surrounds land.",
    3562: "Unusual or strange.",
    3563: "The chances of something happening.",
    3564: "A very distinct smell.",
    3565: "Used to show belonging or connection.",
    3566: "Away from a place.",
    3567: "To make someone angry or upset.",
    3568: "Behavior that is wrong or breaks a law.",
    3569: "Causing anger or resentment.",
    3570: "To present something for someone to accept or reject.",
    3571: "A room or building where people work.",
    3572: "A leader in the army.",
    3573: "Approved by someone in authority.",
    3574: "Working on a computer but not connected to the Internet.",
    3575: "Working on a computer but not connected to the Internet.",
    3576: "The children of a person or the babies of an animal.",
    3577: "Happening many times.",
    3578: "A smooth, thick liquid made from plants or some animals, and is especially used in cooking.",
    3579: "Acceptable or satisfactory.",
    3580: "Having lived for many years.",
    3581: "A small egg-shaped black or green fruit.",
    3582: "Relating to a major international sports competition held every four years.",
    3583: "A sign of what will happen in the future.",
    3584: "To leave something out or not do it.",
    3585: "Used to show position above and touching something.",
    3586: "One time.",
    3587: "The number 1.",
    3588: "Still happening or still growing.",
    3589: "A vegetable with a strong smell and taste.",
    3590: "Connected to or available through a computer or a computer network, especially the Internet.",
    3591: "On the Internet.",
    3592: "Solely or exclusively.",
    3593: "The beginning of something unpleasant.",
    3594: "Moving to a position on something.",
    3595: "Difficult to see through.",
    3596: "To move something so that what was closed is no longer shut.",
    3597: "To work or function.",
    3598: "When a doctor replaces or removes something in the body.",
    3599: "A thought about a person or a thing.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH36_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH36_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH36_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH36_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
