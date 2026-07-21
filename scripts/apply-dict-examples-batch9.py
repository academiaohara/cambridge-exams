#!/usr/bin/env python3
"""Apply hand-crafted example rewrites for vocabulary batch 9 (100 placeholders)."""

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

BATCH9_EXAMPLES: dict[int, str] = {
    2663: "His handwriting was almost illegible.",
    2672: "There is a growing imbalance between supply and demand.",
    2675: "The project required an immense amount of work.",
    2676: "Many immigrants settled in the city after the war.",
    2678: "Immigration has changed the makeup of the population.",
    2682: "She grew impatient waiting for the delayed train.",
    2694: "The government imposed new taxes on imports.",
    2701: "On impulse, she bought a ticket to Paris.",
    2703: "The report was criticized as inadequate.",
    2705: "The error was inadvertent, not deliberate.",
    2707: "The teacher scolded the inattentive students.",
    2713: "I am inclined to agree with your suggestion.",
    2732: "She indulged in a long hot bath after work.",
    2733: "Workers voted for industrial action over pay.",
    2736: "Political inertia blocked reform for years.",
    2742: "The cheaper product was clearly inferior in quality.",
    2746: "Her parents strongly influenced her career choice.",
    2747: "Social media has a huge influence on young people.",
    2753: "The country needs better transport infrastructure.",
    2755: "It was an ingenious solution to a difficult problem.",
    2771: "She had no inkling that she was about to be promoted.",
    2776: "Schools in the inner city face many challenges.",
    2779: "The company is known for technological innovation.",
    2780: "They use innovative methods in their teaching.",
    2781: "Children are inoculated against several diseases.",
    2789: "He insisted on paying for dinner.",
    2790: "She insisted that she had told the truth.",
    2794: "The landscape provided inspiration for her paintings.",
    2797: "The gallery featured a large installation of lights and mirrors.",
    2800: "The response was almost instantaneous.",
    2802: "Birds migrate by instinct.",
    2804: "She works for a financial institution.",
    2810: "He was instrumental in securing the deal.",
    2813: "You should take out travel insurance before you go abroad.",
    2817: "Trust is integral to any good relationship.",
    2819: "The programme helps refugees integrate into society.",
    2822: "Chess is a highly intellectual game.",
    2823: "They enjoyed an intellectual discussion over dinner.",
    2824: "The conference attracted leading intellectuals.",
    2826: "She is an intelligent and thoughtful student.",
    2830: "The intensity of the storm surprised everyone.",
    2831: "She took an intensive language course in Madrid.",
    2837: "You will pay interest on the loan.",
    2839: "Please do not interfere in my personal affairs.",
    2840: "An interim manager was appointed until a permanent one was found.",
    2841: "In the interim, costs continued to rise.",
    2843: "This route is suitable for intermediate cyclists.",
    2844: "She is taking an intermediate English class.",
    2845: "The doctor examined her internal injuries.",
    2850: "There was a long interval between the two meetings.",
    2851: "We had drinks during the interval at the theatre.",
    2853: "The teacher intervened to stop the argument.",
    2856: "They have been intimate friends for years.",
    2857: "She shared intimate details of her childhood.",
    2859: "Bullies tried to intimidate the younger pupils.",
    2864: "As an introvert, he prefers quiet evenings at home.",
    2865: "Her intuition told her that something was wrong.",
    2868: "Your advice has been invaluable to me.",
    2875: "Property can be a good long-term investment.",
    2876: "Investment in education benefits the whole economy.",
    2880: "The job involves a lot of travel.",
    2886: "The cream caused mild skin irritation.",
    2901: "Medical jargon can be hard for patients to understand.",
    2907: "It took two days to recover from jet lag.",
    2910: "After three flat tyres, he felt jinxed.",
    2912: "She jogs in the park every morning.",
    2913: "He went for a short jog before breakfast.",
    2916: "They made a joint decision about the budget.",
    2933: "How can you justify such a high price?",
    2965: "She is very knowledgeable about local history.",
    2967: "Check the label for washing instructions.",
    2968: "Critics labelled the policy a failure.",
    2969: "He rejected the lazy label of troublemaker.",
    2989: "A momentary lapse of concentration caused the mistake.",
    2990: "There was a lapse of several years between the two visits.",
    2991: "Conversation lapsed into an awkward silence.",
    2992: "His membership lapsed after he stopped paying fees.",
    2996: "The meeting lasted about an hour.",
    3018: "The cat leapt onto the wall.",
    3019: "With one leap she cleared the fence.",
    3026: "She is on maternity leave until the autumn.",
    3027: "We attended a lecture on climate change.",
    3028: "He lectures in economics at the university.",
    3036: "New legislation was passed on data protection.",
    3039: "There was very little legroom on the budget flight.",
    3052: "The prisoners were liberated when the war ended.",
    3062: "They enjoy a healthy outdoor lifestyle.",
    3063: "She spent a lifetime working as a nurse.",
    3064: "The battery has a lifetime of about ten years.",
    3069: "There is a strong likelihood of rain tomorrow.",
    3071: "Critics likened the film to a modern fairy tale.",
    3073: "She has a liking for spicy food.",
    3078: "The actor forgot his lines during the performance.",
    3079: "The two cases are closely linked.",
    3080: "Researchers linked the disease to poor diet.",
    3081: "There is a clear link between smoking and illness.",
    3084: "Water is a liquid at room temperature.",
    3085: "Stir until the mixture becomes liquid.",
    3089: "In its literal sense, the word means exactly that.",
    3100: "Workers loaded the truck with boxes.",
}


def main() -> int:
    if len(BATCH9_EXAMPLES) != 100:
        print(f"Expected 100 examples, got {len(BATCH9_EXAMPLES)}", file=sys.stderr)
        return 1

    path = ROOT / "data" / "vocabulary" / "dictionary.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data["entries"]

    errors: list[str] = []
    changed = 0
    for idx, new_example in sorted(BATCH9_EXAMPLES.items()):
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
    print(f"Updated {changed} placeholder examples (indices {min(BATCH9_EXAMPLES)}–{max(BATCH9_EXAMPLES)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
