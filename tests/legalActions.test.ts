import { describe, expect, it } from 'vitest'

import { ActionType } from '../src/engine/actionTypes.ts'
import { applyAction } from '../src/engine/applyAction.ts'
import { getLegalActions } from '../src/engine/getLegalActions.ts'
import { GameErrorCode } from '../src/engine/gameErrors.ts'
import { BattleStep, Zone } from '../src/engine/gameTypes.ts'
import {
  canPlayerAct,
  getActiveCharacters,
  getActivePlayerState,
  getCardDefinitionByInstanceId,
  getCardInstanceById,
  getCardsInHand,
  getCurrentBattle,
  getOpponentPlayerId,
  getPlayerState,
  getRestedCharacters,
  isBattlePending,
} from '../src/engine/selectors.ts'
import {
  advanceToMainPhase,
  advanceToMainPhaseWithDrawnCard,
  createDeclareAttackAction,
  createPassCounterAction,
  createStartedGameState,
  seedCharacterOnBoard,
} from './engineTestHelpers.ts'

describe('engine selectors', () => {
  it('returns the correct active player', () => {
    const state = createStartedGameState()

    expect(getActivePlayerState(state)?.id).toBe('player-1')
    expect(canPlayerAct(state, 'player-1')).toBe(true)
    expect(canPlayerAct(state, 'player-2')).toBe(false)
  })

  it('returns the correct opponent player id', () => {
    const state = createStartedGameState()

    expect(getOpponentPlayerId(state, 'player-1')).toBe('player-2')
    expect(getOpponentPlayerId(state, 'player-2')).toBe('player-1')
  })

  it('finds card instances and definitions correctly', () => {
    const state = createStartedGameState()
    const leaderInstanceId = state.players['player-1'].leaderCardInstanceId

    expect(getPlayerState(state, 'player-1')?.id).toBe('player-1')
    expect(getCardInstanceById(state, leaderInstanceId)?.instanceId).toBe(
      leaderInstanceId,
    )
    expect(getCardDefinitionByInstanceId(state, leaderInstanceId)?.type).toBe(
      'LEADER',
    )
  })

  it('identifies a pending battle correctly', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        400,
      ),
    )

    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    expect(isBattlePending(declareResult.state)).toBe(true)
    expect(getCurrentBattle(declareResult.state)?.currentBattleStep).toBe(
      BattleStep.CounterWindow,
    )
    expect(canPlayerAct(declareResult.state, 'player-2')).toBe(true)
  })
})

describe('getLegalActions', () => {
  it('returns DRAW_CARD during DRAW phase for the active player', () => {
    const state = createStartedGameState()

    const legalActions = getLegalActions(state, 'player-1')

    expect(
      legalActions.some((action) => action.type === ActionType.DrawCard),
    ).toBe(true)
  })

  it('does not return DRAW_CARD outside DRAW phase', () => {
    const state = advanceToMainPhase()

    const legalActions = getLegalActions(state, 'player-1')

    expect(
      legalActions.some((action) => action.type === ActionType.DrawCard),
    ).toBe(false)
  })

  it('returns playable PLAY_CARD actions during MAIN when DON is available', () => {
    const state = advanceToMainPhaseWithDrawnCard()

    const legalActions = getLegalActions(state, 'player-1').filter(
      (action) => action.type === ActionType.PlayCard,
    )

    expect(legalActions.length).toBeGreaterThan(0)
    expect(legalActions.every((action) => 'payload' in action)).toBe(true)
  })

  it('does not return PLAY_CARD when DON is insufficient', () => {
    const baseState = advanceToMainPhaseWithDrawnCard()
    const expensiveCardInstanceId = baseState.players['player-1'].zones[Zone.Hand][0]
    const state = {
      ...baseState,
      cardInstances: {
        ...baseState.cardInstances,
        [expensiveCardInstanceId]: {
          ...baseState.cardInstances[expensiveCardInstanceId],
          cardId: 'OP01-108',
        },
      },
    }

    const legalActions = getLegalActions(state, 'player-1')

    expect(
      legalActions.some((action) => action.type === ActionType.PlayCard),
    ).toBe(false)
  })

  it('returns legal DECLARE_ATTACK actions for active attackers', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', true)
    state = targetSeed.state

    const legalActions = getLegalActions(state, 'player-1').filter(
      (action) => action.type === ActionType.DeclareAttack,
    )

    expect(legalActions.length).toBeGreaterThan(0)
    expect(
      legalActions.some(
        (action) =>
          'payload' in action &&
          action.payload.attackerInstanceId === attackerSeed.instanceId &&
          action.payload.targetInstanceId === targetSeed.instanceId,
      ),
    ).toBe(true)
  })

  it('excludes attacks against active Characters', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', false)
    state = targetSeed.state

    const legalActions = getLegalActions(state, 'player-1').filter(
      (action) => action.type === ActionType.DeclareAttack,
    )

    expect(
      legalActions.some(
        (action) =>
          'payload' in action &&
          action.payload.targetInstanceId === targetSeed.instanceId,
      ),
    ).toBe(false)
  })

  it('excludes attacks against own cards', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const ownTargetSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-101', true)
    state = ownTargetSeed.state

    const legalActions = getLegalActions(state, 'player-1').filter(
      (action) => action.type === ActionType.DeclareAttack,
    )

    expect(
      legalActions.some(
        (action) =>
          'payload' in action &&
          action.payload.targetInstanceId === ownTargetSeed.instanceId,
      ),
    ).toBe(false)
  })

  it('returns PASS_COUNTER for the defending player during the counter window', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        500,
      ),
    )
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const legalActions = getLegalActions(declareResult.state, 'player-2')

    expect(legalActions.map((action) => action.type)).toEqual([
      ActionType.PassCounter,
    ])
  })

  it('does not return PASS_COUNTER for the attacking player', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        510,
      ),
    )
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    expect(getLegalActions(declareResult.state, 'player-1')).toEqual([])
  })

  it('returns RESOLVE_ATTACK only after counter is passed', () => {
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

    expect(
      getLegalActions(declareResult.state, 'player-1').some(
        (action) => action.type === ActionType.ResolveAttack,
      ),
    ).toBe(false)

    const passResult = applyAction(
      declareResult.state,
      createPassCounterAction('player-2', 530),
    )
    expect(passResult.ok).toBe(true)
    if (!passResult.ok) {
      return
    }

    expect(
      getLegalActions(passResult.state, 'player-1').map((action) => action.type),
    ).toEqual([ActionType.ResolveAttack])
  })

  it('excludes END_TURN during an unresolved battle', () => {
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

    expect(
      getLegalActions(declareResult.state, 'player-1').some(
        (action) => action.type === ActionType.EndTurn,
      ),
    ).toBe(false)
  })

  it('applying representative legal actions succeeds', () => {
    const drawState = createStartedGameState()
    const drawAction = getLegalActions(drawState, 'player-1').find(
      (action) => action.type === ActionType.DrawCard,
    )
    expect(drawAction).toBeDefined()
    if (drawAction === undefined) {
      return
    }
    expect(applyAction(drawState, drawAction).ok).toBe(true)

    const playState = advanceToMainPhaseWithDrawnCard()
    const playAction = getLegalActions(playState, 'player-1').find(
      (action) => action.type === ActionType.PlayCard,
    )
    expect(playAction).toBeDefined()
    if (playAction === undefined) {
      return
    }
    expect(applyAction(playState, playAction).ok).toBe(true)

    let attackState = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(
      attackState,
      'player-1',
      'OP01-104',
      false,
    )
    attackState = attackerSeed.state
    const targetSeed = seedCharacterOnBoard(
      attackState,
      'player-2',
      'OP01-101',
      true,
    )
    attackState = targetSeed.state

    const declareAction = getLegalActions(attackState, 'player-1').find(
      (action) =>
        action.type === ActionType.DeclareAttack &&
        'payload' in action &&
        action.payload.attackerInstanceId === attackerSeed.instanceId &&
        action.payload.targetInstanceId === targetSeed.instanceId,
    )
    expect(declareAction).toBeDefined()
    if (declareAction === undefined) {
      return
    }

    const declareResult = applyAction(attackState, declareAction)
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const passAction = getLegalActions(declareResult.state, 'player-2')[0]
    expect(passAction?.type).toBe(ActionType.PassCounter)
    if (passAction === undefined) {
      return
    }

    const passResult = applyAction(declareResult.state, passAction)
    expect(passResult.ok).toBe(true)
    if (!passResult.ok) {
      return
    }

    const resolveAction = getLegalActions(passResult.state, 'player-1')[0]
    expect(resolveAction?.type).toBe(ActionType.ResolveAttack)
    if (resolveAction === undefined) {
      return
    }

    expect(applyAction(passResult.state, resolveAction).ok).toBe(true)
  })

  it('representative illegal actions are still rejected by applyAction', () => {
    const drawState = createStartedGameState()
    const illegalDraw = applyAction(drawState, {
      id: 'illegal-draw-inactive',
      type: ActionType.DrawCard,
      playerId: 'player-2',
      createdAt: 600,
    })

    expect(illegalDraw.ok).toBe(false)
    if (!illegalDraw.ok) {
      expect(illegalDraw.error.code).toBe(GameErrorCode.NotActivePlayer)
    }

    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        610,
      ),
    )
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const illegalPass = applyAction(
      declareResult.state,
      createPassCounterAction('player-1', 620),
    )

    expect(illegalPass.ok).toBe(false)
    if (!illegalPass.ok) {
      expect(illegalPass.error.code).toBe(GameErrorCode.InvalidCounterResponder)
    }
  })

  it('selector-derived board queries stay consistent with legal attack generation', () => {
    let state = advanceToMainPhase()
    const attackerSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-104', false)
    state = attackerSeed.state
    const restedTargetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-101', true)
    state = restedTargetSeed.state
    const activeTargetSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-102', false)
    state = activeTargetSeed.state

    expect(getActiveCharacters(state, 'player-1')).toHaveLength(1)
    expect(getRestedCharacters(state, 'player-2')).toHaveLength(1)
    expect(getCardsInHand(state, 'player-1')).toHaveLength(0)

    const attackActions = getLegalActions(state, 'player-1').filter(
      (action) => action.type === ActionType.DeclareAttack,
    )

    expect(
      attackActions.some(
        (action) =>
          'payload' in action &&
          action.payload.targetInstanceId === restedTargetSeed.instanceId,
      ),
    ).toBe(true)
    expect(
      attackActions.some(
        (action) =>
          'payload' in action &&
          action.payload.targetInstanceId === activeTargetSeed.instanceId,
      ),
    ).toBe(false)
  })

  it('resolve attack action generated after counter pass succeeds', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        630,
      ),
    )
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const passResult = applyAction(
      declareResult.state,
      createPassCounterAction('player-2', 640),
    )
    expect(passResult.ok).toBe(true)
    if (!passResult.ok) {
      return
    }

    const resolveAction = getLegalActions(passResult.state, 'player-1')[0]

    expect(resolveAction?.type).toBe(ActionType.ResolveAttack)
    if (resolveAction === undefined) {
      return
    }

    const resolveResult = applyAction(passResult.state, resolveAction)

    expect(resolveResult.ok).toBe(true)
  })

  it('counter window selectors expose the defending player response state', () => {
    const mainState = advanceToMainPhase()
    const attackerInstanceId = mainState.players['player-1'].leaderCardInstanceId
    const targetInstanceId = mainState.players['player-2'].leaderCardInstanceId
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        attackerInstanceId,
        targetInstanceId,
        650,
      ),
    )
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    expect(getCurrentBattle(declareResult.state)?.defendingPlayerId).toBe(
      'player-2',
    )
    expect(canPlayerAct(declareResult.state, 'player-2')).toBe(true)
    expect(canPlayerAct(declareResult.state, 'player-1')).toBe(false)
  })
})
