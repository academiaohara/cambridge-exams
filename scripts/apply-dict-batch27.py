#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 27 (entries 2600-2699).

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

BATCH27_DEFINITIONS: dict[int, str] = {
    2600: "A feeling of being very afraid or shocked.",
    2601: "A big, strong animal that people ride and use for pulling heavy things.",
    2602: "Friendly to strangers.",
    2603: "A place where sick or hurt people receive care or treatment.",
    2604: "Friendly behaviour and entertainment shown to guests or strangers.",
    2605: "Someone who invites a guest someplace.",
    2606: "Angry and unfriendly.",
    2607: "Having a high temperature.",
    2608: "A place where people stay overnight when they are traveling.",
    2609: "A type of dog that is often used for racing or hunting.",
    2610: "Sixty minutes.",
    2611: "A building where people live.",
    2612: "All the people who live in one building together.",
    2613: "The maintenance of a building or an establishment like a hotel.",
    2614: "Buildings for people to live in.",
    2615: "Used to ask about the way something happens.",
    2616: "Despite or not being influenced by something.",
    2617: "To make a long, loud sound like a wolf or a dog.",
    2618: "Very big.",
    2619: "To make a low, continuous noise.",
    2620: "A person.",
    2621: "Connected to improving people's lives.",
    2622: "Not believing that you are better than other people.",
    2623: "When there is a lot of water in the air.",
    2624: "To make someone feel ashamed and embarrassed.",
    2625: "Something that makes you laugh, or a person's mood.",
    2626: "A feeling that something is true or will happen although you do not know any definite facts about it.",
    2627: "The number 100.",
    2628: "The feeling that you get when you need to eat.",
    2629: "Feeling a need to eat.",
    2630: "To chase and kill animals for food or sport.",
    2631: "An obstacle or difficulty.",
    2632: "To throw something with force.",
    2633: "A violent storm with extremely strong winds and heavy rain.",
    2634: "To do something quickly.",
    2635: "To cause pain or injury.",
    2636: "A married man.",
    2637: "A small shelter made of wood, grass, or mud with only one or two rooms.",
    2638: "A gas that has no taste, colour, or smell.",
    2639: "The conditions or methods needed for health and cleanliness.",
    2640: "Clean and unlikely to cause disease.",
    2641: "An idea about something that has not been proved yet.",
    2642: "Frozen water.",
    2643: "A thought or plan.",
    2644: "Of the best or most suitable type.",
    2645: "As good as you can imagine and probably too good to be real.",
    2646: "The same as someone or something else.",
    2647: "To recognise someone and be able to say who they are.",
    2648: "To feel that you can understand and share someone else's feelings.",
    2649: "Who a person is.",
    2650: "A system of belief.",
    2651: "A system of ideas and principles on which a political or economic theory is based.",
    2652: "A phrase with a meaning different from its words.",
    2653: "A person who is not smart or who has done something silly.",
    2654: "Not doing anything when there are things that you should do.",
    2655: "Not having work to do.",
    2656: "A person who is greatly admired.",
    2657: "Used to talk about a possible situation.",
    2658: "Lack of knowledge about something.",
    2659: "Not knowing something that you should know or need to know.",
    2660: "To act as if you do not see or hear something.",
    2661: "Sick.",
    2662: "Against the law.",
    2663: "Difficult or impossible to read.",
    2664: "A disease or sickness.",
    2665: "To shine light on something or brighten it.",
    2666: "Something that looks real, but does not actually exist.",
    2667: "To draw a picture or to explain with examples.",
    2668: "A picture or representation of something.",
    2669: "Not real; existing only in the mind.",
    2670: "The ability to form pictures in the mind.",
    2671: "To form a picture of something in your mind.",
    2672: "A situation in which two things are not equal or fair.",
    2673: "To act in the exact same way.",
    2674: "Happening quickly.",
    2675: "Extremely large.",
    2676: "Someone who comes to live in a country from another country.",
    2677: "A person who moves to a different country.",
    2678: "The process in which people enter a country in order to live there permanently.",
    2679: "Not able to be affected by a disease.",
    2680: "The effect someone or something has.",
    2681: "To make something weaker or worse.",
    2682: "Annoyed because something is not happening as quickly as you want or in the way you want.",
    2683: "Getting angry or anxious when something takes too much time.",
    2684: "Going to happen soon.",
    2685: "Extremely important and must be done.",
    2686: "Related to an empire.",
    2687: "Not friendly and making people feel unimportant.",
    2688: "To show that someone has done a crime or something bad.",
    2689: "To suggest something without saying it directly.",
    2690: "To bring in a product from another country.",
    2691: "The quality or state of being valuable or significant.",
    2692: "Having great significance or value.",
    2693: "To interrupt or force your ideas on other people.",
    2694: "To introduce something such as a new law or new system and force people to accept it.",
    2695: "Not able to happen or be done.",
    2696: "To make someone proud or amazed.",
    2697: "The way of thinking about someone or something.",
    2698: "To put someone in prison.",
    2699: "To make something better.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH27_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH27_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH27_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH27_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
