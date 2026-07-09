import { getLegalActions } from '../engine/getLegalActions.ts'
import type { GameState, PlayerId } from '../engine/gameTypes.ts'
import { canPlayerAct, isGameOver } from '../engine/selectors.ts'
import {
  AIDifficulty,
  type AIDecision,
  type AIPlayer,
} from './aiTypes.ts'
import { compareScoredActions, scoreAction } from './scoreAction.ts'

function calculateConfidence(scores: readonly number[]): number {
  if (scores.length <= 1) {
    return 1
  }

  const [bestScore, secondScore] = scores
  const gap = Math.max(0, bestScore - secondScore)

  return Math.min(0.99, 0.55 + gap / 5000)
}

export function createMediumAIPlayer(
  controlledPlayerId: PlayerId,
  displayName: string = 'Medium AI',
): AIPlayer {
  return {
    id: `ai-${controlledPlayerId}`,
    displayName,
    controlledPlayerId,
    difficulty: AIDifficulty.Medium,
    notes:
      'Deterministic heuristic AI that only chooses from getLegalActions and executes through applyAction.',
  }
}

export function chooseMediumAIAction(
  state: GameState,
  aiPlayer: AIPlayer,
): AIDecision {
  if (isGameOver(state)) {
    return {
      chosenAction: null,
      consideredActions: [],
      score: null,
      confidence: 1,
      summary: 'No AI action was chosen because the game is already over.',
    }
  }

  if (state.status !== 'IN_PROGRESS') {
    return {
      chosenAction: null,
      consideredActions: [],
      score: null,
      confidence: 1,
      summary: 'No AI action was chosen because the game has not started yet.',
    }
  }

  const legalActions = getLegalActions(state, aiPlayer.controlledPlayerId)

  if (legalActions.length === 0) {
    return {
      chosenAction: null,
      consideredActions: [],
      score: null,
      confidence: 1,
      summary: canPlayerAct(state, aiPlayer.controlledPlayerId)
        ? 'No AI action was chosen because no legal actions were available.'
        : 'No AI action was chosen because it is not currently this AI player control window.',
    }
  }

  const consideredActions = legalActions
    .map((action) => scoreAction(state, aiPlayer.controlledPlayerId, action))
    .sort(compareScoredActions)
  const bestAction = consideredActions[0]

  return {
    chosenAction: bestAction.action,
    consideredActions,
    score: bestAction.score,
    confidence: calculateConfidence(
      consideredActions.map((candidate) => candidate.score),
    ),
    summary: bestAction.reason,
  }
}
