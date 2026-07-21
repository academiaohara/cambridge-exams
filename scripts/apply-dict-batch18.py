#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 18 (entries 1700-1799).

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

BATCH18_DEFINITIONS: dict[int, str] = {
    1700: "Not wet.",
    1701: "Made up of two parts.",
    1702: "Not considered honest or trustworthy.",
    1703: "Not sure about the truth or quality of something or whether you should do something.",
    1704: "Not completely good, safe, or honest.",
    1705: "A small water bird.",
    1706: "Expected to happen or be done at a particular time.",
    1707: "A man of high social rank but below a king or queen.",
    1708: "Not exciting or interesting.",
    1709: "Unable to speak.",
    1710: "To get rid of something in a careless way.",
    1711: "Solid waste material produced by animals.",
    1712: "To make an exact copy of something.",
    1713: "Long-lasting and strong.",
    1714: "The period of time during which something continues to happen or exist.",
    1715: "Throughout the time that something happens.",
    1716: "The time in the evening when it begins to get dark.",
    1717: "Very small, dry particles of earth or sand.",
    1718: "Something that a person has to do.",
    1719: "A person who is very short.",
    1720: "To live in a particular place.",
    1721: "To live somewhere.",
    1722: "To change the colour of something using a special chemical.",
    1723: "Continuously changing, growing, or developing.",
    1724: "The way that parts of a situation affect each other.",
    1725: "A series of rulers who are all from the same family.",
    1726: "Every one of a group.",
    1727: "Showing excitement about something.",
    1728: "A large bird of prey.",
    1729: "The part of the body used for hearing.",
    1730: "Near the beginning of a period of time.",
    1731: "To get money for the work you do.",
    1732: "Honest and serious.",
    1733: "A piece of jewellery worn on the ear.",
    1734: "The planet on which we live.",
    1735: "Made of clay or soil.",
    1736: "A sudden shaking of the ground that often causes a lot of damage.",
    1737: "A condition without difficulty or hard work.",
    1738: "The direction the sun rises from.",
    1739: "A Christian holiday celebrating the resurrection of Jesus.",
    1740: "Not difficult to do.",
    1741: "To chew and swallow food.",
    1742: "When a sound repeats because it bounced off an object.",
    1743: "In a way that concerns living organisms and the environment.",
    1744: "The study of the environment and living things.",
    1745: "Relating to the money and business systems of a country.",
    1746: "The money and businesses of a country or region.",
    1747: "The furthest part or side of something.",
    1748: "Safe to eat.",
    1749: "To correct a piece of writing so that it is suitable to be published.",
    1750: "The process of teaching and learning, usually at a school, college, or university.",
    1751: "A change made by something else.",
    1752: "Someone or something that works well and produces the intended result.",
    1753: "Working well and producing the intended result.",
    1754: "Working well and producing good results without wasting time, money, or supplies.",
    1755: "Not wasting time, money, or energy.",
    1756: "Hard work or an attempt to do something.",
    1757: "An oval object produced by a bird.",
    1758: "A person's sense of their own worth.",
    1759: "The number 8.",
    1760: "One or the other.",
    1761: "Containing a lot of details.",
    1762: "When time passes.",
    1763: "A material that stretches when it is pulled.",
    1764: "The middle part of an arm, where it bends.",
    1765: "Older.",
    1766: "Old.",
    1767: "To choose someone for a job by voting.",
    1768: "A vote to choose someone for a job.",
    1769: "Operated by a current of charged particles.",
    1770: "Relating to powered devices and wiring.",
    1771: "A form of energy used to power things.",
    1772: "Related to currents and magnetic fields.",
    1773: "A particle in all atoms that has a negative charge.",
    1774: "Using powered circuits to operate.",
    1775: "Very fancy and pleasing.",
    1776: "A particular part of something.",
    1777: "The most basic or simple.",
    1778: "A very large animal with a trunk.",
    1779: "To lift up or raise.",
    1780: "A machine that carries people up and down in a building.",
    1781: "The number 11.",
    1782: "Permitted to do or have something.",
    1783: "To get rid of something that is not wanted or needed.",
    1784: "Of or from a high-level group.",
    1785: "Different or additional; referring to another thing.",
    1786: "In or to another place.",
    1787: "Hard to find or catch.",
    1788: "To begin a journey.",
    1789: "To make someone feel ashamed or foolish.",
    1790: "The office of an ambassador in a foreign country.",
    1791: "To symbolize or represent something.",
    1792: "To hold someone closely in your arms.",
    1793: "To come out of a place or situation.",
    1794: "A time when someone needs help right away.",
    1795: "To leave your country in order to live in another country on a permanent basis.",
    1796: "Famous and respected.",
    1797: "To send out gas, heat, light, sound, etc.",
    1798: "A strong feeling such as happiness, anger, or sadness.",
    1799: "Relating to feelings.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH18_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH18_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH18_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH18_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
