#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 7 (entries 600-699).

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

BATCH7_DEFINITIONS: dict[int, str] = {
    600: "To increase or improve something.",
    601: "A heavy shoe that covers the foot and ankle.",
    602: "The edge or outer limit of an area.",
    603: "To make someone feel tired or uninterested.",
    604: "Not interesting or fun.",
    605: "Having started life; brought into the world.",
    606: "To take something belonging to someone else and return it later.",
    607: "A person in charge of other people at work.",
    608: "The scientific study of plants.",
    609: "The two people or things together; each of two.",
    610: "To make the effort to do something.",
    611: "A container with a narrow neck used for storing liquids.",
    612: "The lowest part, point, or level of something.",
    613: "Got something by paying money for it.",
    614: "To hit a surface and immediately move away from it.",
    615: "To move up and away from a surface after hitting it.",
    616: "Going to or intended for a particular place.",
    617: "The line where one area of land stops and another begins.",
    618: "The area in a game within which plays are allowed.",
    619: "A weapon made of curved wood and string that shoots arrows.",
    620: "A round, deep dish used for holding food.",
    621: "A container with flat sides and a lid.",
    622: "Packed inside a container or wrapped for delivery.",
    623: "A male child.",
    624: "The organ inside your head that controls thought and feeling.",
    625: "A device used to slow or stop a vehicle.",
    626: "A part of a tree that grows out from the trunk and has leaves.",
    627: "A type of product made by a particular company.",
    628: "A yellow-brown metal used for musical instruments and decorations.",
    629: "Not afraid to face pain or danger.",
    630: "The quality of facing danger without fear.",
    631: "A food made from flour and water, usually baked.",
    632: "The distance from one side to the other of something.",
    633: "To separate into pieces or stop working.",
    634: "A failure of a machine or system to work correctly.",
    635: "The first meal of the day, eaten in the morning.",
    636: "An important discovery or development after a lot of hard work.",
    637: "One of the two soft parts on the front of a woman's body.",
    638: "The air taken into and sent out of the lungs.",
    639: "To take air into your lungs and send it out again.",
    640: "A particular type of animal within a species.",
    641: "A gentle wind.",
    642: "To make coffee or tea by pouring hot water over it.",
    643: "To illegally give someone money to persuade them to do something.",
    644: "A hard block of baked clay used for building walls.",
    645: "A woman who is getting married or has just been married.",
    646: "A structure built over a river or road so people can cross.",
    647: "Lasting only a short time.",
    648: "Giving off a lot of light.",
    649: "Very intelligent or extremely good.",
    650: "To carry or take something to a place.",
    651: "Hard and easily broken into small pieces.",
    652: "Wide; covering a large area.",
    653: "Able to send large amounts of data quickly over the Internet.",
    654: "A high-speed Internet connection.",
    655: "A television or radio programme sent out to the public.",
    656: "To send out a programme or message on television or radio.",
    657: "To tell many people something, especially something that was meant to be secret.",
    658: "A television or radio programme.",
    659: "A green vegetable with a thick stem and tightly packed florets.",
    660: "A small booklet with pictures and information about a product or place.",
    661: "Damaged or no longer working.",
    662: "To arrange or negotiate the details of an agreement for others.",
    663: "A brown metal made from copper and tin.",
    664: "A brush with a long handle used for sweeping floors.",
    665: "A boy or man who has the same parents as you.",
    666: "Carried or took something to a place.",
    667: "The colour of chocolate, wood, or soil.",
    668: "A dark mark on the skin caused by being hit.",
    669: "A tool with bristles used for painting or cleaning.",
    670: "Extremely violent or cruel.",
    671: "A rough, violent person who behaves like a wild animal.",
    672: "A thin ball of air or gas inside a liquid.",
    673: "A round container with a handle, used for carrying liquids.",
    674: "A small part of a plant that develops into a flower or leaf.",
    675: "A friend.",
    676: "The amount of money available to spend on something.",
    677: "A large wild animal with horns, related to the cow.",
    678: "A small insect.",
    679: "To make something by putting parts together.",
    680: "A structure with walls and a roof, such as a house or office.",
    681: "Having many buildings close together; densely developed.",
    682: "The glass part of an electric light that produces light.",
    683: "A large mass; great size or volume.",
    684: "The largest part or majority of something.",
    685: "A large mass; great size or volume.",
    686: "Goods bought or sold in large quantities at one time.",
    687: "A male cow.",
    688: "A small piece of metal fired from a gun.",
    689: "A short news report about recent important events.",
    690: "To frighten or hurt someone smaller or weaker than you.",
    691: "Someone who frightens or hurts people smaller or weaker than themselves.",
    692: "A small raised area on a surface.",
    693: "A group of things of the same kind held together.",
    694: "A group of things tied or wrapped together.",
    695: "A heavy responsibility that causes worry or difficulty.",
    696: "A government department or office.",
    697: "The officials and offices that manage a large organisation or government.",
    698: "A complicated system of rules and official processes.",
    699: "Someone who illegally enters a building to steal things.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH7_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH7_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH7_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH7_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
