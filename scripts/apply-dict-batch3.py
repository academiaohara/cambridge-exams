#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 3 (entries 200-299).

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

BATCH3_DEFINITIONS: dict[int, str] = {
    200: "The direction from which something is viewed; also the space between two lines that meet.",
    201: "Having a strong feeling of annoyance or hostility.",
    202: "A living creature that is not a plant.",
    203: "Having life; living.",
    204: "The joint that connects the foot to the leg.",
    205: "A date on which an important past event is remembered each year.",
    206: "To make something known publicly.",
    207: "To make someone feel bothered or slightly angry.",
    208: "Happening once every year.",
    209: "Calculated or considered over a period of one year.",
    210: "Happening once every year.",
    211: "Having an unknown name or identity.",
    212: "One more of the same kind.",
    213: "Something said or written in reply to a question.",
    214: "A small insect that lives in large groups.",
    215: "A formal or patriotic song, especially one representing a country.",
    216: "The study of people, society, and culture.",
    217: "A medical drug used to kill bacteria and treat infections.",
    218: "To expect that something will happen.",
    219: "A feeling of excitement about something enjoyable that will happen soon.",
    220: "A substance that stops a poison from causing harm.",
    221: "Very old and valuable.",
    222: "An old object, such as furniture or jewellery, that is valuable because of its age and quality.",
    223: "A feeling of worry and fear.",
    224: "Feeling worried or nervous.",
    225: "Used to refer to one or more things when it does not matter which.",
    226: "Any person at all.",
    227: "Any thing at all.",
    228: "Used to change the subject or return to the main point.",
    229: "In or to any place.",
    230: "Separated by a distance; not next to each other.",
    231: "A set of rooms in a building where people live.",
    232: "A feeling of having no interest in or enthusiasm for anything.",
    233: "Something said or written to show that you are sorry.",
    234: "To shock and upset someone greatly.",
    235: "A device or set of equipment used for a particular purpose.",
    236: "Easy to see or understand; obvious.",
    237: "To make a serious request for people to do something.",
    238: "To be attractive or interesting to someone.",
    239: "A quality that makes people like or want something.",
    240: "A serious request for people to do something or behave in a certain way.",
    241: "To seem or give the impression of being something.",
    242: "A desire or need for food.",
    243: "Looking and smelling good enough to make you want to eat.",
    244: "To clap your hands to show approval or praise.",
    245: "A piece of electrical equipment used for jobs in the home.",
    246: "Relevant or suitable for a particular person or situation.",
    247: "Someone who applies for a job, place, or prize.",
    248: "To put a substance onto a surface.",
    249: "To choose someone for a job or position.",
    250: "To be grateful for something.",
    251: "To understand how serious or important something is.",
    252: "A person who is learning a job from a skilled worker.",
    253: "To move closer to someone or something.",
    254: "To come nearer to a place or person.",
    255: "To speak to someone for the first time about something, especially to ask for help.",
    256: "A particular way of thinking about or dealing with something.",
    257: "The act of coming nearer in time or distance.",
    258: "Suitable or right for a particular situation.",
    259: "The feeling that something or someone is good or acceptable.",
    260: "To think that something is good, right, or acceptable.",
    261: "To calculate something in a way that is not completely exact.",
    262: "Not exact, but close to an exact amount, number, or time.",
    263: "A small, soft, orange fruit.",
    264: "The fourth month of the year.",
    265: "A building or tank where fish and other water animals are kept.",
    266: "Living or growing in water.",
    267: "Based on chance rather than a clear plan or reason.",
    268: "Not based on any particular plan or done for any particular reason.",
    269: "A curved line or shape.",
    270: "A curved structure forming an opening, such as under a bridge or doorway.",
    271: "The study of past human societies through their remains and artifacts.",
    272: "Very old and no longer in common use.",
    273: "Relating to the scientific study of ancient human societies.",
    274: "The scientific study of past human life through objects and ruins.",
    275: "A person who designs buildings.",
    276: "The design and style of buildings.",
    277: "Relating to the very cold regions around the North Pole.",
    278: "A particular part of a surface, such as of the body.",
    279: "The amount of space that a flat surface or shape covers.",
    280: "A large building where sports events or concerts are held.",
    281: "To speak angrily to someone because you disagree.",
    282: "Very dry and receiving little or no rain.",
    283: "To begin to exist or happen.",
    284: "The highest social class in certain societies, especially one with noble titles.",
    285: "A member of the highest social class in certain societies.",
    286: "The branch of mathematics dealing with numbers and calculation.",
    287: "The long upper limb of the body, from the shoulder to the hand.",
    288: "A large organised group of soldiers who fight for a country.",
    289: "A pleasant smell, especially from food or drink.",
    290: "On all sides of something; surrounding it.",
    291: "To cause a feeling or interest to begin in someone.",
    292: "To put things in a particular order or position.",
    293: "A large group or number of different things.",
    294: "To take someone into police custody because they are suspected of a crime.",
    295: "To reach a place at the end of a journey.",
    296: "Believing you are better or more important than other people.",
    297: "A thin, pointed weapon shot from a bow.",
    298: "Creative work such as painting, music, or sculpture that expresses ideas or feelings.",
    299: "A tube that carries blood from the heart to the rest of the body.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH3_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH3_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH3_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH3_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
