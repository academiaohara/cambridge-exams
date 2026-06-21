#!/usr/bin/env python3
"""Normalize B2 exam JSON to match C1 conventions (metadata, types, explanations)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "Nivel" / "B2" / "Exams"

PART_TYPES = {
    1: "multiple-choice",
    2: "open-cloze",
    3: "word-formation",
    4: "transformations",
    5: "multiple-choice-text",
    6: "gapped-text",
    7: "multiple-matching",
}

KEYWORD_EXPLANATIONS = {
    "HAVE": "Tests structures with 'have' (e.g. 'have to', causative, or perfect forms).",
    "BEEN": "Tests present perfect passive ('has/have been + past participle').",
    "SUCH": "Tests 'such + (a/an) + adjective + noun' for emphasis.",
    "USED": "Tests 'used to' or 'be/get used to' structures.",
    "ASKED": "Tests reported speech with an infinitive or question structure.",
    "NEVER": "Tests negative structures with 'never' (e.g. inversion or perfect forms).",
    "EVEN": "Tests emphasis with 'even' or comparative structures.",
    "BEING": "Tests passive or gerund forms with 'being'.",
    "FOR": "Tests purpose or duration structures with 'for'.",
    "MUST": "Tests modal structures with 'must' or deduction.",
    "DESPITE": "Tests contrast with 'despite' or 'in spite of'.",
    "TOLD": "Tests reported speech with 'tell'.",
    "HAD": "Tests past perfect or causative 'have something done'.",
    "SAID": "Tests reported speech with 'say'.",
    "MANAGED": "Tests 'manage to' for achieving something with difficulty.",
    "WOULD": "Tests conditional or habitual 'would' structures.",
    "ENOUGH": "Tests 'enough' with adjectives or nouns.",
    "WAS": "Tests passive voice with 'was/were'.",
    "STARTED": "Tests 'start/begin + -ing' or infinitive structures.",
    "GIVEN": "Tests phrasal verb 'give up' or passive with 'given'.",
    "LONG": "Tests conditional with 'as long as'.",
    "IS": "Tests cleft or emphasis structures with 'is'.",
    "KEPT": "Tests 'keep + -ing' or causative structures.",
    "WISH": "Tests 'wish' + past tense for present regrets.",
    "NEED": "Tests 'needn't have' or necessity structures.",
    "WISHES": "Tests 'wish' + past perfect for past regrets.",
    "SHOULD": "Tests 'should have' for past advice or criticism.",
    "PROVIDED": "Tests conditional with 'provided (that)'.",
    "MADE": "Tests causative 'make someone do' or passive.",
    "KNOW": "Tests 'wish' or 'if only' with past perfect.",
    "MORE": "Tests comparative structures with 'more'.",
    "MIGHT": "Tests modal perfect for past possibility.",
    "LET": "Tests causative 'let someone do'.",
    "OUGHT": "Tests 'ought to have' for past obligation.",
    "CALLED": "Tests passive with 'called/named'.",
    "AGO": "Tests time expressions with 'ago' and tense shift.",
    "TALL": "Tests superlative structures.",
    "TALLEST": "Tests superlative structures.",
    "FASTEST": "Tests superlative structures.",
    "ADMITTED": "Tests reporting verb 'admit' + -ing.",
    "DENIED": "Tests reporting verb 'deny' + -ing.",
    "REGRET": "Tests 'regret + -ing' or 'regret to'.",
    "ACCUSED": "Tests 'accuse someone of' structure.",
    "WARNED": "Tests 'warn someone (not) to'.",
    "SUGGESTED": "Tests 'suggest + -ing' or 'suggest that'.",
    "RECOMMENDED": "Tests 'recommend + -ing' or 'recommend that'.",
    "APOLOGISED": "Tests 'apologise for + -ing'.",
    "REFUSED": "Tests 'refuse to' structure.",
    "PROMISED": "Tests 'promise to' structure.",
    "ORDERED": "Tests 'order someone to' structure.",
    "FORBIDDEN": "Tests 'forbid someone to' structure.",
    "UNLESS": "Tests conditional with 'unless'.",
    "UNTIL": "Tests 'not until' inversion structures.",
    "ONLY": "Tests inversion with 'only' adverbials.",
    "HARDLY": "Tests inversion with 'hardly/scarcely'.",
    "NO": "Tests inversion with 'no sooner' or negative fronting.",
    "SO": "Tests 'so + adjective + that' structures.",
    "TOO": "Tests 'too + adjective + to' structures.",
    "RATHER": "Tests 'would rather' structures.",
    "PREFER": "Tests 'prefer + -ing' or 'prefer to'.",
    "BETTER": "Tests 'had better' for advice.",
    "SORRY": "Tests apology structures with 'sorry for' or 'wish'.",
    "POINT": "Tests 'there is no point (in)' structures.",
    "MATTER": "Tests 'it doesn't matter' structures.",
    "TIME": "Tests 'it's time' + past tense structures.",
    "SINCE": "Tests present perfect with 'since'.",
    "ALTHOUGH": "Tests concession with 'although/even though'.",
    "BECAUSE": "Tests reason clauses or 'because of'.",
    "DUE": "Tests 'due to' or 'owing to' structures.",
    "INSTEAD": "Tests 'instead of + -ing' structures.",
    "WITHOUT": "Tests 'without + -ing' structures.",
    "AFTER": "Tests 'after + -ing' or perfect structures.",
    "BEFORE": "Tests 'before + -ing' structures.",
    "WHILE": "Tests 'while + -ing' structures.",
    "BY": "Tests 'by + -ing' for method.",
    "GET": "Tests causative 'get something done'.",
    "MAKE": "Tests causative 'make someone do'.",
    "HELP": "Tests 'help someone (to) do'.",
    "ABLE": "Tests 'be able to' instead of 'can'.",
    "POSSIBLE": "Tests 'it is possible that' or impersonal structures.",
    "LIKELY": "Tests 'it is likely that' structures.",
    "UNLIKELY": "Tests 'it is unlikely that' structures.",
    "DOUBT": "Tests 'there is no doubt that' structures.",
    "SURE": "Tests 'be sure to' or certainty structures.",
    "CARE": "Tests 'take care of' or 'care about'.",
    "MIND": "Tests 'mind + -ing' structures.",
    "OBJECT": "Tests 'object to + -ing' structures.",
    "FED": "Tests 'be fed up with + -ing'.",
    "LOOK": "Tests phrasal verb 'look forward to + -ing'.",
    "PUT": "Tests phrasal verbs with 'put'.",
    "TURN": "Tests phrasal verbs with 'turn'.",
    "TAKE": "Tests phrasal verbs with 'take'.",
    "COME": "Tests phrasal verbs with 'come'.",
    "GO": "Tests phrasal verbs with 'go'.",
    "SET": "Tests phrasal verbs with 'set'.",
    "RUN": "Tests phrasal verbs with 'run'.",
    "BRING": "Tests phrasal verbs with 'bring'.",
    "CARRY": "Tests phrasal verbs with 'carry'.",
    "HAPPEN": "Tests 'happen to' or 'it happens that'.",
    "SEEM": "Tests 'seem to' or 'it seems that'.",
    "APPEAR": "Tests 'appear to' structures.",
    "SUPPOSED": "Tests 'be supposed to' structures.",
    "MEANT": "Tests 'be meant to' structures.",
    "BOUND": "Tests 'be bound to' for certainty.",
    "DARE": "Tests 'dare to' or 'daren't'.",
    "NEEDN'T": "Tests 'needn't have' vs 'didn't need to'.",
    "CAN'T": "Tests deduction with 'can't have'.",
    "MUST'VE": "Tests deduction with 'must have'.",
    "SHOULDN'T": "Tests criticism with 'shouldn't have'.",
    "COULD": "Tests ability or possibility with 'could'.",
    "WERE": "Tests second conditional or 'wish' structures.",
    "IF": "Tests conditional or 'if only' structures.",
}


def route_sample(routes: list) -> str:
    if not routes:
        return ""
    route = routes[0]
    return " ".join(filter(None, [route.get("p1", "").strip(), route.get("p2", "").strip()])).strip()


def transformation_explanation(question: dict) -> str:
    if question.get("explanation"):
        return question["explanation"]
    kw = (question.get("keyWord") or "").upper()
    if kw in KEYWORD_EXPLANATIONS:
        return KEYWORD_EXPLANATIONS[kw]
    sample = route_sample(question.get("routes") or [])
    if sample:
        return f"Complete the gap using '{kw.lower()}' (e.g. '{sample}')."
    return f"Transform the sentence using the key word '{kw}'."


def normalize_reading1(data: dict, test_name: str) -> None:
    part = 1
    content = data.setdefault("content", {})
    article_title = content.get("articleTitle") or data.get("title", "")
    if article_title and not content.get("articleTitle"):
        content["articleTitle"] = article_title
    data["id"] = f"{test_name}-reading-{part}"
    data["examId"] = test_name
    data["section"] = "reading"
    data["part"] = part
    data["type"] = PART_TYPES[part]
    data["title"] = "Reading and Use of English – Part 1"


def normalize_reading_part(data: dict, test_name: str, part: int) -> None:
    data["id"] = f"{test_name}-reading-{part}"
    data["examId"] = test_name
    data["section"] = "reading"
    data["part"] = part
    if part in PART_TYPES:
        data["type"] = PART_TYPES[part]
    if part == 4:
        data["title"] = "Reading and Use of English – Part 4"
        for q in data.get("content", {}).get("questions", []):
            q["explanation"] = transformation_explanation(q)
    elif part >= 5:
        data["title"] = f"Reading and Use of English – Part {part}"


def process_file(path: Path, test_name: str) -> bool:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    original = json.dumps(data, ensure_ascii=False, sort_keys=True)

    name = path.name
    if name == "reading1.json":
        normalize_reading1(data, test_name)
    elif re.match(r"reading[2-7]\.json", name):
        part = int(name.replace("reading", "").replace(".json", ""))
        normalize_reading_part(data, test_name, part)

    changed = json.dumps(data, ensure_ascii=False, sort_keys=True) != original
    if changed:
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return changed


def main() -> None:
    changed_files = 0
    for test_dir in sorted(ROOT.glob("Test*")):
        if not test_dir.is_dir():
            continue
        test_name = test_dir.name
        for path in sorted(test_dir.glob("reading*.json")):
            if process_file(path, test_name):
                changed_files += 1
                print("updated", path.relative_to(ROOT.parents[1]))
    print(f"Done. {changed_files} files updated.")


if __name__ == "__main__":
    main()
