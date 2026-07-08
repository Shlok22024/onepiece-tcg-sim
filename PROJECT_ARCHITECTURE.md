# Project Architecture

## Purpose

Define the high-level boundaries for an offline, single-player One Piece TCG practice simulator so future work stays modular, testable, and independent from the React presentation layer.

## Current Scope

- Frontend-only application with no backend, database, or desktop wrapper.
- Clear separation between engine state, action contracts, card data definitions, AI planning, storage, and UI rendering.
- TypeScript type modules establish shared language before gameplay logic is introduced.
- Root documentation captures the initial direction and guardrails for later implementation.

### Proposed Layering

```text
React UI
  -> UI view models and presentation helpers
  -> Engine and rules services
  -> Card, deck, and action data contracts
  -> Local persistence adapters
```

### Folder Responsibilities

```text
src/ai        AI contracts and future decision policies
src/cards     Card data models and placeholder sample data
src/deck      Deck definitions and validation-facing types
src/engine    Game state, phases, actions, and orchestration contracts
src/rules     Rule resolution modules and validators
src/storage   Local persistence and save/load adapters
src/ui        React components and UI-only composition
tests         Vitest coverage for engine, rules, and utilities
docs          Supplemental notes, diagrams, or ADRs
```

## Explicitly Out Of Scope

- Full gameplay implementation.
- Real card database ingestion.
- Card effect scripting.
- Matchmaking, online play, accounts, or telemetry.
- Desktop packaging and installer concerns.

## Future Expansion Notes

- Introduce application services that coordinate engine and storage without leaking logic into components.
- Add feature-based test groupings once engine modules exist.
- Consider dedicated folders for selectors, reducers, and sample fixtures when state handling becomes more complex.
- Add import boundaries or path aliases later if the module graph grows enough to justify them.

## Open Questions

- Should the engine eventually use immutable snapshots, command handlers, or a reducer-style state transition model?
- Should saved practice states live as JSON snapshots, replay logs, or both?
- How much AI decision explanation should be exposed to the UI for training-oriented practice modes?
