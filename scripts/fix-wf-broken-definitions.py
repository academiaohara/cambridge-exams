#!/usr/bin/env python3
"""
Restore broken word-formation dictionary definitions from CSV sources.

Broken definitions (e.g. "Person who.", "In an way.") were produced when the
definition-leak fixer stripped base-word tokens without a proper rewrite.
"""

from __future__ import annotations

import csv
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "dict_leak_fixer", ROOT / "scripts" / "fix-dict-definition-leaks.py"
)
_fixer = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_fixer)

is_broken_definition = _fixer.is_broken_definition
rewrite_wf = _fixer.rewrite_wf
fix_definition = _fixer.fix_definition
has_strong_leak = _fixer.has_strong_leak

DICT_PATH = ROOT / "data" / "word-formation" / "dictionary.json"
CSV_DIR = ROOT / "data" / "Word Formation"


def load_csv_definitions() -> dict[tuple[str, str], str]:
    definitions: dict[tuple[str, str], str] = {}
    for csv_path in sorted(CSV_DIR.glob("*.csv")):
        with csv_path.open(encoding="utf-8") as f:
            reader = csv.reader(f, delimiter=";")
            next(reader)  # header
            for row in reader:
                if len(row) < 4:
                    continue
                base, derived, _, definition = row[0], row[1], row[2], row[3]
                definitions[(base.lower(), derived.lower())] = definition.strip()
    return definitions


def main() -> int:
    csv_defs = load_csv_definitions()
    data = json.loads(DICT_PATH.read_text(encoding="utf-8"))
    entries = data["entries"]

    stats = {
        "brokenFound": 0,
        "fixed": 0,
        "stillBroken": [],
        "stillLeaking": [],
    }

    for index, entry in enumerate(entries):
        old_def = entry.get("definition", "")
        if not is_broken_definition(old_def):
            continue

        stats["brokenFound"] += 1
        base = entry.get("base", "")
        derived = entry.get("derived", "")
        source_def = csv_defs.get((base.lower(), derived.lower()), old_def)

        rewritten = rewrite_wf(derived, base, source_def)
        if rewritten and not is_broken_definition(rewritten):
            candidate = rewritten
        else:
            candidate, _ = fix_definition(
                source_def,
                derived,
                base,
                "wf",
                False,
                index,
            )

        if is_broken_definition(candidate):
            stats["stillBroken"].append(
                {"derived": derived, "base": base, "definition": candidate}
            )
            continue

        if has_strong_leak(candidate, derived, base, "wf", False):
            stats["stillLeaking"].append(
                {"derived": derived, "base": base, "definition": candidate}
            )
            continue

        entry["definition"] = candidate
        stats["fixed"] += 1

    DICT_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(json.dumps(stats, indent=2, ensure_ascii=False))
    return 0 if not stats["stillBroken"] and not stats["stillLeaking"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
