#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 7 (100 placeholders)."""

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

BATCH7_EXAMPLES: dict[int, str] = {
    1522: "The country was ruled by a dictator for decades.",
    1530: "It can be hard to differentiate between the two species.",
    1536: "She accepted the criticism with dignity.",
    1537: "He faced a dilemma about whether to accept the job abroad.",
    1539: "Dilute the juice with water before giving it to children.",
    1540: "Use dilute bleach when cleaning the surfaces.",
    1542: "We must consider the financial dimension of the problem.",
    1543: "Measure the length, width, and height of each dimension.",
    1544: "Public interest in the story began to diminish.",
    1545: "The scandal diminished his chances of winning the election.",
    1554: "Rent is paid by direct debit each month.",
    1572: "The company refused to disclose its sales figures.",
    1580: "It is illegal to discriminate against employees because of their age.",
    1581: "Young children can discriminate between different colours.",
    1587: "She looked at the mess with disgust.",
    1588: "The cruelty of the attack disgusted the whole community.",
    1592: "Many voters became disillusioned with the political system.",
    1602: "The border dispute lasted for many years.",
    1603: "He disputed the claim that the report was inaccurate.",
    1609: "Stir until the sugar dissolves completely.",
    1611: "She completed her degree through distance learning.",
    1615: "Can you distinguish between the two similar sounds?",
    1617: "The article distorted the facts to support its argument.",
    1621: "They live in a quiet residential district.",
    1627: "The city has a diverse population from many cultures.",
    1631: "Shareholders received a dividend at the end of the year.",
    1634: "They decided to divorce after ten years of marriage.",
    1635: "The divorce was finalised in the spring.",
    1652: "One company dominates the local market.",
    1666: "We paid a down payment on the house last month.",
    1667: "You can download the software from the website.",
    1668: "The download took only a few minutes.",
    1686: "The boat drifted slowly down the river.",
    1687: "There has been a drift towards more flexible working hours.",
    1688: "I get the drift of what you are trying to say.",
    1695: "The drought destroyed crops across the region.",
    1703: "I am dubious about the accuracy of those figures.",
    1704: "He has a dubious reputation in the industry.",
    1714: "The duration of the flight is about two hours.",
    1721: "They dwell in a small village in the mountains.",
    1723: "She works in a dynamic and fast-growing industry.",
    1752: "The new medicine proved highly effective.",
    1754: "The factory uses efficient production methods.",
    1762: "Several weeks elapsed before we heard any news.",
    1783: "The programme aims to eliminate waste in the supply chain.",
    1795: "Her grandparents emigrated from Poland in the 1950s.",
    1800: "It is easier to empathise when you have had a similar experience.",
    1824: "She endured years of pain before the operation.",
    1825: "The tradition has endured for centuries.",
    1830: "Police are responsible for enforcing the law.",
    1835: "Good lighting can enhance the appearance of a room.",
    1852: "Full-time employees are entitled to paid holiday.",
    1860: "She envied her friend's confidence on stage.",
    1861: "His success filled her with envy.",
    1870: "Solve the equation step by step.",
    1871: "There are many factors in the equation.",
    1873: "The village is equidistant from the two cities.",
    1876: "One pound is roughly equivalent to one euro.",
    1877: "The two roles are roughly equivalent in status.",
    1878: "We live in an era of rapid technological change.",
    1897: "They grew up on a housing estate outside Manchester.",
    1900: "The builder gave us an estimate for the repairs.",
    1901: "Experts estimate that costs will rise next year.",
    1903: "They promised eternal loyalty to each other.",
    1908: "Residents were evacuated when the fire spread.",
    1909: "Teachers evaluate students' progress throughout the year.",
    1921: "The landlord evicted the tenants for not paying rent.",
    1927: "Some species evolved to survive in extreme climates.",
    1928: "The company has evolved into a global brand.",
    1929: "The new policy could exacerbate existing inequalities.",
    1931: "He tends to exaggerate when telling stories.",
    1948: "The price excludes delivery charges.",
    1954: "She is a senior executive at a technology firm.",
    1956: "Students are exempt from paying council tax.",
    1963: "Riding the roller coaster was exhilarating.",
    1968: "The business plans to expand into new markets.",
    1979: "My passport expires next year.",
    1983: "The region's forests have been heavily exploited.",
    1984: "Workers complained that they were being exploited.",
    1991: "The hotel offered exquisite food and service.",
    1995: "We do not yet know the full extent of the damage.",
    1996: "To what extent do you agree with the proposal?",
    1997: "The extent of the park is about fifty hectares.",
    1999: "The university hired an external consultant.",
    2000: "Apply the cream to external areas of the skin only.",
    2009: "As an extrovert, she enjoys meeting new people.",
    2014: "The dress is made from a soft cotton fabric.",
    2031: "She has great faith in her doctor's advice.",
    2039: "Millions died during the famine.",
    2042: "Do you fancy going out for dinner tonight?",
    2051: "He has a lifelong fascination with astronomy.",
    2058: "She believed that fate had brought them together.",
    2061: "Driver fatigue is a major cause of road accidents.",
    2065: "Could you do me a favour and post this letter?",
    2066: "The committee favoured the cheaper option.",
    2067: "The manager was accused of favouring certain staff.",
    2074: "I am fed up with waiting for a reply.",
    2110: "Save the document as a PDF file.",
    2117: "She works in corporate finance.",
    2118: "The project was paid for by public finance.",
}


def main() -> int:
    if len(BATCH7_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH7_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH7_EXAMPLES.items()):
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
    print(f"Updated {changed} placeholder examples (indices {min(BATCH7_EXAMPLES)}–{max(BATCH7_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
