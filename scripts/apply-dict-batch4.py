#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 4 (entries 300-399).

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

BATCH4_DEFINITIONS: dict[int, str] = {
    300: "An illness that causes pain and swelling in the joints.",
    301: "A piece of writing in a newspaper or magazine.",
    302: "Able to express ideas clearly and effectively.",
    303: "An old object made by humans that is historically interesting.",
    304: "Made by humans rather than occurring naturally; not real.",
    305: "A person who creates works such as paintings, drawings, or sculptures.",
    306: "Showing creative skill or relating to creative expression.",
    307: "Used to compare things or to show the way something happens.",
    308: "To go or climb up something, such as stairs or a mountain.",
    309: "To believe that something is the cause of something else.",
    310: "The grey or black powder left when something is burned.",
    311: "Feeling upset and embarrassed because of something you have done.",
    312: "To or on one side; out of the way.",
    313: "To say or write something in order to get an answer.",
    314: "Sleeping.",
    315: "One part or feature of something.",
    316: "Something you want to achieve, or the wish to achieve it.",
    317: "To have a strong desire to achieve or do something.",
    318: "Someone who murders an important person for political reasons.",
    319: "To murder an important person for political reasons.",
    320: "A violent physical attack on someone.",
    321: "To come together in one place; to gather.",
    322: "A group of people gathered together for the same reason.",
    323: "To state firmly that something is true.",
    324: "To evaluate or judge the quality, value, or importance of something.",
    325: "A useful or valuable skill, quality, or possession.",
    326: "To give a job or task to a particular person.",
    327: "To send someone to a particular place to work.",
    328: "A task or piece of work given to someone to do.",
    329: "To adopt the ways of a new culture and become part of it.",
    330: "To help someone.",
    331: "To connect something in your mind with a person or thing.",
    332: "To believe something is true without proof or being told.",
    333: "To tell someone something confidently to make them less worried.",
    334: "A large rock that travels through space.",
    335: "To surprise someone greatly.",
    336: "The study of the stars in the belief that they influence people's lives.",
    337: "A person who travels into outer space.",
    338: "The scientific study of stars, planets, and other objects in space.",
    339: "A place where people with mental illness are cared for.",
    340: "Used to show a specific place or time.",
    341: "A person who is trained in or good at sports.",
    342: "The layer of gases surrounding the Earth.",
    343: "The smallest unit of a chemical element.",
    344: "To fasten or join one thing to another.",
    345: "To connect or fix one thing to another.",
    346: "To try to hurt or damage someone or something.",
    347: "To succeed in reaching or achieving something you want.",
    348: "An act of trying to do something, especially something difficult.",
    349: "To go to an event, place, or school.",
    350: "The act of watching, listening to, or thinking about someone or something carefully.",
    351: "A room in the space just below a house's roof.",
    352: "Clothing, especially nice or formal clothing.",
    353: "The way someone feels and thinks about things.",
    354: "A lawyer who gives people advice about the law.",
    355: "To make someone or something come nearer or become interested.",
    356: "To believe that something is the result of a particular cause or person.",
    357: "A public event where things are sold to the people who offer the most money.",
    358: "A public sale where things are sold to the highest bidder.",
    359: "Able to be heard.",
    360: "A group of people who gather to watch or listen to a performance.",
    361: "Sound, especially when recorded or broadcast.",
    362: "To officially examine the financial records of a person or business.",
    363: "A short performance to show your ability, so someone can decide if you are good enough for a role.",
    364: "A large hall or building used for public events and performances.",
    365: "The eighth month of the year.",
    366: "The sister of your mother or father, or the wife of your uncle.",
    367: "Genuine; not false or a copy of the original.",
    368: "A person who writes books, articles, or other texts.",
    369: "Reliable and based on expert knowledge.",
    370: "The power to make decisions or tell people what to do.",
    371: "To give official permission for something.",
    372: "A true account of someone's own life, written by that person.",
    373: "To use machines or computers to do work instead of people.",
    374: "Working by itself without direct human control.",
    375: "Done without conscious thought or deliberate effort.",
    376: "A car; a road vehicle for passengers.",
    377: "The freedom to govern yourself or act independently.",
    378: "The season between summer and winter when leaves fall from trees.",
    379: "Use or benefit; often in the phrase 'to no avail' meaning without success.",
    380: "Able to be obtained, used, or reached.",
    381: "A large mass of snow, ice, and rock falling suddenly down a mountain.",
    382: "A wide street, often with buildings on each side.",
    383: "Around a usual or ordinary level or standard.",
    384: "Not very good; ordinary or mediocre.",
    385: "Calculated by adding numbers together and dividing by how many there are.",
    386: "The typical amount, level, or standard for a group of people or things.",
    387: "A number calculated by adding several amounts together and dividing by how many there were.",
    388: "To try to prevent something from happening.",
    389: "To try not to go near someone or something.",
    390: "To choose not to do something in order to get a better result.",
    391: "To stay away from someone or something.",
    392: "To wait for something.",
    393: "Not sleeping; conscious.",
    394: "A prize given for doing something well.",
    395: "Knowing that something exists or is happening.",
    396: "Knowledge or understanding of a situation or fact.",
    397: "To or at a distance from a place or person.",
    398: "Extremely impressive or inspiring great admiration.",
    399: "Very bad or unpleasant.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH4_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH4_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH4_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH4_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
