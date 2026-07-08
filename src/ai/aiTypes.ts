import type { GameAction } from '../engine/actionTypes.ts'

export enum AIDifficulty {
  Medium = 'MEDIUM',
}

export interface AIPlayer {
  id: string
  displayName: string
  controlledPlayerId: string
  difficulty: AIDifficulty
  notes?: string
}

export interface AIDecision {
  chosenAction: GameAction | null
  confidence: number
  summary: string
  consideredActionTypes: string[]
}
