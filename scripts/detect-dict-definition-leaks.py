#!/usr/bin/env python3
"""
Detect dictionary entries whose definition contains the term being defined
(or its base word / significant words), which breaks MCQ practice mode.

Matches are classified as:
  - strong: full term/phrase or exact form (incl. morphology of whole term/base)
  - weak:   only a single significant word from a multi-word term matches

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
    why how what which who whom whose one's smth sth something someone
    somebody anyone anything somewhere
    """.split()
)

PHRASE_NOISE = re.compile(
    r"\b(smth|sth|something|someone|somebody)\b", re.IGNORECASE
)
PAREN_OPTIONAL = re.compile(r"\([^)]*\)")
SLASH_ALTS = re.compile(r"/")

# Lexicographic templates common in vocab (for batch-rewrite planning)
VOCAB_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("term_is", re.compile(r"^{term}\s+is\b", re.I)),
    ("to_term", re.compile(r"^to\s+{term}\b", re.I)),
    ("to_term_means", re.compile(r"^to\s+{term}\s+(means|is)\b", re.I)),
    ("if_term", re.compile(r"^if\s+.+\b{term}\b", re.I)),
    ("something_term", re.compile(r"^something\s+{term}\b", re.I)),
    ("an_term", re.compile(r"^an?\s+{term}\b", re.I)),
    ("the_term", re.compile(r"^the\s+{term}\b", re.I)),
    ("term_comma", re.compile(r"^{term}\s*,", re.I)),
    ("term_means", re.compile(r"^{term}\s+means\b", re.I)),
    ("uses_term", re.compile(r"\b(use|uses)\s+(the\s+)?word\s+{term}\b", re.I)),
    ("term_word_meta", re.compile(r"\bword\s+{term}\b", re.I)),
]


def normalize_text(text: str) -> str:
    text = text.lower()
    text = PAREN_OPTIONAL.sub(" ", text)
    text = PHRASE_NOISE.sub(" ", text)
    text = re.sub(r"[^\w\s'-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> list[str]:
    return [t for t in normalize_text(text).split() if t]


def significant_words(text: str) -> list[str]:
    return [w for w in tokenize(text) if w not in STOPWORDS and len(w) >= 2]


def morphological_variants(word: str) -> set[str]:
    w = word.lower().strip()
    if not w or len(w) < 2:
        return {w} if w else set()

    variants: set[str] = {w}

    def add(form: str) -> None:
        if len(form) >= 2:
            variants.add(form)

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

    suffix_rules = [
        ("ingly", 5),
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
                add(stem + stem[-1])

    return {v for v in variants if len(v) >= 2}


def word_boundary_pattern(word: str) -> re.Pattern[str]:
    escaped = re.escape(word.lower())
    return re.compile(rf"(?<![\w'-]){escaped}(?![\w'-])", re.IGNORECASE)


def variant_of_word(matched: str, source_word: str) -> bool:
    matched_l = matched.lower()
    return matched_l in morphological_variants(source_word)


def classify_match_strength(
    match: dict,
    *,
    dict_id: str,
    raw_term: str,
    raw_base: str | None,
    is_multi_word_dict: bool,
) -> str:
    """Return 'strong' or 'weak'."""
    label = match["label"]
    match_type = match["matchType"]
    matched = match["matchedText"]
    source_word = match.get("sourceWord", "")

    # Full phrase in definition → always strong
    if match_type.endswith("_phrase"):
        return "strong"

    # Single-word dictionaries (vocab, wf derived): term leaks are strong
    if label == "term" and not is_multi_word_dict:
        return "strong"

    # WF base word (and its morphology) → strong leak
    if label == "base" and dict_id == "wf":
        if raw_base and variant_of_word(matched, raw_base):
            return "strong"
        return "weak"

    # Multi-word dictionaries: only phrase-level term matches are strong
    if label == "term" and is_multi_word_dict:
        return "weak"

    # Collocation anchor word in base field → weak (natural to appear)
    if label == "base" and dict_id == "colloc":
        return "weak"

    return "weak"


def detect_vocab_pattern(term: str, definition: str) -> str | None:
    """Detect lexicographic template for batch-rewrite planning."""
    term_esc = re.escape(term.strip())
    if not term_esc:
        return None
    for name, pattern in VOCAB_PATTERNS:
        compiled = re.compile(pattern.pattern.replace("{term}", term_esc), pattern.flags)
        if compiled.search(definition):
            return name
    return None


def find_matches_in_definition(
    definition: str,
    search_terms: list[tuple[str, str]],
    *,
    dict_id: str,
    is_multi_word_dict: bool,
) -> list[dict]:
    if not definition or not definition.strip():
        return []

    def_norm = normalize_text(definition)
    matches: list[dict] = []

    for label, raw_term in search_terms:
        if not raw_term or not str(raw_term).strip():
            continue

        raw = str(raw_term).strip()

        phrase_variants: set[str] = set()
        base_phrase = normalize_text(raw)
        if base_phrase and " " in base_phrase:
            phrase_variants.add(base_phrase)
            if "/" in raw.lower():
                parts = [normalize_text(p) for p in SLASH_ALTS.split(raw)]
                phrase_variants.update(p for p in parts if p)

        for phrase in phrase_variants:
            if len(phrase) < 4:
                continue
            pat = word_boundary_pattern(phrase)
            m = pat.search(def_norm)
            if m:
                rec = {
                    "matchType": f"{label}_phrase",
                    "matchedText": m.group(0),
                    "sourceTerm": raw,
                    "label": label,
                }
                rec["strength"] = classify_match_strength(
                    rec,
                    dict_id=dict_id,
                    raw_term=raw,
                    raw_base=None,
                    is_multi_word_dict=is_multi_word_dict,
                )
                matches.append(rec)

        words = tokenize(raw)
        significant = [w for w in words if w not in STOPWORDS and len(w) >= 2]
        if not significant and len(words) == 1:
            significant = words

        for word in significant:
            for variant in morphological_variants(word):
                pat = word_boundary_pattern(variant)
                m = pat.search(def_norm)
                if m:
                    rec = {
                        "matchType": f"{label}_word",
                        "matchedText": m.group(0),
                        "sourceTerm": raw,
                        "sourceWord": word,
                        "variant": variant,
                        "label": label,
                    }
                    rec["strength"] = classify_match_strength(
                        rec,
                        dict_id=dict_id,
                        raw_term=raw,
                        raw_base=search_terms[1][1] if len(search_terms) > 1 else None,
                        is_multi_word_dict=is_multi_word_dict,
                    )
                    matches.append(rec)
                    break

    seen: set[tuple] = set()
    unique: list[dict] = []
    for m in matches:
        key = (m["label"], m["matchedText"], m.get("sourceWord", ""), m["matchType"])
        if key not in seen:
            seen.add(key)
            unique.append(m)
    return unique


def entry_tier(matches: list[dict]) -> str:
    if any(m["strength"] == "strong" for m in matches):
        return "strong"
    return "weak"


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

        matches = find_matches_in_definition(
            str(definition),
            search_terms,
            dict_id=config["dictId"],
            is_multi_word_dict=config["multiWord"],
        )
        if not matches:
            continue

        tier = entry_tier(matches)
        strong_matches = [m for m in matches if m["strength"] == "strong"]
        weak_matches = [m for m in matches if m["strength"] == "weak"]

        row: dict = {
            "dictId": config["dictId"],
            "index": index,
            "term": term,
            "base": base or None,
            "definition": definition,
            "level": entry.get("level"),
            "tier": tier,
            "matches": matches,
            "strongMatches": strong_matches,
            "weakMatches": weak_matches,
            "matchSummary": "; ".join(
                f"[{m['strength']}] {m['label']}:{m['matchedText']} ({m['matchType']})"
                for m in matches
            ),
        }

        if config["dictId"] == "vocab" and tier == "strong":
            pattern = detect_vocab_pattern(str(term), str(definition))
            if pattern:
                row["vocabPattern"] = pattern

        results.append(row)

    return results


def summarize_findings(all_findings: list[dict], configs: list[dict]) -> dict:
    summary: dict = {
        "byDictionary": {},
        "totalEntries": {},
        "totals": {
            "allMatches": len(all_findings),
            "strong": 0,
            "weakOnly": 0,
        },
    }

    for config in configs:
        dict_id = config["dictId"]
        dict_findings = [f for f in all_findings if f["dictId"] == dict_id]
        strong = [f for f in dict_findings if f["tier"] == "strong"]
        weak_only = [f for f in dict_findings if f["tier"] == "weak"]

        with config["path"].open(encoding="utf-8") as f:
            total = len(json.load(f).get("entries", []))

        vocab_patterns: dict[str, int] = {}
        if dict_id == "vocab":
            for f in strong:
                p = f.get("vocabPattern", "other")
                vocab_patterns[p] = vocab_patterns.get(p, 0) + 1

        summary["byDictionary"][dict_id] = {
            "path": str(config["path"].relative_to(ROOT)),
            "totalEntries": total,
            "allMatches": len(dict_findings),
            "strong": len(strong),
            "weakOnly": len(weak_only),
            "strongPct": round(100 * len(strong) / total, 1) if total else 0,
            "weakOnlyPct": round(100 * len(weak_only) / total, 1) if total else 0,
        }
        if vocab_patterns:
            summary["byDictionary"][dict_id]["vocabPatterns"] = dict(
                sorted(vocab_patterns.items(), key=lambda x: -x[1])
            )

        summary["totalEntries"][dict_id] = total
        summary["totals"]["strong"] += len(strong)
        summary["totals"]["weakOnly"] += len(weak_only)

    return summary


def write_csv(path: Path, rows: list[dict]) -> None:
    fieldnames = [
        "dictId",
        "index",
        "tier",
        "term",
        "base",
        "level",
        "definition",
        "vocabPattern",
        "matchSummary",
    ]
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def write_reports(all_findings: list[dict], summary: dict) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    strong = [f for f in all_findings if f["tier"] == "strong"]
    weak_only = [f for f in all_findings if f["tier"] == "weak"]

    files = {
        "all": REPORT_DIR / "dict-definition-leaks.json",
        "strong": REPORT_DIR / "dict-definition-leaks-strong.json",
        "weak": REPORT_DIR / "dict-definition-leaks-weak.json",
    }

    for key, path in files.items():
        subset = {"all": all_findings, "strong": strong, "weak": weak_only}[key]
        payload = {
            "generatedBy": "scripts/detect-dict-definition-leaks.py",
            "tier": key,
            "summary": summary,
            "findings": subset,
        }
        with path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

    write_csv(REPORT_DIR / "dict-definition-leaks.csv", all_findings)
    write_csv(REPORT_DIR / "dict-definition-leaks-strong.csv", strong)
    write_csv(REPORT_DIR / "dict-definition-leaks-weak.csv", weak_only)


def main() -> int:
    all_findings: list[dict] = []
    for config in DICTIONARIES:
        all_findings.extend(process_dictionary(config))

    summary = summarize_findings(all_findings, DICTIONARIES)
    write_reports(all_findings, summary)

    print(json.dumps(summary, indent=2))
    print("\nReports:")
    for name in [
        "dict-definition-leaks.json",
        "dict-definition-leaks-strong.json",
        "dict-definition-leaks-weak.json",
        "dict-definition-leaks.csv",
        "dict-definition-leaks-strong.csv",
        "dict-definition-leaks-weak.csv",
    ]:
        print(f"  scripts/reports/{name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
