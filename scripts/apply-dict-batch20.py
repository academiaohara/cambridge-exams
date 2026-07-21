#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 20 (entries 1900-1999).

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

BATCH20_DEFINITIONS: dict[int, str] = {
    1900: "An approximate calculation or judgment of the size, amount, or cost of something.",
    1901: "To say what you think an amount or value will be, either by guessing or by using available information to calculate it.",
    1902: "Used at the end of a list to mean that other similar items are not mentioned.",
    1903: "Continuing forever or for a very long time.",
    1904: "Being the right thing to do morally.",
    1905: "Moral beliefs or rules about right and wrong.",
    1906: "Related to a group of people with a similar culture.",
    1907: "The group of rules about how to be polite.",
    1908: "To leave a building or other place because it is not safe.",
    1909: "To think carefully about something before making a judgment about its value, importance, or quality.",
    1910: "To change from liquid into gas.",
    1911: "Level or equal.",
    1912: "The period of time at the end of the day.",
    1913: "Something that happens, especially something important.",
    1914: "Happening at the end of a series of events.",
    1915: "At a later time or in the end.",
    1916: "At any time.",
    1917: "Each one of a group.",
    1918: "All people.",
    1919: "All things.",
    1920: "In or to all places.",
    1921: "To legally force someone to leave the house they are living in, usually because they have not paid their rent.",
    1922: "A fact or thing that you use to prove something.",
    1923: "Easy to see or understand.",
    1924: "Relating to something or someone bad or cruel, not good.",
    1925: "To cause a memory or emotion to occur.",
    1926: "The process by which living things change over time.",
    1927: "When a type of plant or animal changes its physical form over a long period of time.",
    1928: "To gradually change and develop over a period of time.",
    1929: "To make a problem become worse.",
    1930: "Correct in every detail.",
    1931: "To describe something in a way that makes it seem better, worse, larger, more important, etc. than it really is.",
    1932: "To say that something is bigger or better than it really is.",
    1933: "A test.",
    1934: "To look at something carefully.",
    1935: "A thing that is typical of something.",
    1936: "To be more than something.",
    1937: "To be very good at a subject or activity.",
    1938: "Very good.",
    1939: "Not including.",
    1940: "Someone or something that does not follow a rule.",
    1941: "Outstanding or unusually good.",
    1942: "A short piece of writing or music taken from a larger piece.",
    1943: "An amount of something that is more than needed or wanted.",
    1944: "To give one thing in return for another.",
    1945: "To make someone happy and interested.",
    1946: "A feeling of great enthusiasm and eagerness.",
    1947: "To say something loudly, suddenly, and excitedly.",
    1948: "To deliberately not include something.",
    1949: "The act of keeping someone out of a group.",
    1950: "Expensive and only for rich people.",
    1951: "A short trip for pleasure.",
    1952: "A reason you give to explain why something bad happened.",
    1953: "To kill someone as a legal punishment.",
    1954: "A senior manager in a business or other organisation.",
    1955: "Not required to do something.",
    1956: "Allowed to ignore something such as a rule, obligation, or payment.",
    1957: "To run or play sports so that you can be healthy.",
    1958: "To use strength or ability to do something.",
    1959: "To make someone tired.",
    1960: "Very tiring.",
    1961: "To show something so that people can go look at it.",
    1962: "A public display of art or items.",
    1963: "Making you feel extremely happy, excited, and full of energy.",
    1964: "The state of being forced to leave one's country.",
    1965: "To be real.",
    1966: "Something that is used as a way to get out of a place.",
    1967: "Relating to something unusual because it is from far away.",
    1968: "To become or make larger in size and fill more space.",
    1969: "To become bigger in size.",
    1970: "To believe that something will happen.",
    1971: "A long trip, usually to a place very far away.",
    1972: "To force someone to leave a place.",
    1973: "The money that people spend on something.",
    1974: "Costing a lot of money.",
    1975: "To do or see something or have something happen to you.",
    1976: "A test that you do to see what will happen.",
    1977: "Someone who is very good at doing something.",
    1978: "The knowledge and skills to do something well.",
    1979: "When the period during which an agreement, offer, or official document can be used comes to an end.",
    1980: "To make something clear or easy to understand.",
    1981: "Very clear, open, and truthful.",
    1982: "To suddenly move apart in many smaller pieces.",
    1983: "To use natural resources such as trees, water, or oil so that you gain as much as possible.",
    1984: "To treat someone unfairly in order to get some benefit for yourself.",
    1985: "To look for new places.",
    1986: "A sudden, violent burst of energy.",
    1987: "To sell products to other countries.",
    1988: "To make known something that is hidden.",
    1989: "The condition of being subjected to something such as danger or publicity.",
    1990: "To show others how one thinks or feels.",
    1991: "Extremely beautiful and delicate.",
    1992: "To make longer or larger.",
    1993: "A part added to something to give it more time or space.",
    1994: "Large in size or amount.",
    1995: "The importance of a problem or situation.",
    1996: "The degree to which something happens or is likely to happen.",
    1997: "The size or area of something.",
    1998: "The outside surface of something.",
    1999: "Coming from outside a place or organisation.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH20_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH20_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH20_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH20_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
