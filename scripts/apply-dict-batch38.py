#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 38 (entries 3700-3799).

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

BATCH38_DEFINITIONS: dict[int, str] = {
    3700: "A large, grand residence for royalty.",
    3701: "Not bright, when describing a color or thing.",
    3702: "The inner part of the hand.",
    3703: "A very thin book with a paper cover, usually given free to people.",
    3704: "A metal container used for cooking.",
    3705: "A thin, flat cake made from batter and fried.",
    3706: "To feel so nervous or afraid that one cannot think clearly.",
    3707: "To breathe quickly with short breaths.",
    3708: "A material used for writing or printing.",
    3709: "A book with a cover made of thick paper.",
    3710: "A device that helps people and things fall to the ground safely.",
    3711: "A series of things or people that come or are shown one after another.",
    3712: "The place or condition of happiness where things are perfect.",
    3713: "A true statement or real event that seems illogical.",
    3714: "A person, thing, or situation that is strange because they have features or qualities that do not normally exist together.",
    3715: "A group of sentences about a single idea.",
    3716: "At the same distance from each other along their entire length.",
    3717: "The loss of the ability to move all or part of your body.",
    3718: "The loss of the ability to move your body or a part of it, usually because of an injury or illness.",
    3719: "To express someone else's writing or speech in different words.",
    3720: "A tiny animal or plant that attaches to another animal to get food.",
    3721: "A package of things to be carried or mailed somewhere.",
    3722: "To not be angry at someone for asking a question or for making a mistake.",
    3723: "A mother or father.",
    3724: "The area for which a priest in some Christian churches is responsible.",
    3725: "A public area with grass and trees.",
    3726: "The group of people who make laws in some countries.",
    3727: "A piece or segment of something.",
    3728: "Someone who joins in a social event or competition.",
    3729: "To be active and do something.",
    3730: "A very small piece of something.",
    3731: "A single, important example from a group of things.",
    3732: "To some extent but not completely.",
    3733: "Someone that you do a particular activity with.",
    3734: "Someone that you live with and have a sexual relationship with.",
    3735: "Someone who lives or works with you as an equal.",
    3736: "A social gathering for celebration.",
    3737: "To go by or through something.",
    3738: "A narrow space that people can move through.",
    3739: "A person who rides in a car, train, or airplane.",
    3740: "Someone who is walking past a place, especially when an accident or violent event happens.",
    3741: "A strong enthusiasm or interest.",
    3742: "Not taking action to solve problems.",
    3743: "An official document used for international travel.",
    3744: "The time that has already happened.",
    3745: "A thick and smooth substance.",
    3746: "An activity that you do often for fun.",
    3747: "A minister in charge of a church congregation.",
    3748: "An area of land covered with grass for animals to use as food.",
    3749: "To touch someone gently several times with a flat hand to show that you care about them or want to make them feel better.",
    3750: "The action of gently touching someone or something several times with a flat hand.",
    3751: "To hit something softly with your hand.",
    3752: "A piece of material used to cover a hole.",
    3753: "A right to be the only person allowed to make or sell a new product.",
    3754: "A way from one place to another that people can walk along.",
    3755: "Causing feelings of pity or sadness.",
    3756: "Extreme, unacceptable, and sometimes a symptom of disease.",
    3757: "The ability to wait calmly.",
    3758: "Not becoming angry or upset easily.",
    3759: "Someone who loves, supports, and defends their country.",
    3760: "A group of people or vehicles that go through an area to make sure that it is free of trouble or danger.",
    3761: "A way in which something is done or organized.",
    3762: "To stop doing something for a while.",
    3763: "An animal's foot that has claws or soft pads.",
    3764: "To give money in exchange for goods or services.",
    3765: "Money that you give someone for goods or services.",
    3766: "A time without war.",
    3767: "The very top of a mountain.",
    3768: "A legume that grows underground and is eaten as food.",
    3769: "A sweet fruit with a green or yellow skin.",
    3770: "A hard, shiny gem found inside oysters.",
    3771: "A poor farmer.",
    3772: "A small, smooth stone.",
    3773: "To strike or bite with the beak.",
    3774: "Strange or odd.",
    3775: "Ordinary and not interesting.",
    3776: "A person who is walking on a street, especially in a town or city.",
    3777: "To remove the skin from fruits or vegetables.",
    3778: "A quick look at something.",
    3779: "To look at something quickly and secretly, usually from a place where you think you cannot be seen.",
    3780: "To look at something carefully because you are not certain what you might see.",
    3781: "Someone who is of the same age as another person.",
    3782: "A tool used for writing.",
    3783: "A punishment for breaking a rule.",
    3784: "A tool used for writing or drawing.",
    3785: "To enter into something.",
    3786: "A large piece of land that is surrounded by the sea on three sides.",
    3787: "A coin worth one cent.",
    3788: "An amount of money paid regularly to someone who no longer works because of age, illness, or retirement.",
    3789: "A regular payment to a retired person.",
    3790: "Human beings.",
    3791: "A spice with a hot taste.",
    3792: "Used to mean \"each\" when giving a price, size, or amount.",
    3793: "To be aware of something.",
    3794: "An amount that is equal to one one-hundredth of something.",
    3795: "A way of thinking about or understanding a situation.",
    3796: "Without any mistakes.",
    3797: "To do something in front of people who watch.",
    3798: "How well someone or something functions or works.",
    3799: "A pleasant-smelling liquid.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH38_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH38_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH38_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH38_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
