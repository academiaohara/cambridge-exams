#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 30 (entries 2900-2999).

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

BATCH30_DEFINITIONS: dict[int, str] = {
    2900: "A glass container with a lid.",
    2901: "Special words and phrases that only people in the same field understand.",
    2902: "Unhappy because someone has something you want, or because someone you love pays attention to another person.",
    2903: "A feeling of wanting something that somebody else has.",
    2904: "Trousers made of strong cotton cloth, usually blue.",
    2905: "Danger of loss or harm.",
    2906: "A fast plane with a big engine.",
    2907: "The tired, confused feeling you get after travelling quickly by plane across time zones.",
    2908: "A beautiful stone that is worth a lot of money.",
    2909: "Decorative items such as rings and necklaces worn on the body.",
    2910: "Having a lot of bad luck, as if under a curse.",
    2911: "The work you do to earn money.",
    2912: "To run at a slow steady speed, usually for exercise or pleasure.",
    2913: "A slow steady run for exercise or pleasure.",
    2914: "To run slowly for exercise.",
    2915: "To connect or become a member of something.",
    2916: "Involving two or more people or done by them together.",
    2917: "Something said to cause laughter.",
    2918: "A type of magazine that deals with an academic subject.",
    2919: "The work of collecting and reporting news for newspapers, television, or the internet.",
    2920: "A person who collects and reports news stories.",
    2921: "A long trip.",
    2922: "A feeling of great happiness.",
    2923: "To say if it is good or bad.",
    2924: "The ability to make sensible decisions.",
    2925: "A liquid from fruits or vegetables.",
    2926: "The seventh month of the year.",
    2927: "To push yourself off the ground.",
    2928: "A type of forest in a warm, rainy tropical area, where trees and plants grow very close together.",
    2929: "Younger or less experienced than others in the same role.",
    2930: "A group of people that listen to a trial and say if someone is guilty.",
    2931: "Exactly or only.",
    2932: "Fairness in the way that people are treated.",
    2933: "To show that there is a good reason for something, especially something that other people think is wrong.",
    2934: "In a fair and reasonable way.",
    2935: "Quick to understand and think clearly; very eager and interested.",
    2936: "To stay in a particular state, condition, or position.",
    2937: "A place where dogs are kept.",
    2938: "A type of oil used in some lamps and stoves.",
    2939: "A large metal pot used for boiling liquids or cooking food.",
    2940: "A small metal tool used to open a lock.",
    2941: "A panel with buttons marked with letters and numbers that are pressed to enter information into a computer.",
    2942: "To say something that is not true as a joke.",
    2943: "To take someone away illegally and detain them, often to demand money for their return.",
    2944: "To cause a person or animal to die.",
    2945: "A unit of weight equal to 1000 grams.",
    2946: "A unit of measurement that is 1,000 meters.",
    2947: "A person's family and relatives.",
    2948: "Friendly and helpful.",
    2949: "A male ruler of a country.",
    2950: "To touch with the lips as a sign of affection.",
    2951: "A set of all the things needed to do something.",
    2952: "A room where food is prepared.",
    2953: "A toy that flies in the wind.",
    2954: "A very young cat.",
    2955: "The joint between the thigh and lower leg.",
    2956: "To rest on one or both knees on the ground.",
    2957: "A tool used for cutting.",
    2958: "A soldier of high rank and skill who usually serves a king.",
    2959: "To make clothing from yarn.",
    2960: "A round handle.",
    2961: "To hit a door to get attention.",
    2962: "A fastening made by tying a piece of rope or string.",
    2963: "To have information in your mind.",
    2964: "Information and understanding gained through experience or education.",
    2965: "Knowing a lot about many different subjects or about one particular subject.",
    2966: "Familiar to many people; widely recognized.",
    2967: "A piece of paper or material fastened to an object that gives information about it.",
    2968: "To use a word or phrase to describe someone or something, especially one that is not completely fair or true.",
    2969: "A word or phrase used to describe someone or something, especially one that is not completely fair or true.",
    2970: "The act of doing or making something.",
    2971: "A room where a scientist works.",
    2972: "Physical work, especially hard work.",
    2973: "A delicate fabric with holes.",
    2974: "A situation in which there is not enough of something.",
    2975: "An object that is used to climb up and down things.",
    2976: "A woman.",
    2977: "To move or happen more slowly than someone or something else.",
    2978: "A large body of water surrounded by land.",
    2979: "A young sheep.",
    2980: "Unable to walk properly because of an injury to the leg or foot.",
    2981: "A device that gives light.",
    2982: "The solid part of the Earth's surface.",
    2983: "When you return to the ground or another surface after a flight or a boat ride.",
    2984: "A person who owns property and rents it to tenants.",
    2985: "An object or building that helps people find or remember a location.",
    2986: "The way an area of countryside or land looks.",
    2987: "A narrow road.",
    2988: "A system of communication.",
    2989: "A short or temporary period when you fail or forget to do things in the right way.",
    2990: "A period of time between two events.",
    2991: "To stop gradually or for a short time.",
    2992: "When an official document, decision, or right is no longer effective because it has not been renewed or used in time.",
    2993: "Very big in size.",
    2994: "A device that produces a narrow beam of light.",
    2995: "Coming after all others.",
    2996: "To continue for a particular length of time.",
    2997: "After the expected time.",
    2998: "At a time after the present or after something else happens.",
    2999: "The distance of a place north or south of the equator.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH30_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH30_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH30_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH30_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
