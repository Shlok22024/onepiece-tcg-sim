import type { GameId, GameState } from './gameTypes.ts'
import { GamePhase } from './phaseTypes.ts'

export interface CreateInitialGameStateOptions {
  readonly gameId?: GameId
  readonly now?: number
}

export function createInitialGameState(
  options: CreateInitialGameStateOptions = {},
): GameState {
  const now = options.now ?? Date.now()

  return {
    id: options.gameId ?? `game-${now}`,
    status: 'NOT_STARTED',
    phase: GamePhase.Setup,
    players: {},
    playerOrder: [],
    cardInstances: {},
    turn: {
      activePlayerId: null,
      activePlayerIndex: null,
      turnNumber: 0,
      hasPerformedNormalDraw: false,
    },
    log: [],
    createdAt: now,
    updatedAt: now,
  }
}
