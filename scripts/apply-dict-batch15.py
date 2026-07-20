#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 15 (entries 1400-1499).

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

BATCH15_DEFINITIONS: dict[int, str] = {
    1400: "A certificate that proves that someone owns something.",
    1401: "To consider something.",
    1402: "Going far down from the surface.",
    1403: "A graceful animal with antlers.",
    1404: "To beat someone in a game or battle.",
    1405: "A part of something that is wrong or missing.",
    1406: "Not made correctly or not working correctly.",
    1407: "The action of defending against attack.",
    1408: "To protect from harm.",
    1409: "Something that is done to protect another thing.",
    1410: "To arrange for an action to happen at a later time.",
    1411: "A lack of something, especially something that is needed.",
    1412: "To clearly state, show, or explain what something is.",
    1413: "Certain or sure to be true.",
    1414: "The most official or complete.",
    1415: "To change something from its correct or original shape.",
    1416: "To work against someone or refuse to do what they say.",
    1417: "A unit for measuring temperature.",
    1418: "To wait to do something.",
    1419: "A person chosen to represent others.",
    1420: "To remove or erase written material.",
    1421: "Intended; not done by chance or by accident.",
    1422: "To think about or discuss something very carefully, especially before making a decision.",
    1423: "Easy to break or harm.",
    1424: "Very tasty.",
    1425: "To give someone a lot of enjoyment or pleasure.",
    1426: "To take something from one place to another.",
    1427: "A low, flat area where a river spreads out before entering the sea.",
    1428: "Of higher quality than usual.",
    1429: "To ask for something forcefully.",
    1430: "A system of government where citizens vote.",
    1431: "Relating to the characteristics of a population.",
    1432: "The study of people and populations.",
    1433: "To deliberately destroy a building.",
    1434: "To show how something is done.",
    1435: "To stand as a sign or substitute for something.",
    1436: "To criticise someone or something severely in public.",
    1437: "Very heavy in relation to its size.",
    1438: "The degree to which a substance is compact.",
    1439: "A small hollow mark on a surface.",
    1440: "Relating to teeth.",
    1441: "A doctor who takes care of teeth.",
    1442: "To say that something is not true.",
    1443: "To leave some place so you can go to another place.",
    1444: "A section of a large organisation.",
    1445: "The act of leaving a place.",
    1446: "To need something for support or help.",
    1447: "A child or other relative to whom you give food, money, and a home.",
    1448: "A situation in which somebody relies on something else.",
    1449: "Relying on someone or something for support.",
    1450: "To show or portray something, often using art.",
    1451: "To use all of something up.",
    1452: "An amount of money that you pay into a bank account.",
    1453: "To pay money into a bank account.",
    1454: "A first payment made when you agree to buy or rent something expensive.",
    1455: "A bus or train station.",
    1456: "To make someone sad.",
    1457: "A medical condition that makes a person very unhappy for long periods of time.",
    1458: "To not let someone have something.",
    1459: "The distance from the top to the bottom of something.",
    1460: "A person who is second in command.",
    1461: "To come or originate from a thing or place.",
    1462: "To go down a mountain, slope, or stairs.",
    1463: "A relative of a person who lived in the past.",
    1464: "A movement downwards.",
    1465: "To say or write what someone or something is like.",
    1466: "Words that say what someone or something is like.",
    1467: "An area of land without many plants or water.",
    1468: "To be worthy of something as a result of one's actions.",
    1469: "To plan how something will look or work.",
    1470: "To give someone or something a particular description.",
    1471: "To want something.",
    1472: "To want something.",
    1473: "A strong feeling of wanting to have or do something.",
    1474: "A piece of furniture that people sit at to do work.",
    1475: "The feeling of having no hope.",
    1476: "Willing to try anything because of great need.",
    1477: "To hate someone or something.",
    1478: "Without being affected by; even though.",
    1479: "The place where someone or something is going.",
    1480: "The place where someone or something is going.",
    1481: "All the things that happen or will happen to a person in their life.",
    1482: "To damage something so badly that it cannot be used.",
    1483: "The act of damaging something so badly that it cannot be used.",
    1484: "To separate from something.",
    1485: "A small piece of information.",
    1486: "To officially prevent someone from leaving a place.",
    1487: "To notice or find something.",
    1488: "A person who solves crimes.",
    1489: "To prevent or discourage someone from doing something.",
    1490: "To become worse.",
    1491: "The act of becoming worse.",
    1492: "What you have when you try to do something even when it is difficult.",
    1493: "To calculate something or discover it by examining evidence.",
    1494: "Something that makes people decide not to do something because of possible unpleasant results.",
    1495: "To hate very much.",
    1496: "Harmful or damaging.",
    1497: "To cause great damage or pain to something.",
    1498: "To seriously damage or completely destroy something.",
    1499: "To make someone feel very shocked and upset.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH15_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH15_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH15_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH15_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
