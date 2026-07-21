#!/usr/bin/env python3
"""Replace Spanish evidence text inside reading6 gap markers with English paragraphs."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = re.compile(r"\[(\d+)\]([\s\S]*?)\[/\1\]", re.IGNORECASE)
SPANISH_HINT = re.compile(
    r"[áéíóúñ¿¡]|\b(?:el |la |los |las |de la |del |en esta|lejos de|iniciativas|estos |sin embargo|su mayor|"
    r"este proceso|el grafiti|los espeleólogos|cultivar |el uso |en muchas|el apnea|la fisiología|esta escena|"
    r"con el tiempo|esta normalidad|además|también|porque|aunque|vivir |los mapas|los faros|los canales|"
    r"la investigación|por eso|este lenguaje|el origen|la competición|la jardinería|cada ciudad|las bicicletas|"
    r"cambiar la|la restauración|el espacio|el sentido|la vida en|los ciclistas|la percepción|las bicicletas)\b",
    re.IGNORECASE,
)
EMBEDDED_MARKERS = re.compile(r"\[\d+\]|\[/\d+\]")


def strip_bom(text: str) -> str:
    return text[1:] if text.startswith("\ufeff") else text


def clean_paragraph(text: str) -> str:
    return EMBEDDED_MARKERS.sub("", text).strip()


def looks_spanish(text: str) -> bool:
    return bool(SPANISH_HINT.search(text))


def process_file(path: Path) -> int:
    raw = strip_bom(path.read_text(encoding="utf-8"))
    data = json.loads(raw)
    content = data.get("content") or {}
    text = content.get("text") or ""
    paragraphs = content.get("paragraphs") or {}
    questions = content.get("questions") or []
    if not text or not paragraphs or not questions:
        return 0

    qmap = {
        q["number"]: q["correct"]
        for q in questions
        if isinstance(q, dict) and "number" in q and "correct" in q
    }

    replacements = 0

    def replace_match(match: re.Match[str]) -> str:
        nonlocal replacements
        num = int(match.group(1))
        inner = match.group(2).strip()
        if not looks_spanish(inner):
            return match.group(0)
        letter = qmap.get(num)
        if not letter or letter not in paragraphs:
            raise ValueError(f"{path}: missing paragraph for gap {num} (correct={letter!r})")
        english = clean_paragraph(paragraphs[letter])
        replacements += 1
        return f"[{num}] {english} [/{num}]"

    new_text = EVIDENCE.sub(replace_match, text)
    if replacements:
        content["text"] = new_text
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return replacements


def main() -> int:
    total_files = 0
    total_replacements = 0
    for path in sorted((ROOT / "Nivel").rglob("*.json")):
        if "Exams" not in path.parts:
            continue
        count = process_file(path)
        if count:
            total_files += 1
            total_replacements += count
            print(f"updated {path.relative_to(ROOT)} ({count} spans)")
    print(f"\nDone. Files changed: {total_files}; spans replaced: {total_replacements}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
