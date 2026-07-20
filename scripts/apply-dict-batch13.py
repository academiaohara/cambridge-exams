#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 13 (entries 1200-1299).

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

BATCH13_DEFINITIONS: dict[int, str] = {
    1200: "A thin, flexible string or rope.",
    1201: "The main or central part of something.",
    1202: "A light, soft material that comes from the bark of a tree.",
    1203: "A tall plant with yellow seeds that are eaten as a vegetable.",
    1204: "The place where two lines or surfaces meet.",
    1205: "Related to a large business.",
    1206: "A large company or business.",
    1207: "A division of a military force.",
    1208: "A dead body.",
    1209: "Right or without error.",
    1210: "To have a close connection to something.",
    1211: "To match or to be similar to something.",
    1212: "To be the same as something else or very much like it.",
    1213: "A newspaper or television reporter, especially one who deals with a particular subject or area.",
    1214: "A narrow passage that leads into other areas.",
    1215: "Breaking the law for money or fame.",
    1216: "Dishonest or illegal behaviour by officials or people in positions of power.",
    1217: "Full of people from many different places.",
    1218: "To require payment.",
    1219: "A set of clothes worn to look like someone or something else.",
    1220: "Comfortable, warm, and relaxing.",
    1221: "A small portable bed.",
    1222: "A small, old house in the countryside.",
    1223: "A cloth made from the fibres of a soft white plant.",
    1224: "A long, soft seat that many people can sit on.",
    1225: "To force air out of your throat with a sudden noise.",
    1226: "A group of people who run a city or town.",
    1227: "To give advice or guidance.",
    1228: "To say numbers in order.",
    1229: "A flat surface in a kitchen or store.",
    1230: "Something that is very similar to something else in what it does.",
    1231: "Very many; more than you can easily count.",
    1232: "An area of land with the same government and laws.",
    1233: "Land that is away from cities and towns.",
    1234: "The largest division of a state in a country.",
    1235: "An uprising in which people try to overthrow the government.",
    1236: "Made of two things that go together.",
    1237: "The feeling of not being afraid.",
    1238: "Someone who takes and delivers mail or packages.",
    1239: "A class in school.",
    1240: "A place where legal trials are held.",
    1241: "Polite and respectful.",
    1242: "The excellence of manners or social conduct.",
    1243: "An outdoor area that is surrounded by the walls of a building.",
    1244: "The child of one's aunt and uncle.",
    1245: "To put things over something.",
    1246: "News about something on television, radio, or in newspapers.",
    1247: "Information about a range of things, for example in a book or course.",
    1248: "A large farm animal that gives milk.",
    1249: "A person who is too afraid to do risky or dangerous things.",
    1250: "Comfortable, warm, and relaxing.",
    1251: "A sea animal with a hard shell and ten legs.",
    1252: "To damage something so that a line or narrow hole appears on its surface without breaking it apart.",
    1253: "A line on a surface where something is beginning to break apart.",
    1254: "A baby's bed that can be rocked.",
    1255: "To make or produce something skilfully.",
    1256: "A traditional skill of making things by hand, for example furniture or jewellery.",
    1257: "To study hard to learn a lot in a short time, especially for an examination.",
    1258: "To put things into a place that can barely contain them.",
    1259: "A strong pain caused by a muscle after a lot of physical use.",
    1260: "A tall machine used for lifting heavy objects.",
    1261: "To hit and break something.",
    1262: "A very strong feeling of wanting something.",
    1263: "To move along the ground on your hands and knees or with your body close to the ground.",
    1264: "A brief and popular activity or object.",
    1265: "Very foolish or irrational.",
    1266: "A thick liquid made from milk.",
    1267: "To make something new.",
    1268: "Something original that is made.",
    1269: "Having the ability to make new things or think of new ideas.",
    1270: "An animal or person.",
    1271: "Able to be believed or trusted.",
    1272: "Something good in your favour.",
    1273: "A stream or small river.",
    1274: "To move somewhere quietly and slowly.",
    1275: "A group of workers.",
    1276: "Something bad that someone does and that can be punished by law.",
    1277: "A person who has committed a crime.",
    1278: "To injure someone so that they cannot walk properly.",
    1279: "A difficult time when things are going to either get worse or better.",
    1280: "Hard or having a hard surface in a pleasant way, especially of food.",
    1281: "A standard by which something is judged.",
    1282: "Someone who does not like something and states their opinion about it.",
    1283: "Someone whose job is to write or broadcast opinions about books, films, or plays.",
    1284: "Expressing disapproval or pointing out faults.",
    1285: "The act of saying that something is not correct or good.",
    1286: "To say bad things about someone or something.",
    1287: "To express an opinion about the good and bad parts of something.",
    1288: "A plant grown for food, usually on a farm.",
    1289: "Something produced by the land.",
    1290: "To go from one side to the other.",
    1291: "Angry.",
    1292: "A large black bird.",
    1293: "A large group of people who are together in one place.",
    1294: "The hat worn by a king or queen.",
    1295: "Extremely important to another thing.",
    1296: "Not exact or detailed but still useful.",
    1297: "Causing pain or suffering to others.",
    1298: "A holiday on a ship.",
    1299: "A very small piece that falls off dry food such as bread or cake.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH13_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH13_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH13_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH13_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
