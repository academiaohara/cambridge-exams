#!/usr/bin/env python3
"""Generate instruction-translation-bundles.json for all web languages."""
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent / 'instruction-translation-bundles.json'

LANGS = {
    'en': None,
    'es': 'es',
    'fr': 'fr',
    'pt': 'pt',
    'de': 'de',
    'it': 'it',
    'ca': 'ca',
    'pl': 'pl',
    'ru': 'ru',
    'zh': 'zh-CN',
    'ar': 'ar',
    'ja': 'ja',
    'ko': 'ko',
}

BOOK_TO_WEB = {
    'Circle the correct word.': 'Tap the correct word.',
    'Circle the correct word or phrase.': 'Tap the correct word or phrase.',
    'Circle the correct phrase.': 'Tap the correct phrase.',
    'Circle the correct option in each sentence.': 'Tap the correct option in each sentence.',
    'Circle the correct modal phrase in each sentence.': 'Tap the correct modal phrase in each sentence.',
    'Circle the correct question tag in each sentence.': 'Tap the correct question tag in each sentence.',
    'Drag each word to the correct box.': 'Tap each word and assign it to the correct box.',
    'Each of the words in bold is in the wrong sentence. Write the correct words on the lines.': 'Each bold word is in the wrong sentence. Type the correct word for each line.',
    'Each of the words in bold is in the wrong sentence. Rewrite them correctly.': 'Each bold word is in the wrong sentence. Type the correct word for each line.',
    'If a line is correct, put a tick (✓). If there is an extra word in a line, write the word.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'If a line is correct, put a tick (✓). If there is an extra word, write it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'If a line is correct, click OK. If there is an extra word in a line, click on it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'If a line is correct, press OK. If there is an extra word, write it.': 'If the line is correct, tap OK. If there is an extra word, tap it.',
    'Choose the sentence that uses to or for correctly. Click A or B.': 'Choose the sentence that uses to or for correctly. Tap A or B.',
    'Read the text. Some lines contain one extra word that should not be there. Click the extra word. If a line is correct, leave it as it is.': 'Some lines contain one extra word. Tap the extra word. If a line is correct, tap OK.',
    'If the word or phrase in bold is correct, put OK. If it is incorrect, rewrite it correctly on the line.': 'If the word or phrase in bold is correct, tap OK. If it is incorrect, rewrite it correctly.',
    'Complete the crossword. All the answers are words in bold in exercise B.': 'Solve the crossword. The answers are the bold words from the previous exercise.',
    'Phrasal verbs with out, such as puzzle out, are often connected to the idea of finding information. Which of these phrasal verbs with out are also connected to this idea?': 'Phrasal verbs with out often relate to finding information. Tap the ones that fit this meaning.',
    'The prefix il-, as in illogical, is often used to make a positive word negative. Which of the words in bold in the following sentences are negative forms of positive words? Write YES or NO.': 'The prefix il- makes positive words negative. Tap YES or NO for each bold word.',
}


def normalize(text: str) -> str:
    raw = text.strip()
    if not raw:
        return ''
    if raw in BOOK_TO_WEB:
        return BOOK_TO_WEB[raw]
    out = raw
    out = re.sub(r'\bCircle the\b', 'Tap the', out)
    out = re.sub(r'\bput a tick\b', 'tap OK', out, flags=re.I)
    out = re.sub(r'\bput OK\b', 'tap OK', out)
    out = re.sub(r'\bClick on\b', 'Tap', out)
    out = re.sub(r'\bClick the\b', 'Tap the', out)
    out = re.sub(r'\bClick A or B\b', 'Tap A or B', out)
    out = re.sub(r'\bDrag each\b', 'Tap each', out)
    out = re.sub(r'\bon the lines?\b', 'in the gap', out, flags=re.I)
    out = re.sub(r'\bwrite the correct words on the lines\b', 'type the correct word for each line', out, flags=re.I)
    return out


def protect(text: str):
    placeholders = {}

    def repl(m):
        key = f'__PH{len(placeholders)}__'
        placeholders[key] = m.group(0)
        return key

    protected = re.sub(r'[A-D](?:\s*[–-]\s*[A-G])?|\([A-D]\)|\bOK\b|YES|NO|–|✓', repl, text)
    return protected, placeholders


def restore(text: str, placeholders: dict) -> str:
    for key, val in placeholders.items():
        text = text.replace(key, val)
    return text


def translate_one(text: str, target: str) -> str:
    protected, ph = protect(text)
    try:
        translated = GoogleTranslator(source='en', target=target).translate(protected)
        return restore(translated, ph)
    except Exception as e:
        print(f'  warn {target}: {text[:40]!r} -> {e}', flush=True)
        return text


def translate_lang(strings, target):
    if target is None:
        return {s: s for s in strings}
    result = {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(translate_one, s, target): s for s in strings}
        done = 0
        for fut in as_completed(futures):
            s = futures[fut]
            result[s] = fut.result()
            done += 1
            if done % 25 == 0:
                print(f'    {done}/{len(strings)}', flush=True)
    return result


def walk_v2_files(dir_path: Path):
    for p in dir_path.rglob('*.v2.json'):
        yield p


def collect_strings():
    strings = set()
    course = ROOT / 'data' / 'Course'
    for file in walk_v2_files(course):
        data = json.loads(file.read_text())

        def visit(node):
            if isinstance(node, dict):
                si = node.get('studentInstruction')
                if isinstance(si, str):
                    n = normalize(si)
                    if n:
                        strings.add(n)
                for v in node.values():
                    visit(v)
            elif isinstance(node, list):
                for item in node:
                    visit(item)

        visit(data)

    for level in ('B1', 'B2', 'C1'):
        defaults = ROOT / 'Nivel' / level / 'exercise-defaults.json'
        if defaults.exists():
            data = json.loads(defaults.read_text())
            for part in data.values():
                if isinstance(part, dict) and part.get('description'):
                    strings.add(part['description'])
    return sorted(strings)


def main():
    strings = collect_strings()
    print(f'Translating {len(strings)} strings into {len(LANGS)} languages...', flush=True)
    bundles = {}
    for lang_key, google_target in LANGS.items():
        print(f'  {lang_key}...', flush=True)
        bundles[lang_key] = translate_lang(strings, google_target)
    OUT.write_text(json.dumps(bundles, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {OUT}', flush=True)


if __name__ == '__main__':
    main()
