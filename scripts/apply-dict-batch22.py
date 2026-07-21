#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 22 (entries 2100-2199).

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

BATCH22_DEFINITIONS: dict[int, str] = {
    2100: "A subject that people study or an area of activity that they are involved in as part of their work.",
    2101: "Angry or violent.",
    2102: "Burning strongly.",
    2103: "The number 15.",
    2104: "The number 5 in a sequence.",
    2105: "The number 50.",
    2106: "A soft, sweet fruit with many small seeds.",
    2107: "To use force to hurt someone or something.",
    2108: "A number or a shape.",
    2109: "To come to understand something and find an answer.",
    2110: "A set of information on a computer.",
    2111: "To make something full.",
    2112: "A movie.",
    2113: "A device that removes unwanted substances.",
    2114: "Dirt or dirty things that disgust you.",
    2115: "The last part; not to be changed.",
    2116: "At the end of a series of events.",
    2117: "Decisions on how money is spent or invested.",
    2118: "Money that is used to pay for something such as a large project.",
    2119: "To pay for something such as a large project.",
    2120: "Relating to money.",
    2121: "To discover or locate something.",
    2122: "Of high quality or satisfactory.",
    2123: "Objects such as paintings that are created to be looked at because they are beautiful or interesting.",
    2124: "One of the five digits on the hand.",
    2125: "To complete something.",
    2126: "Existing only in limited numbers or amounts, or continuing only for a limited time or distance.",
    2127: "The heat and light produced when something burns.",
    2128: "To make someone leave their job, sometimes as a punishment.",
    2129: "A person whose job is to stop and put out burning buildings and other blazes.",
    2130: "A structure in a room where people can burn wood or coal for warmth.",
    2131: "Objects that create coloured lights when they are lit.",
    2132: "Solid but not hard.",
    2133: "Coming before all others.",
    2134: "Of the highest quality.",
    2135: "From an original source.",
    2136: "Related to money, especially that of a government or business.",
    2137: "An animal that lives in water.",
    2138: "A person who catches sea or river animals with nets, rods, or traps.",
    2139: "A hand with fingers bent in toward the palm.",
    2140: "To be the right size or shape.",
    2141: "The state of being healthy and strong.",
    2142: "The number 5.",
    2143: "To make something work.",
    2144: "A piece of coloured cloth that represents something.",
    2145: "To come off a surface in small flat pieces.",
    2146: "A small flat piece of something.",
    2147: "The visible, glowing part of something burning.",
    2148: "To be positioned at the side of something or someone.",
    2149: "To move quickly up and down or from side to side.",
    2150: "To burn brightly or suddenly.",
    2151: "A sudden, brief burst of light.",
    2152: "A small portable light that people carry in their hands.",
    2153: "Relating to something that is level and smooth with no curved parts.",
    2154: "To praise someone in an effort to please them.",
    2155: "To praise someone in order to get something you want, especially in a way that is not sincere.",
    2156: "The taste of food or drinks.",
    2157: "A mistake or fault in something that makes it useless, less effective, or less beautiful.",
    2158: "To leave somewhere very quickly in order to escape from danger.",
    2159: "A group of ships.",
    2160: "The muscle and fat on your body.",
    2161: "Able to bend easily without breaking.",
    2162: "A journey on an airplane.",
    2163: "To press a switch quickly to turn it on or off.",
    2164: "To rest or move slowly on the surface of a liquid and not sink.",
    2165: "To move on top of water without sinking.",
    2166: "To gather in one place.",
    2167: "When water covers a place.",
    2168: "A large amount of water that covers an area that was dry before.",
    2169: "An event in which water covers an area that is usually dry.",
    2170: "The lower surface of a room.",
    2171: "A powder made from plants that is used to make foods like bread.",
    2172: "To do very well and be in an excellent condition.",
    2173: "When a liquid moves smoothly and continuously in one direction.",
    2174: "The continuous movement of a liquid in one direction.",
    2175: "The coloured part of a plant.",
    2176: "A common illness that causes fever and body aches.",
    2177: "To change frequently in amount or level.",
    2178: "To change frequently.",
    2179: "Able to speak a language very well.",
    2180: "Smooth and moving gracefully.",
    2181: "When the face becomes red due to heat, illness, or emotion.",
    2182: "To move through the air.",
    2183: "To think about something and pay attention to it.",
    2184: "An enemy or opponent.",
    2185: "A thick cloud that is near the ground or water.",
    2186: "To bend something so that one part lies on top of another.",
    2187: "The collection of beliefs and stories of a culture.",
    2188: "To go after someone or something.",
    2189: "Things people and animals eat.",
    2190: "A person who lacks good sense or judgment.",
    2191: "Lacking good sense or judgment.",
    2192: "The part of the body at the end of the leg.",
    2193: "A sport with eleven players and an oval-shaped ball.",
    2194: "A note at the bottom of a page that gives more detailed information about something on the page.",
    2195: "Used to indicate the purpose of something.",
    2196: "To order someone not to do something.",
    2197: "A person's strength or power.",
    2198: "Physical strength or violence.",
    2199: "The influence or powerful effect that someone has.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH22_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH22_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH22_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH22_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
