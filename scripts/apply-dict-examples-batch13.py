#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 13 (100 placeholders)."""

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

BATCH13_EXAMPLES: dict[int, str] = {
    4451: "Schools must meet the special needs of all pupils.",
    4452: "Many species of bird nest in this forest.",
    4453: "There was not a speck of dust on the table.",
    4454: "Experts speculate about the causes of the crash.",
    4455: "He speculated in property and made a large profit.",
    4456: "She worked a long spell as a nurse abroad.",
    4457: "The title is printed on the spine of the book.",
    4458: "Rain spoiled our plans for a picnic.",
    4460: "The crowd burst into spontaneous applause.",
    4462: "Employees may bring their spouse to the event.",
    4464: "Do not squash the fruit when packing the bag.",
    4465: "There was a squash of people at the station entrance.",
    4466: "She squeezed the lemon into the glass.",
    4467: "Give the cloth a good squeeze to remove the water.",
    4468: "She stacked the plates on the shelf.",
    4469: "There was a stack of papers on his desk.",
    4470: "The bread had gone stale overnight.",
    4471: "The sudden noise startled the horse.",
    4472: "Education is the responsibility of the state.",
    4473: "Statistics show that crime has fallen this year.",
    4474: "Some people prefer the status quo to change.",
    4475: "Steady the ladder while I climb up.",
    4476: "Hold the camera steady when you take the photo.",
    4477: "Prices have remained steady for several months.",
    4478: "She steered the boat towards the harbour.",
    4479: "He stepped carefully over the puddle.",
    4480: "She took a step back from the edge.",
    4481: "The first step is to gather all the information.",
    4482: "Cinderella's stepmother treated her badly.",
    4483: "The steward served drinks during the flight.",
    4484: "The new shoes felt stiff and uncomfortable.",
    4485: "She did a short stint as a waitress.",
    4486: "The conversation strayed from the main topic.",
    4487: "A stray dog was wandering in the street.",
    4488: "The shelter cares for stray cats and dogs.",
    4489: "The company streamlined its production process.",
    4490: "Exercise helps strengthen your muscles.",
    4491: "She strode confidently into the room.",
    4492: "He crossed the road in one long stride.",
    4493: "Workers voted to go on strike.",
    4494: "Teachers struck for better pay and conditions.",
    4495: "We must strive to improve standards.",
    4496: "She stroked the cat gently.",
    4497: "He gave the dog a friendly stroke.",
    4499: "The bridge is an impressive steel structure.",
    4500: "She packed her stuff into a suitcase.",
    4501: "He stuffed the bag with old clothes.",
    4502: "He made a stumble over the difficult word.",
    4503: "She stumbled over her lines during the play.",
    4504: "He had a stutter as a child.",
    4505: "She stuttered when she was nervous.",
    4506: "Climate change is a difficult subject to discuss.",
    4507: "Prisoners were subjected to harsh treatment.",
    4508: "British subjects owed loyalty to the crown.",
    4509: "Art criticism is often highly subjective.",
    4510: "The rebels refused to submit to the invaders.",
    4511: "Subsequent events proved him right.",
    4512: "Water is the most common substance on Earth.",
    4513: "You can substitute honey for sugar in the recipe.",
    4514: "Margarine is a substitute for butter.",
    4515: "I watched the film with English subtitles.",
    4516: "They moved to a quiet suburban neighbourhood.",
    4517: "The successor to the CEO was announced yesterday.",
    4519: "We have sufficient food for the weekend.",
    4520: "He borrowed a large sum of money from the bank.",
    4521: "The children practised simple sums in class.",
    4522: "He was summoned to appear in court.",
    4523: "This model is superior to the older version.",
    4524: "Breaking a mirror is an old superstition.",
    4525: "She is superstitious about the number thirteen.",
    4526: "The magazine includes a travel supplement.",
    4527: "I suppose we could meet at six o'clock.",
    4529: "The film surpassed all expectations at the box office.",
    4531: "The hotel is in beautiful surroundings.",
    4532: "The charity works to sustain local communities.",
    4533: "Flip the switch to turn on the light.",
    4534: "She switched her phone for a newer model.",
    4535: "There has been a switch to online learning.",
    4536: "I sympathise with anyone who has lost their job.",
    4537: "The jacket is made from synthetic fibres.",
    4538: "The nurse used a syringe to give the injection.",
    4539: "Tabloid newspapers focus on celebrity gossip.",
    4540: "He buys a tabloid on his way to work.",
    4541: "Negotiation is an important tactic in business.",
    4542: "She has excellent taste in clothes.",
    4543: "Be careful not to tear the paper.",
    4544: "There was a tear in his shirt sleeve.",
    4545: "She learned new painting techniques at art school.",
    4546: "The meeting was long and tedious.",
    4547: "He found temporary work during the summer.",
    4548: "The smell of fresh bread was tempting.",
    4551: "She screamed in terror when she saw the snake.",
    4552: "The government condemned the use of terror.",
    4553: "I love the smooth texture of silk.",
    4554: "Your advice was timely and very helpful.",
    4555: "Here is a useful tip for saving energy.",
    4557: "We watched the trailer for the new film.",
    4558: "Technology has transformed the way we work.",
    4559: "The bottle is made of transparent plastic.",
    4560: "It later transpired that he had lied.",
}


def main() -> int:
    if len(BATCH13_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH13_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH13_EXAMPLES.items()):
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
    print(f"Updated {changed} placeholder examples (indices {min(BATCH13_EXAMPLES)}–{max(BATCH13_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
