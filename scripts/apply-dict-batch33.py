#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 33 (entries 3200-3299).

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

BATCH33_DEFINITIONS: dict[int, str] = {
    3200: "A walk by a group of soldiers in which each person matches the speed and movements of the others.",
    3201: "To walk at a steady pace together with others.",
    3202: "A spread used as a substitute for butter.",
    3203: "The edge or border of something.",
    3204: "Related to the sea.",
    3205: "A sailor.",
    3206: "To celebrate an important event or time by doing something.",
    3207: "A place where people buy and sell products or food.",
    3208: "The ways in which a company encourages people to buy its products by deciding on price, type of customer, and advertising policy.",
    3209: "The legally recognized union of two people.",
    3210: "To become the husband or wife of someone in a formal ceremony.",
    3211: "To feel surprise and admiration for something.",
    3212: "A covering for the face.",
    3213: "A large quantity or number.",
    3214: "The amount of physical matter an object contains.",
    3215: "Very large.",
    3216: "To learn something thoroughly so that you can do it very well.",
    3217: "A man who has control over servants or other people who work for him.",
    3218: "An excellent work of art, or the best work an artist has ever produced.",
    3219: "A small piece of carpet.",
    3220: "To be the same or similar.",
    3221: "What is used to make something.",
    3222: "The study of numbers and shapes.",
    3223: "Physical substance.",
    3224: "A large pad for sleeping on.",
    3225: "To start behaving like an adult and become more sensible as you get older.",
    3226: "Behaving in the sensible way that you would expect an adult to behave.",
    3227: "To grow up to become an adult.",
    3228: "The highest amount of anything allowed.",
    3229: "Used to show that something is possible or may be true.",
    3230: "The person in charge of a city.",
    3231: "Used to refer to oneself.",
    3232: "Smaller or less than you want or need.",
    3233: "A time when food is eaten, such as breakfast, lunch, or dinner.",
    3234: "To signify something, or to intend to communicate something.",
    3235: "To move slowly without a particular direction or purpose in mind.",
    3236: "The definition of a word or idea.",
    3237: "A method or way of doing something.",
    3238: "The time between two events.",
    3239: "Happening at the same time as another action.",
    3240: "To find out the quality, value, or effect of something.",
    3241: "Food made of animals.",
    3242: "Someone who fixes vehicles or machines.",
    3243: "A part of a machine that performs a certain function.",
    3244: "A small piece of metal given as an award.",
    3245: "The different ways of entertaining and giving information to the public.",
    3246: "Related to the treatment of an injury or disease.",
    3247: "Medicine or drugs given to people who are sick.",
    3248: "Something you take to feel better or treat an illness.",
    3249: "Coming from the period between 650 and 1500 CE.",
    3250: "Average or below average in quality.",
    3251: "To focus or think deeply in silence.",
    3252: "In the middle between two extremes.",
    3253: "To come together so that you can talk or do something together.",
    3254: "A gathering where people come together to discuss or decide something.",
    3255: "A series of musical notes that form the main part of a song.",
    3256: "To change from solid to liquid by heating.",
    3257: "A person who is part of a group.",
    3258: "Remembered for a special reason.",
    3259: "Something that you remember.",
    3260: "To fix something when it is broken or damaged.",
    3261: "Related to the mind and thinking.",
    3262: "To talk about something briefly.",
    3263: "A list of food and drinks available at a restaurant.",
    3264: "Goods ready to be purchased or sold.",
    3265: "A person who sells things.",
    3266: "A feeling or act of kindness.",
    3267: "Used to emphasize how small or unimportant something or someone is.",
    3268: "To combine two things into one whole thing.",
    3269: "When two organisations combine to form one bigger organisation.",
    3270: "A positive or good quality.",
    3271: "Happy and pleasant.",
    3272: "A condition that is not clean or neat.",
    3273: "A set of words that you send to someone.",
    3274: "One who carries information from one place to another.",
    3275: "Relating to the chemical processes in which living things use food and water to make energy.",
    3276: "The way chemical processes in your body use energy.",
    3277: "A strong material people use to build things.",
    3278: "Concerned with the science of weather.",
    3279: "The science that studies the weather.",
    3280: "The way to do something.",
    3281: "Relating to a large city.",
    3282: "A very small living thing that often makes people sick.",
    3283: "A small device in a computer that holds information.",
    3284: "A device that makes small objects look bigger.",
    3285: "In the middle or center of something.",
    3286: "Nearest the center and with an equal number of things on each side.",
    3287: "Twelve o'clock at night.",
    3288: "The middle part of something.",
    3289: "Strength or power.",
    3290: "Very strong or powerful.",
    3291: "When a bird or animal travels to another part of the world for warmer weather at a particular time of year.",
    3292: "Not strong or severe.",
    3293: "A unit of distance equal to 1.6 kilometers.",
    3294: "Angry and aggressive, and willing to fight easily.",
    3295: "The armed forces of a country.",
    3296: "A white liquid produced by cows.",
    3297: "A building in which wheat is ground into flour.",
    3298: "A period of 1000 years, or the beginning of a period of 1000 years.",
    3299: "Another way to write the number 1,000,000.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH33_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH33_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH33_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH33_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
