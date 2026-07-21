#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 26 (entries 2500-2599).

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

BATCH26_DEFINITIONS: dict[int, str] = {
    2500: "To have a strong dislike for something.",
    2501: "A strong feeling of not liking someone or something.",
    2502: "To carry something from place to place.",
    2503: "To own or possess something.",
    2504: "Dry grass used to feed animals and can be used for different purposes.",
    2505: "Something that could be dangerous or cause damage or accidents.",
    2506: "Used to refer to a male.",
    2507: "The top part of the body.",
    2508: "A pain felt inside the skull.",
    2509: "To try to persuade someone to leave their job and go to work for another company.",
    2510: "The title of a newspaper story.",
    2511: "A building where the bosses of a company work.",
    2512: "To become healthy or well again.",
    2513: "The state of a person's body.",
    2514: "In good physical condition.",
    2515: "A large pile of something, especially an untidy pile.",
    2516: "To make a big untidy pile of things.",
    2517: "To be aware of sound through your ears.",
    2518: "An organ that keeps the body alive.",
    2519: "Loud and happy.",
    2520: "The quality of being hot.",
    2521: "The place that some believe people go to after they die.",
    2522: "Having great weight.",
    2523: "A unit of measure equal to 10,000 square meters.",
    2524: "A fence made of bushes.",
    2525: "The back part of the foot.",
    2526: "How tall someone or something is.",
    2527: "To increase the intensity of an emotion or feeling.",
    2528: "A person who receives the money or property of someone who dies.",
    2529: "A flying machine with large blades that spin.",
    2530: "A place of punishment after death in some religions.",
    2531: "A greeting.",
    2532: "A type of hard hat that protects your head.",
    2533: "To do something that makes something easier for someone else.",
    2534: "Giving assistance.",
    2535: "One half of the Earth.",
    2536: "A female chicken.",
    2537: "Used to show that something is a result of something else.",
    2538: "Used to refer to a female.",
    2539: "A plant used for cooking or medicine.",
    2540: "A group of animals.",
    2541: "In or to this place.",
    2542: "The process of passing on features from parents to children.",
    2543: "The art, buildings, traditions, and beliefs that a society considers important to its history and culture.",
    2544: "One who lives alone and does not spend time with others.",
    2545: "A brave person who does things to help others.",
    2546: "Not sure or slow to act or speak.",
    2547: "To wait for a short time before doing something.",
    2548: "Used to get someone's attention.",
    2549: "Not easily noticed or too hard to find.",
    2550: "To put something where it cannot be seen.",
    2551: "A system of things or people ranked one above the other.",
    2552: "Greater than usual in amount, number, or degree.",
    2553: "A very tall building with many floors or levels.",
    2554: "High areas of land, usually with mountains.",
    2555: "To mark something with a colour so that it is easy to see.",
    2556: "A main road for travelling long distances.",
    2557: "To take control of a vehicle by force.",
    2558: "To take a long walk in the countryside.",
    2559: "Someone who walks for long distances in the countryside for pleasure.",
    2560: "A raised area of land that is higher than the land around it.",
    2561: "Used to refer to a male.",
    2562: "To stop someone or something from doing something.",
    2563: "Something that you say to show what you are thinking or feeling without saying it directly.",
    2564: "A useful suggestion or piece of advice.",
    2565: "To say what you are thinking or feeling in an indirect way.",
    2566: "The part of the body between the waist and thigh.",
    2567: "To pay someone money to work for you.",
    2568: "Used to show that something belongs to a male.",
    2569: "The study of the past.",
    2570: "To affect someone or something in a harmful or dangerous way.",
    2571: "To travel by asking for rides from passing vehicles.",
    2572: "Someone who travels by asking other people to take them in their car by standing at the side of a road and holding out their thumb or a sign.",
    2573: "A fun and creative activity people do in their free time.",
    2574: "A sport played on ice with sticks and a puck.",
    2575: "To have a particular degree, title, record, job, or position.",
    2576: "A hollow space in something solid.",
    2577: "A special day of celebration.",
    2578: "Empty inside.",
    2579: "Sacred or religious.",
    2580: "The place where a person lives.",
    2581: "Having no place to live.",
    2582: "Schoolwork that students are expected to do outside class.",
    2583: "Made up of things that are all the same.",
    2584: "Truthful.",
    2585: "The quality of being truthful.",
    2586: "A sweet, sticky substance made by bees.",
    2587: "To show respect for someone or something.",
    2588: "Part of a coat that goes over a person's head.",
    2589: "A sharp curved piece of metal used for catching or holding things.",
    2590: "A ring that is made of plastic, metal, or wood.",
    2591: "To move forward by jumping on one foot.",
    2592: "A quick jump on one foot.",
    2593: "To want something to happen.",
    2594: "Where the sky looks like it meets the ground.",
    2595: "Flat and level with the ground.",
    2596: "A device that makes a loud noise.",
    2597: "Very bad.",
    2598: "Very shocked and upset.",
    2599: "Frightening and very unpleasant.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH26_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH26_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH26_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH26_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
