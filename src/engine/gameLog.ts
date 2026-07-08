import type { GameAction } from './actionTypes.ts'
import type { GameLogEntry, GameState } from './gameTypes.ts'

export function createGameLogEntry(
  action: GameAction,
  message: string,
  timestamp: number = action.createdAt,
): GameLogEntry {
  return {
    id: `log-${action.id}`,
    actionId: action.id,
    actionType: action.type,
    playerId: action.playerId,
    message,
    timestamp,
  }
}

export function appendGameLog(
  state: GameState,
  entry: GameLogEntry,
): GameState {
  return {
    ...state,
    log: [...state.log, entry],
    updatedAt: entry.timestamp,
  }
}
