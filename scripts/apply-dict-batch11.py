#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 11 (entries 1000-1099).

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

BATCH11_DEFINITIONS: dict[int, str] = {
    1000: "An object in space made of ice and rock with a tail of glowing dust.",
    1001: "A physically relaxed state without pain or other unpleasant feelings.",
    1002: "A feeling of being less sad or worried than before.",
    1003: "A pleasant way of life in which you have everything you need.",
    1004: "To make someone feel less sad, worried, or disappointed.",
    1005: "Making you feel relaxed, confident, and not worried.",
    1006: "Funny; intended to make people laugh.",
    1007: "An order given to a person or animal to do something.",
    1008: "To officially order someone to do something.",
    1009: "An official order.",
    1010: "To begin something.",
    1011: "A remark or opinion about something.",
    1012: "A person who gives opinions or describes something, often on TV or the radio.",
    1013: "The activity of buying and selling things.",
    1014: "Related to buying and selling goods and services.",
    1015: "To pay someone to do a job.",
    1016: "To promise to do something.",
    1017: "A group of people who meet together to make decisions.",
    1018: "Something that can be bought or sold.",
    1019: "Happening often or existing in large amounts.",
    1020: "Ordinary; not unusual.",
    1021: "Involving a group of people.",
    1022: "To talk or write to others in order to share information.",
    1023: "A group of people who share the same area or interests.",
    1024: "The people who live in an area.",
    1025: "To travel regularly to and from work.",
    1026: "To make something smaller or firmer by pressing it.",
    1027: "Smaller than most things of the same kind.",
    1028: "Someone who is with you.",
    1029: "A business or organisation that makes or sells goods or services.",
    1030: "Being judged or measured in relation to something else.",
    1031: "To say how two things are the same and different.",
    1032: "The act of examining how two or more things are the same and different.",
    1033: "An instrument used to find direction.",
    1034: "A feeling of sympathy and concern for others.",
    1035: "Feeling pity and sympathy for others.",
    1036: "Working well or existing together successfully.",
    1037: "Likely to have a good relationship because of being similar.",
    1038: "To force someone to do something.",
    1039: "To pay someone for the time they spent doing something.",
    1040: "Money that someone receives because something bad has happened to them.",
    1041: "To try to win against others.",
    1042: "The ability to do something well or effectively.",
    1043: "Able to think or act successfully.",
    1044: "The act of trying to win against others.",
    1045: "To collect a variety of things into a group.",
    1046: "To say that you are unhappy about something.",
    1047: "An expression of unhappiness about something.",
    1048: "To make something or someone better.",
    1049: "Having all the necessary parts.",
    1050: "In every way; totally.",
    1051: "Having many details or small parts, making something difficult to understand or deal with.",
    1052: "The act of following a rule or doing what you are supposed to do.",
    1053: "To make something harder than necessary.",
    1054: "To say a nice thing about someone or something.",
    1055: "A part of a larger machine.",
    1056: "To make something from smaller parts.",
    1057: "An enclosed area such as a prison or factory.",
    1058: "To understand something.",
    1059: "Including all the details about something.",
    1060: "To press or squeeze something so that it takes up less space.",
    1061: "To consist of two or more things.",
    1062: "To solve a problem by accepting that you cannot have everything you want.",
    1063: "A way of solving a problem in which both sides accept that they cannot have everything they want.",
    1064: "Something that must be done because of a rule or law.",
    1065: "An electronic device for storing and processing data.",
    1066: "To trick someone into doing something or giving up money.",
    1067: "To hide something.",
    1068: "To admit against your wish that something is true.",
    1069: "To be able to imagine or believe something.",
    1070: "To give all your attention to what you are doing.",
    1071: "To give all your attention to something.",
    1072: "To make a solution of something in water stronger.",
    1073: "An idea about something.",
    1074: "A feeling of worry.",
    1075: "An event where you listen to people play music.",
    1076: "A piece of music played with an orchestra but featuring a solo instrument.",
    1077: "Something that one person gives up to another.",
    1078: "To arrive at a logical end by looking at evidence.",
    1079: "The final part of something.",
    1080: "A substance made from stones.",
    1081: "To give someone a specific punishment.",
    1082: "To change a gas into a liquid.",
    1083: "Made thicker by removing water.",
    1084: "The state that someone or something is in.",
    1085: "The way someone behaves, especially in relation to rules or accepted standards.",
    1086: "To do something in an organised way.",
    1087: "To discuss something with someone to make a decision.",
    1088: "A formal meeting for discussion.",
    1089: "To admit a bad or embarrassing truth.",
    1090: "A feeling of certainty or ability.",
    1091: "Believing that you can do something without failing.",
    1092: "Something that must be kept secret.",
    1093: "To keep something in one place.",
    1094: "To make sure something is correct.",
    1095: "Angry disagreement between people or groups.",
    1096: "When different ideas or opinions cannot all be right or all happen.",
    1097: "To obey rules or laws.",
    1098: "To deal with a difficult situation.",
    1099: "To go close to someone in a threatening way.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH11_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH11_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH11_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH11_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
