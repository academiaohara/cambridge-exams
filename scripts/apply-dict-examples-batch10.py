#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 10 (100 placeholders)."""

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

BATCH10_EXAMPLES: dict[int, str] = {
    3101: "The truck was carrying a heavy load of timber.",
    3116: "They have had a long-standing friendship since school.",
    3134: "She always carries a lucky charm in her bag.",
    3137: "He found a lump of coal in the fireplace.",
    3138: "Do not lump all teenagers together as troublemakers.",
    3139: "He received a lump sum when he retired.",
    3147: "I could not understand the lyrics of the song.",
    3158: "We did not realise the magnitude of the problem.",
    3164: "The idea moved from the margins into the mainstream.",
    3165: "Mainstream media covered the story extensively.",
    3166: "It is hard to maintain a healthy diet while travelling.",
    3169: "She played a major role in the success of the project.",
    3185: "The party published its election manifesto last week.",
    3187: "Good manners include saying please and thank you.",
    3188: "The pilot performed a difficult manoeuvre in the air.",
    3189: "She manoeuvred the car into a tight parking space.",
    3192: "Read the manual before using the machine.",
    3193: "The factory still uses manual labour for some tasks.",
    3199: "Soldiers marched through the town centre.",
    3200: "The march lasted for more than an hour.",
    3208: "She works in marketing for a technology company.",
    3213: "A mass of people gathered in the square.",
    3214: "The mass of the object was measured in kilograms.",
    3216: "It took years to master the violin.",
    3217: "In the story, the cruel master treated his servants badly.",
    3218: "The painting is considered the artist's masterpiece.",
    3225: "He matured a lot during his time at university.",
    3226: "She gave a mature response to the criticism.",
    3232: "They survived on a meagre income.",
    3235: "We meandered along the river path without hurrying.",
    3250: "The film received mediocre reviews.",
    3269: "The two banks merged to form a larger company.",
    3291: "Swallows migrate south for the winter.",
    3298: "The city celebrated the new millennium with fireworks.",
    3305: "The region is rich in minerals such as copper and gold.",
    3310: "The minister announced new education policies.",
    3312: "It was only a minor injury, nothing serious.",
    3316: "There were minute traces of chemicals in the water.",
    3324: "Apart from a small mishap, the trip went well.",
    3332: "I am tired of listening to his moans about the weather.",
    3333: "A low moan came from the injured man.",
    3334: "Stop moaning and help with the washing up.",
    3335: "She moaned softly when the doctor touched her shoulder.",
    3339: "It is cruel to mock someone because of their accent.",
    3340: "Students sat mock exams before the real ones.",
    3346: "They modified the design to reduce costs.",
    3353: "The monarch addressed the nation on television.",
    3373: "They took out a mortgage to buy their first home.",
    3382: "Police are investigating the motive for the attack.",
    3385: "The clay was moulded into the shape of a bowl.",
    3386: "Pour the mixture into the mould and leave it to set.",
    3402: "She works for a large multinational corporation.",
    3403: "The company has a multinational workforce.",
    3404: "The crash caused multiple injuries.",
    3405: "Twelve is a multiple of three.",
    3408: "His mumble was impossible to understand.",
    3409: "He mumbled an apology and walked away.",
    3410: "I am tired of mundane office tasks.",
    3412: "She answered in a murmur so quiet I barely heard her.",
    3413: "The murmur of voices came from the next room.",
    3414: "He murmured something under his breath.",
    3422: "The virus can mutate and become more dangerous.",
    3423: "They have mutual respect for each other.",
    3436: "The earthquake was the worst natural disaster in decades.",
    3443: "It was naive to trust him without checking the facts.",
    3458: "The report criticized the neglect of elderly patients.",
    3459: "He was accused of neglecting his duties as a parent.",
    3462: "The union negotiated a pay rise with management.",
    3470: "All the office computers are networked together.",
    3471: "The company has a secure computer network.",
    3511: "I have no notion of what you mean.",
    3516: "They tried a novel approach to teaching maths.",
    3517: "The novelist signed copies of her latest book.",
    3523: "The country is debating nuclear energy policy.",
    3525: "My fingers were numb with cold.",
    3526: "She felt numb with shock after hearing the news.",
    3531: "Her grandmother moved into a nursing home last year.",
    3549: "He is obsessed with fitness and trains every day.",
    3551: "Floppy disks are now almost obsolete.",
    3558: "Rebel forces occupied the city for several weeks.",
    3563: "The odds of winning the lottery are very low.",
    3574: "You can edit the document offline and upload it later.",
    3575: "The app works offline without an internet connection.",
    3590: "Most banking is now done online.",
    3591: "She found the recipe online.",
    3595: "The glass was dirty and almost opaque.",
    3608: "She is optimistic about finding a job soon.",
    3609: "Their forecasts may be overly optimistic.",
    3610: "Find the optimum temperature for growing the plants.",
    3611: "Eight hours of sleep is the optimum for many adults.",
    3613: "Attendance at the extra class is optional.",
    3646: "Our team was outclassed in the final.",
    3669: "He went into overdraft after paying the bills.",
    3670: "The library book is overdue and must be returned.",
    3703: "The clinic handed out pamphlets on healthy eating.",
    3709: "I prefer paperbacks because they are lighter to carry.",
    3714: "It is a paradox that the busiest people often have the most free time.",
    3718: "The injury caused temporary paralysis in his leg.",
    3733: "She chose a partner for the dance competition.",
    3734: "He lives with his partner in a flat near the station.",
}


def main() -> int:
    if len(BATCH10_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH10_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH10_EXAMPLES.items()):
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
    print(f"Updated {changed} placeholder examples (indices {min(BATCH10_EXAMPLES)}–{max(BATCH10_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
