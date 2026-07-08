# Deck Validation Spec

## Purpose

Define the future validation rules and data boundaries for practice decks without implementing deck parsing or enforcement logic yet.

## Current Scope

- Establish shared deck and deck-entry contracts.
- Reserve structure for leader cards, main deck contents, and optional metadata.
- Support a small future library of practice decks built from placeholder or curated local data.

## Explicitly Out Of Scope

- Deck import formats.
- Automatic rule validation.
- Banlist support.
- User-facing deck builder workflows.

## Future Expansion Notes

- Add validation helpers for card counts, leader constraints, and color matching.
- Support versioned deck definitions so practice lists stay compatible with engine changes.
- Introduce fixture decks for tests before building a full deck management interface.
- Consider separate schemas for saved user decks versus internal simulation-ready decks.

## Open Questions

- Should deck validation produce a boolean result, structured errors, or both?
- Will placeholder practice decks be stored as TypeScript modules or local JSON files?
- How should DON!! deck handling be represented once deck assembly rules are enforced?
