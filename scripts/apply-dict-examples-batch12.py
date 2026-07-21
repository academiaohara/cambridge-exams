#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 12 (100 placeholders)."""

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

BATCH12_EXAMPLES: dict[int, str] = {
    4264: "She refined the recipe until it tasted perfect.",
    4265: "He reflected on his decision for several days.",
    4269: "The government promised to reform the health system.",
    4270: "Education reform was debated in parliament.",
    4275: "Thousands of refugees fled across the border.",
    4277: "They refurbished the old hotel before reopening it.",
    4290: "Queen Victoria reigned for more than sixty years.",
    4291: "The country prospered during his reign.",
    4292: "The experience reinforced her belief in hard work.",
    4293: "The teacher reinforced the main grammar points.",
    4294: "Steel beams were used to reinforce the bridge.",
    4296: "Fans rejoiced when the team won the championship.",
    4298: "The two problems are closely related.",
    4302: "Success is relative — it means different things to different people.",
    4306: "Please include only relevant information in your report.",
    4312: "She was reluctant to speak in front of the class.",
    4314: "Please remain seated until the plane has landed.",
    4328: "They renovated the kitchen and added new cabinets.",
    4348: "There is a strong resemblance between the sisters.",
    4351: "He resented being passed over for promotion.",
    4354: "Local people resisted the plans for a new motorway.",
    4355: "She could not resist eating another piece of cake.",
    4356: "She remained resolute despite the criticism.",
    4359: "The committee resolved to increase funding for schools.",
    4361: "The library is a useful resource for students.",
    4362: "The region is rich in natural resources.",
    4368: "Speed is restricted to thirty miles per hour here.",
    4369: "The article offers a retrospective view of the 1990s.",
    4370: "The museum held a retrospective of the painter's work.",
    4371: "The return fare to London costs twenty pounds.",
    4372: "The reviewer praised the novel in the Sunday paper.",
    4373: "She revised her opinion after hearing the evidence.",
    4374: "The author revised the manuscript several times.",
    4375: "The internet brought a revolution in communication.",
    4376: "The revolution overthrew the old regime.",
    4378: "Cattle roam freely across the hills.",
    4379: "The ball rolled down the hill.",
    4380: "The Earth rotates on its axis once every twenty-four hours.",
    4381: "Throw away any rotten fruit.",
    4382: "The service at the restaurant was rotten.",
    4383: "We booked a round trip to Edinburgh.",
    4384: "We took the scenic route along the coast.",
    4385: "The old gate was rusty and hard to open.",
    4386: "He was sacked after repeated lateness.",
    4387: "She sacrificed her free time to care for her parents.",
    4388: "Moving abroad was a huge sacrifice for the family.",
    4389: "The repair was satisfactory, though not perfect.",
    4390: "We had a satisfactory meal at the local pub.",
    4391: "Water is scarce in the desert.",
    4393: "I am sceptical about claims that sound too good to be true.",
    4394: "The film has a memorable musical score.",
    4395: "The dog scratched behind its ear.",
    4396: "Be careful not to scratch the table.",
    4397: "There was a scratch on the car door.",
    4398: "His scribble was impossible to read.",
    4399: "She scribbled a note and left it on the desk.",
    4400: "The toddler scribbled on the paper with crayons.",
    4401: "She scrubbed the floor until it was clean.",
    4402: "Give the kitchen a good scrub.",
    4403: "Strawberries are a seasonal fruit.",
    4404: "Bright colours are seasonal this year.",
    4406: "She prepared for the exam through self-study.",
    4407: "We discussed the article in a seminar.",
    4410: "The event was a complete shambles.",
    4412: "She bought shares in a technology company.",
    4413: "Public opinion has shifted on climate change.",
    4414: "There has been a shift towards remote working.",
    4415: "The jacket was made from shoddy material.",
    4417: "The sweater shrank in the wash.",
    4418: "She has three siblings — two brothers and a sister.",
    4419: "He is on sick leave until next Monday.",
    4420: "Drowsiness is a common side effect of the medicine.",
    4421: "Dark clouds are a sign of approaching rain.",
    4422: "There were simultaneous protests in several cities.",
    4423: "The stone sank to the bottom of the pond.",
    4424: "She made a quick sketch of the street scene.",
    4425: "He sketched the outline of the building.",
    4426: "The comedy show included several short sketches.",
    4427: "The car skidded on the icy road.",
    4428: "The lorry went into a skid on the wet surface.",
    4429: "The children skipped along the path.",
    4430: "The skyline was dominated by tall office blocks.",
    4431: "New York is famous for its skyscrapers.",
    4432: "Teenagers often use slang that adults do not understand.",
    4433: "'Cool' is a common example of slang.",
    4434: "The children slid down the icy path.",
    4435: "The park has a slide for young children.",
    4436: "She slipped on the wet floor and fell.",
    4437: "He smashed the plate in a fit of anger.",
    4439: "He had a smirk on his face after winning the argument.",
    4440: "She smirked when she heard the news.",
    4441: "Under the pressure, he finally snapped.",
    4442: "She snapped at him for being late again.",
    4443: "Laws help society function peacefully.",
    4444: "Ice is a solid at freezing temperatures.",
    4445: "The door felt solid and secure.",
    4447: "That is a sound approach to the problem.",
    4448: "Get some sound advice before you invest.",
    4449: "He worked there over a span of twenty years.",
    4450: "Her career spanned four decades.",
}


def main() -> int:
    if len(BATCH12_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH12_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH12_EXAMPLES.items()):
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
    print(f"Updated {changed} placeholder examples (indices {min(BATCH12_EXAMPLES)}–{max(BATCH12_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
