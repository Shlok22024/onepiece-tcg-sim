import { createGameError, GameErrorCode, type GameError } from './gameErrors.ts'
import type { PlayerState } from './gameTypes.ts'

export interface PayCostSuccessResult {
  readonly ok: true
  readonly player: PlayerState
  readonly error?: undefined
}

export interface PayCostFailureResult {
  readonly ok: false
  readonly player: PlayerState
  readonly error: GameError
}

export type PayCostResult = PayCostSuccessResult | PayCostFailureResult

export function payCost(player: PlayerState, cost: number): PayCostResult {
  if (cost < 0) {
    return {
      ok: false,
      player,
      error: createGameError(
        GameErrorCode.InvalidAction,
        'Card costs cannot be negative.',
      ),
    }
  }

  if (cost === 0) {
    return {
      ok: true,
      player,
    }
  }

  if (player.activeDon < cost) {
    return {
      ok: false,
      player,
      error: createGameError(
        GameErrorCode.InsufficientDon,
        `The active player needs ${cost} active DON but only has ${player.activeDon}.`,
      ),
    }
  }

  return {
    ok: true,
    player: {
      ...player,
      activeDon: player.activeDon - cost,
      restedDon: player.restedDon + cost,
      totalDonInPlay: player.totalDonInPlay,
    },
  }
}
