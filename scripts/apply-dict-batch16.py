#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 16 (entries 1500-1599).

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

BATCH16_DEFINITIONS: dict[int, str] = {
    1500: "Causing great harm or damage to something or someone.",
    1501: "To make something larger or more advanced.",
    1502: "An object or a machine.",
    1503: "A powerful evil spirit in some religions.",
    1504: "To come up with an idea or plan.",
    1505: "Missing something; without it.",
    1506: "To spend a lot of time or effort doing something.",
    1507: "To use something such as money for a particular purpose.",
    1508: "To eat something quickly and hungrily.",
    1509: "Small drops of water that form on the ground at night.",
    1510: "A medical condition in which a person's body cannot control the level of sugar in their blood.",
    1511: "To identify the medical condition someone has.",
    1512: "A statement about what disease someone has based on examining them.",
    1513: "A simple drawing that explains what something is or how it works.",
    1514: "A circular tool, like the front of a clock.",
    1515: "A form of a language spoken in a particular area.",
    1516: "Conversation between two or more people.",
    1517: "The length across the centre of a round thing.",
    1518: "A very hard, clear gemstone.",
    1519: "A book in which people write their personal experiences.",
    1520: "Small cubes with dots on each side used in games.",
    1521: "To say or read something for someone to write down.",
    1522: "Someone who uses force to take and keep power in a country.",
    1523: "A book that tells you what words mean.",
    1524: "To stop living.",
    1525: "The food regularly eaten by a person.",
    1526: "To not be the same as another person or thing.",
    1527: "A way that something is not like other things.",
    1528: "Not the same as others.",
    1529: "To show the difference between things or people.",
    1530: "To see or show a difference between things.",
    1531: "Hard to do or understand.",
    1532: "The state of being hard to do.",
    1533: "To make a hole in the ground.",
    1534: "To swallow food and pass it through the body.",
    1535: "Characterized by computer technology.",
    1536: "Impressive behaviour in which someone controls their emotions in a difficult situation.",
    1537: "A situation in which you have to make a difficult choice.",
    1538: "Working hard and being careful.",
    1539: "To make a liquid less strong by adding water or another liquid.",
    1540: "Made less strong by being mixed with another liquid.",
    1541: "Not bright or clear.",
    1542: "A part of a situation, especially when it influences how you think about it.",
    1543: "Length, height, or width.",
    1544: "To become less.",
    1545: "To make something become less.",
    1546: "Loud, unpleasant, and extended noise.",
    1547: "To eat dinner.",
    1548: "The main meal eaten in the evening.",
    1549: "A very big animal that lived millions of years ago.",
    1550: "A decline or a worsening in condition.",
    1551: "A certificate proving that someone has completed their studies.",
    1552: "A representative of a country who works with another country.",
    1553: "Going straight between two places.",
    1554: "An order to a bank to regularly pay money from your account to a person or organisation.",
    1555: "The way to go.",
    1556: "In a straight line or without anything in between.",
    1557: "A person who manages or controls something.",
    1558: "Loose soil or earth.",
    1559: "Not clean.",
    1560: "To turn off or make unable to work.",
    1561: "Having a physical problem that makes some activities difficult.",
    1562: "A situation that makes it hard to do something.",
    1563: "To have a different opinion from someone.",
    1564: "To go away or not be seen.",
    1565: "To fail to meet someone's expectations.",
    1566: "A really bad thing that happens.",
    1567: "To throw something away.",
    1568: "To see or notice something.",
    1569: "To allow someone to leave from a place, usually a hospital.",
    1570: "Training that helps people follow the rules.",
    1571: "To tell something to someone else.",
    1572: "To give information to people, especially information that was secret.",
    1573: "A place or party where people dance to pop music.",
    1574: "Disagreement or fighting.",
    1575: "A reduction in the usual price of something.",
    1576: "To make someone feel less excited about something.",
    1577: "To find something for the first time.",
    1578: "Careful not to attract attention.",
    1579: "A difference between two things that should be the same.",
    1580: "To treat someone unfairly because of their religion, race, or other personal characteristics.",
    1581: "To recognize the difference between things.",
    1582: "To talk about something with another person.",
    1583: "An illness that causes specific problems.",
    1584: "A state of shame and loss of respect.",
    1585: "Very bad and shameful.",
    1586: "Something you wear so people cannot tell who you are.",
    1587: "A very strong feeling of not liking something.",
    1588: "To make someone angry and upset because something is bad or immoral.",
    1589: "Very unpleasant.",
    1590: "A type of food that is cooked in a particular way.",
    1591: "Not truthful or trustworthy.",
    1592: "Disappointed because you have discovered that someone or something is not as good as you believed.",
    1593: "To not like someone or something.",
    1594: "Depressing or gloomy.",
    1595: "To say something is not important.",
    1596: "Not following the rules or instructions.",
    1597: "A state of confusion or lack of order.",
    1598: "To scatter everywhere.",
    1599: "To force something out of its usual place.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH16_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH16_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH16_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH16_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
