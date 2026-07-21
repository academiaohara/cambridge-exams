#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 28 (entries 2700-2799).

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

BATCH28_DEFINITIONS: dict[int, str] = {
    2700: "To do something with whatever is available or without planning.",
    2701: "A sudden strong feeling that you must do something.",
    2702: "Used to show location inside something.",
    2703: "Not enough or not good enough for a particular purpose.",
    2704: "Done without realizing what you are doing.",
    2705: "Not deliberate.",
    2706: "Not suitable or proper.",
    2707: "Not giving much attention to someone or something.",
    2708: "To formally begin or introduce.",
    2709: "Not able to do something.",
    2710: "What makes a person want to do something.",
    2711: "The number of times something happens.",
    2712: "An event that is usually not pleasant.",
    2713: "Feeling that you want to do something.",
    2714: "To have something as part of a group.",
    2715: "The act of making someone or something part of a larger group or set.",
    2716: "Open to all groups and people in society.",
    2717: "The money you earned from work.",
    2718: "To add something to another thing.",
    2719: "Wrong.",
    2720: "To make something larger.",
    2721: "So amazing that it is hard to believe.",
    2722: "Not believing that something is true.",
    2723: "Used to emphasize a statement.",
    2724: "The state of being free from the control of others.",
    2725: "Not controlled by something else.",
    2726: "A list of words at the end of a book that gives information.",
    2727: "To show or point out thoughts or plans.",
    2728: "Existing naturally in an environment or area.",
    2729: "Not the easiest or straightest way.",
    2730: "A single member of a group.",
    2731: "To make something happen.",
    2732: "To allow yourself to have or do something that you enjoy.",
    2733: "A protest in which workers show that they disagree with a policy of their employer, for example by striking.",
    2734: "Working hard.",
    2735: "A kind of business that produces services or things for sale.",
    2736: "A situation in which something does not change for a long time.",
    2737: "Certain to happen or cannot be avoided.",
    2738: "Well known for something bad.",
    2739: "A baby.",
    2740: "To give someone an illness.",
    2741: "To decide something is true based on other information.",
    2742: "Not as good as something else.",
    2743: "Having no limit or end.",
    2744: "To fill something up with air.",
    2745: "To cause something unpleasant.",
    2746: "To affect the way someone thinks or behaves, or affect the way something happens.",
    2747: "The effect that a person or thing has on someone's decisions, opinions, or behaviour, or on the way something happens.",
    2748: "To tell someone about something.",
    2749: "Casual and relaxed, not official.",
    2750: "Knowledge or facts about something.",
    2751: "Providing a lot of useful facts or details.",
    2752: "A collection of services needed to run a society or business.",
    2753: "The set of systems within a place or organisation that affect how well it operates, for example the telephone and transport systems in a country.",
    2754: "Very smart.",
    2755: "Using new and clever ideas.",
    2756: "Something that is part of a food dish.",
    2757: "To live in a certain place.",
    2758: "A person who lives in a certain place.",
    2759: "To take air or a smell into the lungs.",
    2760: "A natural part of something else.",
    2761: "To receive something that is passed down from a relative.",
    2762: "To stop something from developing.",
    2763: "First; at the beginning.",
    2764: "To start something.",
    2765: "A new plan or action.",
    2766: "To force a liquid into something using a needle.",
    2767: "To damage part of someone's body.",
    2768: "Damage to a part of the body.",
    2769: "A lack of fairness or justice.",
    2770: "A coloured liquid used for writing or printing.",
    2771: "A slight idea or small piece of information that tells you that something might exist or be happening.",
    2772: "Into the centre of a country, away from the coast.",
    2773: "A place where travellers can rest and eat.",
    2774: "Present from birth and not learned.",
    2775: "Located on the inside.",
    2776: "An area near the centre of a large urban area where a lot of poverty and other social problems exist.",
    2777: "A lack of experience of difficult or complex things in life.",
    2778: "Not guilty of a crime.",
    2779: "A new idea, method, piece of equipment, etc.",
    2780: "New, original, and advanced.",
    2781: "To protect someone against a disease by injecting a small amount of it so the body can fight it off.",
    2782: "Information that is entered into a computer.",
    2783: "To ask about something.",
    2784: "A small animal with six legs.",
    2785: "Unable to be separated.",
    2786: "To put something inside something else.",
    2787: "The inner part, space, or side of something.",
    2788: "A deep and accurate understanding of something.",
    2789: "To say very firmly that something must happen or be done.",
    2790: "To keep saying very firmly that something is true even when other people will not believe you.",
    2791: "To be firm in telling people what to do.",
    2792: "A condition in which a person has difficulty sleeping.",
    2793: "To look at something carefully.",
    2794: "A sudden feeling of enthusiasm or a new idea that helps you to do or create something.",
    2795: "To encourage someone by making them feel confident and eager to do something.",
    2796: "To put something in place so that it can be used.",
    2797: "A piece of art that consists of several different objects or pictures arranged to produce a particular effect.",
    2798: "An example of something.",
    2799: "A very short amount of time.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH28_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH28_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH28_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH28_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
