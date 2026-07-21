#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 8 (100 placeholders)."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "example_placeholder_detector",
    ROOT / "scripts" / "detect-dict-example-placeholders.py",
)
_detector = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_detector)

detect_placeholder = _detector.detect_placeholder

BATCH8_EXAMPLES: dict[int, str] = {
    2119: "The bridge was financed by the local council.",
    2123: "The museum has a collection of fine art from the nineteenth century.",
    2126: "We only have a finite amount of time to complete the project.",
    2128: "He was fired after repeated warnings about lateness.",
    2132: "The mattress was firm but comfortable.",
    2134: "They stayed at a first-rate hotel in the city centre.",
    2145: "The old paint began to flake off the wall.",
    2146: "Snowflakes landed on her coat.",
    2155: "He flattered his boss in the hope of getting a promotion.",
    2157: "There was a flaw in the design that caused the bridge to fail.",
    2164: "The boat floated gently on the lake.",
    2167: "Heavy rain flooded the streets overnight.",
    2168: "The flood destroyed homes along the river.",
    2173: "Water flowed slowly through the narrow channel.",
    2174: "The flow of traffic increased during rush hour.",
    2178: "Prices fluctuate according to supply and demand.",
    2194: "Check the footnote for the source of the quotation.",
    2198: "The door had to be opened by force.",
    2199: "She is a force for positive change in the community.",
    2200: "Gravity is a force that pulls objects towards the Earth.",
    2201: "No one can force you to accept the offer.",
    2202: "She forced the window open with a crowbar.",
    2209: "Nobody could have foreseen the scale of the disaster.",
    2218: "The former president spoke at the conference.",
    2228: "Many countries still rely heavily on fossil fuels.",
    2229: "They decided to foster a child who needed a home.",
    2237: "Only a fraction of the applicants were invited to interview.",
    2238: "Three quarters is a fraction equal to 0.75.",
    2240: "Handle the fragile glass with care.",
    2248: "The storm was a weather freak that destroyed several roofs.",
    2249: "A freak accident closed the motorway for hours.",
    2254: "The frequency of bus services increases at peak times.",
    2258: "Friction between the surfaces made the box hard to move.",
    2278: "He fumbled in his pocket for his keys.",
    2302: "He gambled all his savings on one horse race.",
    2304: "The children spent hours playing on their games console.",
    2315: "I gather you are not happy with the decision.",
    2328: "Einstein was considered a genius in physics.",
    2329: "It takes real genius to solve problems like that.",
    2339: "She gestured towards the door to show him the way out.",
    2340: "He made a gesture of friendship by offering his hand.",
    2343: "The celebrity's memoir was written by a ghostwriter.",
    2347: "She gave a nervous giggle when she realised her mistake.",
    2348: "The children giggled during the funny scene.",
    2351: "I did not catch the gist of his argument.",
    2357: "She stole a glance at her watch during the meeting.",
    2358: "He glanced at the headline and moved on.",
    2362: "The skaters glided across the ice.",
    2363: "I caught a glimpse of the singer before she left.",
    2364: "From the hill we glimpsed the sea in the distance.",
    2365: "It is unkind to gloat over someone else's failure.",
    2367: "Scientists warn that global warming is accelerating.",
    2376: "She looked glum after hearing the bad news.",
    2389: "He grabbed his coat and ran out of the door.",
    2394: "She is a graduate of Oxford University.",
    2395: "He graduated with a degree in engineering.",
    2397: "There was not a grain of truth in the rumour.",
    2407: "I finally grasped the main point of the lecture.",
    2408: "The child grasped her mother's hand tightly.",
    2414: "Gravity keeps the planets in orbit around the sun.",
    2419: "Do not be greedy — leave some food for others.",
    2421: "The balcony was decorated with greenery and flowers.",
    2427: "He made a grimace when he tasted the medicine.",
    2428: "She grimaced at the thought of getting up early.",
    2429: "He had a wide grin on his face.",
    2430: "She grinned when she saw the surprise party.",
    2431: "Grind the coffee beans just before brewing.",
    2448: "Her aunt became the children's legal guardian.",
    2451: "Choosing the right treatment involved a lot of guesswork.",
    2466: "Polar bears live in an Arctic habitat.",
    2477: "The handbook explains how to use the software.",
    2480: "She handled the crisis calmly and professionally.",
    2484: "Books were piled in a haphazard way on the shelves.",
    2495: "Farmers harvest wheat in late summer.",
    2496: "The harvest was better than expected this year.",
    2505: "Wet floors can be a hazard in the workplace.",
    2509: "The firm was headhunted to recruit senior engineers.",
    2515: "Clothes lay in a heap on the bedroom floor.",
    2516: "She heaped the towels into a laundry basket.",
    2543: "The castle is part of the nation's cultural heritage.",
    2553: "They live in a high-rise flat on the fifteenth floor.",
    2559: "The hikers followed a trail through the mountains.",
    2563: "He dropped a hint that he might resign soon.",
    2564: "Here is a useful hint for saving time.",
    2565: "She hinted that she was not entirely satisfied.",
    2572: "A hitchhiker was waiting by the roadside with a sign.",
    2578: "The tree trunk was hollow inside.",
    2591: "The child hopped along the pavement on one foot.",
    2592: "With one hop she cleared the puddle.",
    2614: "The city needs more affordable housing.",
    2626: "I had a hunch that something was wrong.",
    2633: "The hurricane caused widespread damage along the coast.",
    2644: "This is the ideal location for a family holiday.",
    2645: "He described his ideal job as working by the sea.",
    2647: "Can you identify the person in this photograph?",
    2648: "Many readers identify with the main character.",
    2651: "The party's ideology influenced its economic policies.",
    2654: "Stop being idle and help with the washing up.",
    2655: "The factory machines stood idle during the strike.",
    2659: "It would be ignorant to ignore the evidence.",
}


def main() -> int:
    if len(BATCH8_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH8_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH8_EXAMPLES.items()):
        entry = entries[idx]
        word = entry["word"]
        old_example = entry.get("example", "")

        if not detect_placeholder(old_example):
            errors.append(f"  [{idx}] {word}: example is not a placeholder")
            continue
        if detect_placeholder(new_example):
            errors.append(f"  [{idx}] {word}: new example is still a placeholder")
            continue

        if old_example != new_example:
            changed += 1
            entry["example"] = new_example

    if errors:
        print("\nVALIDATION ERRORS:", file=sys.stderr)
        print("\n".join(errors), file=sys.stderr)
        return 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {changed} placeholder examples (indices {min(BATCH8_EXAMPLES)}–{max(BATCH8_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
