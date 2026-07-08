# Deck Validation Spec

## Purpose

Define the first real deck input pipeline for practice decks: parse raw decklists, validate basic legality, and produce clean `Deck` objects for the game engine.

## Current Scope

- Raw decklists currently accept these line formats:
  `4x OP01-001`
  `4 OP01-001`
  `OP01-001 x4`
  `OP01-001 4`
- Parsing ignores blank lines, trims whitespace, normalizes card ids, and reports parse problems with original line numbers.
- Validation currently checks:
  exactly 1 Leader
  exactly 50 main deck cards
  no more than 4 copies of the same non-Leader card
  all card ids exist in the local placeholder card database
  main deck cards match the Leader color rules
  Leader cards do not appear in the main deck
- `buildDeckFromList` returns parsed entries, parse errors, validation errors, and a `Deck` object only when the full pipeline is valid.

## Explicitly Out Of Scope

- Banned or restricted lists.
- Format rotation.
- DON!! deck validation.
- Alternate art equivalency rules.
- Complex leader-specific deckbuilding rules.
- Banlist support.
- User-facing deck builder workflows.

## Future Expansion Notes

- Support named deck metadata blocks or import/export formats once the project needs richer persistence.
- Add legality helpers for future real card database integration while keeping parse and validation layers separate.
- Introduce fixture decks for multiple practice archetypes once the first starter decks are chosen.
- Consider separate schemas for saved user decks versus internal engine-ready decks.

## Open Questions

- Should future deck importers preserve comments and sections for round-tripping user deck files?
- Will saved practice decks eventually live as TypeScript fixtures, JSON files, or user-authored text blobs?
- How should DON!! deck handling be modeled once full setup rules are introduced?
