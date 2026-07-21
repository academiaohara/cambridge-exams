#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 10 (entries 900-999).

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

BATCH10_DEFINITIONS: dict[int, str] = {
    900: "A round shape.",
    901: "A piece of an electronic device that allows electricity to flow.",
    902: "Having a round shape.",
    903: "To spread something around, especially to many people or places.",
    904: "An event that makes a situation what it is.",
    905: "A travelling show with animals and people.",
    906: "To mention something as an example or as proof of something.",
    907: "Someone who has the right to live permanently in a country and receive its legal benefits and obligations.",
    908: "Someone who lives in a certain place.",
    909: "A place where a lot of people live.",
    910: "Related to a town or city, especially its government.",
    911: "Relating to the ordinary people or things in a country, not the military or religious.",
    912: "Someone who is not in the military.",
    913: "A human society with its own social organisation and culture.",
    914: "To say that something is true.",
    915: "To climb something with difficulty using your hands and feet.",
    916: "To hit one's hands together to express pleasure or get attention.",
    917: "An explanation that makes something clearer and easier to understand.",
    918: "To make something clear or easier to understand.",
    919: "To fight or argue over something.",
    920: "One of the groups into which people in society are divided by background, education, job, or income.",
    921: "The way people in society are divided into different social and economic groups.",
    922: "Typical of the past; widely recognised and respected over time.",
    923: "More formal and serious than popular music.",
    924: "Putting things into categories or groups that have things in common.",
    925: "To put things into groups based on their type.",
    926: "A room in a school where students are taught.",
    927: "A part of a sentence that has its own subject and verb.",
    928: "A sharp curved nail on the foot of an animal.",
    929: "A type of heavy, wet soil used to make pots.",
    930: "To make something neat and tidy.",
    931: "To remove everything from a place.",
    932: "To close a part of your body tightly, especially because you are angry or upset.",
    933: "A worker, especially one in a store who helps customers.",
    934: "Smart or quick to understand.",
    935: "To press a button on a mouse to make a computer do something.",
    936: "A person or business that pays another to do a service.",
    937: "A high and often flat wall of rock.",
    938: "The usual weather in a place.",
    939: "To use your hands and feet to go up something.",
    940: "To hold onto something tightly.",
    941: "A place where people go for medical treatment.",
    942: "To cut something with scissors.",
    943: "A long, loose piece of clothing without sleeves.",
    944: "An instrument that shows the time.",
    945: "Moving in a circle in the same direction as the hands on a watch face.",
    946: "To shut something or cover up an opening.",
    947: "A small room used to store things.",
    948: "Woven or knitted fabric used for making garments.",
    949: "What people wear to cover their bodies.",
    950: "A group of water drops in the sky.",
    951: "A small plant with three round leaves.",
    952: "A performer who wears funny clothes and makeup and does tricks to make people laugh.",
    953: "A group of people who meet to do an activity.",
    954: "A fact or object that helps solve a mystery or crime.",
    955: "Awkward in handling things; likely to drop or bump into things.",
    956: "A small group of things placed close together.",
    957: "To hold someone or something firmly, for example because you are afraid or in pain.",
    958: "A person who teaches sports.",
    959: "A hard black material that people burn for heat.",
    960: "A group of people or organisations working for a common purpose.",
    961: "Having a rough texture.",
    962: "The land by an ocean.",
    963: "The shape of the land bordering the sea.",
    964: "An outer piece of clothing worn for warmth.",
    965: "A large brown fruit that has a hard shell and white flesh.",
    966: "A set of symbols used to hide or read a message.",
    967: "To exist in the same time and place as something else.",
    968: "To live or exist at the same time or in the same place.",
    969: "A drink made from roasted beans.",
    970: "A box used to bury dead people.",
    971: "Related to learning and knowing things.",
    972: "Having parts that fit well together in a logical way.",
    973: "Reasonable and sensible; easy to follow.",
    974: "To wind into rings or a spiral.",
    975: "To create a new word or phrase that other people begin to use.",
    976: "To happen at the same time.",
    977: "A situation in which separate things happen by chance at the same time or in the same way.",
    978: "Having a low temperature.",
    979: "To fall down suddenly.",
    980: "The part of a shirt that goes around the neck.",
    981: "Someone who works in the same organisation or department as you.",
    982: "Somebody you work with.",
    983: "To bring things together from different places.",
    984: "A group of things that have been gathered together.",
    985: "A rare or valuable object that collectors want to own.",
    986: "A school for higher education.",
    987: "To hit something while moving.",
    988: "The act of two things hitting into each other.",
    989: "A country controlled by another country.",
    990: "The property of an object that is produced by the way it reflects light.",
    991: "A young male horse.",
    992: "A tall, vertical post often used to support a building.",
    993: "A journalist who writes a regular series of articles for a particular newspaper or magazine.",
    994: "A toothed tool used to arrange hair.",
    995: "Fighting between two people or groups.",
    996: "A mixture of different things.",
    997: "To join together to make a single thing or group.",
    998: "To move toward a place.",
    999: "Entertainment that is intended to make people laugh.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH10_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH10_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH10_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH10_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
