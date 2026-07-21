#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 6 (100 placeholders)."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "example_placeholder_detector",
    ROOT / "scripts" / "detect-dict-example-placeholders.py",
)
_detector = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_detector)

detect_placeholder = _detector.detect_placeholder

BATCH6_EXAMPLES: dict[int, str] = {
    1115: "Her parents consented to the school trip.",
    1116: "You need written consent before the procedure.",
    1117: "He had to face the consequences of his actions.",
    1120: "Her grandparents hold quite conservative views.",
    1122: "We need to consider all the options carefully.",
    1124: "The project requires considerable investment.",
    1128: "She has been consistent in her training routine.",
    1136: "They plan to construct a new bridge over the river.",
    1138: "The company hired a management consultant.",
    1139: "She was referred to a heart consultant.",
    1140: "The consultant recommended further tests.",
    1142: "The shop sells consumer electronics such as phones and cameras.",
    1147: "Chemical waste contaminated the local water supply.",
    1149: "She contemplated changing careers for months.",
    1150: "He is contemplating a move abroad next year.",
    1151: "The gallery features contemporary art.",
    1152: "Shakespeare and his contemporary playwrights shaped English drama.",
    1153: "Einstein was a contemporary of many great physicists.",
    1157: "She felt content with her quiet life in the countryside.",
    1158: "He found contentment in simple pleasures.",
    1160: "You need to understand the historical context.",
    1161: "The meaning of a word depends on its context.",
    1166: "The witness contradicted the earlier statement.",
    1167: "The two reports contradict each other.",
    1170: "The exhibition showed contrasting styles from two artists.",
    1173: "The decision caused considerable controversy.",
    1181: "The loft was converted into a flat.",
    1182: "She converted to Buddhism in her twenties.",
    1183: "As a convert, he was eager to learn more.",
    1184: "His tone conveyed disappointment.",
    1185: "The letter conveyed the company's decision.",
    1186: "He was convicted of fraud.",
    1187: "The convict was released after serving ten years.",
    1193: "The two teams cooperated on the research project.",
    1212: "Your account does not correspond with the facts.",
    1213: "She works as a foreign correspondent for the BBC.",
    1216: "The scandal exposed widespread corruption.",
    1231: "Countless stars filled the night sky.",
    1246: "The wedding received extensive media coverage.",
    1247: "The course offers broad coverage of European history.",
    1252: "She cracked the egg into the bowl.",
    1253: "A crack appeared in the ceiling after the storm.",
    1255: "She crafted the necklace by hand.",
    1256: "Traditional crafts are taught at the village centre.",
    1257: "Students crammed for the exam the night before.",
    1262: "She had a craving for chocolate.",
    1263: "The baby crawled across the floor.",
    1274: "He crept downstairs so as not to wake anyone.",
    1282: "He is one of the film's harshest critics.",
    1283: "The theatre critic praised the performance.",
    1288: "Wheat is an important crop in this region.",
    1291: "She was cross about being kept waiting.",
    1299: "He brushed the crumbs off the table.",
    1302: "The box was crushed during delivery.",
    1303: "There was a crush of fans outside the venue.",
    1318: "The curator organised a new exhibition of modern art.",
    1325: "Science is part of the school curriculum.",
    1327: "Legend says the tomb was cursed.",
    1328: "Some believed the drought was a curse.",
    1341: "He is cynical about politicians' promises.",
    1347: "The court awarded damages to the injured worker.",
    1355: "She dashed across the road to catch the bus.",
    1356: "The report is based on data collected last year.",
    1374: "He is struggling to pay off his student debt.",
    1376: "She has lived in this house for over a decade.",
    1378: "The fallen leaves decayed on the forest floor.",
    1379: "Tooth decay can be prevented with regular brushing.",
    1380: "Standards began to decay after years of neglect.",
    1389: "The company declared a profit for the year.",
    1390: "Sales have declined since the recession.",
    1391: "She declined the invitation politely.",
    1392: "His health declined rapidly in old age.",
    1397: "She is a dedicated teacher who cares about her students.",
    1398: "From the evidence, police deduced that he had left by train.",
    1399: "Tax is deducted from your salary each month.",
    1406: "The product was recalled because of a defective battery.",
    1421: "The damage was deliberate, not accidental.",
    1422: "The jury deliberated for three hours.",
    1425: "The news delighted her parents.",
    1433: "The old factory was demolished to make way for flats.",
    1436: "Several MPs denounced the proposed law.",
    1437: "The forest was dark and dense.",
    1447: "She has two dependants living at home.",
    1452: "She made a deposit into her savings account.",
    1453: "He deposited the cheque at the bank.",
    1454: "We paid a deposit on the new car.",
    1462: "The path descends steeply towards the valley.",
    1463: "She is a descendant of Italian immigrants.",
    1472: "Many young people desire greater independence.",
    1473: "He had a strong desire to travel.",
    1479: "Our final destination was a small village in Portugal.",
    1490: "His eyesight has deteriorated over the years.",
    1493: "Tests will determine the cause of the illness.",
    1494: "High fines act as a deterrent to speeding.",
    1496: "Smoking is detrimental to your health.",
    1498: "The earthquake devastated the coastal towns.",
    1499: "The news devastated the whole family.",
    1506: "She devotes several hours a day to practice.",
    1507: "More funds should be devoted to education.",
    1512: "The doctor gave a diagnosis after the tests.",
}


def main() -> int:
    if len(BATCH6_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH6_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH6_EXAMPLES.items()):
        entry = entries[idx]
        word = entry["word"]
        old_example = entry.get("example", "")

        if not detect_placeholder(old_example):
            errors.append(f"  [{idx}] {word}: example is not a placeholder")
            continue
        if detect_placeholder(new_example):
            errors.append(f"  [{idx}] {word}: new example is still a placeholder")
            continue

        if old_example != new_example:
            changed += 1
            entry["example"] = new_example

    if errors:
        print("\nVALIDATION ERRORS:", file=sys.stderr)
        print("\n".join(errors), file=sys.stderr)
        return 1

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {changed} placeholder examples (indices {min(BATCH6_EXAMPLES)}–{max(BATCH6_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
