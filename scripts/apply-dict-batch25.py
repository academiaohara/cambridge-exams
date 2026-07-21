#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 25 (entries 2400-2499).

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

BATCH25_DEFINITIONS: dict[int, str] = {
    2400: "Big and impressive or liked by people.",
    2401: "The father of one's parent.",
    2402: "The mother of one's parent.",
    2403: "To allow someone to have something.",
    2404: "A small, round fruit that grows in bunches.",
    2405: "A fruit similar to an orange, but bigger and not as sweet.",
    2406: "A diagram showing the relationship between numbers.",
    2407: "To understand something.",
    2408: "To take and hold something or someone very tightly.",
    2409: "The green leaves that cover the ground.",
    2410: "Feeling thankful about something.",
    2411: "To please someone.",
    2412: "A feeling of being thankful.",
    2413: "The place where a dead person is buried.",
    2414: "The force that makes something fall to the ground.",
    2415: "When animals feed on plants.",
    2416: "An oily substance put on moving parts so they work smoothly, or oil or fat in cooking.",
    2417: "Very good.",
    2418: "Wanting to have more of something than you need or should have.",
    2419: "Wanting more money, things, or power than you need.",
    2420: "The color of growing grass or leaves.",
    2421: "Plants that are growing somewhere or used as decoration.",
    2422: "A small glass building used to grow plants.",
    2423: "To meet and welcome someone.",
    2424: "The feeling of deep sadness, usually when a person dies.",
    2425: "To feel deep sadness over a loss.",
    2426: "Worrying, serious, and scary.",
    2427: "An ugly expression that you make by twisting your face, for example because you are in pain or do not like something.",
    2428: "To make an ugly expression by twisting your face, for example because you are in pain or do not like something.",
    2429: "A big smile that shows your teeth.",
    2430: "To smile showing your teeth.",
    2431: "To break something into very small pieces or powder by using a machine or by crushing it between two hard surfaces.",
    2432: "To hold something very tightly.",
    2433: "To make a deep sound of pain or annoyance.",
    2434: "A person who sells food.",
    2435: "A store that sells food.",
    2436: "A man who is going to be married.",
    2437: "Disgusting.",
    2438: "The solid surface of the Earth.",
    2439: "A number of people or things together.",
    2440: "A small group of trees.",
    2441: "To increase in size.",
    2442: "An adult.",
    2443: "The process of increasing in size.",
    2444: "A feeling of anger about something in the past.",
    2445: "To complain.",
    2446: "To promise that something will happen or be true.",
    2447: "To protect or watch over something.",
    2448: "Someone who is legally responsible for another person, such as a child whose parents have died.",
    2449: "A person who fights as part of an unofficial army.",
    2450: "To give an answer without knowing for sure.",
    2451: "Finding an answer by trying possibilities without certain knowledge.",
    2452: "Someone who is invited to an event, occasion, or location.",
    2453: "Help and advice that is given to someone about their work, education, or personal life.",
    2454: "Someone who shows you where to go.",
    2455: "A rule about how to do something.",
    2456: "Feeling bad about something you did.",
    2457: "A musical instrument with strings.",
    2458: "A gap between people who do not understand each other.",
    2459: "A sticky substance from trees or a candy for chewing.",
    2460: "A weapon that shoots bullets.",
    2461: "The intestines, where food is processed after leaving the stomach.",
    2462: "All the organs inside a person or animal.",
    2463: "A building with equipment for exercise.",
    2464: "A building with equipment that you can use to get exercise.",
    2465: "A thing that you do often.",
    2466: "The type of place that an animal normally lives in or a plant normally grows in.",
    2467: "A behaviour that a person usually does or has.",
    2468: "To cut something into uneven pieces.",
    2469: "Ice that falls from the sky when rain freezes.",
    2470: "The strands that grow on the head.",
    2471: "One of two equal parts of something.",
    2472: "A large room or a passageway.",
    2473: "To stop moving.",
    2474: "Meat from a pig's leg.",
    2475: "A tool used for hitting nails.",
    2476: "The end part of the arm.",
    2477: "A small book that gives information about a subject or instructions about how to use something.",
    2478: "Material that gives specific information or instructions.",
    2479: "A condition that limits someone's mental or physical abilities.",
    2480: "To take action to deal with a difficult situation.",
    2481: "Good-looking.",
    2482: "Useful.",
    2483: "To keep something above the ground.",
    2484: "Done in a way that does not seem to be carefully planned or organised.",
    2485: "To do something by chance.",
    2486: "Feeling joy or pleasure.",
    2487: "An area of water along a shore where boats land.",
    2488: "Difficult to do or understand.",
    2489: "Almost not; only a very small amount.",
    2490: "Strong and able to live through difficult conditions.",
    2491: "To hurt someone or damage something.",
    2492: "To make different things go well together.",
    2493: "A feeling that everything is peaceful, balanced, and in agreement.",
    2494: "Very unpleasant.",
    2495: "To collect a crop from the fields.",
    2496: "The time when a crop is collected.",
    2497: "The act of collecting food from farming.",
    2498: "Speed in movement or action.",
    2499: "A covering for the head.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH25_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH25_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH25_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH25_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
