# Game Engine Spec

## Purpose

Define the current non-UI game engine contract for an offline single-player simulator where a human player can practice against a computer opponent.

## Current Scope

- `GameState` is the engine source of truth for turn order, player zones, card instances, placeholder DON counts, and engine logs.
- Card definitions are separate from in-game card instances so future rules can operate on board state without mutating source card data.
- The engine currently supports four immutable placeholder actions: `START_GAME`, `ADVANCE_PHASE`, `DRAW_CARD`, and `END_TURN`.
- Every engine action returns an `ActionResult` so callers receive either the next valid state or a structured failure.
- Successful actions append a `GameLogEntry` to the authoritative game state.
- Phase sequence is currently:
  first turn starts in `DRAW`
  later turns start in `REFRESH`
  then progress `REFRESH -> DRAW -> DON -> MAIN -> END`
- `ADVANCE_PHASE` moves through that ordered sequence and rejects attempts to advance from `END` or `SETUP`.
- `END_TURN` is currently legal only from `MAIN` or `END`, switches the active player, and resets the next turn to `REFRESH`.
- Turn counting starts at `1` for the first active player and increments only when turn order wraps back to the first player in `playerOrder`.
- Placeholder DON behavior is intentionally simple:
  entering `DON` grants up to 2 DON from the DON deck
  total DON in play cannot exceed 10
  entering `REFRESH` readies rested DON

## Explicitly Out Of Scope

- Card effects and effect resolution.
- Combat rules and attack sequencing.
- Full OPTCG setup rules, mulligans, life setup, and detailed DON!! attachment or payment rules.
- React gameplay UI.
- External card APIs.
- Desktop packaging.

## Future Expansion Notes

- Add legality validation for more action types while keeping the same `GameAction` and `ActionResult` contract for both human and AI players.
- Expand phase handling beyond the current placeholder flow once more rules are implemented.
- Replace count-only DON tracking with card-level DON state once attachment and payment rules exist.
- Introduce replay-friendly action metadata and richer engine logs for debugging and training use cases.
- Add hidden-information views so the same `GameState` can remain authoritative while UI and AI consume filtered perspectives.

## Open Questions

- Should later rule modules sit behind one central dispatcher or phase-specific action handlers?
- When card effects arrive, should they produce chained `ActionResult` objects or separate effect resolution events?
- How much initial game setup should be baked into `START_GAME` versus separate setup actions?
