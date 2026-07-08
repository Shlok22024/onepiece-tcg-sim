# OPTCG Single Player Practice Simulator

Offline practice simulator foundation for a personal One Piece TCG project. The repository now includes a stricter TypeScript data model, a first non-UI engine contract, and a deck parser and validation pipeline built on placeholder local card data.

## Current Status

- React + TypeScript + Vite project setup is in place, but React gameplay UI is intentionally out of scope for this milestone.
- `GameState` is the engine source of truth and must only change through engine actions.
- A minimal immutable engine contract exists for `START_GAME`, `DRAW_CARD`, and `END_TURN`.
- Decklists can now be parsed, validated, and converted into clean `Deck` objects before they reach the engine.
- Vitest covers engine behavior plus deck parsing and validation rules.
- Card effects, combat, AI gameplay behavior, external card APIs, and real card database integration are still intentionally out of scope.

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- Oxlint

## Scripts

- `npm install` installs dependencies.
- `npm run dev` starts the Vite development server.
- `npm run build` performs a TypeScript build check and production bundle.
- `npm run test` runs the Vitest suite.
- `npm run lint` runs Oxlint.

## Engine Notes

- UI code must call engine actions and consume `ActionResult` values instead of mutating `GameState` directly.
- AI must use the same legal `GameAction` and `ActionResult` system as the human player.
- Card definitions are separate from card instances so future rules can safely manipulate board state.

## Deck Input Notes

- Accepted decklist formats are `4x OP01-001`, `4 OP01-001`, `OP01-001 x4`, and `OP01-001 4`.
- Parsing ignores blank lines, normalizes card ids, and reports line-numbered parse errors instead of throwing.
- Validation currently checks leader count, 50-card main deck size, copy limits, known card ids, and leader color matching.
- The sample card data is placeholder-only and exists strictly for local development and tests.

## Project Layout

```text
src/
  ai/
  cards/
  deck/
  engine/
  rules/
  storage/
  ui/
tests/
docs/
```

Additional planning and milestone notes live in:

- `GAME_ENGINE_SPEC.md`
- `CARD_DATA_SPEC.md`
- `DECK_VALIDATION_SPEC.md`
- `AI_SPEC.md`
- `UI_SPEC.md`
- `PROJECT_ARCHITECTURE.md`

## Next Recommended Step

Add the next engine-facing deck milestone: connect validated deck objects into match setup so `START_GAME` can consume built decks from the parser pipeline instead of inline test fixtures.
