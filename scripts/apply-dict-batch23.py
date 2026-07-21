#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 23 (entries 2200-2299).

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

BATCH23_DEFINITIONS: dict[int, str] = {
    2200: "A power that makes an object move or changes the way it moves.",
    2201: "To make someone do something that they do not want to do, for example by using or threatening to use violence.",
    2202: "To use physical strength to move something in a particular direction.",
    2203: "An idea about what the weather will be like in the future.",
    2204: "The finger between one's thumb and middle finger.",
    2205: "The part of the face above the eyes.",
    2206: "Unfamiliar or from another country.",
    2207: "Most important or leading.",
    2208: "To know about something before it happens.",
    2209: "To see or know something that will happen in the future.",
    2210: "A large area covered with trees.",
    2211: "For all future time, or for a very long time.",
    2212: "To make or produce, especially with difficulty.",
    2213: "To not remember something.",
    2214: "To stop being angry with someone.",
    2215: "A utensil with prongs used for eating.",
    2216: "To make or to shape something.",
    2217: "Official or serious.",
    2218: "Used for describing someone or something that had a particular job title, status, etc. in the past but not now.",
    2219: "Relating to something that used to be but is not anymore.",
    2220: "A plan or method for doing something.",
    2221: "About to happen in the future.",
    2222: "Lucky.",
    2223: "The things that happen but are not controlled by a person.",
    2224: "The number 40.",
    2225: "An open public place in which meetings are held.",
    2226: "In the direction in front of you.",
    2227: "The hard remains of a prehistoric animal or plant.",
    2228: "Substances such as coal or oil made from decayed material from animals or plants that lived many thousands of years ago.",
    2229: "To look after a child as part of your family for a period of time because the child's parents cannot look after them.",
    2230: "Very unpleasant.",
    2231: "To start a company or organization.",
    2232: "A group that provides money for research.",
    2233: "A source of water made by people.",
    2234: "The number 4.",
    2235: "The number 14.",
    2236: "The number 4 in a sequence.",
    2237: "A small part or amount of something.",
    2238: "A division or part of a whole number, for example 1/2 or 3/4.",
    2239: "A crack or break in something.",
    2240: "Easy to break or damage.",
    2241: "A small part of something.",
    2242: "Having a pleasant smell.",
    2243: "A border for a picture or mirror.",
    2244: "A set of rules or ideas that people use to solve problems.",
    2245: "The right to sell another company's products or services in a particular area.",
    2246: "Behaving in a wild way because of fear.",
    2247: "The crime of gaining money by lying or by tricking people.",
    2248: "Something with very unusual features that make it very different from other things of its type.",
    2249: "Extremely unusual and unexpected.",
    2250: "Not costing money or not being controlled.",
    2251: "The power to act, speak, or think as one wants.",
    2252: "To become solid because of cold.",
    2253: "A set of items carried on a train, boat, or airplane.",
    2254: "The number of times that something happens during a period of time.",
    2255: "Happening or done often.",
    2256: "Happening often.",
    2257: "New or recently made.",
    2258: "The physical force that makes it difficult for one surface to move over another.",
    2259: "The day of the week after Thursday.",
    2260: "A refrigerator.",
    2261: "Someone a person knows and likes spending time with.",
    2262: "Kind and pleasant.",
    2263: "The relationship between people who know and like each other.",
    2264: "To cause fear.",
    2265: "A small animal with long legs for jumping.",
    2266: "Indicating a starting place or position.",
    2267: "The part that faces forward.",
    2268: "A border between two regions or countries.",
    2269: "A white layer of ice that forms during very cold weather.",
    2270: "To make an unhappy look with one's face.",
    2271: "Turned into ice.",
    2272: "A type of healthy food that grows on trees and plants.",
    2273: "To cause feelings of disappointment or annoyance.",
    2274: "To cook in hot oil.",
    2275: "Something that creates heat or energy.",
    2276: "To achieve or finish something.",
    2277: "Containing as much as possible.",
    2278: "To try to hold, move, or find something using your hands in a way that is not skilful or graceful.",
    2279: "Unhealthy smoke and gases produced by fires or chemicals.",
    2280: "Enjoyable.",
    2281: "What something is designed to do.",
    2282: "An amount of money that people have.",
    2283: "A basic and important part of something.",
    2284: "A ceremony that takes place after a person dies.",
    2285: "A living thing that includes mushrooms and mold.",
    2286: "A cone-shaped tool for pouring liquids into a small opening.",
    2287: "Causing laughter.",
    2288: "The soft hair covering the skin of some animals.",
    2289: "Very angry.",
    2290: "A place where heat is made.",
    2291: "To put furniture in a house or room.",
    2292: "The things used in a house such as tables and chairs.",
    2293: "At or from a greater distance or time.",
    2294: "In addition; used to add more information.",
    2295: "Intense anger.",
    2296: "A string on fireworks that burns to make them explode.",
    2297: "Excited or annoyed behavior that is not useful in any way.",
    2298: "The time that is yet to come.",
    2299: "To gradually get more and more of a quality, feeling, etc.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH23_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH23_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH23_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH23_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
