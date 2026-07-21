#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 40 (entries 3900-3999).

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

BATCH40_DEFINITIONS: dict[int, str] = {
    3900: "To make a promise to do something.",
    3901: "A large amount of something.",
    3902: "To make a secret plan to do something that is wrong or mean.",
    3903: "A tool used for turning over soil.",
    3904: "To pull something off.",
    3905: "A device used to connect an appliance to electricity.",
    3906: "A sweet fruit with a smooth skin.",
    3907: "A person who fixes pipes and water systems.",
    3908: "The system of pipes used in a home to supply water.",
    3909: "To move down into something very quickly.",
    3910: "More than one.",
    3911: "Added to.",
    3912: "A dangerous illness causing the lungs to fill with liquid.",
    3913: "A part of your clothing where you can keep things.",
    3914: "A short kind of writing.",
    3915: "A person who writes verse.",
    3916: "Writing that expresses feelings in a creative way.",
    3917: "Causing a very strong feeling of sadness.",
    3918: "A specific spot or idea.",
    3919: "To show something by holding out your finger or a long thin object.",
    3920: "A substance that causes illness or death.",
    3921: "To push something quickly with your finger or a pointed object.",
    3922: "Relating to the cold places on Earth's north and south ends.",
    3923: "A long thin stick made of wood or metal that supports things.",
    3924: "People whose job is to enforce the law.",
    3925: "A rule.",
    3926: "To rub the surface of something in order to make it shine.",
    3927: "A chemical substance that you rub onto an object to make it shine.",
    3928: "To rub something in order to make it shiny.",
    3929: "Showing thoughtful and kind behavior.",
    3930: "Relating to government or politics.",
    3931: "A person involved in politics.",
    3932: "The activities associated with governing.",
    3933: "A survey in which people give their opinions about important things.",
    3934: "A substance that makes the air or water not safe for use.",
    3935: "To make air, water, or land dirty, unclean, or foul.",
    3936: "The presence of harmful substances in the environment.",
    3937: "A freshwater body that is smaller than a lake.",
    3938: "To think about something carefully.",
    3939: "To think carefully about something for a long time before reaching a decision.",
    3940: "A small horse.",
    3941: "A small body of water.",
    3942: "Not as good as it could or should be.",
    3943: "To make a sudden, short sound.",
    3944: "A snack made from heated corn kernels.",
    3945: "Liked by many people.",
    3946: "Having people living in it.",
    3947: "All the people living in an area.",
    3948: "A place where ships stop to load and unload things.",
    3949: "A painting or photograph of someone.",
    3950: "To describe something or show it in a picture.",
    3951: "To stay in one place without moving.",
    3952: "A rank or role of someone in an organization or company.",
    3953: "Good.",
    3954: "To have or own something.",
    3955: "Something that you own.",
    3956: "Something that might happen.",
    3957: "Able to be done or happen.",
    3958: "To put a letter in the mail.",
    3959: "To decide that something will not be done at the planned time but at a later time.",
    3960: "To make something happen later than planned.",
    3961: "The manner in which someone stands or sits.",
    3962: "A deep, round metal container used for cooking.",
    3963: "A situation in which you do not know what to expect but you hope that it will be good.",
    3964: "A starchy vegetable that grows underground.",
    3965: "The possibility to develop or achieve something in the future.",
    3966: "Possible or likely in the future.",
    3967: "Capable of happening but not yet actual or real.",
    3968: "A bird, such as a chicken, that is used for meat and eggs.",
    3969: "To hit something many times with a lot of force.",
    3970: "To make a liquid come out of a container.",
    3971: "The state of lacking enough money or resources.",
    3972: "A dry substance in the form of very small grains.",
    3973: "The ability to influence people or give them strong feelings.",
    3974: "Having a strong effect.",
    3975: "Without strength, ability, or authority.",
    3976: "Useful.",
    3977: "Something that is done often or regularly.",
    3978: "A doctor.",
    3979: "To express strong approval or admiration for someone or something, especially in public.",
    3980: "An expression of strong approval or admiration.",
    3981: "To show that you like someone or something.",
    3982: "To speak to God in order to ask for help or to give thanks.",
    3983: "To talk about and promote a religious idea.",
    3984: "An action that is meant to stop something bad from happening.",
    3985: "To come before something.",
    3986: "Valuable and important.",
    3987: "Exact and careful about work.",
    3988: "The person who had a job or official position before someone else.",
    3989: "From a time before written history.",
    3990: "An unreasonable opinion or feeling, especially the feeling of not liking a particular group of people.",
    3991: "Having an unreasonable opinion or feeling about someone or something, especially hatred or fear of a particular group of people.",
    3992: "Relating to something that happens before a more important event.",
    3993: "Done too early or before the proper time.",
    3994: "First in rank or importance.",
    3995: "An idea on which something is based.",
    3996: "A payment that is higher than average.",
    3997: "The act of getting ready for something.",
    3998: "To make ready for something.",
    3999: "A word that shows how a noun relates to other words in a sentence.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH40_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH40_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH40_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH40_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
