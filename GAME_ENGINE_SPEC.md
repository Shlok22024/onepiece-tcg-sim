# Game Engine Spec

## Purpose

Define the current non-UI game engine contract for an offline single-player simulator where a human player can practice against a computer opponent.

## Current Scope

- `GameState` is the engine source of truth for turn order, player zones, card instances, placeholder DON counts, combat outcomes, and engine logs.
- Card definitions are separate from in-game card instances so future rules can operate on board state without mutating source card data.
- The engine currently supports seven immutable actions in the active flow: `START_GAME`, `ADVANCE_PHASE`, `DRAW_CARD`, `PLAY_CARD`, `DECLARE_ATTACK`, `RESOLVE_ATTACK`, and `END_TURN`.
- Every engine action returns an `ActionResult` so callers receive either the next valid state or a structured failure.
- Successful actions append a `GameLogEntry` to the authoritative game state.
- Card instances now track `instanceId`, `zone`, `rested` status, and `attachedDonCount`, while card definitions remain immutable source data.
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
- Basic card play is intentionally narrow in this milestone:
  only the active player may `PLAY_CARD`
  `PLAY_CARD` is only legal during `MAIN`
  only Character cards may be played
  cost payment spends active DON by moving it to rested DON
  played cards move from hand to `CHARACTER_AREA`
- Board zones currently modeled in the engine are `LEADER`, `DECK`, `HAND`, `LIFE`, `TRASH`, `CHARACTER_AREA`, and `STAGE_AREA`, with stage behavior still out of scope.
- Combat flow is intentionally immediate in this milestone:
  `DECLARE_ATTACK` and `RESOLVE_ATTACK` both resolve the full battle immediately
  attackers must belong to the active player, be active, and attack during `MAIN`
  legal targets are the opposing Leader or an opposing rested Character
  attackers become rested when the attack succeeds
  Character-vs-Character battles use printed base power only
  leader damage removes one life card to hand
  attacking a leader at zero life ends the game
- KO handling currently moves defeated Characters from `CHARACTER_AREA` to `TRASH` and records a combat log entry.
- Game over state now records `gameOver`, `winnerId`, `loserId`, and `endReason`.

## Explicitly Out Of Scope

- Card effects and effect resolution.
- Counter windows, blockers, and trigger timing.
- Full OPTCG setup rules, mulligans, life setup, and detailed DON!! attachment or payment rules.
- Event and Stage play behavior.
- Keywords such as Rush, Double Attack, and Banish.
- React gameplay UI.
- External card APIs.
- Desktop packaging.

## Future Expansion Notes

- Add legality validation for more action types while keeping the same `GameAction` and `ActionResult` contract for both human and AI players.
- Expand phase handling beyond the current placeholder flow once more rules are implemented.
- Replace count-only DON tracking with card-level DON state once attachment and payment rules exist.
- Extend `PLAY_CARD` into full board development rules such as stage play, event resolution, and future board-size constraints.
- Extend combat into a multi-step battle pipeline with counter windows, blockers, triggers, and keyword handling.
- Introduce replay-friendly action metadata and richer engine logs for debugging and training use cases.
- Add hidden-information views so the same `GameState` can remain authoritative while UI and AI consume filtered perspectives.

## Open Questions

- Should later rule modules sit behind one central dispatcher or phase-specific action handlers?
- When card effects arrive, should they produce chained `ActionResult` objects or separate effect resolution events?
- How much initial game setup should be baked into `START_GAME` versus separate setup actions?
