#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 32 (entries 3100-3199).

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

BATCH32_DEFINITIONS: dict[int, str] = {
    3100: "To put goods or materials onto or into a vehicle or container.",
    3101: "The goods that a vehicle carries.",
    3102: "Bread shaped and baked in one piece.",
    3103: "Something, usually money, that one person lends to another.",
    3104: "Nearby or relating to a particular area.",
    3105: "A small area or place where something specific happens.",
    3106: "To find the position of something.",
    3107: "A device for fastening a door or container.",
    3108: "A house in the mountains used by people who hunt or fish.",
    3109: "A thick piece of wood that is cut from a tree.",
    3110: "A way of thinking that makes sense.",
    3111: "Reasonable or sensible.",
    3112: "The only person or thing in a given place.",
    3113: "The unhappiness that is felt by someone if they do not have any friends.",
    3114: "Feeling sad because you are alone.",
    3115: "Having great length.",
    3116: "Having existed for a long time.",
    3117: "The ability to live or last for many years.",
    3118: "A strong feeling of wanting something.",
    3119: "To use your eyes to see something.",
    3120: "A line made into the shape of a circle.",
    3121: "Not held in place tightly.",
    3122: "A man of high rank.",
    3123: "To have something that is important or necessary taken from you or destroyed.",
    3124: "The act or instance of no longer having something important or necessary.",
    3125: "Unable to find one's way.",
    3126: "A large amount or number.",
    3127: "Strong and very easy to hear, when describing a sound.",
    3128: "To like something or someone a lot.",
    3129: "Smaller than usual in amount, number, or degree.",
    3130: "To move something downward or reduce its amount or level.",
    3131: "Always helping or supporting a certain person or thing.",
    3132: "Success or failure caused by chance.",
    3133: "Having good fortune.",
    3134: "Something that people believe brings them good fortune.",
    3135: "Bags and suitcases used for travel.",
    3136: "Wood that is used for building.",
    3137: "A solid piece of something that does not have a regular shape.",
    3138: "To put people or things into the same group although they do not really belong together.",
    3139: "Money paid in a single large payment rather than in smaller separate payments.",
    3140: "Related to the moon.",
    3141: "A meal eaten in the middle of the day.",
    3142: "A part of the body that fills with air when breathing.",
    3143: "To convince someone to do something by using a trick.",
    3144: "Full of a variety of large, healthy plants.",
    3145: "An expensive thing that is nice but not needed.",
    3146: "Expressing a lot of emotion, when describing a poem.",
    3147: "The words of a song.",
    3148: "A device made by people that does work.",
    3149: "Angry.",
    3150: "A regular publication with news, stories, and articles.",
    3151: "The power to do impossible things.",
    3152: "Relating to a quality that makes someone or something special.",
    3153: "A piece of iron or other material which attracts iron toward it.",
    3154: "Having the properties of a piece of iron that attracts metal.",
    3155: "Beautiful and grand.",
    3156: "To make something look bigger than it really is.",
    3157: "Large size or great importance.",
    3158: "Great size, importance, or effect.",
    3159: "A female servant.",
    3160: "Letters and other things sent to people.",
    3161: "Most important.",
    3162: "The largest part of a country, not including islands.",
    3163: "What is considered normal and accepted by most people.",
    3164: "Ideas, methods, or people that are considered ordinary or normal and accepted by most people.",
    3165: "Considered ordinary or normal and accepted or used by most people.",
    3166: "To make something continue in the same way or condition.",
    3167: "Large and impressive.",
    3168: "Supreme greatness or authority.",
    3169: "Important, serious, large, or great.",
    3170: "Very important or serious.",
    3171: "More than half of the people or things in a group.",
    3172: "To create or produce something.",
    3173: "Refers to men or boys.",
    3174: "A large shopping center.",
    3175: "An animal that usually has hair and is not born from an egg.",
    3176: "An adult male human.",
    3177: "To control or be in charge of something.",
    3178: "The act or process of controlling and dealing with something.",
    3179: "A person who controls a business or department.",
    3180: "Relating to the work of controlling a business or department.",
    3181: "One of the two main Chinese languages.",
    3182: "Required by official rules or regulations.",
    3183: "To move skillfully.",
    3184: "To make something visible or obvious.",
    3185: "A formal statement expressing the aims and plans of a group or organisation, especially a political party.",
    3186: "To skillfully or unfairly control or affect something.",
    3187: "Traditionally accepted ways of behaving that show polite respect for other people.",
    3188: "An action or movement that you need care or skill to do.",
    3189: "To move someone or something in a situation that needs care or skill.",
    3190: "A large house with many rooms.",
    3191: "A large and expensive home.",
    3192: "A book containing instructions for doing something, especially for operating a machine.",
    3193: "Operated by people rather than automatically or using computers.",
    3194: "To produce something in a factory.",
    3195: "Shows that there is a large number of something.",
    3196: "A drawing of an area showing the positions of features.",
    3197: "A long-distance race.",
    3198: "A type of rock that feels cold and is smooth when cut.",
    3199: "To walk in a group with regular matching steps, as soldiers do.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH32_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH32_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH32_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH32_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
