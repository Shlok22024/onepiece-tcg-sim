import { describe, expect, it } from 'vitest'

import {
  ActionType,
  type AdvancePhaseAction,
  type DrawCardAction,
  type EndTurnAction,
  type StartGameAction,
  type StartGamePlayerConfig,
  type UnsupportedGameAction,
} from '../src/engine/actionTypes.ts'
import { applyAction } from '../src/engine/applyAction.ts'
import { createInitialGameState } from '../src/engine/createInitialGameState.ts'
import { GameErrorCode } from '../src/engine/gameErrors.ts'
import { GamePhase } from '../src/engine/phaseTypes.ts'
import { Zone } from '../src/engine/gameTypes.ts'

function createPlaceholderPlayers(): readonly [
  StartGamePlayerConfig,
  StartGamePlayerConfig,
] {
  return [
    {
      id: 'player-1',
      displayName: 'Player One',
      isHuman: true,
      deck: {
        id: 'deck-1',
        name: 'Straw Hat Practice',
        leaderCardId: 'leader-luffy',
        mainDeck: [
          { cardId: 'char-zoro', quantity: 2 },
          { cardId: 'event-guard-point', quantity: 1 },
        ],
        source: 'LOCAL_PLACEHOLDER',
      },
    },
    {
      id: 'player-2',
      displayName: 'Player Two',
      isHuman: false,
      deck: {
        id: 'deck-2',
        name: 'Navy Practice',
        leaderCardId: 'leader-smoker',
        mainDeck: [
          { cardId: 'char-tashigi', quantity: 2 },
          { cardId: 'event-white-out', quantity: 1 },
        ],
        source: 'LOCAL_PLACEHOLDER',
      },
    },
  ]
}

function createStartGameAction(
  players: readonly [StartGamePlayerConfig, StartGamePlayerConfig],
): StartGameAction {
  return {
    id: 'action-start',
    type: ActionType.StartGame,
    playerId: players[0].id,
    createdAt: 100,
    payload: { players },
  }
}

function createAdvancePhaseAction(
  playerId: string,
  id: string,
  createdAt: number,
): AdvancePhaseAction {
  return {
    id,
    type: ActionType.AdvancePhase,
    playerId,
    createdAt,
  }
}

function createStartedGameState() {
  const initialState = createInitialGameState({ gameId: 'game-1', now: 10 })
  const players = createPlaceholderPlayers()
  const startResult = applyAction(initialState, createStartGameAction(players))

  expect(startResult.ok).toBe(true)

  return startResult.ok ? startResult.state : initialState
}

function advanceToMainPhase() {
  let state = createStartedGameState()

  const firstAdvance = applyAction(
    state,
    createAdvancePhaseAction('player-1', 'advance-1', 200),
  )
  expect(firstAdvance.ok).toBe(true)
  if (!firstAdvance.ok) {
    return state
  }

  state = firstAdvance.state

  const secondAdvance = applyAction(
    state,
    createAdvancePhaseAction('player-1', 'advance-2', 210),
  )
  expect(secondAdvance.ok).toBe(true)
  if (!secondAdvance.ok) {
    return state
  }

  return secondAdvance.state
}

describe('createInitialGameState', () => {
  it('creates a not-started game state with no players', () => {
    const state = createInitialGameState({ gameId: 'game-1', now: 5 })

    expect(state.id).toBe('game-1')
    expect(state.status).toBe('NOT_STARTED')
    expect(state.phase).toBe('SETUP')
    expect(state.playerOrder).toEqual([])
    expect(state.turn.activePlayerId).toBeNull()
    expect(state.turn.turnNumber).toBe(0)
    expect(state.turn.hasPerformedNormalDraw).toBe(false)
    expect(state.log).toEqual([])
  })
})

describe('applyAction', () => {
  it('game starts in draw phase after START_GAME', () => {
    const initialState = createInitialGameState({ gameId: 'game-1', now: 0 })
    const result = applyAction(
      initialState,
      createStartGameAction(createPlaceholderPlayers()),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.status).toBe('IN_PROGRESS')
    expect(result.state.phase).toBe(GamePhase.Draw)
    expect(result.state.turn.activePlayerId).toBe('player-1')
    expect(result.state.turn.turnNumber).toBe(1)
    expect(result.state.players['player-1'].donDeckCount).toBe(10)
  })

  it('ADVANCE_PHASE follows the valid phase order', () => {
    const startedState = createStartedGameState()

    const toDon = applyAction(
      startedState,
      createAdvancePhaseAction('player-1', 'advance-don', 200),
    )
    expect(toDon.ok).toBe(true)
    if (!toDon.ok) {
      return
    }

    expect(toDon.state.phase).toBe(GamePhase.Don)

    const toMain = applyAction(
      toDon.state,
      createAdvancePhaseAction('player-1', 'advance-main', 210),
    )
    expect(toMain.ok).toBe(true)
    if (!toMain.ok) {
      return
    }

    expect(toMain.state.phase).toBe(GamePhase.Main)

    const toEnd = applyAction(
      toMain.state,
      createAdvancePhaseAction('player-1', 'advance-end', 220),
    )
    expect(toEnd.ok).toBe(true)
    if (!toEnd.ok) {
      return
    }

    expect(toEnd.state.phase).toBe(GamePhase.End)
  })

  it('ADVANCE_PHASE rejects invalid transitions', () => {
    const mainState = advanceToMainPhase()
    const endResult = applyAction(
      mainState,
      createAdvancePhaseAction('player-1', 'advance-end', 230),
    )
    expect(endResult.ok).toBe(true)
    if (!endResult.ok) {
      return
    }

    const invalidAdvance = applyAction(
      endResult.state,
      createAdvancePhaseAction('player-1', 'advance-invalid', 240),
    )

    expect(invalidAdvance.ok).toBe(false)
    if (!invalidAdvance.ok) {
      expect(invalidAdvance.error.code).toBe(
        GameErrorCode.InvalidPhaseTransition,
      )
    }
  })

  it('DRAW_CARD is only legal in draw phase', () => {
    const startedState = createStartedGameState()
    const legalDraw: DrawCardAction = {
      id: 'draw-legal',
      type: ActionType.DrawCard,
      playerId: 'player-1',
      createdAt: 300,
    }

    const legalResult = applyAction(startedState, legalDraw)

    expect(legalResult.ok).toBe(true)
    if (!legalResult.ok) {
      return
    }

    expect(legalResult.state.players['player-1'].zones[Zone.Hand]).toHaveLength(1)
    expect(legalResult.state.turn.hasPerformedNormalDraw).toBe(true)

    const donState = applyAction(
      createStartedGameState(),
      createAdvancePhaseAction('player-1', 'advance-don-illegal', 310),
    )
    expect(donState.ok).toBe(true)
    if (!donState.ok) {
      return
    }

    const illegalDraw = applyAction(donState.state, {
      id: 'draw-illegal',
      type: ActionType.DrawCard,
      playerId: 'player-1',
      createdAt: 320,
    })

    expect(illegalDraw.ok).toBe(false)
    if (!illegalDraw.ok) {
      expect(illegalDraw.error.code).toBe(GameErrorCode.IllegalPhaseAction)
    }
  })

  it('END_TURN switches the active player', () => {
    const mainState = advanceToMainPhase()
    const action: EndTurnAction = {
      id: 'end-turn',
      type: ActionType.EndTurn,
      playerId: 'player-1',
      createdAt: 400,
    }

    const result = applyAction(mainState, action)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.turn.activePlayerId).toBe('player-2')
    expect(result.state.turn.turnNumber).toBe(1)
    expect(result.state.phase).toBe(GamePhase.Refresh)
    expect(result.state.turn.hasPerformedNormalDraw).toBe(false)
  })

  it('END_TURN rejects if used in an illegal phase', () => {
    const startedState = createStartedGameState()
    const action: EndTurnAction = {
      id: 'end-illegal',
      type: ActionType.EndTurn,
      playerId: 'player-1',
      createdAt: 410,
    }

    const result = applyAction(startedState, action)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.IllegalPhaseAction)
    }
  })

  it('DON phase adds up to 2 DON', () => {
    const startedState = createStartedGameState()
    const result = applyAction(
      startedState,
      createAdvancePhaseAction('player-1', 'advance-don', 500),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.phase).toBe(GamePhase.Don)
    expect(result.state.players['player-1'].activeDon).toBe(2)
    expect(result.state.players['player-1'].restedDon).toBe(0)
    expect(result.state.players['player-1'].totalDonInPlay).toBe(2)
    expect(result.state.players['player-1'].donDeckCount).toBe(8)
  })

  it('DON cannot exceed 10 total DON in play', () => {
    const startedState = createStartedGameState()
    const cappedState = {
      ...startedState,
      players: {
        ...startedState.players,
        'player-1': {
          ...startedState.players['player-1'],
          activeDon: 4,
          restedDon: 6,
          totalDonInPlay: 10,
          donDeckCount: 3,
        },
      },
    }
    const result = applyAction(
      cappedState,
      createAdvancePhaseAction('player-1', 'advance-don-cap', 510),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-1'].activeDon).toBe(4)
    expect(result.state.players['player-1'].restedDon).toBe(6)
    expect(result.state.players['player-1'].totalDonInPlay).toBe(10)
    expect(result.state.players['player-1'].donDeckCount).toBe(3)
  })

  it('REFRESH readies rested DON', () => {
    const mainState = advanceToMainPhase()
    const preparedState = {
      ...mainState,
      players: {
        ...mainState.players,
        'player-2': {
          ...mainState.players['player-2'],
          activeDon: 1,
          restedDon: 3,
          totalDonInPlay: 4,
        },
      },
    }
    const result = applyAction(preparedState, {
      id: 'end-for-refresh',
      type: ActionType.EndTurn,
      playerId: 'player-1',
      createdAt: 520,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.phase).toBe(GamePhase.Refresh)
    expect(result.state.players['player-2'].activeDon).toBe(4)
    expect(result.state.players['player-2'].restedDon).toBe(0)
    expect(result.state.players['player-2'].totalDonInPlay).toBe(4)
  })

  it('DRAW_CARD from an empty deck fails cleanly', () => {
    const startedState = createStartedGameState()
    const emptiedState = {
      ...startedState,
      players: {
        ...startedState.players,
        'player-1': {
          ...startedState.players['player-1'],
          zones: {
            ...startedState.players['player-1'].zones,
            [Zone.Deck]: [],
          },
        },
      },
    }
    const action: DrawCardAction = {
      id: 'action-draw-empty',
      type: ActionType.DrawCard,
      playerId: 'player-1',
      createdAt: 530,
    }

    const result = applyAction(emptiedState, action)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.EmptyDeck)
    }
  })

  it('unsupported or invalid actions fail cleanly', () => {
    const startedState = createStartedGameState()
    const unsupportedAction: UnsupportedGameAction = {
      id: 'action-play-card',
      type: ActionType.PlayCard,
      playerId: 'player-1',
      createdAt: 600,
      payload: { test: true },
    }

    const unsupportedResult = applyAction(startedState, unsupportedAction)

    expect(unsupportedResult.ok).toBe(false)
    if (!unsupportedResult.ok) {
      expect(unsupportedResult.error.code).toBe(GameErrorCode.UnsupportedAction)
    }
  })

  it('successful phase actions add game log entries', () => {
    const initialState = createInitialGameState({ gameId: 'game-1', now: 0 })
    const startResult = applyAction(
      initialState,
      createStartGameAction(createPlaceholderPlayers()),
    )

    expect(startResult.ok).toBe(true)
    if (!startResult.ok) {
      return
    }

    const advanceResult = applyAction(
      startResult.state,
      createAdvancePhaseAction('player-1', 'advance-log', 700),
    )

    expect(advanceResult.ok).toBe(true)
    if (!advanceResult.ok) {
      return
    }

    expect(advanceResult.state.log).toHaveLength(2)
    expect(advanceResult.state.log[0].actionType).toBe(ActionType.StartGame)
    expect(advanceResult.state.log[1].actionType).toBe(ActionType.AdvancePhase)
  })
})
