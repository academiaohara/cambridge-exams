#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 5 (entries 400-499).

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

BATCH5_DEFINITIONS: dict[int, str] = {
    400: "For a short time.",
    401: "Embarrassing and uncomfortable; difficult to deal with.",
    402: "A tool with a heavy blade used for cutting wood.",
    403: "An imaginary line through the centre of something that it rotates around.",
    404: "A very young child.",
    405: "A man who has never been married.",
    406: "The rear part of the body between the neck and the waist.",
    407: "A person's education, family, and experience.",
    408: "A bag carried on your back, used for carrying things.",
    409: "Behind or at the back of a theatre stage.",
    410: "Toward the back or in the opposite direction.",
    411: "Salted meat from a pig, usually eaten fried.",
    412: "Very small living things, some of which can cause disease.",
    413: "Not good; of poor quality.",
    414: "A small piece of metal or cloth that shows a person's rank or group.",
    415: "In an unsatisfactory or poor way.",
    416: "To confuse someone so much that they cannot understand or solve something.",
    417: "A container made of cloth, plastic, or paper used to carry things.",
    418: "Something put on a hook or trap to attract fish or animals.",
    419: "To cook food in an oven without direct flame.",
    420: "A state in which different things are equal or in the correct proportions.",
    421: "A platform with a railing on the outside of a building.",
    422: "Having no hair on the head.",
    423: "A round object thrown, kicked, or hit in a game or sport.",
    424: "A thin rubber bag filled with air or gas.",
    425: "A piece of paper used to vote in an election.",
    426: "To officially say that people must not do something.",
    427: "A long yellow fruit with soft white flesh inside.",
    428: "A group of people who play music together.",
    429: "A strip of cloth used to cover and protect a wound.",
    430: "A sudden loud noise.",
    431: "A business where people keep and manage their money.",
    432: "Unable to pay debts; having no money left.",
    433: "A long strip of cloth with a message or design on it.",
    434: "A long, straight piece of metal or wood.",
    435: "A person whose job is to cut men's hair.",
    436: "Not covered; with no clothes or shoes on.",
    437: "By the smallest amount; almost not.",
    438: "Something bought for a very good price.",
    439: "To make the short, loud sound that a dog makes.",
    440: "A large farm building used for storing crops, equipment, and animals.",
    441: "A large round container for storing liquids.",
    442: "Something that blocks a path or way.",
    443: "The bottom or lowest part of something.",
    444: "A game played with a bat and ball between two teams of nine players.",
    445: "A room built underground in a house or building.",
    446: "Simple; forming the most important or essential part of something.",
    447: "A large bowl used for washing, especially a sink.",
    448: "The main reason, part, or way in which something happens.",
    449: "A container made of woven material used for carrying things.",
    450: "A game in which two teams try to score by throwing a ball through a hoop.",
    451: "A piece of wood used to hit a ball in baseball or cricket.",
    452: "A number of things or people dealt with at the same time.",
    453: "To group things together to be dealt with at the same time.",
    454: "The act of washing your body by sitting in a tub of water.",
    455: "To wash yourself or another person with water.",
    456: "A room with a toilet, sink, and usually a bath or shower.",
    457: "A device that stores electricity and supplies power to something.",
    458: "A fight between armies during a war.",
    459: "A part of the coast where the land curves inward.",
    460: "To exist, or to have a particular quality or identity.",
    461: "A sandy or rocky area by the sea or a lake.",
    462: "A small round drop of liquid.",
    463: "The hard, pointed part of a bird's mouth.",
    464: "A long, strong piece of wood or metal that supports a structure.",
    465: "The seed of certain plants, eaten as food.",
    466: "A large, heavy wild animal with thick fur.",
    467: "To be unable to accept or endure something because it upsets you.",
    468: "Hair that grows on a man's chin and cheeks.",
    469: "A large and dangerous animal.",
    470: "To defeat someone in a game, competition, or fight.",
    471: "Very pleasant to look at.",
    472: "The quality of being very pleasant to look at.",
    473: "Used to introduce the reason for something.",
    474: "To start to be something.",
    475: "A piece of furniture used for sleeping on.",
    476: "A room used for sleeping in.",
    477: "A flying insect that makes honey and can sting.",
    478: "The meat from a cow, used as food.",
    479: "The past participle of the verb 'be'.",
    480: "An alcoholic drink made from grain.",
    481: "Earlier than a particular time or event.",
    482: "Before something else happens; in advance.",
    483: "To ask for something in a desperate or emotional way.",
    484: "To start doing something.",
    485: "Done for another person as their representative.",
    486: "To act in a particular way, especially in a polite or good way.",
    487: "The way a person acts.",
    488: "The way that someone or something acts.",
    489: "At the back of something.",
    490: "A living person or creature.",
    491: "A strong feeling that something is true or correct.",
    492: "To think that something is true.",
    493: "A hollow metal object that rings when it is hit.",
    494: "The front part of the body between the chest and the legs; the stomach area.",
    495: "To be owned by someone or to be a member of a group.",
    496: "Loved very much; very dear.",
    497: "In a lower position than something else.",
    498: "A strip of leather or cloth worn around the waist.",
    499: "A long seat for two or more people.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH5_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH5_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH5_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH5_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
