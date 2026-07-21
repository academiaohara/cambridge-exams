#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 21 (entries 2000-2099).

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

BATCH21_DEFINITIONS: dict[int, str] = {
    2000: "On or from the outside of something such as a building or someone's body.",
    2001: "No longer existing; with none left alive.",
    2002: "When a particular animal, plant, type of person, custom, skill, etc. stops existing.",
    2003: "To put out a fire.",
    2004: "More than what is needed.",
    2005: "To remove something.",
    2006: "Amazing or remarkable.",
    2007: "Very great or intense.",
    2008: "Very much; to a very great degree.",
    2009: "Someone who is very confident, lively, and likes social situations.",
    2010: "The part of the body used for seeing.",
    2011: "The line of hair above the eye.",
    2012: "Lenses worn to help you see better.",
    2013: "A short story that teaches a lesson.",
    2014: "Cloth, especially when it is used for making things such as clothes or curtains.",
    2015: "Cloth used to make clothes, furniture, etc.",
    2016: "Extremely good.",
    2017: "To deal with something in a direct way.",
    2018: "To make something easier.",
    2019: "A building that exists for a particular purpose.",
    2020: "A piece of information that is true.",
    2021: "Something that has an effect on the way another thing happens.",
    2022: "A building where things are made or put together.",
    2023: "A mental or physical ability.",
    2024: "To become quieter or less bright.",
    2025: "A temperature scale where water freezes at 32° and boils at 212°.",
    2026: "To not succeed in what you try to do.",
    2027: "When something is not done right.",
    2028: "To go unconscious and fall down.",
    2029: "Reasonable or right.",
    2030: "To a certain degree but not very.",
    2031: "Strong belief in or trust of someone or something.",
    2032: "Trust or belief without proof.",
    2033: "Made to look real in order to trick people.",
    2034: "To drop down from a higher place.",
    2035: "Not correct.",
    2036: "A reputation one has gained among the public.",
    2037: "Known well through experience or contact.",
    2038: "A group of people who are related to each other.",
    2039: "A serious lack of food that continues for a long time and causes many people in a country to become ill or die.",
    2040: "Well known.",
    2041: "A person who likes and supports someone or something.",
    2042: "To want to have or do something.",
    2043: "Really good.",
    2044: "A pleasant situation that people think about but is unlikely to happen.",
    2045: "Not close.",
    2046: "An amount of money paid to use a bus, train, or taxi.",
    2047: "An instance of saying goodbye or a way to say it.",
    2048: "An area of land used for growing crops or raising animals.",
    2049: "A person who grows crops or raises animals for a living.",
    2050: "To make someone very interested.",
    2051: "The state of being very interested in something or attracted by something.",
    2052: "A popular style of clothes or behavior.",
    2053: "What people like to wear and do now.",
    2054: "Moving or happening quickly.",
    2055: "To close something or attach it to something else.",
    2056: "An oily solid or liquid substance in food.",
    2057: "Likely to cause someone's death.",
    2058: "A power that some people believe controls everything that happens in their lives.",
    2059: "A male parent.",
    2060: "A feeling of extreme tiredness.",
    2061: "A feeling of being extremely tired, either physically or mentally.",
    2062: "Responsibility for a mistake.",
    2063: "An act of kindness that you do for someone.",
    2064: "Liked more than others.",
    2065: "Something that you do for someone in order to help them.",
    2066: "To support an idea and believe that it is better than other ideas that have been suggested.",
    2067: "To help someone and give them an advantage in an unfair way.",
    2068: "The feeling of being afraid.",
    2069: "Possible to do.",
    2070: "A large, elaborate meal.",
    2071: "An impressive or difficult achievement or action.",
    2072: "One of the light structures covering a bird's body.",
    2073: "An important part of something.",
    2074: "Annoyed or bored with something that you feel you have accepted for too long.",
    2075: "Relating to the government of a country.",
    2076: "A group of states or businesses working for a common cause.",
    2077: "The amount of money you pay to do something.",
    2078: "Small or weak.",
    2079: "To give food to someone or something.",
    2080: "Comments to a person about how they are doing something.",
    2081: "To experience an emotion or sensation.",
    2082: "An emotion.",
    2083: "The parts of the body used for standing and walking.",
    2084: "Someone who shares a job or quality with someone else.",
    2085: "Relating to women or girls.",
    2086: "Having qualities commonly associated with women.",
    2087: "A structure that encloses an area.",
    2088: "A boat that carries passengers over short distances.",
    2089: "Able to produce good crops and plants.",
    2090: "A substance added to soil to help plants grow.",
    2091: "An event that is held to celebrate a particular thing.",
    2092: "Happy and related to a party or celebration.",
    2093: "To go and get something.",
    2094: "When a body's temperature is higher than normal.",
    2095: "A small number of things.",
    2096: "A thread of a substance used to make clothes or rope.",
    2097: "A story that is not true.",
    2098: "Invented as part of a story.",
    2099: "Another name for a violin.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH21_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH21_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH21_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH21_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
