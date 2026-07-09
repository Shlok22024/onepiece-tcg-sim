# AI Spec

## Purpose

Outline the boundaries for the initial computer opponent so AI planning can evolve without being tightly coupled to UI or rule implementation details.

## Current Scope

- Model a single medium-difficulty AI opponent as the first planned target.
- Define typed AI identity, scored-decision, single-step, and turn-runner contracts.
- Keep AI inputs and outputs centered on engine state and game actions.
- Require AI to inspect state through engine selectors and discover candidate moves through `getLegalActions` instead of inventing moves ad hoc.
- Require AI to execute every chosen action through `applyAction` and consume the resulting `ActionResult`.
- Ship a deterministic Medium AI v1 heuristic with these priorities:
  pass counter if required
  resolve queued combat when legal
  draw during `DRAW`
  advance through non-`MAIN` phases
  during `MAIN`, prefer lethal leader attacks, then favorable rested-character battles, then leader pressure, then the best affordable Character play, then phase advance or turn end
- Support debug-only AI controls in the current React harness through `Run AI Step` and `Run AI Turn`.

## Explicitly Out Of Scope

- Search algorithms deeper than the current one-step heuristic ordering.
- Difficulty scaling implementation.
- Bluffing, deck adaptation, or learning systems.
- Machine learning or self-play training.
- Card-effect-aware planning.
- Hidden-information simulation beyond the current fully visible debug state.
- Performance optimization work.

## Future Expansion Notes

- Continue building AI planning on top of selectors plus `getLegalActions` before adding any bespoke evaluation logic.
- Add richer evaluation layers for board state, resource efficiency, combat pressure, and future counter windows.
- Introduce difficulty presets that change planning depth or risk tolerance.
- Keep explanation text available so the simulator can double as a practice coaching tool.
- Expand to deck-specific policies once 2 to 3 starter practice decks exist.
- Add optional auto-run hooks in the UI once the debug surface is stable enough for repeated AI turns.

## Open Questions

- How much selector-level hidden-information filtering will AI need once imperfect-information play matters?
- How much hidden-information simulation should the AI be allowed to perform?
- Should later AI milestones stay deterministic for testing, or add optional seeded variation?
- When combat gains blockers, counters, and effects, should AI reasoning stay score-based or move to small tree search?
