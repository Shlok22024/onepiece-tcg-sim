import { describe, expect, it } from 'vitest'

import {
  ActionType,
  type DrawCardAction,
  type EndTurnAction,
  type StartGameAction,
  type StartGamePlayerConfig,
  type UnsupportedGameAction,
} from '../src/engine/actionTypes.ts'
import { applyAction } from '../src/engine/applyAction.ts'
import { createInitialGameState } from '../src/engine/createInitialGameState.ts'
import { GameErrorCode } from '../src/engine/gameErrors.ts'
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

function createStartedGameState() {
  const initialState = createInitialGameState({ gameId: 'game-1', now: 10 })
  const players = createPlaceholderPlayers()
  const startResult = applyAction(initialState, createStartGameAction(players))

  expect(startResult.ok).toBe(true)

  return startResult.ok ? startResult.state : initialState
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
    expect(state.log).toEqual([])
  })
})

describe('applyAction', () => {
  it('START_GAME works with placeholder decks', () => {
    const initialState = createInitialGameState({ gameId: 'game-1', now: 0 })
    const players = createPlaceholderPlayers()
    const action = createStartGameAction(players)

    const result = applyAction(initialState, action)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.status).toBe('IN_PROGRESS')
    expect(result.state.playerOrder).toEqual(['player-1', 'player-2'])
    expect(result.state.turn.activePlayerId).toBe('player-1')
    expect(result.state.turn.turnNumber).toBe(1)
    expect(result.state.players['player-1'].zones[Zone.Deck]).toHaveLength(3)
    expect(result.state.players['player-2'].zones[Zone.Leader]).toHaveLength(1)
  })

  it('DRAW_CARD moves one card from deck to hand', () => {
    const startedState = createStartedGameState()
    const action: DrawCardAction = {
      id: 'action-draw',
      type: ActionType.DrawCard,
      playerId: 'player-1',
      createdAt: 200,
    }

    const result = applyAction(startedState, action)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-1'].zones[Zone.Deck]).toHaveLength(2)
    expect(result.state.players['player-1'].zones[Zone.Hand]).toHaveLength(1)
    const drawnCardId = result.state.players['player-1'].zones[Zone.Hand][0]
    expect(result.state.cardInstances[drawnCardId].zone).toBe(Zone.Hand)
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
      createdAt: 300,
    }

    const result = applyAction(emptiedState, action)

    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }

    expect(result.error.code).toBe(GameErrorCode.EmptyDeck)
    expect(result.error.message).toContain('deck is empty')
  })

  it('END_TURN changes the active player and advances the round on wraparound', () => {
    const startedState = createStartedGameState()
    const firstEndTurn: EndTurnAction = {
      id: 'action-end-1',
      type: ActionType.EndTurn,
      playerId: 'player-1',
      createdAt: 400,
    }

    const firstResult = applyAction(startedState, firstEndTurn)

    expect(firstResult.ok).toBe(true)
    if (!firstResult.ok) {
      return
    }

    expect(firstResult.state.turn.activePlayerId).toBe('player-2')
    expect(firstResult.state.turn.turnNumber).toBe(1)

    const secondEndTurn: EndTurnAction = {
      id: 'action-end-2',
      type: ActionType.EndTurn,
      playerId: 'player-2',
      createdAt: 500,
    }
    const secondResult = applyAction(firstResult.state, secondEndTurn)

    expect(secondResult.ok).toBe(true)
    if (!secondResult.ok) {
      return
    }

    expect(secondResult.state.turn.activePlayerId).toBe('player-1')
    expect(secondResult.state.turn.turnNumber).toBe(2)
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

    const invalidAction: DrawCardAction = {
      id: 'action-invalid-player',
      type: ActionType.DrawCard,
      playerId: 'player-2',
      createdAt: 610,
    }
    const invalidResult = applyAction(startedState, invalidAction)

    expect(invalidResult.ok).toBe(false)
    if (!invalidResult.ok) {
      expect(invalidResult.error.code).toBe(GameErrorCode.NotActivePlayer)
    }
  })

  it('successful actions add game log entries', () => {
    const initialState = createInitialGameState({ gameId: 'game-1', now: 0 })
    const startResult = applyAction(
      initialState,
      createStartGameAction(createPlaceholderPlayers()),
    )

    expect(startResult.ok).toBe(true)
    if (!startResult.ok) {
      return
    }

    expect(startResult.state.log).toHaveLength(1)
    expect(startResult.state.log[0].actionType).toBe(ActionType.StartGame)

    const drawAction: DrawCardAction = {
      id: 'action-draw-log',
      type: ActionType.DrawCard,
      playerId: 'player-1',
      createdAt: 700,
    }
    const drawResult = applyAction(startResult.state, drawAction)

    expect(drawResult.ok).toBe(true)
    if (!drawResult.ok) {
      return
    }

    expect(drawResult.state.log).toHaveLength(2)
    expect(drawResult.state.log[1].actionType).toBe(ActionType.DrawCard)
    expect(drawResult.state.log[1].message).toContain('drew one card')
  })
})
