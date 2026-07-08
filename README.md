# OPTCG Single Player Practice Simulator

Offline practice simulator foundation for a personal One Piece TCG project. The repository now includes a stricter TypeScript data model, a phase-based non-UI engine contract, basic Character card play with DON cost payment, and a deck parser and validation pipeline built on placeholder local card data.

## Current Status

- React + TypeScript + Vite project setup is in place, but React gameplay UI is intentionally out of scope for this milestone.
- `GameState` is the engine source of truth and must only change through engine actions.
- The engine now supports `START_GAME`, `ADVANCE_PHASE`, `DRAW_CARD`, `PLAY_CARD`, and `END_TURN` with phase-aware legality checks.
- Decklists can now be parsed, validated, and converted into clean `Deck` objects before they reach the engine.
- The turn loop currently uses explicit phases and placeholder DON behavior to prepare for future combat and AI work.
- Basic board development is now possible through Character card play from hand during `MAIN`.
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
- Current phase order is:
  first turn starts in `DRAW`
  later turns start in `REFRESH`
  then proceed `REFRESH -> DRAW -> DON -> MAIN -> END`
- `END_TURN` currently switches players only from `MAIN` or `END`.
- Entering `DON` grants up to 2 DON from the DON deck, capped at 10 DON in play.
- Entering `REFRESH` readies rested DON.
- `PLAY_CARD` currently supports only Character cards from hand during `MAIN`, and cost payment moves active DON to rested DON.
- Supported board-facing zones are `LEADER`, `HAND`, `DECK`, `LIFE`, `TRASH`, `CHARACTER_AREA`, and placeholder `STAGE_AREA`.
- Card effects, Stage play, Event play, combat, and AI behavior are still not implemented yet.

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

Connect validated deck objects into match setup so `START_GAME` consumes built decks from the parser pipeline, then add the next board-rule milestone: controlled stage/event support or basic combat setup on top of this cost-paying card-play system.
