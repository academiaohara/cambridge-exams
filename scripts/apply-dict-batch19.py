#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 19 (entries 1800-1899).

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

BATCH19_DEFINITIONS: dict[int, str] = {
    1800: "To understand how someone feels because you can imagine what it is like to be them.",
    1801: "The leader of a group of countries.",
    1802: "Special importance given to a particular aspect of something.",
    1803: "To give special importance to something.",
    1804: "A large group of countries ruled by an emperor or empress.",
    1805: "Involving scientific proof and evidence.",
    1806: "To give work to someone.",
    1807: "A person who works for a company.",
    1808: "A person or company that pays people to work.",
    1809: "The state of having a paid job.",
    1810: "Having no things inside.",
    1811: "To make it possible for something to happen.",
    1812: "To make something into a law.",
    1813: "To make someone feel very interested or happy.",
    1814: "To contain or surround something.",
    1815: "To find or meet a person or thing.",
    1816: "To make someone want to do something.",
    1817: "Something that makes someone more determined, hopeful, or confident.",
    1818: "To stop or finish.",
    1819: "To put someone or something at risk of harm.",
    1820: "Very rare and at risk of dying out altogether.",
    1821: "An attempt to do something, especially something new or original.",
    1822: "Having no limit or finish.",
    1823: "To express formal support or approval for someone or something.",
    1824: "To suffer something unpleasant or difficult in a patient way over a long period.",
    1825: "To last for a long time.",
    1826: "A country that is fighting another country during a war.",
    1827: "Having plenty of strength and activity.",
    1828: "Strength and activity that lets you do many things.",
    1829: "To make a person follow a rule.",
    1830: "To make sure that a law or rule is obeyed by people.",
    1831: "To take part in something.",
    1832: "A machine that produces power.",
    1833: "To skillfully plan how to make something.",
    1834: "To cut a design or words into the surface of something.",
    1835: "To improve something or make it more attractive or more valuable.",
    1836: "To like something.",
    1837: "To make something bigger.",
    1838: "To teach someone about something.",
    1839: "To join the military.",
    1840: "Very large.",
    1841: "As much as necessary.",
    1842: "To make someone rich or increase their wealth.",
    1843: "To put one's name on a list as a member of a group.",
    1844: "To make sure something happens.",
    1845: "To go into a place.",
    1846: "A company or business.",
    1847: "To do something that someone enjoys.",
    1848: "A very strong good feeling about something.",
    1849: "Excited by or interested in something.",
    1850: "The whole thing or group.",
    1851: "To give someone the right to have or do something.",
    1852: "Having the right to do something.",
    1853: "A place where someone can go into an area.",
    1854: "Someone who starts a new business or organization in order to make money.",
    1855: "The act of going into a place.",
    1856: "A flat paper container for a letter.",
    1857: "Wanting something that another person has.",
    1858: "The place where people work or live.",
    1859: "Relating to the natural world.",
    1860: "To have the unhappy feeling of wanting to be like someone else or have what they have.",
    1861: "The unhappy feeling you have when you want very much to do something that someone else does or have something that they have.",
    1862: "A long book, poem, or movie about a period of time or a great event.",
    1863: "An outbreak of a disease that spreads quickly.",
    1864: "A medical condition that affects the brain and can make someone become unconscious or unable to control their movement for a short time.",
    1865: "Something that happens as part of a series of events.",
    1866: "A period of time in history.",
    1867: "The same in size, number, amount, or value as something else.",
    1868: "The state of being the same, especially in rights and opportunities.",
    1869: "To compare two things and consider them very similar.",
    1870: "A statement in mathematics that two sets of numbers or expressions are the same.",
    1871: "All the different aspects that you have to consider in a situation.",
    1872: "An imaginary line that splits the Earth into north and south.",
    1873: "At the same distance from two places.",
    1874: "To give someone the things needed to do something.",
    1875: "The things used for a specific purpose.",
    1876: "Someone or something that has the same size, value, importance, or meaning as someone or something else.",
    1877: "Of the same size, value, importance, or meaning as something else.",
    1878: "A period of time that has a particular quality or character.",
    1879: "To remove or delete something.",
    1880: "To build something.",
    1881: "To gradually wear away.",
    1882: "The destruction of rock or soil due to flowing water or weather.",
    1883: "To make a mistake.",
    1884: "A trip taken to do a specific activity.",
    1885: "Not regular or predictable.",
    1886: "Incorrect or only partly correct.",
    1887: "A mistake.",
    1888: "To explode or blow apart, especially a volcano.",
    1889: "To become more intense or serious.",
    1890: "To succeed in getting away from a place.",
    1891: "To safely accompany someone to a place.",
    1892: "Particularly or above all.",
    1893: "A short piece of writing on a certain subject.",
    1894: "The most important qualities or basic characteristics of something.",
    1895: "Very important and necessary.",
    1896: "To create or set up something.",
    1897: "An area where there are many houses, usually built at the same time by the same company.",
    1898: "To respect and admire.",
    1899: "Highly respected and admired by many people.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH19_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH19_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH19_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH19_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
