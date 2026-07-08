import { describe, expect, it } from 'vitest'

import {
  ActionType,
  type AdvancePhaseAction,
  type DeclareAttackAction,
  type DrawCardAction,
  type PlayCardAction,
  type ResolveAttackAction,
  type StartGameAction,
  type StartGamePlayerConfig,
  type UnsupportedGameAction,
} from '../src/engine/actionTypes.ts'
import { applyAction } from '../src/engine/applyAction.ts'
import { createInitialGameState } from '../src/engine/createInitialGameState.ts'
import { GameErrorCode } from '../src/engine/gameErrors.ts'
import { payCost } from '../src/engine/payCost.ts'
import { GamePhase } from '../src/engine/phaseTypes.ts'
import { Zone, type GameState } from '../src/engine/gameTypes.ts'

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

function createStartedGameState(): GameState {
  const initialState = createInitialGameState({ gameId: 'game-1', now: 10 })
  const startResult = applyAction(
    initialState,
    createStartGameAction(createPlaceholderPlayers()),
  )

  expect(startResult.ok).toBe(true)

  return startResult.ok ? startResult.state : initialState
}

function advanceToMainPhase(state: GameState = createStartedGameState()): GameState {
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

function advanceToMainPhaseWithDrawnCard(): GameState {
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

function seedCharacterOnBoard(
  state: GameState,
  playerId: string,
  cardId: string,
  isRested: boolean = false,
): { readonly state: GameState; readonly instanceId: string } {
  const sourceInstanceId = state.players[playerId].zones[Zone.Deck][0]
  const nextState: GameState = {
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
  }

  return {
    state: nextState,
    instanceId: sourceInstanceId,
  }
}

function setPlayerLifeCount(
  state: GameState,
  playerId: string,
  lifeCount: number,
): GameState {
  const currentLife = state.players[playerId].zones[Zone.Life]
  const keptLife = currentLife.slice(0, lifeCount)
  const removedLife = currentLife.slice(lifeCount)
  const updatedCardInstances = { ...state.cardInstances }

  for (const cardInstanceId of removedLife) {
    updatedCardInstances[cardInstanceId] = {
      ...updatedCardInstances[cardInstanceId],
      zone: Zone.Hand,
    }
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        zones: {
          ...state.players[playerId].zones,
          [Zone.Life]: keptLife,
          [Zone.Hand]: [
            ...state.players[playerId].zones[Zone.Hand],
            ...removedLife,
          ],
        },
      },
    },
    cardInstances: updatedCardInstances,
  }
}

function createDeclareAttackAction(
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

function createResolveAttackAction(
  playerId: string,
  attackerInstanceId: string,
  targetInstanceId: string,
  createdAt: number,
): ResolveAttackAction {
  return {
    id: `resolve-${createdAt}`,
    type: ActionType.ResolveAttack,
    playerId,
    createdAt,
    payload: {
      attackerInstanceId,
      targetInstanceId,
    },
  }
}

describe('createInitialGameState', () => {
  it('creates a not-started game state with no players', () => {
    const state = createInitialGameState({ gameId: 'game-1', now: 5 })

    expect(state.id).toBe('game-1')
    expect(state.status).toBe('NOT_STARTED')
    expect(state.gameOver).toBe(false)
    expect(state.phase).toBe('SETUP')
    expect(state.playerOrder).toEqual([])
    expect(state.turn.activePlayerId).toBeNull()
    expect(state.turn.turnNumber).toBe(0)
    expect(state.turn.hasPerformedNormalDraw).toBe(false)
    expect(state.log).toEqual([])
  })
})

describe('engine flow', () => {
  it('game starts in draw phase with life cards assigned', () => {
    const state = createStartedGameState()

    expect(state.status).toBe('IN_PROGRESS')
    expect(state.phase).toBe(GamePhase.Draw)
    expect(state.players['player-1'].zones[Zone.Life]).toHaveLength(5)
    expect(state.players['player-2'].zones[Zone.Life]).toHaveLength(5)
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

    const mainState = advanceToMainPhase()
    const illegalDraw = applyAction(mainState, {
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

  it('PLAY_CARD succeeds during MAIN phase with enough active DON', () => {
    const mainState = advanceToMainPhaseWithDrawnCard()
    const cardInstanceId = mainState.players['player-1'].zones[Zone.Hand][0]
    const action: PlayCardAction = {
      id: 'play-character',
      type: ActionType.PlayCard,
      playerId: 'player-1',
      createdAt: 330,
      payload: { cardInstanceId },
    }

    const result = applyAction(mainState, action)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-1'].zones[Zone.CharacterArea]).toContain(
      cardInstanceId,
    )
    expect(result.state.cardInstances[cardInstanceId].zone).toBe(
      Zone.CharacterArea,
    )
    expect(result.state.players['player-1'].activeDon).toBe(1)
    expect(result.state.players['player-1'].restedDon).toBe(1)
  })

  it('unsupported actions still fail cleanly', () => {
    const startedState = createStartedGameState()
    const unsupportedAction: UnsupportedGameAction = {
      id: 'action-effect',
      type: ActionType.ActivateEffect,
      playerId: 'player-1',
      createdAt: 340,
      payload: { test: true },
    }

    const unsupportedResult = applyAction(startedState, unsupportedAction)

    expect(unsupportedResult.ok).toBe(false)
    if (!unsupportedResult.ok) {
      expect(unsupportedResult.error.code).toBe(GameErrorCode.UnsupportedAction)
    }
  })
})

describe('combat foundation', () => {
  it('legal Leader attack removes one life', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId

    const result = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        400,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-2'].zones[Zone.Life]).toHaveLength(4)
  })

  it('legal Character attack resolves against a rested character', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', true)
    state = targetSeed.state

    const result = applyAction(
      state,
      createResolveAttackAction(
        'player-1',
        attackerSeed.instanceId,
        targetSeed.instanceId,
        410,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.cardInstances[attackerSeed.instanceId].isRested).toBe(true)
  })

  it('illegal attack on active Character fails cleanly', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', false)

    const result = applyAction(
      targetSeed.state,
      createDeclareAttackAction(
        'player-1',
        attackerSeed.instanceId,
        targetSeed.instanceId,
        420,
      ),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.TargetMustBeRestedCharacter)
    }
  })

  it('illegal attack on own Character fails cleanly', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const ownTargetSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-101', true)

    const result = applyAction(
      ownTargetSeed.state,
      createDeclareAttackAction(
        'player-1',
        attackerSeed.instanceId,
        ownTargetSeed.instanceId,
        430,
      ),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.CannotAttackOwnCard)
    }
  })

  it('attacker becomes rested after a successful attack', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId

    const result = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        440,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.cardInstances[attackerInstanceId].isRested).toBe(true)
  })

  it('stronger Character wins battle and weaker Character is KOd', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', true)

    const result = applyAction(
      targetSeed.state,
      createDeclareAttackAction(
        'player-1',
        attackerSeed.instanceId,
        targetSeed.instanceId,
        450,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-2'].zones[Zone.CharacterArea]).not.toContain(
      targetSeed.instanceId,
    )
    expect(result.state.players['player-2'].zones[Zone.Trash]).toContain(
      targetSeed.instanceId,
    )
    expect(result.state.cardInstances[targetSeed.instanceId].zone).toBe(Zone.Trash)
  })

  it('weaker attacking Character is KOd by a stronger rested defender', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-101', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-104', true)

    const result = applyAction(
      targetSeed.state,
      createDeclareAttackAction(
        'player-1',
        attackerSeed.instanceId,
        targetSeed.instanceId,
        460,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-1'].zones[Zone.Trash]).toContain(
      attackerSeed.instanceId,
    )
    expect(result.state.cardInstances[attackerSeed.instanceId].zone).toBe(Zone.Trash)
  })

  it('equal power leaves both Characters alive', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-102', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP02-101', true)

    const result = applyAction(
      targetSeed.state,
      createDeclareAttackAction(
        'player-1',
        attackerSeed.instanceId,
        targetSeed.instanceId,
        470,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-1'].zones[Zone.CharacterArea]).toContain(
      attackerSeed.instanceId,
    )
    expect(result.state.players['player-2'].zones[Zone.CharacterArea]).toContain(
      targetSeed.instanceId,
    )
  })

  it('Leader loses life correctly and life moves to hand', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const startingHand = mainState.players['player-2'].zones[Zone.Hand].length

    const result = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        480,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.players['player-2'].zones[Zone.Life]).toHaveLength(4)
    expect(result.state.players['player-2'].zones[Zone.Hand]).toHaveLength(
      startingHand + 1,
    )
  })

  it('Game over is detected when a leader at zero life takes damage', () => {
    const preparedState = setPlayerLifeCount(advanceToMainPhase(), 'player-2', 0)
    const attackerInstanceId = preparedState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = preparedState.players['player-2'].leaderCardInstanceId

    const result = applyAction(
      preparedState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        490,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.gameOver).toBe(true)
    expect(result.state.status).toBe('COMPLETE')
    expect(result.state.winnerId).toBe('player-1')
    expect(result.state.loserId).toBe('player-2')
    expect(result.state.endReason).toBe('LEADER_DAMAGE_AT_ZERO_LIFE')
  })

  it('combat actions do not mutate the original state', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', true)
    const originalState = targetSeed.state

    const result = applyAction(
      originalState,
      createDeclareAttackAction(
        'player-1',
        attackerSeed.instanceId,
        targetSeed.instanceId,
        500,
      ),
    )

    expect(result.ok).toBe(true)
    expect(originalState.cardInstances[attackerSeed.instanceId].isRested).toBe(false)
    expect(originalState.players['player-2'].zones[Zone.CharacterArea]).toContain(
      targetSeed.instanceId,
    )
    expect(originalState.players['player-2'].zones[Zone.Trash]).not.toContain(
      targetSeed.instanceId,
    )
  })

  it('invalid attacks fail cleanly for nonexistent targets', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId

    const result = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        'missing-target',
        510,
      ),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.UnknownCardInstance)
    }
  })
})

describe('payCost', () => {
  it('cost payment helper succeeds correctly', () => {
    const player = advanceToMainPhaseWithDrawnCard().players['player-1']

    const result = payCost(player, 2)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.player.activeDon).toBe(0)
    expect(result.player.restedDon).toBe(2)
    expect(result.player.totalDonInPlay).toBe(2)
  })

  it('cost payment helper fails correctly', () => {
    const player = advanceToMainPhaseWithDrawnCard().players['player-1']

    const result = payCost(player, 3)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.InsufficientDon)
    }
  })
})
