#!/usr/bin/env python3
"""Fix C1 reading8.json files: key order, correct remapping, evidence markers."""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

MARKER_RE = re.compile(r'\[(\d+)\](.*?)\[/\1\]', re.DOTALL)
HEADER_RE = re.compile(r'###\s*(.+?)(?:\n|$)')
EXPL_NAME_RE = re.compile(r"([A-Za-z][A-Za-z'-]+)\s*\(([A-D])\)")

LETTERS = ['A', 'B', 'C', 'D']


def fix_json_text(raw: str) -> str:
    """Remove trailing commas before } in texts block (invalid JSON)."""
    return re.sub(r',(\s*)\}(\s*,\s*"questions")', r'\1}\2', raw)


def extract_person_names(text: str) -> list[str]:
    m = HEADER_RE.search(text or '')
    if not m:
        return []
    title = m.group(1).strip()
    names: list[str] = []
    paren = re.search(r'\(([^)]+)\)', title)
    if paren:
        names.append(paren.group(1).strip())
    before_comma = title.split(',')[0].strip()
    before_paren = before_comma.split('(')[0].strip()
    if before_paren and before_paren not in names:
        names.append(before_paren)
    first_word = title.split()[0] if title.split() else ''
    if first_word and first_word not in names and first_word.lower() != 'the':
        names.append(first_word)
    return names


def build_person_letter_map(questions: list) -> dict[str, str]:
    """Map person first-name -> intended letter from explanations."""
    person_letters: dict[str, str] = {}
    for q in questions:
        for m in EXPL_NAME_RE.finditer(q.get('explanation', '')):
            name, letter = m.group(1), m.group(2)
            person_letters.setdefault(name, letter)
    return person_letters


def match_person_to_letter(names: list[str], person_letters: dict[str, str]) -> str | None:
    for name in names:
        if name in person_letters:
            return person_letters[name]
        for expl_name, letter in person_letters.items():
            if name.lower() == expl_name.lower():
                return letter
            if name.lower().startswith(expl_name.lower()) or expl_name.lower().startswith(name.lower()):
                return letter
    return None


def reorder_texts(texts: dict, questions: list) -> tuple[dict, dict[str, str]]:
    """Return reordered texts (A-D) and old_key -> new_key mapping."""
    letter_keys = [k for k in texts if k in LETTERS]
    if letter_keys == LETTERS:
        return {k: texts[k] for k in LETTERS}, {k: k for k in LETTERS}

    person_letters = build_person_letter_map(questions)
    if len(person_letters) < 4:
        # Cannot reliably reorder; keep content but sort keys A-D alphabetically by key only
        ordered = {k: texts[k] for k in sorted(letter_keys)}
        mapping = {k: k for k in letter_keys}
        return ordered, mapping

    old_key_for_person: dict[str, str] = {}
    for old_key in letter_keys:
        names = extract_person_names(texts[old_key])
        letter = match_person_to_letter(names, person_letters)
        if letter:
            old_key_for_person[letter] = old_key

    if len(old_key_for_person) != 4:
        ordered = {k: texts[k] for k in LETTERS if k in texts}
        return ordered, {k: k for k in letter_keys}

    new_texts = {letter: texts[old_key_for_person[letter]] for letter in LETTERS}
    old_to_new = {old: new for new, old in old_key_for_person.items()}
    return new_texts, old_to_new


def remap_correct(correct: str, old_to_new: dict[str, str]) -> str:
    return old_to_new.get(correct, correct)


def strip_markers(text: str) -> str:
    return MARKER_RE.sub(r'\2', text)


def close_unclosed_markers(text: str) -> str:
    """Close [n]... markers missing [/n] (common at paragraph ends)."""
    def fix_segment(s: str) -> str:
        m = re.search(r'\[(\d+)\]([^\[]+)$', s)
        if not m:
            return s
        qnum, content = m.group(1), m.group(2)
        if f'[/{qnum}]' in content:
            return s
        return s[: m.start()] + f'[{qnum}]{content}[/{qnum}]'

    return fix_segment(text)


def keep_only_markers(text: str, keep_qnums: set[int]) -> str:
    def repl(m: re.Match) -> str:
        qnum = int(m.group(1))
        inner = m.group(2)
        if qnum in keep_qnums:
            return f'[{qnum}]{inner}[/{qnum}]'
        return inner
    return MARKER_RE.sub(repl, text)


def fix_file(fp: Path, folder_test: str) -> dict:
    raw = fp.read_text(encoding='utf-8')
    raw_fixed = fix_json_text(raw)
    data = json.loads(raw_fixed)

    content = data.setdefault('content', {})
    texts = content.get('texts', {})

    # Test50-style: questions nested inside texts
    nested_questions = None
    if isinstance(texts, dict) and 'questions' in texts:
        nested_questions = texts.pop('questions')
        content['texts'] = texts

    if nested_questions and not content.get('questions'):
        content['questions'] = nested_questions

    questions = content.get('questions', [])
    if not questions:
        raise ValueError('no questions')

    # Reorder texts and remap correct
    texts, old_to_new = reorder_texts(texts, questions)
    for q in questions:
        if q.get('correct'):
            q['correct'] = remap_correct(q['correct'], old_to_new)

    # Keep evidence markers only in the correct-answer paragraph
    markers_by_letter: dict[str, set[int]] = defaultdict(set)
    for q in questions:
        correct = q.get('correct', '')
        if correct in LETTERS:
            markers_by_letter[correct].add(q['number'])

    for letter in LETTERS:
        if letter not in texts:
            continue
        texts[letter] = close_unclosed_markers(texts[letter])
        keep = markers_by_letter.get(letter, set())
        texts[letter] = keep_only_markers(texts[letter], keep)

    content['texts'] = texts

    # Fix metadata to match folder
    if data.get('examId') != folder_test:
        data['examId'] = folder_test
    expected_id = f'{folder_test}-reading-8'
    if data.get('id') != expected_id:
        data['id'] = expected_id

    return data


def audit(data: dict) -> list[str]:
    issues = []
    texts = data['content']['texts']
    questions = data['content']['questions']
    keys = [k for k in texts if k in LETTERS]
    if keys != LETTERS:
        issues.append(f'keys={keys}')

    markers_by_q: dict[int, set[str]] = {}
    for letter in LETTERS:
        for m in MARKER_RE.finditer(texts.get(letter, '')):
            markers_by_q.setdefault(int(m.group(1)), set()).add(letter)

    for q in questions:
        found = markers_by_q.get(q['number'], set())
        correct = q.get('correct', '')
        if len(found) > 1:
            issues.append(f"Q{q['number']}: multi {sorted(found)}")
        elif correct and found and correct not in found:
            issues.append(f"Q{q['number']}: correct={correct} markers={sorted(found)}")
        elif correct and not found:
            issues.append(f"Q{q['number']}: no markers correct={correct}")
    return issues


def main() -> int:
    root = Path('Nivel/C1/Exams')
    files = sorted(root.glob('Test*/reading8.json'), key=lambda p: int(p.parts[-2].replace('Test', '')))
    changed = 0
    errors = []

    for fp in files:
        folder_test = fp.parts[-2]
        try:
            original = fp.read_text(encoding='utf-8')
            fixed = fix_file(fp, folder_test)
            new_text = json.dumps(fixed, ensure_ascii=False, indent=2) + '\n'
            remaining = audit(fixed)
            if new_text != original or remaining:
                if remaining:
                    errors.append((folder_test, remaining))
                fp.write_text(new_text, encoding='utf-8')
                changed += 1
        except Exception as e:
            errors.append((folder_test, [str(e)]))

    print(f'Processed {len(files)} files, wrote {changed}')
    if errors:
        print(f'Remaining issues in {len(errors)} files:')
        for test, iss in errors[:20]:
            print(f'  {test}: {iss[:5]}')
        return 1
    print('All files OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
