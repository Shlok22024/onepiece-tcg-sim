# Project Architecture

## Purpose

Define the high-level boundaries for an offline, single-player One Piece TCG practice simulator so future work stays modular, testable, and independent from the React presentation layer.

## Current Scope

- Shared TypeScript models now distinguish static card definitions from mutable in-game card instances.
- `GameState` is the authoritative source of truth for engine-owned state.
- Engine transitions are performed through immutable action handlers rather than direct object mutation.
- The engine now owns a simple turn loop with explicit phases, phase advancement, placeholder DON handling, phase-aware action legality, basic Character card play, and immediate combat resolution.
- Deck input now flows through a dedicated parser, validator, and builder pipeline before entering the engine.

### Proposed Layering

```text
React UI
  -> dispatches legal engine actions
  -> consumes ActionResult and GameState snapshots
Engine and rules services
  -> own GameState, phase validation, DON placeholders, cost payment, combat resolution, and immutable state transitions
Card and deck models
  -> define static source data used to create game instances
  -> parse and validate raw decklists into clean Deck objects
Storage adapters
  -> persist or restore engine snapshots later
```

### Folder Responsibilities

```text
src/ai        AI contracts that must use the same legal GameAction and ActionResult flow as human play
src/cards     Static card definitions and placeholder sample card data
src/deck      Deck definitions, parser, validator, and deck construction helpers
src/engine    Source-of-truth game state, phase flow, actions, combat and cost helpers, logs, errors, and transition helpers
src/rules     Future rule resolution modules layered on top of the engine contract
src/storage   Future local persistence and replay adapters
src/ui        React components that render state and dispatch actions, but never mutate engine state directly
tests         Vitest coverage for engine behavior and future rule modules
docs          Supplemental notes, diagrams, or ADRs
```

## Explicitly Out Of Scope

- Card effects and scripting.
- Full combat extensions such as counters, blockers, triggers, and keywords.
- External card API integration.
- AI gameplay behavior.
- Desktop packaging.

## Future Expansion Notes

- Add application services between UI and engine once match setup and save-state flows exist.
- Add selectors or derived view-model utilities so the UI consumes stable read-only shapes.
- Introduce stricter module boundaries if the engine grows into multiple rule packages.
- Expand AI modules to evaluate and select only legal engine actions instead of special-casing separate AI pathways.
- Replace placeholder card data with a richer local card source before attempting real competitive deck support.
- Build combat, card play, and AI planning on top of the explicit phase engine instead of bypassing it.
- Continue layering board rules into the same action system so future combat and AI logic can reason over legal board-development actions instead of UI-specific shortcuts.
- Split the immediate combat resolution path into a richer battle pipeline later without changing the public action/result contract that the UI and AI will consume.

## Open Questions

- Should future rule expansion remain reducer-like, or split into command handlers per action type?
- Will save states be full `GameState` snapshots, action logs, or both?
- How much engine metadata should eventually be exposed for coaching-style AI explanations?
