#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 5 (100 placeholders).

First mega-batch: next 100 remaining placeholder examples (indices 416–1110).
"""

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

BATCH5_EXAMPLES: dict[int, str] = {
    416: "The instructions baffled even the experienced engineers.",
    452: "She baked a batch of cookies for the school sale.",
    453: "The documents were batched together for processing.",
    467: "She couldn't bear to watch the sad film.",
    488: "The teacher praised the children's good behaviour.",
    504: "Regular exercise has many health benefits.",
    505: "She claimed unemployment benefit after losing her job.",
    506: "Students benefit from small class sizes.",
    507: "The doctor said the tumour was benign.",
    512: "The novel became an instant bestseller.",
    516: "This year's results bettered last year's record.",
    517: "He tried to better his previous score.",
    523: "The article was biased towards one political party.",
    561: "There was a small blemish on the apple's skin.",
    568: "Falling rocks blocked the mountain road.",
    569: "The children played with wooden blocks.",
    578: "Losing the final was a terrible blow for the team.",
    580: "He was blunt about the company's poor performance.",
    584: "His boast about his salary annoyed his colleagues.",
    585: "She boasted about her exam results.",
    592: "Glue was used to bond the two pieces of wood.",
    593: "The bond between the tiles had weakened over time.",
    594: "A strong bond formed between the teammates.",
    614: "The ball bounced off the wall.",
    636: "Scientists made a breakthrough in cancer research.",
    651: "The old bones were dry and brittle.",
    653: "Most homes in the area now have broadband access.",
    654: "They upgraded to a faster broadband connection.",
    655: "We watched the live broadcast of the match.",
    656: "The concert will be broadcast on national radio.",
    657: "News of the decision was broadcast across the company.",
    681: "They moved from a rural village to a built-up area.",
    683: "Sugar is often cheaper when bought in bulk.",
    684: "The bulk of the work was completed by Friday.",
    685: "The ship carried a huge bulk of raw materials.",
    686: "The store sells rice and pasta in bulk.",
    690: "Older boys used to bully him at school.",
    691: "The headteacher spoke to the bully after the incident.",
    698: "Getting a visa involved a lot of bureaucracy.",
    717: "We bypassed the town centre to avoid traffic.",
    718: "Take the bypass if the main road is closed.",
    758: "The photo had a caption explaining the scene.",
    772: "The ship was carrying cargo to several ports.",
    775: "We found seats in the last carriage of the train.",
    787: "The dress code for the party is casual.",
    792: "The flood was an economic catastrophe for the region.",
    800: "Smoking can cause serious health problems.",
    801: "Investigators are still looking for the cause of the fire.",
    820: "The castle was built in the twelfth century.",
    838: "Chaos broke out when the concert was cancelled.",
    846: "She volunteers for a local children's charity.",
    850: "They chartered a boat for the fishing trip.",
    855: "The scandal cheapened his reputation.",
    877: "He chipped a tooth while eating nuts.",
    878: "There was a chip in the edge of the plate.",
    892: "List the events in chronological order.",
    894: "She let out a quiet chuckle at the joke.",
    895: "He chuckled when he read the funny message.",
    907: "She became a citizen after ten years in the country.",
    915: "The children clambered over the rocks to the beach.",
    917: "The manager provided clarification on the new policy.",
    920: "He comes from a working-class background.",
    932: "She clenched her fists in frustration.",
    935: "Click the icon to open the file.",
    957: "He clutched his bag tightly on the crowded bus.",
    968: "Different communities coexist peacefully in the city.",
    973: "She gave a clear and coherent explanation.",
    977: "We met by coincidence at the airport.",
    981: "A colleague covered my meetings while I was ill.",
    985: "The rare stamp is a real collector's item.",
    993: "She writes as a columnist for a national newspaper.",
    1001: "The chair offered little comfort after hours of walking.",
    1002: "Her words brought him some comfort.",
    1003: "They lived in comfort in a large house.",
    1004: "She comforted her friend after the loss.",
    1008: "The officer commanded the soldiers to stand at attention.",
    1009: "He gave the command to begin the drill.",
    1024: "The local community raised money for the new park.",
    1025: "She commutes to London every day by train.",
    1026: "Snow had compacted into a hard layer on the road.",
    1027: "They stayed in a compact flat in the city centre.",
    1028: "The dog was a loyal companion on long walks.",
    1037: "The software is compatible with both systems.",
    1040: "He received compensation for the injury at work.",
    1051: "The instructions were too complex for beginners.",
    1061: "The committee comprises twelve members.",
    1062: "Both sides agreed to compromise on the terms.",
    1063: "They reached a compromise after long negotiations.",
    1064: "School attendance is compulsory until age sixteen.",
    1070: "Please concentrate while I explain the rules.",
    1072: "Boiling the sauce will concentrate the flavour.",
    1085: "The referee warned him about his conduct on the pitch.",
    1086: "The university will conduct a full investigation.",
    1095: "There was conflict between the two departments.",
    1096: "His account conflicted with the evidence.",
    1098: "She confronted the problem head-on.",
    1099: "The protester confronted the police officer.",
    1106: "The army conquered the city after a long siege.",
    1107: "It took years to conquer her fear of flying.",
    1110: "She is a conscientious worker who never misses a deadline.",
}


def main() -> int:
    if len(BATCH5_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH5_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH5_EXAMPLES.items()):
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
    print(f"Updated {changed} placeholder examples (indices {min(BATCH5_EXAMPLES)}–{max(BATCH5_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
