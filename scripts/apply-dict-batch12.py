#!/usr/bin/env python3
"""Apply hand-crafted definition rewrites for vocabulary batch 12 (entries 1100-1199).

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

BATCH12_DEFINITIONS: dict[int, str] = {
    1100: "To make someone feel unsure or uncertain.",
    1101: "To tell someone that you are happy for them.",
    1102: "To gather in one place.",
    1103: "A group of leaders in a government.",
    1104: "A word that joins together sentences or parts of a sentence.",
    1105: "To join two things together.",
    1106: "To take control of land or people using soldiers.",
    1107: "To gain control of a situation or emotion through great physical or mental effort.",
    1108: "An event by which one country takes over another country.",
    1109: "Your inner sense of what is right and wrong.",
    1110: "Working hard and being careful to do things well.",
    1111: "Aware of something.",
    1112: "Happening one after another without interruption.",
    1113: "A general agreement among a group of people.",
    1114: "Permission for something to happen.",
    1115: "To give approval for something.",
    1116: "Permission to do something.",
    1117: "A result or effect of something.",
    1118: "A result of a choice or action.",
    1119: "Happening because of a different situation.",
    1120: "Not willing to accept much change, especially in traditional values.",
    1121: "To protect something from being ruined or used completely.",
    1122: "To think about something carefully before making a decision.",
    1123: "To think about something.",
    1124: "Large in size, amount, or degree.",
    1125: "Paying attention to the needs of others.",
    1126: "To be made of certain parts or things.",
    1127: "The state of always behaving in the same way.",
    1128: "Not changing in behaviour, attitudes, or qualities.",
    1129: "To give comfort to a person who feels sad.",
    1130: "To join or bring together into one thing.",
    1131: "A secret plan that two or more people make together to do something harmful or illegal.",
    1132: "Happening a lot or all of the time.",
    1133: "Doing something on a continuous basis.",
    1134: "A document of principles for a government.",
    1135: "To limit the development of something.",
    1136: "To build something large or complicated such as a bridge or road.",
    1137: "To ask someone for help or advice.",
    1138: "An expert whose job is to give help and advice on a particular subject.",
    1139: "A senior doctor in a hospital who is an expert in a particular medical subject.",
    1140: "A senior doctor in a hospital who is an expert in a particular medical subject.",
    1141: "To eat or drink something.",
    1142: "Electrical equipment such as digital cameras that is available for the public to buy.",
    1143: "The act of using up food or drink.",
    1144: "To speak or write to someone.",
    1145: "To hold or have something inside.",
    1146: "To put dirty or harmful chemicals into something.",
    1147: "To make something dirty, polluted, or poisonous by adding chemicals, waste, or infection.",
    1148: "To think about something.",
    1149: "To think very carefully about something for a long time.",
    1150: "To consider doing something in the future.",
    1151: "Modern or relating to the present time.",
    1152: "Alive or existing at the same time as a particular event or person.",
    1153: "Someone alive at the same time as a particular event or person.",
    1154: "The feeling of having no respect for something.",
    1155: "To struggle to overcome something.",
    1156: "To be happy and not want more.",
    1157: "Happy and satisfied with your life.",
    1158: "The happiness you feel when you have everything you want and enjoy your life.",
    1159: "A game or a race.",
    1160: "The general situation in which something happens, which helps explain it.",
    1161: "The words surrounding a particular word that help to give it its meaning.",
    1162: "One of the seven large areas of land on the Earth.",
    1163: "A set of people that are part of a larger group.",
    1164: "To keep doing something.",
    1165: "A written agreement between two people.",
    1166: "To say that the opposite of what someone has said is true.",
    1167: "When two statements disagree and cannot both be true.",
    1168: "The opposite of another thing.",
    1169: "A sharp difference between two things.",
    1170: "Different from each other in a noticeable or interesting way.",
    1171: "To do something to help make something successful.",
    1172: "A dispute about something that affects many people.",
    1173: "A disagreement about a public policy or moral issue that many people feel strongly about.",
    1174: "To come together for a meeting.",
    1175: "Allowing you to do something easily or without trouble.",
    1176: "Saving you time or effort.",
    1177: "Behaviour that is considered to be common or polite.",
    1178: "Based on what is generally done or believed.",
    1179: "A talk between two or more people.",
    1180: "The act of changing something into a different state or form.",
    1181: "To change from one system, use, or method to another.",
    1182: "To change your beliefs, especially religious beliefs.",
    1183: "Someone who has changed their beliefs in an important way.",
    1184: "To communicate ideas or feelings indirectly.",
    1185: "To give official information or a formal message to someone.",
    1186: "To prove in a court of law that someone is guilty of a crime.",
    1187: "Someone who is in prison because they have committed a crime.",
    1188: "To make someone sure of something.",
    1189: "To prepare food for eating.",
    1190: "A small, sweet baked treat.",
    1191: "The activity of making food ready to eat.",
    1192: "A little bit cold, but not very cold.",
    1193: "To work with other people to achieve a result that is good for everyone involved.",
    1194: "To work with someone to achieve something that you both want.",
    1195: "To make different parts work together.",
    1196: "To deal with a difficult or stressful situation.",
    1197: "A red-brown metal often used in electric wire and pipes.",
    1198: "To make something that looks exactly like something else.",
    1199: "The hard, colourful material formed by the shells of animals.",
}


def main() -> int:
    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    if len(BATCH12_DEFINITIONS) != 100:
        print(f"Expected 100 definitions, got {len(BATCH12_DEFINITIONS)}", file=sys.stderr)
        return 1

    leaks: list[str] = []
    changed = 0
    for idx, new_def in BATCH12_DEFINITIONS.items():
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
    print(f"\nUpdated {changed} of {len(BATCH12_DEFINITIONS)} definitions in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
