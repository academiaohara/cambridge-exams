#!/usr/bin/env python3
"""
generar_examen.py — Genera un examen Cambridge C1/B2 en PPTX a partir de JSONs.

Uso:
  python generar_examen.py <ruta_test> [plantilla.pptx]

Ejemplos:
  python generar_examen.py Nivel/C1/Exams/Test1
  python generar_examen.py Nivel/C1/Exams/Test1 mi_plantilla.pptx
"""

import json
import os
import re
import sys

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Pt

TEMPLATE_DEFAULT = "examen_plantilla.pptx"


# ─── helpers silenciosos (sin avisos ni warnings) ────────────────────────────

def get_shape(slide, name):
    """Devuelve la forma con ese nombre, o None si no existe."""
    for shape in slide.shapes:
        if shape.name == name:
            return shape
    return None


def get_table(slide, name):
    """Devuelve la tabla (objeto Table) con ese nombre, o None si no existe."""
    shape = get_shape(slide, name)
    if shape is None or not shape.has_table:
        return None
    return shape.table


def set_text(slide, name, text):
    """Escribe texto plano en una forma. No hace nada si la forma no existe."""
    shape = get_shape(slide, name)
    if shape is None or not shape.has_text_frame:
        return
    tf = shape.text_frame
    tf.clear()
    tf.text = text


def set_shape_text_rich(slide, name, runs):
    """
    Escribe texto enriquecido en una forma.

    runs es una lista de dict:
        {'text': str, 'bold': bool, 'size': int (opcional en puntos)}

    No hace nada si la forma no existe o no tiene marco de texto.
    """
    shape = get_shape(slide, name)
    if shape is None or not shape.has_text_frame:
        return
    tf = shape.text_frame
    tf.clear()
    p = tf.paragraphs[0]
    for run_data in runs:
        run = p.add_run()
        run.text = run_data.get("text", "")
        run.font.bold = run_data.get("bold", False)
        if "size" in run_data:
            run.font.size = Pt(run_data["size"])


def fill_black_shape(slide, name):
    """Rellena una forma de negro. No hace nada si la forma no existe."""
    shape = get_shape(slide, name)
    if shape is None:
        return
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(0, 0, 0)


def clear_shape_fill(slide, name):
    """Elimina el relleno de una forma (fondo transparente/blanco). Silencioso."""
    shape = get_shape(slide, name)
    if shape is None:
        return
    shape.fill.background()


def fill_table_cell(table, row, col, text, bold=False):
    """
    Escribe texto en una celda de tabla.
    No hace nada si table es None o si la celda no existe.
    """
    if table is None:
        return
    try:
        cell = table.cell(row, col)
        cell.text = text
        if bold:
            for para in cell.text_frame.paragraphs:
                for run in para.runs:
                    run.font.bold = True
    except Exception:
        pass


# ─── procesado de texto ─────────────────────────────────────────────────────

def format_parrafos(raw_text):
    """Convierte el separador || en salto de línea."""
    return raw_text.replace("||", "\n")


def text_con_huecos(raw_text):
    """Sustituye cada (N) en el texto por (N) ......... ."""
    return re.sub(r"\((\d+)\)", r"(\1) .........", raw_text)


def text_con_huecos_wf(raw_text, questions):
    """
    Word-formation: sustituye (N) por (N) ......... (WORD)
    donde WORD es la palabra en mayúsculas asociada a esa pregunta.
    """
    word_map = {str(q["number"]): q.get("word", "") for q in questions}

    def repl(match):
        n = match.group(1)
        word = word_map.get(n, "")
        if word:
            return f"({n}) ......... ({word})"
        return f"({n}) ........."

    return re.sub(r"\((\d+)\)", repl, raw_text)


def strip_markers(text):
    """Elimina marcadores tipo [41] y [/41] del texto."""
    return re.sub(r"\[/?(\d+)\]", "", text)


def format_options_dict(opts):
    """
    Convierte un dict de opciones {A: 'texto', B: 'texto', ...}
    en una lista de cadenas "A) texto".
    """
    return [f"{k}) {v}" for k, v in sorted(opts.items())]


def format_options_list(opts):
    """
    Devuelve la lista de opciones tal cual (ya vienen como "A) texto").
    Si es dict, convierte primero.
    """
    if isinstance(opts, dict):
        return format_options_dict(opts)
    return list(opts)


# ─── funciones por diapositiva ──────────────────────────────────────────────

def set_nombre_test(slide, test_num):
    set_text(slide, "NombreTest", f"Test {test_num}")


def fill_slide_reading1(slide, data, test_num):
    """Diapositiva 2: Reading 1 — Multiple-choice cloze."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    example = content.get("example", {})
    raw_text = content.get("text", "")

    set_text(slide, "titulo", data.get("title", ""))
    set_text(slide, "texto", format_parrafos(text_con_huecos(raw_text)))

    # Forma "example": "0     A) opción     B) opción     C) opción     D) opción"
    opts = format_options_list(example.get("options", []))
    ex_num = example.get("number", 0)
    parts = [str(ex_num)] + opts
    set_text(slide, "example", "     ".join(parts))

    # Formas A, B, C, D: rellenar de negro la respuesta correcta del example
    correct = example.get("correct", "").upper()
    for letter in ("A", "B", "C", "D"):
        if letter == correct:
            fill_black_shape(slide, letter)
        else:
            clear_shape_fill(slide, letter)


def fill_slide_reading2(slide, data, test_num):
    """Diapositiva 3: Reading 2 — Open cloze."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    example = content.get("example", {})
    raw_text = content.get("text", "")

    set_text(slide, "titulo", data.get("title", ""))
    set_text(slide, "texto", format_parrafos(text_con_huecos(raw_text)))

    # Tabla "example": cada celda contiene una letra de la palabra correcta
    correct_word = str(example.get("correct", ""))
    table = get_table(slide, "example")
    for i, letter in enumerate(correct_word):
        fill_table_cell(table, 0, i, letter)


def fill_slide_reading3(slide, data, test_num):
    """Diapositiva 4: Reading 3 — Word formation."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    questions = content.get("questions", [])
    raw_text = content.get("text", "")

    set_text(slide, "titulo", data.get("title", ""))
    set_text(slide, "texto", format_parrafos(text_con_huecos_wf(raw_text, questions)))


def fill_slide_reading4(slide, data, test_num):
    """Diapositiva 5: Reading 4 — Key word transformations."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    questions = content.get("questions", [])

    # Tabla "example": segunda celda = respuesta del example (si existe)
    example = content.get("example", {})
    if example:
        ex_answer = str(example.get("answer", example.get("correct", ""))).upper()
        table = get_table(slide, "example")
        fill_table_cell(table, 0, 1, ex_answer)

    # Cada pregunta en su propia forma (nombre = número de pregunta)
    for q in questions:
        num = q.get("number", "")
        key = q.get("keyWord", q.get("key", ""))
        first = q.get("firstSentence", "")
        before = q.get("beforeGap", "")
        after = q.get("afterGap", "")
        gap_line = f"{before} .................... {after}"
        text = f"{num}  {key}\n{first}\n{gap_line}"
        set_text(slide, str(num), text)


def fill_slide_reading5_texto(slide, data, test_num):
    """Diapositiva 6: Reading 5 — título y texto del artículo."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    title = content.get("title", data.get("title", ""))
    raw_text = strip_markers(content.get("text", ""))
    set_text(slide, "titulo", title)
    set_text(slide, "texto", format_parrafos(raw_text))


def fill_slide_reading5_preguntas(slide, data, test_num):
    """Diapositiva 7: Reading 5 — preguntas 31–36 con opciones."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    questions = content.get("questions", [])
    for q in questions:
        num = q.get("number", "")
        question_text = q.get("question", "")
        opts = format_options_list(q.get("options", []))
        # Texto enriquecido: número + pregunta, luego opciones con letra en negrita
        runs = [{"text": f"{num}. {question_text}\n", "bold": False}]
        for opt in opts:
            # opt tiene formato "A) texto..."
            if opt and len(opt) >= 2:
                letter = opt[0]
                rest = opt[1:]
                runs.append({"text": f"   {letter}", "bold": True})
                runs.append({"text": f"{rest}\n", "bold": False})
        set_shape_text_rich(slide, str(num), runs)


def fill_slide_reading6_texto(slide, data, test_num):
    """Diapositiva 8: Reading 6 — título y texto con párrafos A–D."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    title = content.get("title", data.get("title", ""))
    texts = content.get("texts", {})
    set_text(slide, "titulo", title)
    runs = []
    for letter in ("A", "B", "C", "D"):
        raw = strip_markers(texts.get(letter, "")).strip()
        runs.append({"text": f"{letter})", "bold": True})
        runs.append({"text": f" {raw}\n", "bold": False})
    set_shape_text_rich(slide, "texto", runs)


def fill_slide_reading6_tablas(slide, data, test_num):
    """Diapositiva 9: Reading 6 — tablas de preguntas 37–40."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    texts = content.get("texts", {})
    questions = texts.get("questions", content.get("questions", []))
    if not isinstance(questions, list):
        questions = []
    for q in questions:
        num = q.get("number", "")
        question_text = q.get("question", "")
        table = get_table(slide, str(num))
        fill_table_cell(table, 0, 0, question_text)


def fill_slide_reading7_texto(slide, data, test_num):
    """Diapositiva 10: Reading 7 — título y texto con numeración entre párrafos."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    title = content.get("title", data.get("title", ""))
    raw_text = strip_markers(content.get("text", ""))
    set_text(slide, "titulo", title)
    set_text(slide, "texto", format_parrafos(raw_text))


def fill_slide_reading7_parrafos(slide, data, test_num):
    """Diapositiva 11: Reading 7 — párrafos A–G en dos formas."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    paragraphs = content.get("paragraphs", {})

    runs1 = []
    for letter in ("A", "B", "C", "D"):
        raw = strip_markers(paragraphs.get(letter, "")).strip()
        runs1.append({"text": f"{letter}\n", "bold": True})
        runs1.append({"text": f"{raw}\n", "bold": False})
    set_shape_text_rich(slide, "parrafos1", runs1)

    runs2 = []
    for letter in ("E", "F", "G"):
        raw = strip_markers(paragraphs.get(letter, "")).strip()
        runs2.append({"text": f"{letter}\n", "bold": True})
        runs2.append({"text": f"{raw}\n", "bold": False})
    set_shape_text_rich(slide, "parrafos2", runs2)


def fill_slide_reading8_tablas(slide, data, test_num):
    """Diapositiva 12: Reading 8 — tablas de preguntas 47–56."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    texts = content.get("texts", {})
    questions = texts.get("questions", content.get("questions", []))
    if not isinstance(questions, list):
        questions = []
    for q in questions:
        num = q.get("number", "")
        question_text = q.get("question", "")
        table = get_table(slide, str(num))
        fill_table_cell(table, 0, 0, question_text)


def fill_slide_reading8_texto(slide, data, test_num):
    """Diapositiva 13: Reading 8 — título y texto con párrafos A–D."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    title = content.get("title", data.get("title", ""))
    texts = content.get("texts", {})
    set_text(slide, "titulo", title)
    runs = []
    for letter in ("A", "B", "C", "D"):
        raw = strip_markers(texts.get(letter, "")).strip()
        runs.append({"text": f"{letter})", "bold": True})
        runs.append({"text": f" {raw}\n", "bold": False})
    set_shape_text_rich(slide, "texto", runs)


def fill_slide_writing1(slide, data, test_num):
    """Diapositiva 14: Writing 1 — essay."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    notes = content.get("notes", {})
    structure = content.get("structure", {})

    set_text(slide, "description", data.get("description", ""))

    methods = notes.get("methods", notes.get("aspects", []))
    set_text(slide, "aspects", "\n".join(f"• {m}" for m in methods))

    opinions = notes.get("opinions", [])
    set_text(slide, "opinions", "\n".join(f"• {o}" for o in opinions))

    struct_text = "\n".join(f"{k}: {v}" for k, v in structure.items())
    set_text(slide, "structure", struct_text)


def fill_slide_writing2(slide, data, test_num):
    """Diapositiva 15: Writing 2 — opciones (formas 2, 3 y 4)."""
    set_nombre_test(slide, test_num)
    content = data.get("content", {})
    tasks = content.get("tasks", [])
    for i, task in enumerate(tasks[:3], start=2):
        title = task.get("title", "")
        prompt = task.get("prompt", task.get("description", ""))
        set_text(slide, str(i), f"{title}\n{prompt}")


def fill_slide_listening1(slide, data, test_num):
    """Diapositiva 16: Listening 1 — preguntas 1–6 y contextos."""
    set_nombre_test(slide, test_num)
    extracts = data.get("extracts", [])
    for ctx_idx, extract in enumerate(extracts, start=1):
        set_text(slide, f"context{ctx_idx}", extract.get("context", ""))
        for q in extract.get("questions", []):
            num = q.get("number", "")
            question_text = q.get("question", "")
            opts = format_options_list(q.get("options", []))
            text = f"{num}. {question_text}\n" + "\n".join(f"   {o}" for o in opts)
            set_text(slide, str(num), text)


def fill_slide_listening2(slide, data, test_num):
    """Diapositiva 17: Listening 2 — sentence completion."""
    set_nombre_test(slide, test_num)
    set_text(slide, "description", data.get("instructions", data.get("description", "")))
    set_text(slide, "titulo", data.get("title", ""))
    questions = []
    for extract in data.get("extracts", []):
        questions.extend(extract.get("questions", []))
    lines = [f"{q.get('number', '')}. {q.get('question', '')}" for q in questions]
    set_text(slide, "texto", "\n".join(lines))


def fill_slide_listening3(slide, data, test_num):
    """Diapositiva 18: Listening 3 — preguntas 15–20 con opciones."""
    set_nombre_test(slide, test_num)
    set_text(slide, "description", data.get("instructions", data.get("description", "")))
    for extract in data.get("extracts", []):
        for q in extract.get("questions", []):
            num = q.get("number", "")
            question_text = q.get("question", "")
            opts = format_options_list(q.get("options", []))
            text = f"{num}. {question_text}\n" + "\n".join(f"   {o}" for o in opts)
            set_text(slide, str(num), text)


def fill_slide_listening4(slide, data, test_num):
    """Diapositiva 19: Listening 4 — multiple matching."""
    set_nombre_test(slide, test_num)
    set_text(slide, "description", data.get("description", ""))
    content = data.get("content", {})
    task1 = content.get("task1", {})
    task2 = content.get("task2", {})

    set_text(slide, "instruction1", task1.get("instruction", ""))
    set_text(slide, "instruction2", task2.get("instruction", ""))

    opts1 = task1.get("options", {})
    opts2 = task2.get("options", {})
    set_text(slide, "options1", "\n".join(format_options_dict(opts1) if isinstance(opts1, dict) else opts1))
    set_text(slide, "options2", "\n".join(format_options_dict(opts2) if isinstance(opts2, dict) else opts2))


def fill_slide_answer_reading(slide, test_num, reading_data):
    """Diapositiva 20: Answer Key — Reading & Use of English (formas 1–8)."""
    set_nombre_test(slide, test_num)
    for part_idx, data in enumerate(reading_data, start=1):
        if data is None:
            continue
        content = data.get("content", {})
        lines = []
        example = content.get("example", {})
        if example:
            correct = example.get("correct", "")
            lines.append(f"0. {correct}")
        questions = content.get("questions", [])
        for q in questions:
            num = q.get("number", "")
            correct = q.get("correct", q.get("answer", ""))
            if isinstance(correct, list):
                correct = " / ".join(correct)
            lines.append(f"{num}. {correct}")
        text = f"Part {part_idx}\n" + "\n".join(lines)
        set_text(slide, str(part_idx), text)


def fill_slide_answer_listening(slide, test_num, listening_data):
    """Diapositiva 21: Answer Key — Listening (formas 1–4)."""
    set_nombre_test(slide, test_num)
    for part_idx, data in enumerate(listening_data, start=1):
        if data is None:
            continue
        lines = []
        if part_idx == 4:
            content = data.get("content", {})
            for task_key in ("task1", "task2"):
                task = content.get(task_key, {})
                for q in task.get("questions", []):
                    num = q.get("number", "")
                    correct = q.get("correct", q.get("answer", ""))
                    lines.append(f"{num}. {correct}")
        else:
            for extract in data.get("extracts", []):
                for q in extract.get("questions", []):
                    num = q.get("number", "")
                    correct = q.get("answer", q.get("correct", ""))
                    if isinstance(correct, list):
                        correct = " / ".join(correct)
                    lines.append(f"{num}. {correct}")
        text = f"Part {part_idx}\n" + "\n".join(lines)
        set_text(slide, str(part_idx), text)


# ─── carga de datos ─────────────────────────────────────────────────────────

def load_json(path):
    """Carga un JSON desde disco. Devuelve None si el archivo no existe."""
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ─── main ────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Uso: python generar_examen.py <ruta_test> [plantilla.pptx]")
        sys.exit(1)

    test_dir = sys.argv[1]
    template_path = sys.argv[2] if len(sys.argv) > 2 else TEMPLATE_DEFAULT

    test_name = os.path.basename(test_dir.rstrip("/\\"))
    test_num = re.sub(r"[^0-9]", "", test_name) or "?"

    print(f"Procesando Test {test_num} desde: {test_dir}")

    def load(name):
        return load_json(os.path.join(test_dir, name))

    reading = [load(f"reading{i}.json") for i in range(1, 9)]
    listening = [load(f"listening{i}.json") for i in range(1, 5)]
    writing = [load("writing1.json"), load("writing2.json")]

    prs = Presentation(template_path)
    slides = prs.slides

    def slide(idx):
        return slides[idx] if idx < len(slides) else None

    print("  Procesando diapositiva 1 (portada)...")
    sl = slide(0)
    if sl:
        set_nombre_test(sl, test_num)

    print("  Procesando diapositiva 2 (Reading 1)...")
    sl = slide(1)
    if sl and reading[0]:
        fill_slide_reading1(sl, reading[0], test_num)

    print("  Procesando diapositiva 3 (Reading 2)...")
    sl = slide(2)
    if sl and reading[1]:
        fill_slide_reading2(sl, reading[1], test_num)

    print("  Procesando diapositiva 4 (Reading 3)...")
    sl = slide(3)
    if sl and reading[2]:
        fill_slide_reading3(sl, reading[2], test_num)

    print("  Procesando diapositiva 5 (Reading 4)...")
    sl = slide(4)
    if sl and reading[3]:
        fill_slide_reading4(sl, reading[3], test_num)

    print("  Procesando diapositiva 6 (Reading 5 - texto)...")
    sl = slide(5)
    if sl and reading[4]:
        fill_slide_reading5_texto(sl, reading[4], test_num)

    print("  Procesando diapositiva 7 (Reading 5 - preguntas)...")
    sl = slide(6)
    if sl and reading[4]:
        fill_slide_reading5_preguntas(sl, reading[4], test_num)

    print("  Procesando diapositiva 8 (Reading 6 - texto)...")
    sl = slide(7)
    if sl and reading[5]:
        fill_slide_reading6_texto(sl, reading[5], test_num)

    print("  Procesando diapositiva 9 (Reading 6 - tablas)...")
    sl = slide(8)
    if sl and reading[5]:
        fill_slide_reading6_tablas(sl, reading[5], test_num)

    print("  Procesando diapositiva 10 (Reading 7 - texto)...")
    sl = slide(9)
    if sl and reading[6]:
        fill_slide_reading7_texto(sl, reading[6], test_num)

    print("  Procesando diapositiva 11 (Reading 7 - párrafos)...")
    sl = slide(10)
    if sl and reading[6]:
        fill_slide_reading7_parrafos(sl, reading[6], test_num)

    print("  Procesando diapositiva 12 (Reading 8 - tablas)...")
    sl = slide(11)
    if sl and reading[7]:
        fill_slide_reading8_tablas(sl, reading[7], test_num)

    print("  Procesando diapositiva 13 (Reading 8 - texto)...")
    sl = slide(12)
    if sl and reading[7]:
        fill_slide_reading8_texto(sl, reading[7], test_num)

    print("  Procesando diapositiva 14 (Writing 1)...")
    sl = slide(13)
    if sl and writing[0]:
        fill_slide_writing1(sl, writing[0], test_num)

    print("  Procesando diapositiva 15 (Writing 2)...")
    sl = slide(14)
    if sl and writing[1]:
        fill_slide_writing2(sl, writing[1], test_num)

    print("  Procesando diapositiva 16 (Listening 1)...")
    sl = slide(15)
    if sl and listening[0]:
        fill_slide_listening1(sl, listening[0], test_num)

    print("  Procesando diapositiva 17 (Listening 2)...")
    sl = slide(16)
    if sl and listening[1]:
        fill_slide_listening2(sl, listening[1], test_num)

    print("  Procesando diapositiva 18 (Listening 3)...")
    sl = slide(17)
    if sl and listening[2]:
        fill_slide_listening3(sl, listening[2], test_num)

    print("  Procesando diapositiva 19 (Listening 4)...")
    sl = slide(18)
    if sl and listening[3]:
        fill_slide_listening4(sl, listening[3], test_num)

    print("  Procesando diapositiva 20 (Answer Key Reading)...")
    sl = slide(19)
    if sl:
        fill_slide_answer_reading(sl, test_num, reading)

    print("  Procesando diapositiva 21 (Answer Key Listening)...")
    sl = slide(20)
    if sl:
        fill_slide_answer_listening(sl, test_num, listening)

    output_path = os.path.join(test_dir, f"Test{test_num}_examen.pptx")
    prs.save(output_path)
    print(f"✅ Guardado en: {output_path}")


if __name__ == "__main__":
    main()
