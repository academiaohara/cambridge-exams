#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 45 (entries 4400-4499).

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

BATCH45_DEFINITIONS: dict[int, str] = {
    4400: "To make marks or drawings with no meaning.",
    4401: "To wash or clean something by rubbing it hard, especially with a brush.",
    4402: "A thorough wash or clean.",
    4403: "Available only during a particular time of year.",
    4404: "Suitable or typical of the time of year it is now.",
    4405: "Something that you do not tell other people.",
    4406: "Work that you do without the help of a teacher.",
    4407: "A class at a college or university in which a small group of students discusses a subject with a teacher.",
    4408: "More than two but not many.",
    4409: "To move back and forth or up and down quickly.",
    4410: "Something that is very badly organised and does not operate effectively.",
    4411: "The arrangement of an object's sides and surfaces.",
    4412: "One of the equal parts of a company that you can buy as a way of investing money.",
    4413: "To change in position, direction, or form.",
    4414: "A change in something, for example in someone's ideas or opinions.",
    4415: "Of a very low standard.",
    4416: "To say something loudly.",
    4417: "To become or make something smaller in size.",
    4418: "A brother or sister.",
    4419: "A period of time during which you do not work because you are ill.",
    4420: "An unintended and possibly unpleasant result of taking a medicine.",
    4421: "A piece of evidence that something is happening or that something exists.",
    4422: "Happening or done at the same time.",
    4423: "To disappear below the surface of the water.",
    4424: "A drawing made quickly that does not have many details.",
    4425: "To draw a picture quickly and with few details.",
    4426: "A short funny scene performed within a longer show.",
    4427: "To slide across the ground in an uncontrolled way.",
    4428: "A sudden uncontrolled slide across the ground, especially by a vehicle.",
    4429: "To move forwards by jumping first on one foot and then the other.",
    4430: "The shapes made by buildings or mountains when you see them against the sky.",
    4431: "A very tall building containing offices or flats.",
    4432: "Very informal words or expressions not considered suitable for more formal situations.",
    4433: "Words or expressions that are very informal and are not considered suitable for more formal situations.",
    4434: "To move smoothly and quickly across a surface.",
    4435: "A structure that children play on by climbing up steps and going down a slope on the other side.",
    4436: "To lose your balance or fall by accidentally sliding your feet.",
    4437: "To break something noisily into many pieces by dropping or hitting it with a lot of force.",
    4438: "To use your nose to sense something.",
    4439: "An unpleasant smile that shows satisfaction with your own success or pleasure at someone else's misfortune.",
    4440: "To smile in an unpleasant way because you are pleased with yourself or are going to do something bad.",
    4441: "To suddenly lose control and become extremely angry or upset because a situation has become too annoying or difficult.",
    4442: "To speak to someone in a sudden angry way.",
    4443: "People in general living together in organised communities with laws and traditions controlling the way they behave towards one another.",
    4444: "A substance that is not a liquid or a gas.",
    4445: "Firm and hard, and not a liquid or a gas.",
    4446: "To find an answer to a problem or question.",
    4447: "Involving the use of good judgment and therefore likely to be effective.",
    4448: "Thorough.",
    4449: "The amount of time that something lasts.",
    4450: "To last for a particular period of time, especially a long period.",
    4451: "The particular requirements of people who are physically or mentally disabled.",
    4452: "A plant or animal group whose members all have similar general features and are able to produce young plants or animals together.",
    4453: "A very small spot or mark.",
    4454: "To consider or discuss why something has happened.",
    4455: "To take the risk of investing your money in a company in the hope that you can make a big profit later by selling the shares you buy.",
    4456: "A period of time, usually a short one.",
    4457: "The edge of a book where all the pages are fixed together.",
    4458: "To affect something in a way that makes it worse, less attractive, or less enjoyable.",
    4459: "Expressed by speaking rather than writing.",
    4460: "Happening in a natural way without being planned or thought about.",
    4461: "Physical games and activities such as running, jumping, football, and tennis.",
    4462: "A husband or wife.",
    4463: "To move out to cover a larger area.",
    4464: "To damage something by pressing or crushing it and making it lose its normal shape.",
    4465: "A situation in which there are too many people in a small space.",
    4466: "To press something firmly, especially with your hands.",
    4467: "The action of pressing something firmly.",
    4468: "To arrange things so that they stand one on top of another.",
    4469: "A pile of things placed one on top of another.",
    4470: "No longer fresh, especially bread and similar foods.",
    4471: "To make a person or animal feel suddenly frightened or surprised by doing something they do not expect.",
    4472: "The government of a country.",
    4473: "A group of numbers that represent facts or describe a situation.",
    4474: "The present situation or the way things usually are.",
    4475: "To hold something firmly without shaking or moving it.",
    4476: "Firmly held in a particular position without moving or shaking.",
    4477: "Staying at the same level, speed, value, etc.",
    4478: "To control the direction in which a vehicle moves.",
    4479: "To move by putting one foot down in front of the other.",
    4480: "A short movement made by putting one foot in front of the other.",
    4481: "One of a series of actions you do in order to achieve a particular aim.",
    4482: "A woman who is someone's parent because of a second marriage rather than a biological connection.",
    4483: "A man whose job is to look after the passengers on a plane, train, or ship, especially serving them with food and drink.",
    4484: "Firm and difficult to bend.",
    4485: "A period of time spent doing something.",
    4486: "To move away from the correct place or path.",
    4487: "Lost or without a home.",
    4488: "A pet that is lost or has left its home.",
    4489: "To improve a business, organization, or process by making it more modern or simple.",
    4490: "To make something physically or structurally firmer.",
    4491: "To walk with energy and confidence.",
    4492: "A long confident step.",
    4493: "A period of time during which people refuse to work as a protest about pay or conditions of work.",
    4494: "To refuse to work for a period of time as a protest about your pay or conditions of work.",
    4495: "To make a lot of effort to achieve something.",
    4496: "To gently move your hand over skin, hair, or fur.",
    4497: "A gentle movement of your hand across skin, hair, or fur.",
    4498: "To walk slowly and calmly.",
    4499: "Something large such as a building or a bridge that is built from different parts.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH45_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH45_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH45_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH45_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
