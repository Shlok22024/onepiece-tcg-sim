import type { ActionResult, GameAction } from '../engine/actionTypes.ts'
import type { GameState, PlayerId } from '../engine/gameTypes.ts'

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

export interface AIScoredAction {
  readonly action: GameAction
  readonly score: number
  readonly reason: string
}

export interface AIDecision {
  readonly chosenAction: GameAction | null
  readonly consideredActions: readonly AIScoredAction[]
  readonly score: number | null
  readonly confidence: number
  readonly summary: string
}

export interface AIStepResult {
  readonly previousState: GameState
  readonly state: GameState
  readonly decision: AIDecision
  readonly actionResult: ActionResult | null
  readonly stoppedReason: string
}

export interface RunAIUntilStopOptions {
  readonly maxSteps?: number
}

export interface AIRunResult {
  readonly state: GameState
  readonly steps: readonly AIStepResult[]
  readonly decisions: readonly AIDecision[]
  readonly results: readonly ActionResult[]
  readonly stoppedReason: string
}
