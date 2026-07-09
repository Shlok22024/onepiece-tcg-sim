import { expect } from 'vitest'

import {
  ActionType,
  type AdvancePhaseAction,
  type DeclareAttackAction,
  type PassCounterAction,
  type ResolveAttackAction,
  type StartGameAction,
  type StartGamePlayerConfig,
} from '../src/engine/actionTypes.ts'
import { applyAction } from '../src/engine/applyAction.ts'
import { createInitialGameState } from '../src/engine/createInitialGameState.ts'
import { Zone, type GameState } from '../src/engine/gameTypes.ts'

export function createPlaceholderPlayers(): readonly [
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
        leaderCardId: 'OP01-001',
        mainDeck: [
          { cardId: 'OP01-101', quantity: 8 },
          { cardId: 'OP01-102', quantity: 4 },
          { cardId: 'OP01-103', quantity: 2 },
          { cardId: 'OP01-108', quantity: 1 },
          { cardId: 'OP01-110', quantity: 2 },
          { cardId: 'OP01-112', quantity: 1 },
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
        leaderCardId: 'OP01-002',
        mainDeck: [
          { cardId: 'OP02-101', quantity: 12 },
          { cardId: 'OP01-104', quantity: 2 },
          { cardId: 'OP01-102', quantity: 2 },
          { cardId: 'OP02-102', quantity: 2 },
        ],
        source: 'LOCAL_PLACEHOLDER',
      },
    },
  ]
}

export function createStartGameAction(
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

export function createAdvancePhaseAction(
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

export function createDeclareAttackAction(
  playerId: string,
  attackerInstanceId: string,
  targetInstanceId: string,
  createdAt: number,
): DeclareAttackAction {
  return {
    id: `declare-${createdAt}`,
    type: ActionType.DeclareAttack,
    playerId,
    createdAt,
    payload: {
      attackerInstanceId,
      targetInstanceId,
    },
  }
}

export function createPassCounterAction(
  playerId: string,
  createdAt: number,
): PassCounterAction {
  return {
    id: `pass-counter-${createdAt}`,
    type: ActionType.PassCounter,
    playerId,
    createdAt,
  }
}

export function createResolveAttackAction(
  playerId: string,
  createdAt: number,
): ResolveAttackAction {
  return {
    id: `resolve-${createdAt}`,
    type: ActionType.ResolveAttack,
    playerId,
    createdAt,
  }
}

export function createStartedGameState(): GameState {
  const initialState = createInitialGameState({ gameId: 'game-1', now: 10 })
  const startResult = applyAction(
    initialState,
    createStartGameAction(createPlaceholderPlayers()),
  )

  expect(startResult.ok).toBe(true)

  return startResult.ok ? startResult.state : initialState
}

export function advanceToMainPhase(
  state: GameState = createStartedGameState(),
): GameState {
  const toDon = applyAction(
    state,
    createAdvancePhaseAction('player-1', 'advance-to-don', 200),
  )
  expect(toDon.ok).toBe(true)
  if (!toDon.ok) {
    return state
  }

  const toMain = applyAction(
    toDon.state,
    createAdvancePhaseAction('player-1', 'advance-to-main', 210),
  )
  expect(toMain.ok).toBe(true)

  return toMain.ok ? toMain.state : toDon.state
}

export function advanceToMainPhaseWithDrawnCard(): GameState {
  const startedState = createStartedGameState()
  const drawResult = applyAction(startedState, {
    id: 'draw-before-main',
    type: ActionType.DrawCard,
    playerId: 'player-1',
    createdAt: 220,
  })
  expect(drawResult.ok).toBe(true)

  return advanceToMainPhase(drawResult.ok ? drawResult.state : startedState)
}

export function seedCharacterOnBoard(
  state: GameState,
  playerId: string,
  cardId: string,
  isRested: boolean = false,
): { readonly state: GameState; readonly instanceId: string } {
  const sourceInstanceId = state.players[playerId].zones[Zone.Deck][0]

  return {
    state: {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          zones: {
            ...state.players[playerId].zones,
            [Zone.Deck]: state.players[playerId].zones[Zone.Deck].slice(1),
            [Zone.CharacterArea]: [
              ...state.players[playerId].zones[Zone.CharacterArea],
              sourceInstanceId,
            ],
          },
        },
      },
      cardInstances: {
        ...state.cardInstances,
        [sourceInstanceId]: {
          ...state.cardInstances[sourceInstanceId],
          cardId,
          zone: Zone.CharacterArea,
          isRested,
        },
      },
    },
    instanceId: sourceInstanceId,
  }
}
