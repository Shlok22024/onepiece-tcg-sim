import type { GameAction } from '../engine/actionTypes.ts'
import type { PlayerId } from '../engine/gameTypes.ts'

export enum AIDifficulty {
  Medium = 'MEDIUM',
}

export interface AIPlayer {
  readonly id: string
  readonly displayName: string
  readonly controlledPlayerId: PlayerId
  readonly difficulty: AIDifficulty
  readonly notes?: string
}

export interface AIDecision {
  readonly chosenAction: GameAction | null
  readonly consideredActions: readonly GameAction[]
  readonly confidence: number
  readonly summary: string
}
