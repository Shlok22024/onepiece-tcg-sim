# Game Engine Spec

## Purpose

Define the current non-UI game engine contract for an offline single-player simulator where a human player can practice against a computer opponent.

## Current Scope

- `GameState` is the engine source of truth for turn order, player zones, card instances, placeholder DON counts, battle state, combat outcomes, and engine logs.
- Card definitions are separate from in-game card instances so future rules can operate on board state without mutating source card data.
- The engine currently supports eight immutable actions in the active flow: `START_GAME`, `ADVANCE_PHASE`, `DRAW_CARD`, `PLAY_CARD`, `DECLARE_ATTACK`, `PASS_COUNTER`, `RESOLVE_ATTACK`, and `END_TURN`.
- Every engine action returns an `ActionResult` so callers receive either the next valid state or a structured failure.
- Successful actions append a `GameLogEntry` to the authoritative game state.
- A read-only selector layer now exposes safe engine queries such as active player lookups, zone inspection, battle inspection, and card-definition resolution without mutating state.
- `getLegalActions(state, playerId)` now centralizes currently legal high-level action discovery for UI and AI consumers, while `applyAction` remains the final rule authority.
- Card instances now track `instanceId`, `zone`, `rested` status, and `attachedDonCount`, while card definitions remain immutable source data.
- Battle state is now explicit and tracks attacker, defender, target type, turn number, current battle step, placeholder counter power, and whether the defender still has a counter response window.
- Phase sequence is currently:
  first turn starts in `DRAW`
  later turns start in `REFRESH`
  then progress `REFRESH -> DRAW -> DON -> MAIN -> END`
- `ADVANCE_PHASE` moves through that ordered sequence and rejects attempts to advance from `END` or `SETUP`.
- `END_TURN` is currently legal only from `MAIN` or `END`, switches the active player, resets the next turn to `REFRESH`, and fails if a battle is still unresolved.
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
- Combat now uses a structured placeholder battle pipeline:
  `DECLARE_ATTACK` is only legal during `MAIN`
  attackers must belong to the active player, be active, and target the opposing Leader or an opposing rested Character
  `DECLARE_ATTACK` rests the attacker, stores battle state, and opens a counter window for the defending player
  `PASS_COUNTER` is the only counter-window response implemented in this milestone and moves the battle to `READY_TO_RESOLVE`
  `RESOLVE_ATTACK` is only legal after the counter window closes and clears battle state after applying combat results
  a second attack cannot be declared while a battle is unresolved
  `ADVANCE_PHASE` and `END_TURN` both fail while a battle is unresolved
- Vanilla battle resolution is intentionally preserved:
  Character-vs-Character battles use printed base power only
  `counterPowerAdded` exists as a placeholder field but stays at `0` in this milestone
  leader damage removes one life card to hand
  attacking a leader at zero life ends the game
- Legal action generation currently covers:
  `DRAW_CARD`
  `ADVANCE_PHASE`
  `END_TURN`
  `PLAY_CARD`
  `DECLARE_ATTACK`
  `PASS_COUNTER`
  `RESOLVE_ATTACK`
- `START_GAME` is intentionally not part of normal legal-action generation because it is a match setup concern rather than an in-progress turn action.
- KO handling currently moves defeated Characters from `CHARACTER_AREA` to `TRASH` and records a combat log entry.
- Game over state now records `gameOver`, `winnerId`, `loserId`, and `endReason`.

## Explicitly Out Of Scope

- Card effects and effect resolution.
- Real counter cards, blockers, and trigger timing.
- Full OPTCG setup rules, mulligans, life setup, and detailed DON!! attachment or payment rules.
- Event and Stage play behavior.
- Keywords such as Rush, Double Attack, and Banish.
- React gameplay UI.
- External card APIs.
- Desktop packaging.
- AI combat decision making.
- Hidden-information filtering for separate human and AI views.

## Future Expansion Notes

- Add legality validation for more action types while keeping the same `GameAction` and `ActionResult` contract for both human and AI players.
- Expand selectors into richer filtered views once hidden-information rules and UI read models become necessary.
- Expand phase handling beyond the current placeholder flow once more rules are implemented.
- Replace count-only DON tracking with card-level DON state once attachment and payment rules exist.
- Extend `PLAY_CARD` into full board development rules such as stage play, event resolution, and future board-size constraints.
- Extend the placeholder counter window into real counter card play, power modification, and defender choice sequencing.
- Extend combat into a fuller battle pipeline with blockers, triggers, and keyword handling layered on the same battle state model.
- Introduce replay-friendly action metadata and richer engine logs for debugging and training use cases.
- Add hidden-information views so the same `GameState` can remain authoritative while UI and AI consume filtered perspectives.

## Open Questions

- Should later rule modules sit behind one central dispatcher or phase-specific action handlers?
- How much action metadata should eventually live beside `GameAction` versus being derived from selectors for UI display?
- When card effects arrive, should they produce chained `ActionResult` objects or separate effect resolution events?
- How much initial game setup should be baked into `START_GAME` versus separate setup actions?
