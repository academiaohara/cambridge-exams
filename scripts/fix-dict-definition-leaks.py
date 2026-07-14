#!/usr/bin/env python3
"""
Rewrite dictionary definitions flagged as strong leaks in MCQ practice mode.

Uses pattern-based rules per dictionary type, then verifies with the detector.
"""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Load detector module without package install
_spec = importlib.util.spec_from_file_location(
    "dict_leak_detector", ROOT / "scripts" / "detect-dict-definition-leaks.py"
)
_detector = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_detector)

morphological_variants = _detector.morphological_variants
detect_vocab_pattern = _detector.detect_vocab_pattern
find_matches_in_definition = _detector.find_matches_in_definition
DICTIONARIES = _detector.DICTIONARIES
word_boundary_pattern = _detector.word_boundary_pattern
entry_tier = _detector.entry_tier


def capitalize_first(text: str) -> str:
    text = text.strip()
    if not text:
        return text
    return text[0].upper() + text[1:]


def ensure_period(text: str) -> str:
    text = text.strip()
    if text and text[-1] not in ".!?":
        text += "."
    return text


def term_regex(term: str) -> str:
    return re.escape(term.strip())


def banned_tokens(term: str, base: str | None = None) -> set[str]:
    tokens: set[str] = set()
    for word in _detector.tokenize(term):
        tokens.update(morphological_variants(word))
    if base:
        for word in _detector.tokenize(base):
            tokens.update(morphological_variants(word))
    return {t for t in tokens if len(t) >= 2}


def has_strong_leak(
    definition: str, term: str, base: str | None, dict_id: str, multi_word: bool
) -> bool:
    search = [("term", term)]
    if base:
        search.append(("base", base))
    matches = find_matches_in_definition(
        definition, search, dict_id=dict_id, is_multi_word_dict=multi_word
    )
    return entry_tier(matches) == "strong"


def polish_definition(text: str) -> str:
    text = re.sub(r"\s+", " ", text.strip())
    fixes = [
        (r"\bTo to\b", "To"),
        (r"\bto to\b", "to"),
        (r"\b(is|are|was|were)\s+\1\b", r"\1"),
        (r"\bthat is is\b", "that is"),
        (r"\bwho is is\b", "who is"),
        (r"\bsomething that is is\b", "something that is"),
        (r"\bSomeone or something that is is\b", "Someone or something that is"),
        (r"\bA person who is is\b", "A person who is"),
        (r"\bWhen something is is\b", "When something is"),
    ]
    for pat, repl in fixes:
        text = re.sub(pat, repl, text, flags=re.I)
    return capitalize_first(text)


def is_broken_definition(text: str) -> bool:
    if not text or len(text.strip()) < 3:
        return True
    broken = [
        r"\bTo to\b",
        r"\bthat is is\b",
        r"\bwho is is\b",
        r"^Able to be\.\s*$",
        r"^Something is\.\s*$",
        r"\ban  effect\b",
    ]
    return any(re.search(p, text, re.I) for p in broken)


def finalize_candidate(
    candidate: str,
    term: str,
    base: str | None,
    dict_id: str,
    multi_word: bool,
    *,
    allow_strip: bool = True,
) -> str | None:
    banned = banned_tokens(term, base)
    for text in [polish_definition(candidate)]:
        if not is_broken_definition(text) and not has_strong_leak(
            text, term, base, dict_id, multi_word
        ):
            return ensure_period(text)

    if not allow_strip:
        return None

    stripped = polish_definition(strip_banned_tokens(candidate, banned))
    if (
        stripped
        and not is_broken_definition(stripped)
        and not has_strong_leak(stripped, term, base, dict_id, multi_word)
    ):
        return ensure_period(stripped)
    return None


def strip_banned_tokens(definition: str, banned: set[str]) -> str:
    result = definition
    for token in sorted(banned, key=len, reverse=True):
        result = word_boundary_pattern(token).sub(" ", result)
    result = re.sub(r"\s+", " ", result).strip()
    result = re.sub(r"\s+([,.;:])", r"\1", result)
    result = re.sub(r"^[,.;:]\s*", "", result)
    result = re.sub(r"\(\s*\)", "", result)
    return capitalize_first(result)


# ── Vocab rewrites ──────────────────────────────────────────────────────────

def rewrite_vocab_candidates(term: str, definition: str, pattern: str | None) -> list[str]:
    t = term_regex(term)
    d = definition.strip()
    p = pattern or detect_vocab_pattern(term, d) or "other"

    if p in ("uses_term", "term_word_meta"):
        return []

    rules: list[tuple[str, str]] = [
        (rf"^To\s+{t}\s+is\s+to\s+(.+)$", r"To \1"),
        (rf"^To\s+{t}\s+.+?\s+means\s+to\s+(.+)$", r"To \1"),
        (rf"^To\s+{t}\s+.+?\s+is\s+to\s+(.+)$", r"To \1"),
        (rf"^To\s+be\s+{t}\s+.+?\s+is\s+to\s+(.+)$", r"To \1"),
        (rf"^To\s+{t}\s+means\s+(.+)$", r"\1"),
        (rf"^To\s+go\s+{t}\s+.+?\s+is\s+to\s+(.+)$", r"To \1"),
        (rf"^Your\s+{t}\s+is\s+your\s+(.+)$", r"Your \1"),
        (rf"^Your\s+{t}\s+is\s+(.+)$", r"\1"),
        (rf"^Someone's\s+{t}\s+is\s+(.+)$", r"\1"),
        (rf"^{t}\s+is\s+(.+)$", r"\1"),
        (rf"^An?\s+{t}\s+is\s+(.+)$", r"\1"),
        (rf"^An?\s+{t}\s+(.+)$", r"\1"),
        (rf"^The\s+{t}\s+is\s+(.+)$", r"\1"),
        (rf"^The\s+{t}\s+of\s+(.+)$", r"The \1"),
        (rf"^{t}\s+means\s+(.+)$", r"\1"),
        (rf"^If\s+.+?,\s*(.+)$", r"\1"),
        (rf"^When\s+.+?\s+{t}\b,?\s*(.+)$", r"\1"),
        (rf"^(.+?) that is {t}\s+is\s+(.+)$", r"\2"),
        (rf"^A person who is {t}\s+is\s+(.+)$", r"\1"),
        (rf"^Someone or something that is {t}\s+is\s+(.+)$", r"\1"),
        (rf"^An action done {t}\s+is done\s+(.+)$", r"Done \1"),
        (rf"^People study {t}\s+so\s+(.+)$", r"The study of how to deal with money and finance."),
        (rf"^{t}\s+describes\s+(.+)$", r"Relating to \1"),
        (rf"^{t}\s+relates to\s+(.+)$", r"Relating to \1"),
        (rf"^You use {t}\s+to\s+(.+)$", r"Used to \1"),
        (rf"^Something\s+{t}\s+(.+)$", r"Something \1"),
        (rf"^When something happens .+?, it happens {t}\.$", r"At a later time or in the end."),
        (rf"^{t}\s+(.+)$", r"\1"),
    ]

    candidates: list[str] = []
    seen: set[str] = set()
    for pat, repl in rules:
        m = re.match(pat, d, re.I | re.S)
        if not m:
            continue
        out = ensure_period(capitalize_first(re.sub(r"\s+", " ", m.expand(repl).strip())))
        if out not in seen:
            seen.add(out)
            candidates.append(out)
    return candidates


def rewrite_vocab(term: str, definition: str, pattern: str | None) -> str | None:
    candidates = rewrite_vocab_candidates(term, definition, pattern)
    return candidates[0] if candidates else None


# ── Word formation rewrites ─────────────────────────────────────────────────

WF_IN_A_WAY = {
    "active": "with energy and involvement",
    "aggressive": "in a forceful or hostile manner",
    "analytical": "using careful logical analysis",
    "assertive": "in a confident and direct manner",
    "attractive": "in a pleasing or appealing manner",
    "conservative": "in a cautious or traditional manner",
    "creative": "in an imaginative manner",
    "decisive": "in a firm and determined manner",
    "effective": "in a successful or productive manner",
    "efficient": "in a productive manner without waste",
    "exclusive": "in a way that excludes others",
    "expensive": "in a costly manner",
    "extensive": "over a wide area or scope",
    "intensive": "in a concentrated or thorough manner",
    "interactive": "through two-way communication",
    "objective": "in an impartial and factual manner",
    "obsessive": "in an excessive and preoccupied manner",
    "offensive": "in an attacking or upsetting manner",
    "passive": "without active response or resistance",
    "playful": "in a light-hearted or fun manner",
    "progressive": "in a forward-moving or modern manner",
    "restful": "in a calm and relaxing manner",
    "selective": "in a carefully chosen manner",
    "sensitive": "in a careful or responsive manner",
    "subjective": "based on personal feelings or opinions",
}

WF_TEMPLATES: list[tuple[str, str]] = [
    (r"^in an? (\w+) way$", "way"),
    (r"^in a (\w+) manner$", "manner"),
    (r"^person who (\w+)$", "person"),
    (r"^the process of (\w+ing)$", "process"),
    (r"^the act of (\w+ing)$", "act"),
    (r"^able to be (\w+ed|adjusted)$", "able"),
    (r"^not able to be (\w+ed)$", "unable"),
    (r"^to (\w+) again$", "again"),
    (r"^something added( to .+)?$", "added"),
    (r"^the quality of being (\w+)$", "quality"),
    (r"^tendency to be (\w+)$", "tendency"),
    (r"^campaigning for (.+)$", "campaign"),
    (r"^based on (\w+)$", "based"),
    (r"^not recorded in writing$", "unwritten"),
    (r"^typed document$", "typescript"),
]


def rewrite_wf(derived: str, base: str, definition: str) -> str | None:
    d = definition.strip().rstrip(".")
    dl = d.lower()

    m = re.match(r"^in an? (\w+) way$", dl)
    if m:
        adj = m.group(1)
        phrase = WF_IN_A_WAY.get(adj)
        if phrase:
            return ensure_period(capitalize_first(phrase))

    replacements = {
        "person who edits": "Someone who prepares text for publication",
        "person who speaks": "Someone who addresses an audience",
        "person who analyses": "Someone who examines data or information in detail",
        "person who campaigns for change": "Someone who works for political or social reform",
        "to take action against": "To oppose or counter something",
        "to act in an exaggerated way": "To perform with excessive drama",
        "exaggerated acting": "Overly dramatic performance",
        "something added to a document": "An item appended to a document",
        "the process of adding something": "Combining something with something else",
        "substance added to improve something": "A compound mixed in to enhance a product",
        "able to be adjusted": "Capable of being changed to fit",
        "the process of adjusting": "Making small changes to improve fit or accuracy",
        "to adjust again": "To change something once more",
        "to appear again": "To become visible again",
        "to write again": "To produce a new written version",
        "not recorded in writing": "Existing only in spoken or informal form",
        "typed document": "A document produced on a keyboard",
        "in an offensive way": "In a manner that attacks or upsets others",
        "in a passive way": "Without active resistance or response",
        "easy to reach or enter": "Not blocked or difficult to access",
        "not easy to reach or enter": "Blocked or difficult to access",
        "the quality of being easy to reach or enter": "How open or reachable something is",
        "able to be argued": "Open to question or not certain",
        "able to be believed": "Plausible or credible",
        "able to be changed": "Capable of being modified",
    }
    if dl in replacements:
        return ensure_period(replacements[dl])

    m = re.match(r"^able to be (\w+)$", dl)
    if m:
        return ensure_period("Capable of being considered or disputed")

    if dl.startswith("not ") and base:
        rest = d[4:]
        cleaned = strip_banned_tokens(rest, banned_tokens(derived, base))
        if cleaned:
            return ensure_period("Not " + cleaned[0].lower() + cleaned[1:])

    return None


# ── Manual fixes (pv, idioms, colloc) ──────────────────────────────────────

MANUAL_BY_INDEX: dict[tuple[str, int], str] = {
    # vocab edge cases
    ("vocab", 1915): "At a later time or in the end.",
    ("vocab", 89): "Harmful, dangerous, or unfavorable in effect.",
    # phrasal verbs
    ("pv", 0): "If separate amounts form a total together, they make that total.",
    ("pv", 13): "If two people end their romantic relationship.",
    ("pv", 37): "If people each contribute money so it can be used to buy something together.",
    ("pv", 92): "If two things seem good, natural, or attractive in combination.",
    ("pv", 147): "To cause difficulties or pain for someone; if children misbehave.",
    ("pv", 162): "To get information on a subject by reading extensively.",
    ("pv", 164): "If an organisation or area becomes reduced in size, importance, or activity.",
    ("pv", 180): "If people in a group move apart so they cover a large area.",
    # idioms
    ("idioms", 17): "Worse than the usual or expected standard.",
    ("idioms", 42): "To take control or advantage over a person or situation.",
    ("idioms", 96): "Done suddenly without planning beforehand.",
    ("idioms", 135): "A large quantity of money.",
    # collocations (strong-tier only)
    ("colloc", 25): "Requires a very long time.",
    ("colloc", 30): "Respond to accusations or criticism.",
    ("colloc", 102): "Widely or firmly held views.",
    ("colloc", 122): "Having something is preferable to having nothing.",
    ("colloc", 185): "Confident about something.",
    ("colloc", 261): "Reach a decision or conclusion.",
    ("colloc", 296): "A planned sequence of events or steps.",
    ("colloc", 305): "Express sadness about something.",
    ("colloc", 412): "Place something inside or on top of something else.",
    ("colloc", 507): "Display a flag or fly a kite in the air.",
    ("colloc", 528): "Push forward with effort through something.",
    ("colloc", 557): "A very close companion.",
    ("colloc", 569): "Become sick, angry, worried, or similar.",
    ("colloc", 576): "Become deaf, grey, crazy, bad, or similar.",
    ("colloc", 680): "Of a specific type or category.",
    ("colloc", 748): "A storm involving electrical discharges and loud rumbling.",
    ("colloc", 756): "Associate one thing with another.",
    ("colloc", 896): "From a different viewpoint.",
    ("colloc", 998): "Uncertainty regarding something.",
    ("colloc", 1052): "In this or that aspect.",
    ("colloc", 1058): "Place something resting on or leaning against something.",
    ("colloc", 1060): "Take a break from activity.",
    ("colloc", 1134): "Divide among several people.",
    ("colloc", 1176): "Seem or feel insignificant.",
    ("colloc", 1238): "Have a day free from work.",
    ("colloc", 1239): "Have free time away from work.",
    ("colloc", 1240): "Not at work or college.",
    ("colloc", 1272): "Deliver or compose academic text about a subject.",
    ("colloc", 1367): "An opinion about a topic.",
    ("colloc", 1423): "Give a signal or permission.",
    ("colloc", 1484): "Think clearly.",
}


def rewrite_entry(
    dict_id: str,
    term: str,
    base: str | None,
    definition: str,
    index: int,
    multi_word: bool,
    pattern: str | None = None,
) -> str | None:
    manual = MANUAL_BY_INDEX.get((dict_id, index))
    if manual:
        return manual

    if dict_id == "vocab":
        return rewrite_vocab(term, definition, pattern)

    if dict_id == "wf":
        return rewrite_wf(term, base or "", definition)

    return None


def fix_definition(
    definition: str,
    term: str,
    base: str | None,
    dict_id: str,
    multi_word: bool,
    index: int,
    pattern: str | None = None,
) -> tuple[str, bool]:
    """Return (new_definition, changed)."""
    if not has_strong_leak(definition, term, base, dict_id, multi_word):
        return definition, False

    manual = MANUAL_BY_INDEX.get((dict_id, index))
    if manual:
        finalized = finalize_candidate(
            manual, term, base, dict_id, multi_word, allow_strip=False
        )
        if finalized:
            return finalized, True

    candidates: list[str] = []
    if dict_id == "vocab":
        candidates.extend(rewrite_vocab_candidates(term, definition, pattern))
    else:
        rewritten = rewrite_entry(
            dict_id, term, base, definition, index, multi_word, pattern
        )
        if rewritten:
            candidates.append(rewritten)

    for candidate in candidates:
        finalized = finalize_candidate(
            candidate, term, base, dict_id, multi_word, allow_strip=True
        )
        if finalized:
            return finalized, True

    finalized = finalize_candidate(
        definition, term, base, dict_id, multi_word, allow_strip=True
    )
    if finalized:
        return finalized, True

    return definition, False


def load_strong_findings() -> list[dict]:
    report = ROOT / "scripts" / "reports" / "dict-definition-leaks-strong.json"
    if not report.exists():
        raise SystemExit("Run detect-dict-definition-leaks.py first")
    return json.loads(report.read_text(encoding="utf-8"))["findings"]


def apply_fixes(dry_run: bool = False) -> dict:
    findings = load_strong_findings()
    by_dict: dict[str, list[dict]] = {}
    for f in findings:
        by_dict.setdefault(f["dictId"], []).append(f)

    stats = {
        "fixed": 0,
        "unchanged": 0,
        "stillLeaking": 0,
        "stillLeakingSamples": [],
    }

    config_by_id = {c["dictId"]: c for c in DICTIONARIES}

    for dict_id, items in by_dict.items():
        config = config_by_id[dict_id]
        path: Path = config["path"]
        data = json.loads(path.read_text(encoding="utf-8"))
        entries = data["entries"]
        term_field = config["termField"]
        def_field = config["definitionField"]
        base_field = config["baseField"]

        for item in items:
            idx = item["index"]
            entry = entries[idx]
            term = entry[term_field]
            base = entry.get(base_field, "") if base_field else None
            old_def = entry[def_field]
            new_def, changed = fix_definition(
                old_def,
                str(term),
                str(base) if base else None,
                dict_id,
                config["multiWord"],
                idx,
                item.get("vocabPattern"),
            )
            if changed:
                entry[def_field] = new_def
                stats["fixed"] += 1
            elif has_strong_leak(
                old_def, str(term), str(base) if base else None, dict_id, config["multiWord"]
            ):
                stats["stillLeaking"] += 1
                if len(stats["stillLeakingSamples"]) < 30:
                    stats["stillLeakingSamples"].append(
                        {
                            "dictId": dict_id,
                            "index": idx,
                            "term": term,
                            "definition": old_def,
                        }
                    )
            else:
                stats["unchanged"] += 1

        if not dry_run:
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    return stats


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    stats = apply_fixes(dry_run=dry_run)
    print(json.dumps(stats, indent=2, ensure_ascii=False))
    if dry_run:
        print("\n(dry run — no files written)")
    else:
        print("\nRe-run: python3 scripts/detect-dict-definition-leaks.py")
    return 0 if stats["stillLeaking"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
