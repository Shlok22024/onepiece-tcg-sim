# Project Architecture

## Purpose

Define the high-level boundaries for an offline, single-player One Piece TCG practice simulator so future work stays modular, testable, and independent from the React presentation layer.

## Current Scope

- Shared TypeScript models now distinguish static card definitions from mutable in-game card instances.
- `GameState` is the authoritative source of truth for engine-owned state.
- Engine transitions are performed through immutable action handlers rather than direct object mutation.
- The initial engine milestone is intentionally non-UI and limited to `START_GAME`, `DRAW_CARD`, and `END_TURN`.

### Proposed Layering

```text
React UI
  -> dispatches legal engine actions
  -> consumes ActionResult and GameState snapshots
Engine and rules services
  -> own GameState, action validation, and immutable state transitions
Card and deck models
  -> define static source data used to create game instances
Storage adapters
  -> persist or restore engine snapshots later
```

### Folder Responsibilities

```text
src/ai        AI contracts that must use the same legal GameAction and ActionResult flow as human play
src/cards     Static card definitions and placeholder sample data shapes
src/deck      Deck definitions and future validation-facing types
src/engine    Source-of-truth game state, actions, logs, errors, and transition helpers
src/rules     Future rule resolution modules layered on top of the engine contract
src/storage   Future local persistence and replay adapters
src/ui        React components that render state and dispatch actions, but never mutate engine state directly
tests         Vitest coverage for engine behavior and future rule modules
docs          Supplemental notes, diagrams, or ADRs
```

## Explicitly Out Of Scope

- Card effects and scripting.
- Combat resolution.
- External card API integration.
- Deck importing or parsing workflows.
- AI gameplay behavior.
- Desktop packaging.

## Future Expansion Notes

- Add application services between UI and engine once match setup and save-state flows exist.
- Add selectors or derived view-model utilities so the UI consumes stable read-only shapes.
- Introduce stricter module boundaries if the engine grows into multiple rule packages.
- Expand AI modules to evaluate and select only legal engine actions instead of special-casing separate AI pathways.

## Open Questions

- Should future rule expansion remain reducer-like, or split into command handlers per action type?
- Will save states be full `GameState` snapshots, action logs, or both?
- How much engine metadata should eventually be exposed for coaching-style AI explanations?
