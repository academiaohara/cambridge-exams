#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 8 (entries 700-799).

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

BATCH8_DEFINITIONS: dict[int, str] = {
    700: "The act of putting a dead body into the ground.",
    701: "To use something as a source of energy.",
    702: "To suddenly break open or apart.",
    703: "To put something under the ground or under a lot of other things.",
    704: "A large vehicle that carries passengers along a fixed route.",
    705: "A woody plant that is smaller than a tree.",
    706: "The activity of buying and selling goods and services.",
    707: "Having a lot of things to do.",
    708: "Used to introduce a different idea.",
    709: "A person who sells meat.",
    710: "The most important male servant in a wealthy house.",
    711: "A soft yellow food made from cream.",
    712: "An insect with colourful wings.",
    713: "A small fastener on clothing.",
    714: "To get something by paying money for it.",
    715: "To be full of excited energy or lively activity.",
    716: "Used to show who or what did something.",
    717: "To avoid the centre of a town or city by using a road that goes around it.",
    718: "A road that goes around a town or city so traffic can avoid the centre.",
    719: "A small wooden house in a forest or camping area.",
    720: "A piece of furniture with shelves and doors.",
    721: "A thick wire used for electricity or communication.",
    722: "A restaurant where you choose your food and carry it to a table.",
    723: "A small restaurant where you can buy drinks and simple meals.",
    724: "A structure that holds an animal so it cannot leave.",
    725: "A sweet dessert made from flour, water, sugar, and eggs.",
    726: "To find an answer using mathematics.",
    727: "A chart that shows the days, weeks, and months of a year.",
    728: "A young cow.",
    729: "To say something loudly or to phone someone.",
    730: "Not getting excited or upset easily.",
    731: "A unit of heat used to measure how much energy a food will produce.",
    732: "A large animal with a long neck and one or two humps on its back.",
    733: "A piece of equipment that takes pictures.",
    734: "Something used to hide people and things by blending in.",
    735: "A place where people live in tents or simple buildings for a short time.",
    736: "A series of actions to achieve a goal.",
    737: "The grounds and buildings of a school or college.",
    738: "Shows that a person or thing has the ability to do an action.",
    739: "A man-made waterway used for travel or irrigation.",
    740: "To decide that an event or request will not happen.",
    741: "A serious disease that causes cells to grow abnormally.",
    742: "Related to a disease in which cells grow abnormally in the body.",
    743: "A person who is competing to win something such as a job.",
    744: "A stick of wax that is lit for light or heat.",
    745: "A sweet food made from sugar or chocolate.",
    746: "A long stick used to help someone walk.",
    747: "A large gun that fires heavy metal balls.",
    748: "A long, light boat with pointed ends.",
    749: "A thick piece of cloth that artists paint on.",
    750: "A narrow valley with steep walls through which a river often flows.",
    751: "A soft hat with a curved part at the front.",
    752: "Able to do something well.",
    753: "The amount of something that a container or space can hold.",
    754: "A city where a country's government is based.",
    755: "An economic system where private companies make goods for profit.",
    756: "A business person who invests in trade and industry for profit.",
    757: "The person who controls a ship or aeroplane.",
    758: "Words printed near or on a picture that explain something about it.",
    759: "A prisoner.",
    760: "To catch and hold something.",
    761: "A vehicle with four wheels used for transportation.",
    762: "A sweet, chewy treat made from sugar and milk.",
    763: "A chemical element found in coal and living things.",
    764: "A colourless gas breathed out by people and animals, or produced when things burn.",
    765: "A small piece of plastic or paper used to buy or use things.",
    766: "A stiff material made from thick paper, often used for packaging.",
    767: "The effort made to do something correctly or safely.",
    768: "A job that you do for a large part of your life.",
    769: "Giving attention to doing something correctly or safely.",
    770: "With great attention, especially to detail or safety.",
    771: "A person who takes care of very young, old, or sick people.",
    772: "Goods being sent by ship, plane, train, or truck.",
    773: "A person who builds things with wood.",
    774: "A thick, heavy, woven fabric used to cover the floor.",
    775: "One of the vehicles joined together to make a train.",
    776: "A vehicle pulled by a horse.",
    777: "An orange vegetable.",
    778: "To hold something while moving it from one place to another.",
    779: "A vehicle used for carrying things.",
    780: "A funny drawing, often in a newspaper or animated show.",
    781: "To cut into something.",
    782: "An example of a particular situation or of something happening.",
    783: "Money in the form of coins or notes.",
    784: "A place where people go to gamble.",
    785: "To throw something.",
    786: "A large building with thick walls and towers, built in the past to defend against attack.",
    787: "Relaxed and informal.",
    788: "Relaxed, informal, or not formal.",
    789: "A person killed or injured in a war or an accident.",
    790: "A small animal related to lions and tigers that is kept as a pet.",
    791: "A book or pamphlet that lists and describes products or services.",
    792: "An event that causes a lot of damage or makes many people suffer.",
    793: "To grab or get something.",
    794: "A group of things that share similar qualities.",
    795: "To provide someone with all the things they need or want.",
    796: "A small insect that looks like a worm and eats plants.",
    797: "An important, often large and beautifully built, church.",
    798: "Connected with the Christian church led by the Pope in Rome.",
    799: "Cows and bulls kept for their meat or milk.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH8_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH8_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH8_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH8_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
