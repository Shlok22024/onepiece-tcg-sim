# Game Engine Spec

## Purpose

Define the core state model and action flow for an offline single-player simulator where a human player can practice against a computer opponent.

## Current Scope

- Establish shared TypeScript contracts for game state, player state, phases, and actions.
- Keep engine concepts independent from React components and rendering concerns.
- Support a future turn-based flow with human and AI participants.
- Reserve space for core rules-first implementation before individual card effects.

## Explicitly Out Of Scope

- Full rule enforcement.
- Effect timing windows and stack-like sequencing.
- Combat resolution details.
- Randomization helpers, replay systems, and save/load logic.

## Future Expansion Notes

- Add state transition functions for setup, turn progression, combat, and win conditions.
- Introduce deterministic action logs for testing and replay support.
- Model hidden information carefully so AI and UI consume the same authoritative state with different visibility rules.
- Expand player zones to reflect the full OPTCG board structure once rules implementation begins.

## Open Questions

- Will the engine use a single reducer, command bus, or phase-specific handlers?
- How should hidden information be represented for AI decision-making versus player rendering?
- Should invalid actions be prevented before dispatch, rejected by the engine, or both?
