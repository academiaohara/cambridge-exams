#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 17 (entries 1600-1699).

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

BATCH17_DEFINITIONS: dict[int, str] = {
    1600: "To show something, especially by putting it in a certain place.",
    1601: "To get rid of something.",
    1602: "A serious disagreement, especially one between groups of people that lasts for a long time.",
    1603: "To say that something such as a fact is not true or correct.",
    1604: "Rudeness or behaviour that shows no regard for others.",
    1605: "To prevent something or someone from working properly.",
    1606: "Not happy with something.",
    1607: "To fail to please someone.",
    1608: "To spread information or knowledge widely.",
    1609: "When a solid substance mixes into a liquid so that it becomes part of the liquid.",
    1610: "How far it is between two points.",
    1611: "A system in which students work at home with the help of television and radio broadcasts and send work to their teachers by post or e-mail.",
    1612: "Far away in space or time.",
    1613: "Clearly different or easy to notice.",
    1614: "Having a special quality, character, or appearance that is easy to recognize.",
    1615: "To recognise the differences between things.",
    1616: "To lie about something, or pull or twist it out of shape.",
    1617: "To change something such as information so that it is no longer true or accurate.",
    1618: "To stop someone from concentrating on something.",
    1619: "A feeling of sadness and anxiousness.",
    1620: "To give something to a number of people.",
    1621: "An area of a town or country.",
    1622: "A small part of a city, county, state, or country.",
    1623: "To upset someone.",
    1624: "A narrow hole cut into the ground by a road or a field.",
    1625: "To go down head first into water.",
    1626: "To become different or to follow a different direction.",
    1627: "Very different from each other.",
    1628: "The state of having many different forms, types, ideas, etc.",
    1629: "To change direction or to draw someone's attention away from something.",
    1630: "To split something into smaller parts.",
    1631: "A share of the profits of a company paid once or twice a year to the people who own the company's shares.",
    1632: "Related to a god or gods.",
    1633: "The act of separating something into parts.",
    1634: "To take legal action to end your marriage.",
    1635: "A legal way of ending a marriage.",
    1636: "Having a spinning feeling in your head.",
    1637: "The molecule that carries genetic instructions in living organisms.",
    1638: "To perform an action.",
    1639: "An enclosed area where ships go to be loaded, unloaded, and repaired.",
    1640: "A person who studies medicine and helps sick people.",
    1641: "A set of beliefs held by a group.",
    1642: "A written text, usually not in the form of a book.",
    1643: "An animal with four legs and a tail that is kept as a pet or trained to work.",
    1644: "A toy that looks like a person.",
    1645: "A unit of money in the US.",
    1646: "A large sea mammal that breathes air.",
    1647: "An area of knowledge or activity.",
    1648: "A curved roof of a building.",
    1649: "Relating to something that happens within a particular country.",
    1650: "The state of being more powerful than others.",
    1651: "Stronger than others.",
    1652: "To control something or someone, often in a negative way, because you have more power or influence.",
    1653: "To give something to a charity or organization.",
    1654: "Someone who gives something to an organisation.",
    1655: "Death or destruction.",
    1656: "Likely to fail or be destroyed.",
    1657: "An object that swings or slides open and shut.",
    1658: "A school building where students live.",
    1659: "A certain amount of medicine taken at one time.",
    1660: "A small, round mark.",
    1661: "Twice as much or twice as many.",
    1662: "A feeling of not being sure.",
    1663: "A mixture of flour and water that becomes bread when baked.",
    1664: "A white bird that is a symbol of peace.",
    1665: "Toward a lower place.",
    1666: "An initial sum of money paid when buying something, with the rest paid later.",
    1667: "To move information to your computer from a computer system or the Internet.",
    1668: "A file transferred from the Internet or another computer to your device.",
    1669: "On a lower floor of a building.",
    1670: "The central area of a city or town.",
    1671: "Moving toward a lower position.",
    1672: "A group of twelve.",
    1673: "A piece of written work that is not in its final form.",
    1674: "To pull something across the ground.",
    1675: "A large, imaginary animal that breathes fire.",
    1676: "A play for theatre or television.",
    1677: "Sudden and striking.",
    1678: "Severe or extreme.",
    1679: "To make a picture with a pen or pencil.",
    1680: "A disadvantage.",
    1681: "A sliding box-shaped compartment in furniture used for storage.",
    1682: "To feel great fear about something that could, or is going to, happen.",
    1683: "A series of thoughts and images that occur during sleep.",
    1684: "Dull, dark, and lifeless.",
    1685: "To put on clothes.",
    1686: "To be pushed along very slowly by the movement of air or water.",
    1687: "A slow and gradual change from one situation or opinion to another.",
    1688: "The general meaning that someone is trying to express.",
    1689: "A tool with a point that spins in order to make a hole.",
    1690: "To take liquid into the body through the mouth.",
    1691: "To fall a little bit at a time.",
    1692: "To operate a vehicle.",
    1693: "A short private road that leads to a person's home.",
    1694: "To fall or allow something to fall.",
    1695: "A long period of time when there is little or no rain and crops die.",
    1696: "To die from not being able to breathe underwater.",
    1697: "A substance used to treat an illness or to change how the body works.",
    1698: "A musical instrument that you hit with sticks or your hands.",
    1699: "Affected by alcohol to the point of losing control.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH17_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH17_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH17_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH17_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
