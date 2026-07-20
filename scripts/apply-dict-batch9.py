#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 9 (entries 800-899).

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

BATCH9_DEFINITIONS: dict[int, str] = {
    800: "To make something happen, usually something bad.",
    801: "An event, thing, or person that makes something happen.",
    802: "Care and attention in order to avoid danger.",
    803: "Careful to avoid danger.",
    804: "An open space or hole underground or inside a mountain or cliff.",
    805: "To stop doing something or to stop something from happening.",
    806: "The top of a room.",
    807: "To do something to show that an event is special.",
    808: "Someone who is famous.",
    809: "A vegetable with long, green, crunchy stalks.",
    810: "The smallest part of a living thing that can live by itself.",
    811: "A room under a building, often used for storage.",
    812: "A large string instrument that is played while sitting down.",
    813: "A scale for measuring temperature.",
    814: "A powder that is mixed with water and sand to make concrete.",
    815: "A place where people are buried when they die.",
    816: "To remove information if it is dangerous, rude, or rebellious.",
    817: "The middle of something.",
    818: "Measured on the same temperature scale as degrees Celsius.",
    819: "A unit of length equal to 0.01 metres.",
    820: "A period of 100 years, usually counted from a year ending in -00.",
    821: "One hundred years.",
    822: "A breakfast food made from grains that is eaten with milk.",
    823: "An event that happens on special occasions.",
    824: "Knowing that something is true.",
    825: "Without doubt.",
    826: "A document that says that something is true or happened.",
    827: "To confirm that something's results are true.",
    828: "A series of connected metal rings.",
    829: "A piece of furniture for one person to sit on.",
    830: "The person in charge of a meeting or organisation.",
    831: "Something difficult to complete.",
    832: "A closed space or room used for a special purpose.",
    833: "The winner of a competition.",
    834: "An opportunity to do something.",
    835: "To become different.",
    836: "A long, deep space between two edges.",
    837: "A situation that is confusing and not ordered.",
    838: "A situation in which everything is confused and in a mess.",
    839: "Crazy, confused, and hectic.",
    840: "A building where people go to pray and worship God.",
    841: "A part of a book that usually has a number or a title.",
    842: "Your personality.",
    843: "Something that shows what a person or a thing is like.",
    844: "The price to pay for something.",
    845: "Aiming to help people in need.",
    846: "An organisation to which you give money so it can help people who are poor, ill, or in need.",
    847: "An act of giving help, usually money, to those who need it.",
    848: "To please someone with your personality.",
    849: "A list of information.",
    850: "To hire a boat, plane, or bus for use by a group of people.",
    851: "To run after someone and try to catch them.",
    852: "To talk with someone.",
    853: "To talk quickly about unimportant things.",
    854: "Low in price.",
    855: "To make someone or something seem less valuable or respected.",
    856: "To be dishonest in order to win or do well.",
    857: "To ask someone whether something is correct, true, or allowed.",
    858: "The place where you pay for goods in a store.",
    859: "To give a loud shout of approval or encouragement.",
    860: "Happy and pleasant.",
    861: "A food made from milk.",
    862: "A person who cooks in a restaurant.",
    863: "A substance used in science and industry.",
    864: "A scientist who studies substances and how they react.",
    865: "The study of substances and reactions between them.",
    866: "A small, round red fruit with a pit.",
    867: "The front part of a body between the neck and stomach.",
    868: "To break up food by using the mouth and teeth.",
    869: "A bird that is often used for food.",
    870: "The leader of a group of people.",
    871: "A young human being.",
    872: "The period of life when someone is young.",
    873: "A feeling of cold.",
    874: "A tall pipe used to carry smoke out of a building.",
    875: "The hard part at the bottom of a person's face.",
    876: "A small piece of something.",
    877: "To break a small piece off something hard.",
    878: "A small piece of something such as wood or glass, especially when broken off.",
    879: "A sweet food made from cacao beans.",
    880: "The act of choosing between two or more things.",
    881: "A group of people who sing together.",
    882: "To be unable to breathe because something blocks the throat.",
    883: "To pick something or make a decision.",
    884: "To cut something into pieces with a tool.",
    885: "An unpleasant job that must be done.",
    886: "A group of singers who sing together.",
    887: "The title given to Jesus, considered by Christians to be the saviour.",
    888: "A person who believes in Jesus.",
    889: "A holiday in December celebrating the birth of Jesus.",
    890: "Happening over and over again for a long time.",
    891: "To record events as they happen.",
    892: "Arranged or described in the order in which events happened.",
    893: "The order in which a series of past events happened.",
    894: "A quiet laugh.",
    895: "To laugh quietly, especially in a private or secret way.",
    896: "A thick, solid piece of something.",
    897: "A building where Christians go to worship.",
    898: "A thin paper tube filled with tobacco that is smoked.",
    899: "A building in which films are shown.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH9_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH9_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH9_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH9_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
