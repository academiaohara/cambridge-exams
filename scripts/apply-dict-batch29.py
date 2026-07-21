#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 29 (entries 2800-2899).

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

BATCH29_DEFINITIONS: dict[int, str] = {
    2800: "Immediate.",
    2801: "In place of.",
    2802: "A natural tendency to behave in a particular way that people and animals are born with and that they obey without knowing why.",
    2803: "An organization that is interested in research or teaching.",
    2804: "A large organisation such as a bank, hospital, university, or prison.",
    2805: "To teach.",
    2806: "A direction or order.",
    2807: "Directions that explain how to do something.",
    2808: "A person who teaches a skill.",
    2809: "Something designed to do a certain task, like play music.",
    2810: "Involved in an important way in making something happen.",
    2811: "To protect something from heat, cold, or noise.",
    2812: "To say things that will hurt someone's feelings.",
    2813: "An arrangement in which you regularly pay a company an amount of money so that they will compensate you if something you own is damaged, lost, or stolen, or if you die or are ill or injured.",
    2814: "An arrangement where you pay money to a company in case of an accident or loss.",
    2815: "Complete and not damaged.",
    2816: "An important part of the whole.",
    2817: "Forming an essential part of something and needed to make it complete.",
    2818: "To make something a part of another larger thing.",
    2819: "To make someone become a full member of a group or society and be involved completely in its activities.",
    2820: "Honesty and good morals.",
    2821: "A person's ability to understand things easily.",
    2822: "Relating to the ability to think in an intelligent way and to understand things, especially difficult or complicated ideas and subjects.",
    2823: "Well educated and interested in art, science, literature, etc. at an advanced level.",
    2824: "Someone who is well educated and interested in art, science, literature, etc. at an advanced level.",
    2825: "The ability to learn and understand things.",
    2826: "Good at thinking clearly and quickly, at understanding difficult ideas and subjects, and at gaining and using knowledge.",
    2827: "Very smart.",
    2828: "To plan to do something.",
    2829: "Very strong.",
    2830: "Strength.",
    2831: "Involving a lot of teaching or training in a short time.",
    2832: "A plan to do something.",
    2833: "What a person plans to do.",
    2834: "To talk to or do something with another person.",
    2835: "A discussion in which people share ideas.",
    2836: "A feeling of wanting to know more about something.",
    2837: "Money that a person or institution such as a bank charges you for lending you money.",
    2838: "Catching your attention.",
    2839: "To deliberately become involved in a situation and try to influence the way that it develops, although you have no right to do this.",
    2840: "Intended to last or perform an activity only until someone or something permanent or final is available.",
    2841: "The time between one thing happening and another, or while waiting for something permanent or final to become available.",
    2842: "The inside of something.",
    2843: "In between two stages, places, levels, times, etc.",
    2844: "At an academic level below advanced.",
    2845: "Existing or happening inside an object, a building, or your body.",
    2846: "Involving more than one country.",
    2847: "A global computer network.",
    2848: "To find the meaning of something, often by changing it into a different language.",
    2849: "To stop someone from speaking or doing something.",
    2850: "A period of time between two events.",
    2851: "A short break between the parts of something such as a play or concert.",
    2852: "To help stop a problem between two people or groups.",
    2853: "To become involved in a situation in order to try to stop or change it.",
    2854: "A formal meeting to ask someone questions.",
    2855: "Tubes through which food passes after it leaves the stomach.",
    2856: "A very close personal relationship, especially a sexual one.",
    2857: "Relating to very private or personal things.",
    2858: "To frighten others.",
    2859: "To deliberately make someone feel frightened, especially so that they will do what you want.",
    2860: "Used to show movement to the inside of something.",
    2861: "To cause curiosity about something or someone.",
    2862: "Related to the basic nature of something.",
    2863: "To present someone or something for the first time.",
    2864: "Someone who tends to concentrate on their own thoughts and feelings rather than communicating with other people.",
    2865: "An ability to know or understand something through your feelings rather than by considering facts or evidence.",
    2866: "To take over a place by force.",
    2867: "Not correct or not legally acceptable.",
    2868: "Extremely useful.",
    2869: "An attack by a group from another country.",
    2870: "To create something that never existed before.",
    2871: "Good at creating new things.",
    2872: "A supply of something.",
    2873: "To use money in a way that will bring a profit later.",
    2874: "To search for something or learn about it.",
    2875: "Money used in a way that may earn you more money, for example money used for buying property or shares in a company.",
    2876: "The process of spending money in order to improve something or make it more successful.",
    2877: "To ask someone to come to a place or event.",
    2878: "A bill for goods or services.",
    2879: "To mention something to support an argument or ask for help.",
    2880: "To include something as a necessary part of an activity, event, or situation.",
    2881: "Not expressed or shown to others.",
    2882: "A strong metal that is used to make many objects.",
    2883: "To supply water to land so that crops can grow.",
    2884: "Becoming annoyed or angry very easily.",
    2885: "To annoy someone.",
    2886: "A painful feeling in a part of the body, often with red skin or swelling.",
    2887: "Land in the middle of water.",
    2888: "To separate one person or thing from a group.",
    2889: "An important topic.",
    2890: "Used to refer to a thing or animal.",
    2891: "To have an unpleasant feeling that you want to scratch.",
    2892: "A single separate piece.",
    2893: "A hard, white substance that comes from elephants.",
    2894: "A short coat.",
    2895: "Having a tough, uneven shape or edge.",
    2896: "A place to keep bad people.",
    2897: "A sweet spread made from fruit.",
    2898: "A person who makes repairs and takes care of a building.",
    2899: "The first month of the year.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH29_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH29_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH29_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH29_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
