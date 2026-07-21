#!/usr/bin/env python3
"""Translate Spanish metadata in exam/test JSON files to English."""

from __future__ import annotations

import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parent.parent
EXAMS_ROOT = ROOT / "Nivel"
PROMPT_DIRS = [
    ROOT / "Nivel" / "C1" / "WritingPrompts",
    ROOT / "Nivel" / "C1" / "SpeakingPrompts",
]

METADATA_KEYS = {
    "explanation",
    "description",
    "question",
    "title",
    "instructions",
    "hint",
    "feedback",
    "prompt",
    "intro",
    "label",
    "message",
    "opening",
    "introduction",
    "bodyParagraph1",
    "bodyParagraph2",
    "conclusion",
    "main_body",
    "evaluation",
    "findings",
    "conclusions",
    "recommendations",
    "closing",
}

PROMPT_FILE_KEYS = METADATA_KEYS | {"tips"}

SPANISH_MARKERS = re.compile(
    r"(?:"
    r"\bes el\b|\bes la\b|\bson los\b|\bson las\b|"
    r"\bLa respuesta\b|\bLas demás\b|\bcolocación\b|\bno encaja\b|"
    r"\bintroduce el\b|\bintroduce una\b|\bintroduce la\b|"
    r"\bexplica por qué\b|\bexplica qué\b|"
    r"\b[ABCDEFGH] introduce\b|\b[ABCDEFGH] explica\b|"
    r"\bA (explica|describe|define|menciona|habla|apoya)\b|"
    r"\bse refiere\b|\bconecta con\b|\bañade el\b|\bva seguido\b|"
    r"\bConjunción\b|\bAdverbio interrogativo\b|"
    r"\bEvalúa\b|\bActúa como\b|\bProporciona\b|\bDespués\b|"
    r"\bEl texto\b|\bLa reseña\b|\bEl informe\b|\bEl artículo\b|"
    r"\bUsa \b|\bEmplea \b|\bIncluye \b|\bIntroduce \b|\bDesarrolla \b|\bResume \b|"
    r"\bAmplía \b|\bEvita \b|\bDemuestra \b|\bAñade \b|\bExpresa \b|\bInvita \b|"
    r"\bVaría \b|\bUtiliza \b|\bMantén \b|\bEquilibra \b|\bEmpieza \b|\bTermina \b|"
    r"\bpara (seguir|indicar|describir|elegir|expresar|obtener|albergar|enfrentar)\b|"
    r"\bno (encajan|funcionan|forman|transmiten|se usan)\b"
    r")",
    re.IGNORECASE,
)

ENGLISH_MARKERS = re.compile(
    r"(?:"
    r"^(?:The |This |It |They |He |She |We |You |An |In |On |At |Because |Since |When |While |Although |"
    r"However |Therefore |Moreover |Furthermore |Option |Answer |Correct |Incorrect |Paragraph |Section |"
    r"Speaker |Candidate |Gap |Question |Part |Use |Choose |Select |Listen |Read |Write |Both |Neither |Only |Not )|"
    r"\bis the (correct|right|best|standard|most common|usual|appropriate)\b|"
    r"\bare the (correct|right|best)\b|"
    r"\bmatches the (text|passage|audio|context|meaning)\b|"
    r"\bA (describes|defines|explains|mentions|supports|refers)\b"
    r")",
    re.IGNORECASE,
)

QUOTE_ES_PATTERN = re.compile(
    r"""['"][^'"]+['"]\s+es\s+(el|la|los|las)\b""",
    re.IGNORECASE,
)

ACCENT_PATTERN = re.compile(r"[áéíóúñ¿¡]", re.IGNORECASE)

translator = GoogleTranslator(source="es", target="en")
_cache: dict[str, str] = {}


def strip_bom(text: str) -> str:
    return text[1:] if text.startswith("\ufeff") else text


def looks_spanish(text: str) -> bool:
    if not text or not text.strip():
        return False
    if re.match(r"^[A-H]\s+(explica|describe|define|menciona|habla|apoya|introduce|añade|conecta|se refiere)\b", text, re.IGNORECASE):
        return True
    if ENGLISH_MARKERS.search(text):
        return False
    if SPANISH_MARKERS.search(text):
        return True
    if QUOTE_ES_PATTERN.search(text):
        return True
    without_cafe = re.sub(r"café", "cafe", text, flags=re.IGNORECASE)
    if ACCENT_PATTERN.search(without_cafe):
        return True
    words = re.findall(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]+", text.lower())
    spanish_words = {
        "el", "la", "los", "las", "de", "del", "que", "por", "para", "con", "es", "son",
        "una", "uno", "este", "esta", "estos", "estas", "como", "más", "menos", "también",
        "además", "aunque", "según", "texto", "párrafo", "respuesta", "opción", "verbo",
        "sustantivo", "expresión", "colocación", "encajan", "funcionan", "introduce",
        "explica", "menciona", "contradice", "refuerza", "implica", "contraste", "anterior",
        "demás", "correcta", "pensada", "original", "típica", "estándar", "fija", "natural",
        "común", "consecuencia", "información", "argumento", "significado", "contexto",
        "debe", "deben", "puede", "podría", "conlleva", "transmiten", "provocar", "causar",
        "contribuye", "indica", "describe", "presenta", "se", "usa", "utilizan", "evalúa",
        "actúa", "proporciona", "después", "emplea", "incluye", "desarrolla", "resume",
        "asegurándote", "comprueba", "cambia", "propón", "sustitúyelos", "analiza",
        "verifica", "identifica", "sugiéreme", "muletillas", "encajen", "intervención",
        "respuestas", "opinión", "compañero", "examinador", "criterios", "puntúa",
        "reescribe", "conectores", "vocabulario", "registro", "tono", "informe", "reseña",
        "artículo", "propuesta", "recomendaciones", "hallazgos", "conclusiones",
        "amplía", "evita", "demuestra", "añade", "expresa", "invita", "varía", "utiliza",
        "mantén", "equilibra", "empieza", "termina", "lenguaje", "titulo", "título",
        "reflexión", "anécdota", "matizada", "creíble", "figurativo", "encabezados",
        "nominalizaciones", "concretos", "respaldar", "monosilábicas", "justificaciones",
    }
    hits = sum(1 for w in words if w in spanish_words)
    return hits >= 3


def translate_text(text: str) -> str:
    if text in _cache:
        return _cache[text]
    for attempt in range(4):
        try:
            translated = translator.translate(text)
            _cache[text] = translated
            return translated
        except Exception as exc:  # noqa: BLE001
            if attempt == 3:
                raise
            print(f"  retry {attempt + 1} for: {text[:60]!r} ({exc})", file=sys.stderr)
            time.sleep(1.5 * (attempt + 1))
    return text


def collect_targets(obj, path: str = "", prompt_file: bool = False) -> list[tuple[str, str]]:
    targets: list[tuple[str, str]] = []

    if isinstance(obj, dict):
        for key, value in obj.items():
            child_path = f"{path}.{key}" if path else key
            if isinstance(value, str):
                allowed_keys = PROMPT_FILE_KEYS if prompt_file else METADATA_KEYS
                if key in allowed_keys and looks_spanish(value):
                    targets.append((child_path, value))
            elif isinstance(value, list) and prompt_file and key == "tips":
                for index, item in enumerate(value):
                    if isinstance(item, str) and looks_spanish(item):
                        targets.append((f"{child_path}[{index}]", item))
            else:
                targets.extend(collect_targets(value, child_path, prompt_file))
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            targets.extend(collect_targets(value, f"{path}[{index}]", prompt_file))

    return targets


def set_at_path(obj, path: str, value: str) -> None:
    parts = re.split(r"\.(?![^\[]*\])", path)
    current = obj
    for part in parts[:-1]:
        match = re.match(r"([^[]+)(\[(\d+)\])?", part)
        if not match:
            raise ValueError(f"Invalid path segment: {part}")
        key = match.group(1)
        index = match.group(3)
        current = current[key]
        if index is not None:
            current = current[int(index)]
    last = parts[-1]
    match = re.match(r"([^[]+)(\[(\d+)\])?", last)
    if not match:
        raise ValueError(f"Invalid path segment: {last}")
    key = match.group(1)
    index = match.group(3)
    if index is None:
        current[key] = value
    else:
        current[key][int(index)] = value


def process_file(path: Path, prompt_file: bool = False) -> tuple[int, int]:
    raw = strip_bom(path.read_text(encoding="utf-8"))
    data = json.loads(raw)
    targets = collect_targets(data, prompt_file=prompt_file)
    unique_texts = sorted({text for _, text in targets})
    if not unique_texts:
        return 0, 0

    translations: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(translate_text, text): text for text in unique_texts}
        for future in as_completed(futures):
            original = futures[future]
            translations[original] = future.result()

    for target_path, original in targets:
        set_at_path(data, target_path, translations[original])

    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return len(unique_texts), len(targets)


def iter_exam_files() -> list[Path]:
    files: list[Path] = []
    for level in ("B1", "B2", "C1"):
        exams_dir = EXAMS_ROOT / level / "Exams"
        if exams_dir.exists():
            files.extend(sorted(exams_dir.rglob("*.json")))
    return files


def main() -> int:
    total_strings = 0
    total_fields = 0
    changed_files = 0

    for file_path in iter_exam_files():
        count_strings, count_fields = process_file(file_path)
        if count_strings:
            changed_files += 1
            total_strings += count_strings
            total_fields += count_fields
            print(f"updated {file_path.relative_to(ROOT)} ({count_strings} strings)")

    for prompt_dir in PROMPT_DIRS:
        if not prompt_dir.exists():
            continue
        for file_path in sorted(prompt_dir.glob("*.json")):
            count_strings, count_fields = process_file(file_path, prompt_file=True)
            if count_strings:
                changed_files += 1
                total_strings += count_strings
                total_fields += count_fields
                print(f"updated {file_path.relative_to(ROOT)} ({count_strings} strings)")

    print(
        f"\nDone. Files changed: {changed_files}; "
        f"unique strings translated: {total_strings}; field updates: {total_fields}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
