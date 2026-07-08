# Game Engine Spec

## Purpose

Define the first non-UI game engine contract for an offline single-player simulator where a human player can practice against a computer opponent.

## Current Scope

- `GameState` is the engine source of truth for turn order, player zones, card instances, and engine logs.
- Card definitions are separate from in-game card instances so future rules can operate on board state without mutating source card data.
- The engine currently supports only three immutable placeholder actions: `START_GAME`, `DRAW_CARD`, and `END_TURN`.
- Every engine action returns an `ActionResult` so callers receive either the next valid state or a structured failure.
- Successful actions append a `GameLogEntry` to the authoritative game state.
- Turn counting currently starts at `1` for the first active player and increments only when turn order wraps back to the first player in `playerOrder`.

## Explicitly Out Of Scope

- Card effects and effect resolution.
- Combat rules and attack sequencing.
- Full OPTCG setup rules, mulligans, life setup, and DON!! handling.
- React gameplay UI.
- External card APIs.
- Desktop packaging.

## Future Expansion Notes

- Add legality validation for more action types while keeping the same `GameAction` and `ActionResult` contract for both human and AI players.
- Expand phase handling beyond the current placeholder flow once more rules are implemented.
- Introduce replay-friendly action metadata and richer engine logs for debugging and training use cases.
- Add hidden-information views so the same `GameState` can remain authoritative while UI and AI consume filtered perspectives.

## Open Questions

- Should later rule modules sit behind one central dispatcher or phase-specific action handlers?
- When card effects arrive, should they produce chained `ActionResult` objects or separate effect resolution events?
- How much initial game setup should be baked into `START_GAME` versus separate setup actions?
