# OPTCG Single Player Practice Simulator

Offline practice simulator foundation for a personal One Piece TCG project. The repository now includes a stricter TypeScript data model and a first non-UI engine contract for future human-versus-AI play.

## Current Status

- React + TypeScript + Vite project setup is in place, but React gameplay UI is intentionally out of scope for this milestone.
- `GameState` is the engine source of truth and must only change through engine actions.
- A minimal immutable engine contract exists for `START_GAME`, `DRAW_CARD`, and `END_TURN`.
- Vitest covers initial state creation, successful action flow, and clean failure results.
- Card effects, combat, deck parsing, AI gameplay behavior, and external card APIs are still intentionally out of scope.

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

Add the first rule-validation layer around the engine contract: setup constraints, basic phase restrictions, and a small set of legal-action builders that both the human flow and future AI can share.
