#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 14 (entries 1300-1399).

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

BATCH14_DEFINITIONS: dict[int, str] = {
    1300: "To break or fall apart into small pieces.",
    1301: "To crush something so that it becomes wrinkled.",
    1302: "To hit or press something so hard that you damage or destroy it.",
    1303: "A crowd of people pressed extremely close together in an area that is too small.",
    1304: "The tough outer part of a loaf of bread.",
    1305: "A stick that helps someone with a leg injury walk.",
    1306: "To produce tears from your eyes because of sadness or pain.",
    1307: "A piece of a solid substance that has a regular shape.",
    1308: "A baby animal, such as a bear or lion.",
    1309: "A solid object with six square surfaces that are all the same size.",
    1310: "A long, green vegetable with a cool, fresh taste.",
    1311: "A signal to begin something.",
    1312: "Someone who has committed a crime or other bad deed.",
    1313: "To care for plants and help them grow.",
    1314: "The music, art, and writings of a certain place or group of people.",
    1315: "Relating to an increase by adding one after another.",
    1316: "A small container for drinking.",
    1317: "A piece of furniture that is used to store food or household items.",
    1318: "Someone whose job is to look after the objects in a museum.",
    1319: "To prevent something from happening or increasing.",
    1320: "A medical treatment to make a sickness go away.",
    1321: "Wanting to know about something.",
    1322: "To form into a curved shape.",
    1323: "The type of money used in a country.",
    1324: "A steady and constant flow of air or water in a river or ocean.",
    1325: "The subjects that students study at a particular school or college.",
    1326: "The set of courses offered by a school.",
    1327: "To use magic powers to make bad things happen to someone.",
    1328: "A bad situation or event caused by someone's deliberate use of magic powers.",
    1329: "A cloth hung over a window or used to divide a room.",
    1330: "To move in a line that bends and does not go straight.",
    1331: "A soft bag of material used to make a seat more comfortable.",
    1332: "The right to take care of someone or something.",
    1333: "A way of doing things that has been the same for a long time.",
    1334: "A person who buys something at a store.",
    1335: "To use a sharp tool to divide something.",
    1336: "Attractive or pretty in a simple way.",
    1337: "A series of events that go in a circle from the end back to the beginning again.",
    1338: "A large storm with heavy rain and winds that spin in a circle.",
    1339: "A solid shape with two circular ends and straight sides.",
    1340: "Unwilling to believe that people have good intentions.",
    1341: "Believing that people are only interested in themselves and are not sincere.",
    1342: "A word for father.",
    1343: "Happening every day.",
    1344: "Describing foods made from milk.",
    1345: "A wall built across a river to hold back water.",
    1346: "To harm or break something.",
    1347: "Money that a court orders you to pay someone because you have harmed them or their property.",
    1348: "Slightly wet.",
    1349: "To move your body in time with music.",
    1350: "The possibility that someone or something will be harmed, destroyed, or killed.",
    1351: "Likely to cause harm.",
    1352: "To be brave enough to try something.",
    1353: "Having little or no light.",
    1354: "The state of having no light.",
    1355: "To run or go somewhere very quickly because you are in a hurry.",
    1356: "Information in a form that a computer can use.",
    1357: "A collection of information and facts.",
    1358: "A collection of information stored in a computer.",
    1359: "A specific day of the month or year.",
    1360: "A female child.",
    1361: "The time of day when the sun rises.",
    1362: "A period of twenty-four hours, beginning at midnight.",
    1363: "The natural light during the day.",
    1364: "The time of the day when the sky is light.",
    1365: "To impress someone greatly.",
    1366: "No longer alive.",
    1367: "The time by which you need to have something completed.",
    1368: "Likely to cause death.",
    1369: "Unable to hear.",
    1370: "An agreement that you have with another person.",
    1371: "Much loved.",
    1372: "The end of life.",
    1373: "To seriously discuss something with someone.",
    1374: "An amount of money that you owe.",
    1375: "An amount of money that a person owes.",
    1376: "A period of ten years, especially one beginning with a year ending in 0.",
    1377: "A period of ten years.",
    1378: "To be gradually destroyed through a natural process of change.",
    1379: "The gradual destruction of something through a natural process of change.",
    1380: "To become gradually worse in quality or weaker in power or influence.",
    1381: "No longer alive.",
    1382: "To make someone believe something that is not true.",
    1383: "Good enough; acceptable.",
    1384: "The act of lying or tricking someone.",
    1385: "To make a definite choice.",
    1386: "A number that has a dot followed by a fraction.",
    1387: "A choice you make after thinking about something.",
    1388: "A wooden floor built outside of a house or the floor of a ship.",
    1389: "To announce officially that something is true or happening.",
    1390: "To become less or worse.",
    1391: "To say politely that you will not accept something or do something.",
    1392: "To become less or worse.",
    1393: "To make a room more attractive by adding beautiful things to it.",
    1394: "To make something less than it was before.",
    1395: "An official order from a leader.",
    1396: "To put a lot of time and effort into something.",
    1397: "Spending all your time and effort on something.",
    1398: "To reach a conclusion based on the information available.",
    1399: "To take an amount or number from a total.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH14_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH14_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH14_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH14_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
