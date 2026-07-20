#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 6 (entries 500-599).

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

BATCH6_DEFINITIONS: dict[int, str] = {
    500: "To curve or fold something so that it is not straight.",
    501: "Under or lower than something else.",
    502: "A person who gives money to help someone, especially for a good cause.",
    503: "Good for you; having a helpful effect.",
    504: "An advantage or good result that you get from a situation.",
    505: "Money or other help that the government gives to people in need.",
    506: "To get help or an advantage from something.",
    507: "Kind and gentle; not harmful.",
    508: "Curved or no longer straight.",
    509: "A small, soft fruit.",
    510: "Next to or at the side of someone or something.",
    511: "Better than all others.",
    512: "A book that sells in very large numbers.",
    513: "To risk money on the result of a game, race, or business.",
    514: "To be disloyal to someone who trusts you.",
    515: "Of a higher quality or more enjoyable than something else.",
    516: "To surpass someone or something in quality or achievement.",
    517: "To improve something.",
    518: "In the space that separates two things, people, or places.",
    519: "A drink, especially one other than water.",
    520: "To be careful of something or someone that is dangerous.",
    521: "Further than or outside the limits of something.",
    522: "A tendency to prefer one thing, person, or idea over another.",
    523: "Unfairly preferring one person, thing, or idea over another.",
    524: "The sacred book of the Christian religion.",
    525: "A two-wheeled vehicle that you ride by pushing pedals with your feet.",
    526: "An attempt to do or achieve something.",
    527: "Large in size or amount.",
    528: "A two-wheeled vehicle that you ride by pushing pedals with your feet.",
    529: "Able to speak two languages.",
    530: "A statement of money owed for goods or a service.",
    531: "The number 1,000,000,000; a very large amount.",
    532: "A person who has at least a billion pounds or dollars.",
    533: "A container for storing or putting things in.",
    534: "To join people together in a close relationship or shared duty.",
    535: "A device with two lenses used for seeing distant things clearly.",
    536: "Able to break down naturally without harming the environment.",
    537: "A written account of someone's life, written by another person.",
    538: "Relating to living things and the processes of life.",
    539: "The scientific study of living things.",
    540: "The regions of the Earth where living things exist, including land, water, and air.",
    541: "The use of living cells and organisms in industry and science.",
    542: "An animal with feathers and wings, usually able to fly.",
    543: "The time when a baby is born; the start of life.",
    544: "The anniversary of the day on which a person was born.",
    545: "The place where a person was born or where something began.",
    546: "A small amount or piece of something.",
    547: "The act of using your teeth to cut into something.",
    548: "Feeling angry, hurt, or upset because of something unfair.",
    549: "Very strange and unusual.",
    550: "The darkest colour; the colour of coal or night.",
    551: "A dark surface in a classroom used for writing on with chalk.",
    552: "A person who makes and repairs things made of iron.",
    553: "The flat, sharp cutting part of a knife, sword, or tool.",
    554: "To say that someone is responsible for something bad.",
    555: "Having nothing written, drawn, or printed on it.",
    556: "A large piece of cloth used to keep warm in bed.",
    557: "A powerful explosion.",
    558: "To burn brightly and strongly.",
    559: "A chemical used to make things whiter or to clean and disinfect.",
    560: "To lose blood from the body.",
    561: "A mark or spot that spoils the appearance of something.",
    562: "To mix two or more things together so they become one.",
    563: "To ask God to protect or help someone.",
    564: "Unable to see.",
    565: "To shut your eyes and quickly open them again.",
    566: "A state of complete happiness.",
    567: "A severe snowstorm with strong winds.",
    568: "To stop something from moving through or along something else.",
    569: "A solid piece of wood, stone, or ice with straight sides.",
    570: "A solid piece of wood, stone, or ice.",
    571: "A pale golden yellow colour, especially of hair.",
    572: "A person with pale golden hair.",
    573: "The red liquid that flows through the bodies of people and animals.",
    574: "To produce flowers.",
    575: "A flower or mass of flowers on a tree or bush.",
    576: "A piece of clothing like a shirt, worn by women.",
    577: "To move air, or to be moved by air.",
    578: "A sudden upsetting event that causes sadness, shock, or disappointment.",
    579: "The colour of a clear sky on a sunny day.",
    580: "Speaking in a direct and honest way, even if it upsets people.",
    581: "To make something unclear or difficult to see or remember.",
    582: "Not seen clearly; out of focus.",
    583: "A flat, thin piece of wood or other stiff material.",
    584: "A proud statement about what you or someone close to you has done or owns.",
    585: "To talk proudly about what you have done or own to impress others.",
    586: "A vehicle that travels on water.",
    587: "The whole physical structure of a person or animal.",
    588: "To heat a liquid until bubbles form and it turns to vapour.",
    589: "Brave and willing to take risks.",
    590: "A metal bar used to fasten a door or window.",
    591: "A weapon designed to explode and cause damage.",
    592: "To join two things firmly together, usually with glue.",
    593: "The way in which two surfaces are stuck together, usually with glue.",
    594: "A close connection between people or groups based on love or shared duty.",
    595: "One of the hard parts inside the body of a person or animal.",
    596: "Extra money given in addition to your usual pay.",
    597: "A set of printed pages held together inside a cover for reading.",
    598: "A shop that sells books.",
    599: "To make a loud, deep sound.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH6_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH6_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH6_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH6_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
