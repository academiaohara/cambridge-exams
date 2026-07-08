# Legacy migration — fidelity improvements (non-blocking)

## Option B: visible word bank on `free_text_gap_fill`

**Status:** Pending — does not block pilot approval or batch migration.

**Context:** Legacy `bold-swap` exercises (e.g. C1 Unit2 ex. C) show a shared word
bank (`words[]`) while the student replaces the bold wrong word in each sentence.
Pilot uses **Option A**: `bold-swap` → `error_correction` with
`highlightedText` = wrong bold word; the exercise is playable but the bank is not
shown.

**Proposed improvement:** When `exercise.words` / `wordBank` is present on a
gap-fill screen, render a chip row (reuse `.sp-passage-wordbank` / `.sp-verb-bank`
patterns from `passage_gap_fill`) above the sentence. Optional tap-to-fill into
the active gap.

**Affected legacy patterns:** `bold-swap`, some word-bank cloze items without
passage (e.g. B1 Unit4 F could show bank chips for reference).

**Acceptance:** C1 Unit2 ex. C displays 11 bank words; student can tap or type;
validation unchanged.
