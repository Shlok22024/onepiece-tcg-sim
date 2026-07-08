# AI Spec

## Purpose

Outline the boundaries for the initial computer opponent so AI planning can evolve without being tightly coupled to UI or rule implementation details.

## Current Scope

- Model a single medium-difficulty AI opponent as the first planned target.
- Define basic AI identity and decision result contracts.
- Keep AI inputs and outputs centered on engine state and game actions.

## Explicitly Out Of Scope

- Search algorithms or heuristics.
- Difficulty scaling implementation.
- Bluffing, deck adaptation, or learning systems.
- Performance optimization work.

## Future Expansion Notes

- Add evaluation layers for board state, resource efficiency, and combat pressure.
- Introduce difficulty presets that change planning depth or risk tolerance.
- Provide optional explanation text so the simulator can double as a practice coaching tool.
- Expand to deck-specific policies once 2 to 3 starter practice decks exist.

## Open Questions

- Should early AI act through the same action queue as the human player or through helper shortcuts?
- How much hidden-information simulation should the AI be allowed to perform?
- Will medium difficulty be defined by tactical competence, reduced search depth, or intentionally imperfect heuristics?
