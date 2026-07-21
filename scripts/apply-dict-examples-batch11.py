#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 11 (100 placeholders)."""

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

BATCH11_EXAMPLES: dict[int, str] = {
    3740: "A passerby called an ambulance after the accident.",
    3741: "She has a passion for classical music.",
    3749: "He patted the dog on the head.",
    3750: "She gave the child a gentle pat on the back.",
    3775: "The film's plot was rather pedestrian.",
    3778: "She took a quick peep through the keyhole.",
    3779: "The children peeped out from behind the curtain.",
    3780: "He peered closely at the small print.",
    3781: "She enjoys spending time with her peers at school.",
    3788: "He retired on a modest pension.",
    3802: "The project will take a period of six months.",
    3804: "They wore period costumes for the play.",
    3805: "The house dates from the Victorian period.",
    3806: "She is looking for a permanent job.",
    3811: "If symptoms persist, see your doctor.",
    3821: "He is pessimistic about the economy.",
    3822: "Do not be so pessimistic — things may improve.",
    3825: "Residents signed a petition against the new road.",
    3829: "The project is entering a new phase.",
    3842: "Pick a card from the deck.",
    3843: "Take your pick from the menu.",
    3848: "We walked along the pier to watch the boats.",
    3853: "She piled the books on the desk.",
    3854: "There was a pile of laundry on the chair.",
    3859: "The pilot announced that we were landing.",
    3860: "She learned to pilot a small aircraft.",
    3875: "Protesters carried placards through the streets.",
    3877: "Students who plagiarise may fail the course.",
    3885: "She put a plaster on the cut on her finger.",
    3886: "His arm was in plaster for six weeks.",
    3892: "Her explanation sounded plausible.",
    3919: "He pointed to the map on the wall.",
    3926: "She polished the silver until it shone.",
    3927: "Use furniture polish on the wooden table.",
    3939: "She pondered the offer for several days.",
    3946: "It is a densely populated area.",
    3959: "The meeting was postponed until next week.",
    3963: "We had no plan for dinner — it was pot luck.",
    3965: "The region has great potential for tourism.",
    3966: "He is a potential candidate for the job.",
    3979: "The teacher praised the students for their effort.",
    3980: "She received praise for her performance.",
    3988: "Her predecessor left the role after ten years.",
    3990: "Racial prejudice still exists in many societies.",
    3991: "We must not be prejudiced against newcomers.",
    4000: "The show used prerecorded messages between songs.",
    4001: "The doctor prescribed antibiotics for the infection.",
    4011: "I presume you have already heard the news.",
    4016: "Regular exercise can help prevent heart disease.",
    4018: "Vaccination is an important form of preventive medicine.",
    4023: "The painting is considered priceless.",
    4029: "Location is the prime factor in property prices.",
    4030: "They lived in a primitive hut without electricity.",
    4037: "You need no prior experience for this course.",
    4040: "Campaigners called for prison reform.",
    4044: "She works in the private sector as a consultant.",
    4046: "He grew up in a privileged background.",
    4064: "The prognosis for recovery is good.",
    4066: "He works as a software programmer.",
    4067: "Work on the bridge is progressing well.",
    4068: "She has made good progress this term.",
    4070: "Smoking is prohibited in all public buildings.",
    4076: "She got a promotion to senior manager.",
    4077: "The charity supports the promotion of healthy eating.",
    4078: "The company spent millions on promotion.",
    4079: "Prompt action prevented further damage.",
    4080: "Thank you for your prompt reply.",
    4088: "A large proportion of the budget goes on salaries.",
    4093: "The company was prosecuted for breaking safety laws.",
    4095: "There are good prospects for graduates in this field.",
    4106: "A provisional date has been set for the meeting.",
    4107: "The provisional results will be confirmed next week.",
    4118: "She has always worked in the public sector.",
    4129: "He punched the wall in frustration.",
    4131: "Please try to be punctual for appointments.",
    4152: "It is hard to quantify the emotional impact.",
    4156: "The ferry docked at the quay.",
    4158: "I have a query about my bill.",
    4159: "She queried the accuracy of the figures.",
    4160: "Several readers queried the author's sources.",
    4164: "Let us not quibble over minor details.",
    4178: "The party proposed radical changes to the tax system.",
    4197: "We picked a random name from the list.",
    4202: "He went into a rant about rising prices.",
    4203: "She ranted for twenty minutes about the service.",
    4210: "The crime rate has fallen this year.",
    4211: "Production increased at a faster rate.",
    4212: "Critics rate the film as one of the year's best.",
    4214: "The ratio of men to women was about two to one.",
    4215: "Families received a weekly food ration.",
    4216: "Fuel was rationed during the crisis.",
    4218: "He raved about the poor conditions in the hostel.",
    4219: "Reviewers raved about her latest novel.",
    4245: "We attended a piano recital at the concert hall.",
    4247: "I reckon we should leave before it rains.",
    4253: "The army welcomed new recruits in the spring.",
    4254: "The firm is recruiting graduates this year.",
    4255: "We recruited volunteers to help at the event.",
    4258: "The film's redeeming feature is its humour.",
    4260: "Several staff were made redundant last month.",
}


def main() -> int:
    if len(BATCH11_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH11_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH11_EXAMPLES.items()):
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
    print(f"Updated {changed} placeholder examples (indices {min(BATCH11_EXAMPLES)}–{max(BATCH11_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
