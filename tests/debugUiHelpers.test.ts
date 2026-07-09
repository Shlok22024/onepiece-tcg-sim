import { describe, expect, it } from 'vitest'

import { ActionType } from '../src/engine/actionTypes.ts'
import { applyAction } from '../src/engine/applyAction.ts'
import { createInitialGameState } from '../src/engine/createInitialGameState.ts'
import { getLegalActions } from '../src/engine/getLegalActions.ts'
import { createDebugStartGameAction } from '../src/ui/debugGameSetup.ts'
import { describeLegalAction } from '../src/ui/describeLegalAction.ts'
import {
  advanceToMainPhase,
  advanceToMainPhaseWithDrawnCard,
  createPassCounterAction,
} from './engineTestHelpers.ts'

describe('debug UI helpers', () => {
  it('creates a buildable placeholder start game action', () => {
    const action = createDebugStartGameAction(1234)

    expect(action.type).toBe(ActionType.StartGame)
    expect(action.payload.players).toHaveLength(2)
    expect(action.payload.players[0].deck.mainDeck.reduce((total, entry) => total + entry.quantity, 0)).toBe(50)
    expect(action.payload.players[1].deck.mainDeck.reduce((total, entry) => total + entry.quantity, 0)).toBe(50)
  })

  it('describes play-card legal actions with readable labels', () => {
    const state = advanceToMainPhaseWithDrawnCard()
    const playAction = getLegalActions(state, 'player-1').find(
      (action) => action.type === ActionType.PlayCard,
    )

    expect(playAction).toBeDefined()
    if (playAction === undefined) {
      return
    }

    expect(describeLegalAction(state, playAction)).toMatch(/^Play /)
  })

  it('describes battle actions with readable labels', () => {
    const mainState = advanceToMainPhase()
    const declareAction = getLegalActions(mainState, 'player-1').find(
      (action) => action.type === ActionType.DeclareAttack,
    )

    expect(declareAction).toBeDefined()
    if (declareAction === undefined) {
      return
    }

    expect(describeLegalAction(mainState, declareAction)).toContain('Attack Leader')

    const declareResult = applyAction(mainState, declareAction)
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const passResult = applyAction(
      declareResult.state,
      createPassCounterAction('player-2', 600),
    )
    expect(passResult.ok).toBe(true)
    if (!passResult.ok) {
      return
    }

    const resolveAction = getLegalActions(passResult.state, 'player-1').find(
      (action) => action.type === ActionType.ResolveAttack,
    )

    expect(resolveAction).toBeDefined()
    if (resolveAction === undefined) {
      return
    }

    expect(describeLegalAction(passResult.state, resolveAction)).toContain(
      'Resolve Attack',
    )
  })

  it('start game action succeeds against a fresh initial engine state', () => {
    const initialState = createInitialGameState({ gameId: 'debug-test', now: 50 })
    const result = applyAction(initialState, createDebugStartGameAction(60))

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.status).toBe('IN_PROGRESS')
  })
})
