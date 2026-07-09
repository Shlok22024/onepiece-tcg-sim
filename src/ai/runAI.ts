import type { ActionResult } from '../engine/actionTypes.ts'
import { applyAction } from '../engine/applyAction.ts'
import type { GameState } from '../engine/gameTypes.ts'
import { canPlayerAct, isGameOver } from '../engine/selectors.ts'
import {
  type AIRunResult,
  type AIDecision,
  type AIStepResult,
  type AIPlayer,
  type RunAIUntilStopOptions,
} from './aiTypes.ts'
import { chooseMediumAIAction } from './mediumAI.ts'

const defaultMaxSteps = 32

export function runAIStep(
  state: GameState,
  aiPlayer: AIPlayer,
): AIStepResult {
  const decision = chooseMediumAIAction(state, aiPlayer)

  if (decision.chosenAction === null) {
    return {
      previousState: state,
      state,
      decision,
      actionResult: null,
      stoppedReason: decision.summary,
    }
  }

  const actionResult = applyAction(state, decision.chosenAction)

  return {
    previousState: state,
    state: actionResult.state,
    decision,
    actionResult,
    stoppedReason: actionResult.ok
      ? decision.summary
      : `${decision.summary} ${actionResult.error.message}`,
  }
}

export function runAIUntilHumanTurn(
  initialState: GameState,
  aiPlayer: AIPlayer,
  options: RunAIUntilStopOptions = {},
): AIRunResult {
  const maxSteps = options.maxSteps ?? defaultMaxSteps
  const steps: AIStepResult[] = []
  const decisions: AIDecision[] = []
  const results: ActionResult[] = []
  let state = initialState

  if (maxSteps <= 0) {
    return {
      state,
      steps,
      decisions,
      results,
      stoppedReason: 'Stopped before running because the AI max-step guard was set to zero.',
    }
  }

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    if (isGameOver(state)) {
      return {
        state,
        steps,
        decisions,
        results,
        stoppedReason: 'Stopped because the game is already over.',
      }
    }

    if (!canPlayerAct(state, aiPlayer.controlledPlayerId)) {
      return {
        state,
        steps,
        decisions,
        results,
        stoppedReason:
          state.turn.activePlayerId === aiPlayer.controlledPlayerId
            ? 'Stopped because the AI player can no longer act in the current state.'
            : 'Stopped because control has returned to the human or another player.',
      }
    }

    const step = runAIStep(state, aiPlayer)
    steps.push(step)
    decisions.push(step.decision)

    if (step.actionResult === null) {
      return {
        state,
        steps,
        decisions,
        results,
        stoppedReason: step.stoppedReason,
      }
    }

    const actionResult = step.actionResult
    results.push(actionResult)
    state = step.state

    if (!actionResult.ok) {
      return {
        state,
        steps,
        decisions,
        results,
        stoppedReason: step.stoppedReason,
      }
    }

    if (isGameOver(state)) {
      return {
        state,
        steps,
        decisions,
        results,
        stoppedReason: 'Stopped because the AI action ended the game.',
      }
    }

    if (!canPlayerAct(state, aiPlayer.controlledPlayerId)) {
      return {
        state,
        steps,
        decisions,
        results,
        stoppedReason:
          state.turn.activePlayerId === aiPlayer.controlledPlayerId
            ? 'Stopped because the AI player has no further legal response window.'
            : 'Stopped because the turn moved out of AI control.',
      }
    }
  }

  return {
    state,
    steps,
    decisions,
    results,
    stoppedReason: `Stopped after reaching the AI max-step guard of ${maxSteps} actions.`,
  }
}
