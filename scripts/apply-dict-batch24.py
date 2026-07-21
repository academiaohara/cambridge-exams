#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 24 (entries 2300-2399).

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

BATCH24_DEFINITIONS: dict[int, str] = {
    2300: "An extremely large collection of star systems.",
    2301: "A large space where people can see works of art.",
    2302: "To risk money or something valuable in the hope of winning more if you are lucky or if you guess something correctly.",
    2303: "An activity where people compete against each other.",
    2304: "A small piece of electronic equipment that you connect to a screen and use for interactive entertainment.",
    2305: "A group of people who associate for a criminal purpose.",
    2306: "A space between two things.",
    2307: "The part of a house where people put their cars.",
    2308: "Waste material like unwanted or spoiled food, bottles, paper, etc.",
    2309: "An area where people grow plants.",
    2310: "A plant with a strong smell and taste used in cooking.",
    2311: "A piece of clothing.",
    2312: "A substance that is not solid or liquid, such as air.",
    2313: "A type of door, usually made of metal or wood.",
    2314: "To form a group or bring together.",
    2315: "To believe that something is true although no one has directly told you about it.",
    2316: "To look at something for a long time.",
    2317: "A newspaper.",
    2318: "Equipment needed for a particular activity.",
    2319: "The parts of a motor that control the speed.",
    2320: "A category that describes being either a boy or a girl.",
    2321: "A unit inside a living thing that controls what it looks like and how it grows and develops.",
    2322: "Affecting all or most people.",
    2323: "In most cases, or to most people.",
    2324: "To cause something to develop or begin.",
    2325: "A group of people who live at the same time.",
    2326: "Likely to give things to people.",
    2327: "Related to the units inside the body that are passed from parents to children.",
    2328: "Someone who is much more intelligent or skilful than other people.",
    2329: "A very high level of skill or ability.",
    2330: "The deliberate murder of a whole group or race of people.",
    2331: "A type of literature, art, or music characterized by its style.",
    2332: "Kind and calm.",
    2333: "A polite or well-mannered man.",
    2334: "True or real.",
    2335: "The study of the Earth, its land, weather, etc.",
    2336: "The study of the Earth's natural structures and how they change.",
    2337: "The study of shapes and how to measure them.",
    2338: "A very small living thing that can make people sick.",
    2339: "To make a movement with your hands or head in order to show or tell someone something.",
    2340: "A movement that communicates a feeling or instruction.",
    2341: "To obtain or receive something.",
    2342: "The spirit of a dead person.",
    2343: "Someone who writes something for another person whose name will appear on it as the writer.",
    2344: "Very big.",
    2345: "Something you give someone.",
    2346: "Extremely large.",
    2347: "A high laugh, especially a nervous or silly one.",
    2348: "To laugh in a nervous, excited, or silly way that is difficult to control.",
    2349: "A root of a plant that is used to make food spicy and sweet.",
    2350: "A female child.",
    2351: "The main idea or most important point of something that someone has written or said.",
    2352: "To hand over something to someone.",
    2353: "A large piece of ice that moves very slowly.",
    2354: "Happy.",
    2355: "Full of beauty and excitement.",
    2356: "A quality relating to riches, wealth, and beauty.",
    2357: "A quick look at someone or something.",
    2358: "To look somewhere quickly and then look away.",
    2359: "To look at something quickly.",
    2360: "A transparent, breakable material.",
    2361: "To sparkle and shine.",
    2362: "To move in a smooth and easy way with no noise.",
    2363: "An occasion when you see someone or something for a moment only.",
    2364: "To see someone or something for a moment or not completely.",
    2365: "To show that you are happy and proud at your own success or at someone else's failure.",
    2366: "Happening all around the world.",
    2367: "An increase in the average temperature of the Earth.",
    2368: "The planet Earth; the world.",
    2369: "A state of almost complete darkness or sadness.",
    2370: "Dark or sad.",
    2371: "The importance, magnificence, or specialness of something.",
    2372: "A piece of clothing that covers your fingers and hand.",
    2373: "To produce a steady light.",
    2374: "A natural form of sugar that exists in plants and fruit.",
    2375: "A sticky substance used to join things together.",
    2376: "Looking sad as if you expect something bad to happen.",
    2377: "To move from one place to another.",
    2378: "Something you work toward.",
    2379: "An animal with horns and a beard.",
    2380: "A being worshipped as having power over nature.",
    2381: "A valuable yellow metal.",
    2382: "A sport with clubs and a small white ball.",
    2383: "Of high quality or pleasing.",
    2384: "Anything that can be bought or sold.",
    2385: "Very pleasing and attractive.",
    2386: "Information that might be untrue but is still discussed anyway.",
    2387: "To rule over a country or group.",
    2388: "The group of people who rule a country.",
    2389: "To take hold of something in a rough or rude way.",
    2390: "Elegance and beauty of movement.",
    2391: "Kind and helpful to those who need it.",
    2392: "A score or mark given to someone's work.",
    2393: "Happening slowly.",
    2394: "Someone who has a degree from a university.",
    2395: "To complete your studies at a university or college, usually by getting a degree.",
    2396: "To complete and pass all courses of study at a school.",
    2397: "A very small individual piece of a substance such as sand, salt, or sugar.",
    2398: "A unit of weight.",
    2399: "The rules of a language.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH24_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH24_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH24_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH24_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
