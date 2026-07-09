# OPTCG Single Player Practice Simulator

Offline practice simulator foundation for a personal One Piece TCG project. The repository now includes a stricter TypeScript data model, a phase-based non-UI engine contract, a read-only selector layer, centralized legal action generation, a debug gameplay UI for manual engine testing, a deterministic Medium AI v1 opponent, basic Character card play with DON cost payment, a structured battle flow with a placeholder counter window, and a deck parser and validation pipeline built on placeholder local card data.

## Current Status

- React + TypeScript + Vite project setup is in place, and the app now opens a debug-only gameplay UI for manual engine validation.
- `GameState` is the engine source of truth and must only change through engine actions.
- The engine now supports `START_GAME`, `ADVANCE_PHASE`, `DRAW_CARD`, `PLAY_CARD`, `DECLARE_ATTACK`, `PASS_COUNTER`, `RESOLVE_ATTACK`, and `END_TURN` with phase-aware legality checks.
- The engine now exposes pure selectors plus `getLegalActions(state, playerId)` so future UI and AI layers can inspect state and discover legal moves without duplicating rule logic.
- Medium AI v1 now reads the same `GameState`, selectors, and legal action list as the human side, then executes through `applyAction`.
- Decklists can now be parsed, validated, and converted into clean `Deck` objects before they reach the engine.
- The turn loop currently uses explicit phases and placeholder DON behavior to prepare for future combat and AI work.
- Basic board development is now possible through Character card play from hand during `MAIN`.
- The combat layer now supports attack declaration, a placeholder counter-response window, vanilla power comparison, life damage, KO movement to trash, and game-over detection.
- The debug UI now includes `Run AI Step` and `Run AI Turn` controls plus visible AI reasoning text for verification.
- Vitest covers engine behavior, deck parsing and validation, AI heuristics, and debug UI helpers.
- Real counter cards, card effects, blockers, machine learning, external card APIs, and real card database integration are still intentionally out of scope.

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- Oxlint

## Scripts

- `npm install` installs dependencies.
- `npm run dev` starts the Vite development server and opens the debug gameplay UI.
- `npm run build` performs a TypeScript build check and production bundle.
- `npm run test` runs the Vitest suite.
- `npm run lint` runs Oxlint.

## Engine Notes

- UI code must call engine actions and consume `ActionResult` values instead of mutating `GameState` directly.
- UI should use selectors and `getLegalActions` instead of scattering raw state traversal and legality checks across components.
- AI must use the same legal `GameAction` and `ActionResult` system as the human player, and it should discover candidate moves through `getLegalActions`.
- `applyAction` remains the final rule authority even when selectors and legal action helpers are available.
- The current React UI is a debug harness, not the final production match interface.
- Medium AI v1 is deterministic and heuristic-driven, not random and not ML-based.
- Card definitions are separate from card instances so future rules can safely manipulate board state.
- `GameState.battle` is now the source of truth for any unresolved attack and prevents phase changes or turn ending until the battle is resolved.
- Current phase order is:
  first turn starts in `DRAW`
  later turns start in `REFRESH`
  then proceed `REFRESH -> DRAW -> DON -> MAIN -> END`
- `END_TURN` currently switches players only from `MAIN` or `END`, and it fails if a battle is unresolved.
- Entering `DON` grants up to 2 DON from the DON deck, capped at 10 DON in play.
- Entering `REFRESH` readies rested DON.
- `PLAY_CARD` currently supports only Character cards from hand during `MAIN`, and cost payment moves active DON to rested DON.
- Supported board-facing zones are `LEADER`, `HAND`, `DECK`, `LIFE`, `TRASH`, `CHARACTER_AREA`, and placeholder `STAGE_AREA`.
- Combat currently follows a small battle pipeline:
  `DECLARE_ATTACK` validates the attack, rests the attacker, stores battle state, and opens a counter window for the defender
  `PASS_COUNTER` is the only counter response implemented right now and moves the battle to ready-to-resolve
  `RESOLVE_ATTACK` applies vanilla battle rules and clears the battle state
  unresolved battles block `ADVANCE_PHASE`, `END_TURN`, and new attack declarations
  Character-vs-Character battles still use base power only
  `counterPowerAdded` is present in battle state but remains a placeholder set to `0`
  leader damage moves one life card to hand
  attacking a leader at zero life ends the game
- `getLegalActions` currently generates in-progress actions for:
  `DRAW_CARD`
  `ADVANCE_PHASE`
  `END_TURN`
  `PLAY_CARD`
  `DECLARE_ATTACK`
  `PASS_COUNTER`
  `RESOLVE_ATTACK`
- `START_GAME` is intentionally left out of normal legal action generation because it belongs to match setup rather than live turn flow.
- The debug UI uses plain text rendering only and includes no copyrighted card images or official logos.
- Current Medium AI priorities are:
  pass counter when required
  resolve queued attacks
  draw during `DRAW`
  advance through non-`MAIN` phases
  during `MAIN`, prefer lethal leader attacks, then favorable rested-character battles, then leader attacks, then the best affordable Character play, then phase advance or turn end
- Counter cards, blockers, keywords, card effects, Stage/Event play, and polished production UI are still not implemented yet.

## Debug UI Notes

- Use the `Start Debug Game` button to seed a placeholder mirror match from local sample card data.
- The action panel renders buttons from `getLegalActions` for each player, while `applyAction` still validates every action before state changes.
- `Run AI Step` executes one legal AI action, while `Run AI Turn` repeats AI actions until control leaves the AI window, the game ends, no legal action remains, or a safety step guard is reached.
- The debug surface shows the latest AI reasoning text so heuristic choices can be inspected while testing.
- The current surface is intentionally limited: it is meant for engine verification, not polished gameplay presentation.
- Both players currently use the same validated placeholder red practice deck because the local sample card pool is still intentionally small.

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

Implement real counter-card play and defender battle choices on top of the current battle state, legal action generator, and AI contract so the counter window becomes interactive before moving on to blockers, triggers, and card effects.
