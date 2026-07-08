# OPTCG Single Player Practice Simulator

Offline practice simulator foundation for a personal One Piece TCG project. This repository currently contains the initial frontend scaffold, placeholder documentation, and TypeScript-first architecture for a future human-vs-AI rules engine.

## Current Status

- React + TypeScript + Vite frontend scaffold is in place.
- Game engine, card, deck, and AI concerns are separated from the UI layer.
- Vitest is configured with a placeholder test.
- No gameplay logic, deck parsing, AI behavior, card effects, or external data integration has been implemented yet.

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
- `npm run test` runs the placeholder Vitest suite.
- `npm run lint` runs Oxlint.

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

Additional project planning lives in the root specification files:

- `GAME_ENGINE_SPEC.md`
- `CARD_DATA_SPEC.md`
- `DECK_VALIDATION_SPEC.md`
- `AI_SPEC.md`
- `UI_SPEC.md`
- `PROJECT_ARCHITECTURE.md`

## Next Recommended Step

Implement a minimal non-UI game loop contract next: define turn setup helpers, zone transitions, and a narrow action dispatcher that can process a handful of rule-safe placeholder actions without card effects.
