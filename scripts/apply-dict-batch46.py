#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 46 (entries 4500-4599).

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

BATCH46_DEFINITIONS: dict[int, str] = {
    4500: "A variety of objects or things.",
    4501: "To push something soft into a space or container.",
    4502: "A mistake while speaking.",
    4503: "To make a mistake when you are speaking.",
    4504: "A problem in speaking that causes you to repeat some particular sounds more than you should.",
    4505: "To repeat the sounds of words in an uncontrolled way when you speak because you are nervous or have a speech problem.",
    4506: "An idea, problem, situation, etc. that you discuss or write about.",
    4507: "To make someone experience something unpleasant.",
    4508: "Someone who lives in a country that is controlled by a king or queen.",
    4509: "Based on your own feelings and ideas and not on facts.",
    4510: "To accept that someone has defeated you or has power over you.",
    4511: "Happening or coming after something else.",
    4512: "A particular type of liquid, solid, or gas.",
    4513: "To remove one thing and put something else in its place.",
    4514: "Something that is used instead of something else.",
    4515: "A translation of dialogue in a foreign-language film or television programme shown at the bottom of the screen.",
    4516: "Relating to an area or town near a large city but away from its centre, where there are many houses, especially for middle-class people.",
    4517: "Someone who has a position after someone else.",
    4518: "Happening quickly and unexpectedly.",
    4519: "As much as is needed.",
    4520: "An amount of money.",
    4521: "A simple calculation.",
    4522: "To officially order someone to come to a place, especially a court of law.",
    4523: "Better than someone or something else in quality or skill.",
    4524: "A belief that things such as magic or luck have the power to affect your life.",
    4525: "Believing in the power of magic or luck.",
    4526: "A separate part of a newspaper or magazine.",
    4527: "To believe that something is probably true based on your experience, your knowledge, and any other information that you have.",
    4528: "To guess.",
    4529: "To be better or greater than something else, or better than what was expected or hoped for.",
    4530: "Feeling the way you do when something unexpected has happened.",
    4531: "All the things that are present in a place and that form the experience of being there.",
    4532: "To provide the conditions in which something can happen or exist.",
    4533: "Something such as a button or key that controls the electrical supply to a light, piece of equipment, machine, etc.",
    4534: "To replace one object with another.",
    4535: "A change from one thing to another.",
    4536: "To behave in a kind way and show that you understand someone's problems.",
    4537: "Made from artificial materials or substances, not from natural ones.",
    4538: "A needle fitted to a plastic tube, used for taking blood from your body or for putting medicine or drugs into it.",
    4539: "Relating to newspapers with fairly small pages, mostly containing stories about famous people and not much serious news.",
    4540: "A newspaper with fairly small pages, mostly containing stories about famous people and not much serious news.",
    4541: "A particular method or plan for achieving something.",
    4542: "The ability to judge if something is good or bad in things like art, fashion, and social behaviour.",
    4543: "To pull something so that it separates into pieces or gets a hole in it, or to become damaged in this way.",
    4544: "A hole in a piece of paper, cloth, etc. where it has been torn.",
    4545: "A method of doing something using a special skill that you have developed.",
    4546: "Boring and continuing for too long.",
    4547: "Existing, done, or used for only a limited period of time.",
    4548: "Used for describing something that makes you feel you would like to have it or do it.",
    4549: "Not comfortable and feeling unhappy or worried.",
    4550: "Very bad.",
    4551: "A strong feeling of fear.",
    4552: "Violence used for making people very frightened in order to achieve political aims.",
    4553: "The way something feels when you touch it.",
    4554: "Happening when most needed or appropriate.",
    4555: "A useful suggestion.",
    4556: "Completely; used to show you agree with everything just said.",
    4557: "An advertisement for a film or television programme that shows a short part of that film or programme.",
    4558: "To make someone or something completely different, usually in a way that makes them more attractive or easier to use.",
    4559: "Clear or thin enough for you to see through.",
    4560: "To happen.",
    4561: "To go to a faraway place on vacation or business.",
    4562: "A gradual change or development that produces a particular result.",
    4563: "To hit your foot on something and fall down.",
    4564: "Not very interesting, serious, or valuable.",
    4565: "The work that a teacher does when they teach a particular subject, especially to one person or a small group.",
    4566: "A lesson in which a small group of students discuss a subject with a tutor, especially at a university or college.",
    4567: "Normal, or something that usually happens.",
    4568: "Happening at the end of a process or activity.",
    4569: "As good or as bad as possible.",
    4570: "The fact that something is not known or has not been decided.",
    4571: "To make something or someone become gradually less effective, confident, or successful.",
    4572: "To know what something means or how it works.",
    4573: "Not regular in terms of size, length, quality, or quantity.",
    4574: "The same everywhere.",
    4575: "An organisation that represents the workers in a particular industry and tries to improve pay, conditions, etc.",
    4576: "Angry or violent behaviour by people who are protesting against something.",
    4577: "To begin to relax after you have been working hard or feeling nervous.",
    4578: "To send documents or programs from your computer to a larger system using the Internet.",
    4579: "Relating to towns and cities or happening there.",
    4580: "To advise someone very strongly about what action or attitude they should take.",
    4581: "A strong feeling of wanting or needing to do something.",
    4582: "To say something.",
    4583: "To make a sound.",
    4584: "A substance put into the body, usually by injection, in order to provide protection against a disease.",
    4585: "Not clear or complete.",
    4586: "Extremely large.",
    4587: "The rate at which something moves in one direction.",
    4588: "The place where an activity or event happens.",
    4589: "To treat someone in a deliberately unfair way.",
    4590: "To look at something.",
    4591: "A very small town.",
    4592: "Excellent in quality and made several years ago, especially wine.",
    4593: "Old but kept in good condition because it is interesting or attractive.",
    4594: "All of the wine produced in a particular year, or the year it was produced.",
    4595: "The period when something was produced.",
    4596: "Showing the best or most characteristic qualities of someone or something.",
    4597: "To go and spend time in another place or see another person.",
    4598: "An amount of something.",
    4599: "The amount of space something takes or can be filled with.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH46_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH46_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH46_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH46_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
