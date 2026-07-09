import { describe, expect, it } from 'vitest'

import {
  ActionType,
  type AdvancePhaseAction,
  type DeclareAttackAction,
  type DrawCardAction,
  type PassCounterAction,
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
import { BattleStep, Zone, type GameState } from '../src/engine/gameTypes.ts'

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

function createPassCounterAction(
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

function createResolveAttackAction(
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

function declarePassAndResolve(
  state: GameState,
  attackerInstanceId: string,
  targetInstanceId: string,
  declaredAt: number = 400,
): {
  readonly declareResult: ReturnType<typeof applyAction>
  readonly passResult: ReturnType<typeof applyAction>
  readonly resolveResult: ReturnType<typeof applyAction>
} {
  const declareResult = applyAction(
    state,
    createDeclareAttackAction(
      'player-1',
      attackerInstanceId,
      targetInstanceId,
      declaredAt,
    ),
  )
  expect(declareResult.ok).toBe(true)

  const passResult = applyAction(
    declareResult.ok ? declareResult.state : state,
    createPassCounterAction('player-2', declaredAt + 10),
  )
  expect(passResult.ok).toBe(true)

  const resolveResult = applyAction(
    passResult.ok
      ? passResult.state
      : declareResult.ok
        ? declareResult.state
        : state,
    createResolveAttackAction('player-1', declaredAt + 20),
  )
  expect(resolveResult.ok).toBe(true)

  return {
    declareResult,
    passResult,
    resolveResult,
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
    expect(state.battle).toBeNull()
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
    expect(state.battle).toBeNull()
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

describe('combat battle flow', () => {
  it('DECLARE_ATTACK creates battle state', () => {
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

    expect(result.state.battle).not.toBeNull()
    expect(result.state.battle?.attackerInstanceId).toBe(attackerInstanceId)
    expect(result.state.battle?.targetInstanceId).toBe(targetInstanceId)
    expect(result.state.battle?.currentBattleStep).toBe(BattleStep.CounterWindow)
  })

  it('DECLARE_ATTACK rests the attacker and opens the counter window', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId

    const result = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        410,
      ),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.state.cardInstances[attackerInstanceId].isRested).toBe(true)
    expect(result.state.battle?.awaitingCounterResponse).toBe(true)
    expect(
      result.state.log.some((entry) =>
        entry.message.includes('Counter window opened for Player Two.'),
      ),
    ).toBe(true)
  })

  it('PASS_COUNTER closes the counter window', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        420,
      ),
    )

    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const passResult = applyAction(
      declareResult.state,
      createPassCounterAction('player-2', 430),
    )

    expect(passResult.ok).toBe(true)
    if (!passResult.ok) {
      return
    }

    expect(passResult.state.battle?.awaitingCounterResponse).toBe(false)
    expect(passResult.state.battle?.currentBattleStep).toBe(
      BattleStep.ReadyToResolve,
    )
  })

  it('PASS_COUNTER fails when called by the attacking player', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        440,
      ),
    )

    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const passResult = applyAction(
      declareResult.state,
      createPassCounterAction('player-1', 450),
    )

    expect(passResult.ok).toBe(false)
    if (!passResult.ok) {
      expect(passResult.error.code).toBe(GameErrorCode.InvalidCounterResponder)
    }
  })

  it('PASS_COUNTER fails when no battle exists', () => {
    const mainState = advanceToMainPhase()
    const passResult = applyAction(
      mainState,
      createPassCounterAction('player-2', 460),
    )

    expect(passResult.ok).toBe(false)
    if (!passResult.ok) {
      expect(passResult.error.code).toBe(GameErrorCode.NoActiveBattle)
    }
  })

  it('RESOLVE_ATTACK fails before counter is passed', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        470,
      ),
    )

    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const resolveResult = applyAction(
      declareResult.state,
      createResolveAttackAction('player-1', 480),
    )

    expect(resolveResult.ok).toBe(false)
    if (!resolveResult.ok) {
      expect(resolveResult.error.code).toBe(
        GameErrorCode.BattleNotReadyToResolve,
      )
    }
  })

  it('RESOLVE_ATTACK succeeds after PASS_COUNTER and clears battle state', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const { resolveResult } = declarePassAndResolve(
      mainState,
      attackerInstanceId,
      targetInstanceId,
      490,
    )

    expect(resolveResult.ok).toBe(true)
    if (!resolveResult.ok) {
      return
    }

    expect(resolveResult.state.battle).toBeNull()
  })

  it('cannot declare a second attack while battle is unresolved', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', true)
    state = targetSeed.state

    const firstDeclare = applyAction(
      state,
      createDeclareAttackAction(
        'player-1',
        attackerSeed.instanceId,
        targetSeed.instanceId,
        500,
      ),
    )
    expect(firstDeclare.ok).toBe(true)
    if (!firstDeclare.ok) {
      return
    }

    const secondDeclare = applyAction(
      firstDeclare.state,
      createDeclareAttackAction(
        'player-1',
        state.players['player-1'].leaderCardInstanceId,
        state.players['player-2'].leaderCardInstanceId,
        510,
      ),
    )

    expect(secondDeclare.ok).toBe(false)
    if (!secondDeclare.ok) {
      expect(secondDeclare.error.code).toBe(
        GameErrorCode.BattleAlreadyInProgress,
      )
    }
  })

  it('END_TURN fails during an unresolved battle', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        520,
      ),
    )

    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const endTurnResult = applyAction(declareResult.state, {
      id: 'end-turn-during-battle',
      type: ActionType.EndTurn,
      playerId: 'player-1',
      createdAt: 530,
    })

    expect(endTurnResult.ok).toBe(false)
    if (!endTurnResult.ok) {
      expect(endTurnResult.error.code).toBe(GameErrorCode.UnresolvedBattle)
    }
  })

  it('ADVANCE_PHASE fails during an unresolved battle', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        540,
      ),
    )

    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const advanceResult = applyAction(
      declareResult.state,
      createAdvancePhaseAction('player-1', 'advance-during-battle', 550),
    )

    expect(advanceResult.ok).toBe(false)
    if (!advanceResult.ok) {
      expect(advanceResult.error.code).toBe(GameErrorCode.UnresolvedBattle)
    }
  })

  it('legal Leader attack still damages life after resolution', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const { resolveResult } = declarePassAndResolve(
      mainState,
      attackerInstanceId,
      targetInstanceId,
      560,
    )

    expect(resolveResult.ok).toBe(true)
    if (!resolveResult.ok) {
      return
    }

    expect(resolveResult.state.players['player-2'].zones[Zone.Life]).toHaveLength(
      4,
    )
  })

  it('Life still moves to hand after leader damage', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const startingHand = mainState.players['player-2'].zones[Zone.Hand].length
    const { resolveResult } = declarePassAndResolve(
      mainState,
      attackerInstanceId,
      targetInstanceId,
      570,
    )

    expect(resolveResult.ok).toBe(true)
    if (!resolveResult.ok) {
      return
    }

    expect(resolveResult.state.players['player-2'].zones[Zone.Hand]).toHaveLength(
      startingHand + 1,
    )
  })

  it('game over still works when a leader at zero life takes damage', () => {
    const preparedState = setPlayerLifeCount(advanceToMainPhase(), 'player-2', 0)
    const attackerInstanceId = preparedState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = preparedState.players['player-2'].leaderCardInstanceId
    const { resolveResult } = declarePassAndResolve(
      preparedState,
      attackerInstanceId,
      targetInstanceId,
      580,
    )

    expect(resolveResult.ok).toBe(true)
    if (!resolveResult.ok) {
      return
    }

    expect(resolveResult.state.gameOver).toBe(true)
    expect(resolveResult.state.status).toBe('COMPLETE')
    expect(resolveResult.state.winnerId).toBe('player-1')
    expect(resolveResult.state.loserId).toBe('player-2')
    expect(resolveResult.state.endReason).toBe('LEADER_DAMAGE_AT_ZERO_LIFE')
  })

  it('legal Character attack still KOs a weaker Character', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', true)
    const { resolveResult } = declarePassAndResolve(
      targetSeed.state,
      attackerSeed.instanceId,
      targetSeed.instanceId,
      590,
    )

    expect(resolveResult.ok).toBe(true)
    if (!resolveResult.ok) {
      return
    }

    expect(resolveResult.state.players['player-2'].zones[Zone.CharacterArea]).not.toContain(
      targetSeed.instanceId,
    )
    expect(resolveResult.state.players['player-2'].zones[Zone.Trash]).toContain(
      targetSeed.instanceId,
    )
  })

  it('equal power still leaves both Characters alive', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-102', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP02-101', true)
    const { resolveResult } = declarePassAndResolve(
      targetSeed.state,
      attackerSeed.instanceId,
      targetSeed.instanceId,
      600,
    )

    expect(resolveResult.ok).toBe(true)
    if (!resolveResult.ok) {
      return
    }

    expect(resolveResult.state.players['player-1'].zones[Zone.CharacterArea]).toContain(
      attackerSeed.instanceId,
    )
    expect(resolveResult.state.players['player-2'].zones[Zone.CharacterArea]).toContain(
      targetSeed.instanceId,
    )
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
        610,
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
        620,
      ),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.CannotAttackOwnCard)
    }
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
        630,
      ),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe(GameErrorCode.UnknownCardInstance)
    }
  })

  it('combat actions do not mutate the original state', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId

    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        640,
      ),
    )

    expect(declareResult.ok).toBe(true)
    expect(mainState.cardInstances[attackerInstanceId].isRested).toBe(false)
    expect(mainState.battle).toBeNull()
  })

  it('successful battle actions add traceable game log entries', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const { declareResult, passResult, resolveResult } = declarePassAndResolve(
      mainState,
      attackerInstanceId,
      targetInstanceId,
      650,
    )

    expect(declareResult.ok).toBe(true)
    expect(passResult.ok).toBe(true)
    expect(resolveResult.ok).toBe(true)
    if (!resolveResult.ok) {
      return
    }

    const logMessages = resolveResult.state.log.map((entry) => entry.message)

    expect(
      logMessages.some((message) => message.includes('declared an attack')),
    ).toBe(true)
    expect(
      logMessages.some((message) => message.includes('Counter window opened')),
    ).toBe(true)
    expect(
      logMessages.some((message) => message.includes('passed the counter window')),
    ).toBe(true)
    expect(
      logMessages.some((message) => message.includes('resolved the attack')),
    ).toBe(true)
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
