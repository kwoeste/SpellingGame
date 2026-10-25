# Flashcard curation rule (NotebookLM decks)

NotebookLM exports 50+ raw cards per chapter. Every deck must be curated before
`scripts/nlm-import.ts` copies it into `lib/content/flashcards/<chapterId>.json`.

1. **18–25 cards per chapter.**
2. **Grade-4 level.** Short, plain sentences a 4th grader can read on their own.
3. **Chapter concepts and vocabulary only.** Match the chapter's school concept and vocab list (see the chapter's NotebookLM source `.md`).
4. **Deduplicate.** If a deck has both a bare term card ("Erosion") and a "What is erosion?" card, keep one. Also merge near-identical questions.
5. **Fact-check** every answer against the chapter and a reputable source. Fix or drop anything wrong.
6. **Drop off-topic or too-technical items**, especially ones pulled in from website sources. Examples: ch5 haloclasty, karst, hydrolysis, carbonation, gabion, loess and fjord details; ch3 National Wildlife Federation trivia (Clean Earth Challenge, Native Plant Finder, "1/3 of species").
7. **Light rewording is OK** for clarity, but keep the meaning.
8. **Kid-appropriate, in our own words.** Never copy textbook text. Religion cards must be reverent and Catholic-accurate.

Shape: `[{ "front": string, "back": string }]`, with no other keys. The importer and `tests/content/watch-listen.test.ts` enforce this shape.

Save raw decks (when available) at `/workspace/notebooklm/raw-flashcards/<id>.json` and curated decks at `/workspace/notebooklm/media/<id>/flashcards.json`.
