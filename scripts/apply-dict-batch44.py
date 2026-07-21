#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 44 (entries 4300-4399).

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

BATCH44_DEFINITIONS: dict[int, str] = {
    4300: "The way in which two or more people behave toward each other.",
    4301: "A family member.",
    4302: "Having a particular quality when compared to something else.",
    4303: "A set of ideas about time and space developed by Albert Einstein.",
    4304: "To rest or do something enjoyable.",
    4305: "To stop holding something.",
    4306: "Important and directly connected to what is being discussed or considered.",
    4307: "Important to a certain person or situation.",
    4308: "Able to be trusted.",
    4309: "A good feeling after something bad or challenging ends.",
    4310: "A belief in a god or gods.",
    4311: "Related to or about belief in a god or gods.",
    4312: "Not willing to do something.",
    4313: "To depend on someone or something.",
    4314: "To continue to be in a particular situation or condition.",
    4315: "What is left when part of something has been taken or used.",
    4316: "To say something.",
    4317: "Worthy of attention.",
    4318: "A cure for a disease, argument, or problem.",
    4319: "To recall something from the past.",
    4320: "To tell someone to remember to do something.",
    4321: "A strong feeling of sadness and regret.",
    4322: "Distant or far away from other places.",
    4323: "To take something away.",
    4324: "A period of renewed interest in art and learning in Europe between the 14th and 17th centuries.",
    4325: "To cause something to become a particular way.",
    4326: "To make new again.",
    4327: "To repair a building or to build new structures on it.",
    4328: "To make something old look new again by repairing and improving it.",
    4329: "The quality of being well known due to having done good things.",
    4330: "The money people pay to live in a certain place.",
    4331: "To fix something.",
    4332: "To pay back or to reward someone or something.",
    4333: "To say or do again.",
    4334: "Done or said many times in the same way and becoming boring.",
    4335: "To put something in the place of something else.",
    4336: "To make something full or complete again.",
    4337: "To answer.",
    4338: "Something someone writes for school or work.",
    4339: "To speak or act for a person or group.",
    4340: "To make something exactly how someone else did it.",
    4341: "A cold-blooded animal that lays eggs and has skin covered with scales.",
    4342: "A country without a king or queen.",
    4343: "The opinion that people have about someone.",
    4344: "To ask for something.",
    4345: "To say that something is necessary or must be done.",
    4346: "To save someone from danger.",
    4347: "Close and careful study to discover new things.",
    4348: "The state of being similar to another person or thing, especially in appearance.",
    4349: "To look or be like someone or something else.",
    4350: "To feel bitter or angry about something, especially because you think it is unfair.",
    4351: "To feel bitter or angry about something, especially because you think it is unfair.",
    4352: "To keep something for a particular person, purpose, or time.",
    4353: "To quit a job.",
    4354: "To oppose or fight against someone or something.",
    4355: "To stop yourself from doing something that you would very much like to do.",
    4356: "Showing determination and purpose.",
    4357: "A personal decision.",
    4358: "To find a solution.",
    4359: "To make a formal decision, usually after a discussion and a vote at a meeting.",
    4360: "To turn to something, especially something bad, in order to solve a problem.",
    4361: "Something you can use to help you achieve something, especially in your work or study.",
    4362: "Things such as coal, trees, and oil that exist in nature and can be used by people.",
    4363: "Clever at using what is available to solve problems.",
    4364: "To admire or have a high opinion of someone.",
    4365: "Belonging or relating separately to each of the people or things just mentioned.",
    4366: "To give an answer to what someone else said.",
    4367: "The answer to a question.",
    4368: "To keep something within strict limits.",
    4369: "Relating to or considering things that happened in the past.",
    4370: "An exhibition that includes examples of a particular artist's work from their whole career.",
    4371: "The money you pay for a journey to and from a place.",
    4372: "Someone whose job is to write articles in a newspaper or magazine giving their opinion about a new play, book, art exhibition, etc.",
    4373: "To change your opinion or judgment of someone or something.",
    4374: "To change, improve, or make additions to something such as a book, law, or piece of writing.",
    4375: "A sudden or major change, especially in ideas or methods.",
    4376: "A situation in which people completely change their government or political system, usually by force.",
    4377: "A formal custom that people do regularly.",
    4378: "To move or travel with no particular purpose.",
    4379: "To move forward while turning over and over.",
    4380: "To move in a circle around a fixed central point, or to move something in this way.",
    4381: "Decayed and no longer good to eat or use.",
    4382: "Of a low quality, standard, or ability.",
    4383: "An occasion when you go somewhere and come back to your starting point again.",
    4384: "The roads or paths that you use when you go from one place to another.",
    4385: "Covered with reddish-brown corrosion on the surface.",
    4386: "To tell someone they can no longer work at their job.",
    4387: "To give up something important or valuable so that you or other people can do or have something else.",
    4388: "The act of giving up something important or valuable so that you or other people can do or have something else.",
    4389: "Good enough to be accepted in a particular situation.",
    4390: "Enjoyable and pleasing.",
    4391: "Not existing in large enough amounts.",
    4392: "To make someone feel afraid.",
    4393: "Having doubts about something that other people think is true or right.",
    4394: "The written music for a film, play, or similar performance.",
    4395: "To pull your nails along your skin, especially because you have an itch.",
    4396: "To damage a surface by marking it with something sharp or rough.",
    4397: "A thin mark on a surface.",
    4398: "Untidy writing or something written in an untidy way.",
    4399: "To write something quickly and carelessly.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH44_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH44_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH44_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH44_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
