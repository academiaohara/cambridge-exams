#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 2 (entries 100-199).

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

BATCH2_DEFINITIONS: dict[int, str] = {
    100: "A feeling of liking or fondness for someone or something.",
    101: "To cause someone pain, suffering, or distress.",
    102: "Suffering from pain, illness, or distress.",
    103: "Wealthy; having plenty of money.",
    104: "To have enough money to pay for something.",
    105: "A life that some people believe begins when a person dies.",
    106: "At a later time; after an event.",
    107: "One more time.",
    108: "Touching or leaning on something; or opposed to something.",
    109: "The number of years someone has lived.",
    110: "A business or service that acts on behalf of others.",
    111: "A plan, goal, or list of things to be done that guides someone's behaviour.",
    112: "A person who works for a company or represents another person.",
    113: "To make something bad become worse, especially a situation or medical condition.",
    114: "An angry feeling that makes you want to attack or defeat someone.",
    115: "Ready or eager to argue or fight; behaving in a forceful way.",
    116: "To spend a long time worrying and feeling upset about something.",
    117: "Great physical pain.",
    118: "A strong unpleasant feeling, especially great worry or sadness.",
    119: "To have the same opinion or belief as another person.",
    120: "A formal arrangement or decision about future action.",
    121: "The work, business, or study of farming.",
    122: "The growing of plants and raising of animals for food.",
    123: "In front of or further forward than something else.",
    124: "To help or support someone.",
    125: "To cause pain, illness, or trouble to someone.",
    126: "Sick or in poor health.",
    127: "A goal that someone wants to achieve.",
    128: "The invisible gas that surrounds the Earth and that people breathe.",
    129: "A vehicle that flies in the sky, such as an aeroplane or helicopter.",
    130: "A company that owns aircraft and carries people or goods by plane.",
    131: "A place where aeroplanes take off and land.",
    132: "The passage through which air reaches a person's lungs.",
    133: "A passage between rows of seats or between shelves.",
    134: "A warning sound or device that alerts people to danger.",
    135: "Although; even though.",
    136: "A type of drink that can make people drunk.",
    137: "To warn someone about something dangerous or important.",
    138: "A creature from a different world.",
    139: "To support or side with a political group, country, or person you agree with.",
    140: "Similar to each other.",
    141: "Living; not dead.",
    142: "The whole number or amount of something.",
    143: "To say that something is true without giving proof.",
    144: "To claim that something is true or that someone has done wrong, without proof.",
    145: "To make something less painful, severe, or serious.",
    146: "A narrow road or passage between buildings.",
    147: "An agreement between groups or countries to work together.",
    148: "To give or set aside something for a particular purpose or person.",
    149: "To let something happen or give permission for it.",
    150: "An amount of money given regularly, especially to a child.",
    151: "A metal made by combining two or more metals.",
    152: "Someone who agrees to help or support another person or group.",
    153: "Nearly but not completely.",
    154: "Without other people; on your own.",
    155: "Moving in a line next to something from one point to another.",
    156: "Next to or beside something else.",
    157: "In a voice that can be heard by others.",
    158: "A set of letters used for writing a language.",
    159: "Before now or before a particular time.",
    160: "In addition; too.",
    161: "To change something.",
    162: "To happen or appear one after the other repeatedly.",
    163: "Happening on one day, week, etc., but not on the one immediately after.",
    164: "Something that you can choose instead of something else.",
    165: "Different from the usual and able to be used instead of it.",
    166: "Something that you can choose instead of your first choice.",
    167: "Used to introduce a contrast between two things.",
    168: "The height of something above sea level.",
    169: "Completely; in total; entirely.",
    170: "A light, silver-coloured metal used in many everyday objects.",
    171: "At all times; on every occasion.",
    172: "A person who does something for enjoyment and is not paid for it.",
    173: "To surprise someone very much.",
    174: "A diplomat who represents their country in a foreign country.",
    175: "Not entirely clear; open to more than one interpretation.",
    176: "Not clear or definite; able to be understood in more than one way.",
    177: "A strong desire to succeed or achieve something important.",
    178: "Having a strong desire to be successful, rich, or powerful.",
    179: "A vehicle that takes sick or injured people to hospital.",
    180: "To change something to improve it or make it more accurate.",
    181: "To make changes to a document, law, or agreement, especially to improve it.",
    182: "In the middle of or surrounded by something.",
    183: "In the middle of or surrounded by other people or things.",
    184: "A quantity of something.",
    185: "More than enough; plentiful.",
    186: "Enough, and often more than you need.",
    187: "To make someone laugh or enjoy themselves.",
    188: "Something that seems to belong to an earlier time and is out of place today.",
    189: "Similar to something else in certain ways.",
    190: "Related to careful logical analysis and reasoning.",
    191: "To examine something in detail in order to understand it.",
    192: "A relative who lived a long time ago.",
    193: "A person who presents the news on television or radio.",
    194: "To present a television or radio programme, especially the news.",
    195: "Very old; from a long time ago.",
    196: "Used to connect words, phrases, or clauses.",
    197: "Again, often in a new or different way.",
    198: "A spiritual being that some people believe is God's servant in heaven.",
    199: "A strong feeling of being upset or annoyed when something unfair happens.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH2_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH2_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH2_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH2_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
