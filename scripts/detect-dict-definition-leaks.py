#!/usr/bin/env python3
"""
Detect dictionary entries whose definition contains the term being defined
(or its base word / significant words), which breaks MCQ practice mode.

Read-only: does not modify dictionary JSON files.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_DIR = ROOT / "scripts" / "reports"
REPORT_JSON = REPORT_DIR / "dict-definition-leaks.json"
REPORT_CSV = REPORT_DIR / "dict-definition-leaks.csv"

DICTIONARIES = [
    {
        "dictId": "vocab",
        "path": ROOT / "data" / "vocabulary" / "dictionary.json",
        "termField": "word",
        "definitionField": "definition",
        "baseField": None,
        "multiWord": False,
    },
    {
        "dictId": "wf",
        "path": ROOT / "data" / "word-formation" / "dictionary.json",
        "termField": "derived",
        "definitionField": "definition",
        "baseField": "base",
        "multiWord": False,
    },
    {
        "dictId": "pv",
        "path": ROOT / "data" / "phrasal-verbs" / "dictionary.json",
        "termField": "verb",
        "definitionField": "definition",
        "baseField": None,
        "multiWord": True,
    },
    {
        "dictId": "idioms",
        "path": ROOT / "data" / "idioms" / "dictionary.json",
        "termField": "idiom",
        "definitionField": "definition",
        "baseField": None,
        "multiWord": True,
    },
    {
        "dictId": "colloc",
        "path": ROOT / "data" / "collocations" / "dictionary.json",
        "termField": "phrase",
        "definitionField": "definition",
        "baseField": "word",
        "multiWord": True,
    },
]

STOPWORDS = frozenset(
    """
    a an the to of in on at by for with from as is are was were be been being
    have has had do does did will would could should may might must shall can
    and or but if so than that this these those it its he she they we you i
    my your his her their our not no up out off down over under about into
    through during before after above below between among all any some both
    each few more most other such only own same too very just also when where
    why how what which who whom whose one's one's smth sth something someone
    somebody anyone anything somewhere
    """.split()
)

# Placeholders / noise in collocation phrases
PHRASE_NOISE = re.compile(
    r"\b(smth|sth|something|someone|somebody)\b", re.IGNORECASE
)
PAREN_OPTIONAL = re.compile(r"\([^)]*\)")
SLASH_ALTS = re.compile(r"/")


def normalize_text(text: str) -> str:
    text = text.lower()
    text = PAREN_OPTIONAL.sub(" ", text)
    text = PHRASE_NOISE.sub(" ", text)
    text = re.sub(r"[^\w\s'-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> list[str]:
    return [t for t in normalize_text(text).split() if t]


def morphological_variants(word: str) -> set[str]:
    """Simple English morphological variants for leak detection."""
    w = word.lower().strip()
    if not w or len(w) < 2:
        return {w} if w else set()

    variants: set[str] = {w}

    def add(form: str) -> None:
        if len(form) >= 2:
            variants.add(form)

    # Forward: add common inflections
    add(w + "s")
    add(w + "es")
    add(w + "ed")
    add(w + "ing")
    add(w + "ly")
    add(w + "er")
    add(w + "est")
    add(w + "ness")
    add(w + "ment")
    add(w + "ion")
    add(w + "ity")
    add(w + "able")
    add(w + "ible")

    if w.endswith("e") and len(w) > 3:
        stem = w[:-1]
        add(stem + "ing")
        add(stem + "ed")
        add(stem + "s")
        add(stem + "ion")
        add(stem + "ive")
        add(stem + "able")

    if w.endswith("y") and len(w) > 3 and w[-2] not in "aeiou":
        stem = w[:-1]
        add(stem + "ies")
        add(stem + "ied")
        add(stem + "iness")

    if re.search(r"[bcdfghjklmnpqrstvwxyz]$", w) and len(w) >= 3:
        add(w + w[-1] + "ing")
        add(w + w[-1] + "ed")

    # Backward: strip common suffixes to catch definitional reuse
    suffix_rules = [
        ("ingly", 5),
        ("ingly", 4),
        ("ness", 4),
        ("ment", 4),
        ("able", 4),
        ("ible", 4),
        ("tion", 4),
        ("sion", 4),
        ("ity", 3),
        ("ing", 3),
        ("ied", 3),
        ("ies", 3),
        ("ed", 2),
        ("es", 2),
        ("ly", 2),
        ("er", 2),
        ("est", 3),
        ("s", 1),
    ]
    for suffix, min_stem in suffix_rules:
        if w.endswith(suffix) and len(w) > min_stem + 1:
            stem = w[: -len(suffix)]
            add(stem)
            if suffix == "ing" and not stem.endswith("e"):
                add(stem + "e")
            if suffix in ("ed", "ing") and len(stem) >= 2:
                add(stem + stem[-1])  # doubled consonant stem

    return {v for v in variants if len(v) >= 2}


def word_boundary_pattern(word: str) -> re.Pattern[str]:
    escaped = re.escape(word.lower())
    return re.compile(rf"(?<![\w'-]){escaped}(?![\w'-])", re.IGNORECASE)


def find_matches_in_definition(
    definition: str, search_terms: list[tuple[str, str]]
) -> list[dict]:
    """
    search_terms: list of (label, raw_term) e.g. [('term', 'absence'), ('base', 'act')]
    Returns list of match records.
    """
    if not definition or not definition.strip():
        return []

    def_norm = normalize_text(definition)
    matches: list[dict] = []

    for label, raw_term in search_terms:
        if not raw_term or not str(raw_term).strip():
            continue

        raw = str(raw_term).strip()

        # Full phrase match (multi-word terms)
        phrase_variants = set()
        base_phrase = normalize_text(raw)
        if base_phrase and " " in base_phrase:
            phrase_variants.add(base_phrase)
            # Slash alternatives: "partly mainly all about" -> individual chunks
            if "/" in raw.lower():
                parts = [normalize_text(p) for p in SLASH_ALTS.split(raw)]
                phrase_variants.update(p for p in parts if p and " " not in p)
                phrase_variants.update(p for p in parts if p)

        for phrase in phrase_variants:
            if len(phrase) < 4:
                continue
            pat = word_boundary_pattern(phrase)
            m = pat.search(def_norm)
            if m:
                matches.append(
                    {
                        "matchType": f"{label}_phrase",
                        "matchedText": m.group(0),
                        "sourceTerm": raw,
                        "label": label,
                    }
                )

        # Per-word matching with morphology
        words = tokenize(raw)
        significant = [w for w in words if w not in STOPWORDS and len(w) >= 2]
        if not significant and len(words) == 1:
            significant = words

        for word in significant:
            for variant in morphological_variants(word):
                pat = word_boundary_pattern(variant)
                m = pat.search(def_norm)
                if m:
                    matches.append(
                        {
                            "matchType": f"{label}_word",
                            "matchedText": m.group(0),
                            "sourceTerm": raw,
                            "sourceWord": word,
                            "variant": variant,
                            "label": label,
                        }
                    )
                    break  # one variant hit per source word is enough

    # Deduplicate by (label, matchedText, matchType prefix)
    seen: set[tuple] = set()
    unique: list[dict] = []
    for m in matches:
        key = (m["label"], m["matchedText"], m.get("sourceWord", ""), m["matchType"])
        if key not in seen:
            seen.add(key)
            unique.append(m)
    return unique


def process_dictionary(config: dict) -> list[dict]:
    path: Path = config["path"]
    if not path.exists():
        print(f"WARNING: missing {path}", file=sys.stderr)
        return []

    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    entries = data.get("entries", [])
    results: list[dict] = []

    for index, entry in enumerate(entries):
        term = entry.get(config["termField"], "")
        definition = entry.get(config["definitionField"], "")
        base = entry.get(config["baseField"], "") if config["baseField"] else ""

        if not term or not definition:
            continue

        search_terms: list[tuple[str, str]] = [("term", str(term))]
        if base:
            search_terms.append(("base", str(base)))

        matches = find_matches_in_definition(str(definition), search_terms)
        if not matches:
            continue

        results.append(
            {
                "dictId": config["dictId"],
                "index": index,
                "term": term,
                "base": base or None,
                "definition": definition,
                "level": entry.get("level"),
                "matches": matches,
                "matchSummary": "; ".join(
                    f"{m['label']}:{m['matchedText']} ({m['matchType']})"
                    for m in matches
                ),
            }
        )

    return results


def write_reports(all_findings: list[dict], summary: dict) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "generatedBy": "scripts/detect-dict-definition-leaks.py",
        "summary": summary,
        "findings": all_findings,
    }
    with REPORT_JSON.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    fieldnames = [
        "dictId",
        "index",
        "term",
        "base",
        "level",
        "definition",
        "matchSummary",
    ]
    with REPORT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in all_findings:
            writer.writerow(row)


def main() -> int:
    all_findings: list[dict] = []
    summary: dict = {"byDictionary": {}, "totalAffected": 0, "totalEntries": {}}

    for config in DICTIONARIES:
        findings = process_dictionary(config)
        all_findings.extend(findings)

        with config["path"].open(encoding="utf-8") as f:
            total = len(json.load(f).get("entries", []))

        summary["byDictionary"][config["dictId"]] = {
            "affected": len(findings),
            "totalEntries": total,
            "affectedPct": round(100 * len(findings) / total, 1) if total else 0,
            "path": str(config["path"].relative_to(ROOT)),
        }
        summary["totalEntries"][config["dictId"]] = total

    summary["totalAffected"] = len(all_findings)

    write_reports(all_findings, summary)

    print(json.dumps(summary, indent=2))
    print(f"\nWrote {REPORT_JSON.relative_to(ROOT)}")
    print(f"Wrote {REPORT_CSV.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
