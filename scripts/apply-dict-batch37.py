#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 37 (entries 3600-3699).

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

BATCH37_DEFINITIONS: dict[int, str] = {
    3600: "A person or group trying to defeat another person or group.",
    3601: "A chance to do something.",
    3602: "To dislike something or act against it.",
    3603: "Completely different from something else.",
    3604: "To rule over someone in a cruel and unfair way.",
    3605: "Relating to the eyes or light.",
    3606: "The state of being hopeful about the future.",
    3607: "Someone who has a lot of hope and always sees the bright side of things.",
    3608: "Hopeful about the future and expecting that good things will happen.",
    3609: "Based on beliefs that are too confident.",
    3610: "Best or most suitable within a range of possibilities.",
    3611: "The best or most suitable situation, level, or amount.",
    3612: "A choice between two or more things.",
    3613: "Available or possible if you want it, but you do not have to have it or do it.",
    3614: "Used to show a choice.",
    3615: "Spoken rather than written.",
    3616: "A round citrus fruit with thick skin, or the bright colour of that fruit.",
    3617: "A large ape with red and brown hair and long arms.",
    3618: "To move around something in a continuous, curving path.",
    3619: "A large group of musicians playing together.",
    3620: "A bad experience.",
    3621: "The arrangement of things in a sequence.",
    3622: "Normal, or not special in any way.",
    3623: "The raw form of rock or material from which a valuable metal is taken.",
    3624: "A part of the body that has a specific function.",
    3625: "Grown without adding chemicals.",
    3626: "A living thing, especially a very small one.",
    3627: "A group of people working together.",
    3628: "To plan or get ready for an event.",
    3629: "To align or position something.",
    3630: "Faced in a particular direction or focused on a particular thing.",
    3631: "The point where something begins.",
    3632: "The first one of that thing.",
    3633: "At the beginning; when something first happened or began.",
    3634: "To start in a particular place or from a particular source.",
    3635: "An attractive object that people display in their homes.",
    3636: "A child who does not have parents.",
    3637: "Different from the one mentioned.",
    3638: "In another way if you do not do this.",
    3639: "The right thing to do.",
    3640: "A unit of weight.",
    3641: "Used to show that something belongs to us.",
    3642: "Away from the inside.",
    3643: "The wild inland region of Australia where very few people live.",
    3644: "A sudden start or increase of fighting or disease.",
    3645: "A sudden, strong expression of an emotion.",
    3646: "To be much better than someone or something else.",
    3647: "The end result of an action or event.",
    3648: "No longer current or modern.",
    3649: "Taking place outside.",
    3650: "A set of clothes worn together, often for a certain job or event.",
    3651: "A criminal who hides from the police.",
    3652: "The plan for a story or essay.",
    3653: "A person's opinion or way of thinking about something.",
    3654: "To have a greater number than another group.",
    3655: "To make someone feel very angry or shocked.",
    3656: "Very angry.",
    3657: "Open and direct.",
    3658: "The beginning of something.",
    3659: "The outer side or surface of something.",
    3660: "Not afraid to say what you think.",
    3661: "Extremely good.",
    3662: "Extended to its full length.",
    3663: "To exceed something in value, amount, or importance.",
    3664: "Above or on top of something.",
    3665: "Considering the whole thing.",
    3666: "Full of clouds and not sunny.",
    3667: "To successfully deal with a problem.",
    3668: "Having too many people or things in it.",
    3669: "An agreement with your bank that allows you to spend money when you have no money left in your account.",
    3670: "Later than expected or required.",
    3671: "Located above you.",
    3672: "To hear something without the speaker's knowledge.",
    3673: "Extremely happy.",
    3674: "To cover part of something.",
    3675: "To put more things into something than it is meant to hold.",
    3676: "To fail to notice something or to not realize that it is important.",
    3677: "Happening during the night.",
    3678: "The state of having too many people in an area.",
    3679: "Happening in another country across an ocean.",
    3680: "To make sure that something is being done properly.",
    3681: "A general description of a situation.",
    3682: "Heavier than is healthy.",
    3683: "To exist in such a large amount that someone cannot deal with it.",
    3684: "To make someone tired with too much work.",
    3685: "To have to pay money to someone.",
    3686: "To have something that belongs to you.",
    3687: "A person who possesses something.",
    3688: "A gas that all living things need to breathe.",
    3689: "The speed at which something happens.",
    3690: "To put things into a container for travel.",
    3691: "A box or container used to send something.",
    3692: "A thick piece of soft material used to protect or clean things.",
    3693: "A piece of wood or plastic that moves a boat across water.",
    3694: "A sheet of paper in a book or document.",
    3695: "The feeling that you have when you are hurt.",
    3696: "To cover a surface with coloured liquid.",
    3697: "An artist who creates pictures using coloured liquid.",
    3698: "A picture made with coloured liquid.",
    3699: "Two things that are the same and used together.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH37_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH37_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH37_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH37_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
