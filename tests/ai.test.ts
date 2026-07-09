import { describe, expect, it } from 'vitest'

import {
  createMediumAIPlayer,
  chooseMediumAIAction,
} from '../src/ai/mediumAI.ts'
import { runAIStep, runAIUntilHumanTurn } from '../src/ai/runAI.ts'
import { ActionType } from '../src/engine/actionTypes.ts'
import { applyAction } from '../src/engine/applyAction.ts'
import { getLegalActions } from '../src/engine/getLegalActions.ts'
import { Zone, type GameState } from '../src/engine/gameTypes.ts'
import { canPlayerAct } from '../src/engine/selectors.ts'
import {
  advanceToMainPhase,
  createDeclareAttackAction,
  createPassCounterAction,
  createStartedGameState,
  seedCharacterOnBoard,
} from './engineTestHelpers.ts'

const mediumAI = createMediumAIPlayer('player-2', 'Test Medium AI')
const attackingAI = createMediumAIPlayer('player-1', 'Attacking Test AI')

let createdAtCounter = 1000

function nextTimestamp(): number {
  createdAtCounter += 10
  return createdAtCounter
}

function applyAndExpectOk(
  state: GameState,
  action: {
    readonly id: string
    readonly type: ActionType
    readonly playerId: string
    readonly createdAt: number
    readonly payload?: Readonly<Record<string, unknown>>
  },
): GameState {
  const result = applyAction(state, action)

  expect(result.ok).toBe(true)

  return result.ok ? result.state : state
}

function createAdvancePhaseAction(playerId: string) {
  return {
    id: `advance-${playerId}-${nextTimestamp()}`,
    type: ActionType.AdvancePhase,
    playerId,
    createdAt: nextTimestamp(),
  } as const
}

function createDrawCardAction(playerId: string) {
  return {
    id: `draw-${playerId}-${nextTimestamp()}`,
    type: ActionType.DrawCard,
    playerId,
    createdAt: nextTimestamp(),
  } as const
}

function createEndTurnAction(playerId: string) {
  return {
    id: `end-turn-${playerId}-${nextTimestamp()}`,
    type: ActionType.EndTurn,
    playerId,
    createdAt: nextTimestamp(),
  } as const
}

function createInternalDrawAction(playerId: string) {
  return {
    id: `internal-draw-${playerId}-${nextTimestamp()}`,
    type: ActionType.DrawCard,
    playerId: 'setup-player',
    createdAt: nextTimestamp(),
    payload: {
      internal: true,
      targetPlayerId: playerId,
    },
  } as const
}

function createPlayerTwoTurnState(): GameState {
  const playerOneMainState = advanceToMainPhase(createStartedGameState())

  return applyAndExpectOk(
    playerOneMainState,
    createEndTurnAction('player-1'),
  )
}

function createPlayerTwoDrawState(): GameState {
  return applyAndExpectOk(
    createPlayerTwoTurnState(),
    createAdvancePhaseAction('player-2'),
  )
}

function createPlayerTwoMainState(): GameState {
  let state = createPlayerTwoDrawState()

  state = applyAndExpectOk(state, createDrawCardAction('player-2'))
  state = applyAndExpectOk(state, createAdvancePhaseAction('player-2'))
  state = applyAndExpectOk(state, createAdvancePhaseAction('player-2'))

  return state
}

function withPlayerDon(
  state: GameState,
  playerId: string,
  activeDon: number,
  restedDon: number,
  totalDonInPlay: number = activeDon + restedDon,
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        activeDon,
        restedDon,
        totalDonInPlay,
      },
    },
  }
}

function withHandCards(
  state: GameState,
  playerId: string,
  cardIds: readonly string[],
): GameState {
  let nextState = state

  while (nextState.players[playerId].zones[Zone.Hand].length < cardIds.length) {
    nextState = applyAndExpectOk(nextState, createInternalDrawAction(playerId))
  }

  const handIds = nextState.players[playerId].zones[Zone.Hand].slice(
    0,
    cardIds.length,
  )

  return {
    ...nextState,
    cardInstances: {
      ...nextState.cardInstances,
      ...Object.fromEntries(
        handIds.map((instanceId, index) => [
          instanceId,
          {
            ...nextState.cardInstances[instanceId],
            cardId: cardIds[index],
            zone: Zone.Hand,
            isRested: false,
          },
        ]),
      ),
    },
  }
}

function withLeaderLifeCount(
  state: GameState,
  playerId: string,
  lifeCount: number,
): GameState {
  const player = state.players[playerId]
  const currentLife = player.zones[Zone.Life]
  const keptLife = currentLife.slice(0, lifeCount)
  const movedLife = currentLife.slice(lifeCount)

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        zones: {
          ...player.zones,
          [Zone.Life]: keptLife,
          [Zone.Hand]: [...player.zones[Zone.Hand], ...movedLife],
        },
      },
    },
    cardInstances: {
      ...state.cardInstances,
      ...Object.fromEntries(
        movedLife.map((instanceId) => [
          instanceId,
          {
            ...state.cardInstances[instanceId],
            zone: Zone.Hand,
          },
        ]),
      ),
    },
  }
}

function withLeaderRested(
  state: GameState,
  playerId: string,
  isRested: boolean,
): GameState {
  const leaderInstanceId = state.players[playerId].leaderCardInstanceId

  return {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [leaderInstanceId]: {
        ...state.cardInstances[leaderInstanceId],
        isRested,
      },
    },
  }
}

function withEmptyHand(state: GameState, playerId: string): GameState {
  const handIds = state.players[playerId].zones[Zone.Hand]
  const deckIds = state.players[playerId].zones[Zone.Deck]

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        zones: {
          ...state.players[playerId].zones,
          [Zone.Hand]: [],
          [Zone.Deck]: [...handIds, ...deckIds],
        },
      },
    },
    cardInstances: {
      ...state.cardInstances,
      ...Object.fromEntries(
        handIds.map((instanceId) => [
          instanceId,
          {
            ...state.cardInstances[instanceId],
            zone: Zone.Deck,
          },
        ]),
      ),
    },
  }
}

describe('medium AI v1 decision making', () => {
  it('returns no action when the game is already over', () => {
    const state = {
      ...createStartedGameState(),
      status: 'COMPLETE' as const,
      gameOver: true,
      winnerId: 'player-1',
      loserId: 'player-2',
      endReason: 'LEADER_DAMAGE_AT_ZERO_LIFE' as const,
    }

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction).toBeNull()
    expect(decision.summary).toContain('already over')
  })

  it('chooses DRAW_CARD during the DRAW phase', () => {
    const state = createPlayerTwoDrawState()

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.DrawCard)
  })

  it('advances phase when no higher-priority action exists in REFRESH', () => {
    const state = createPlayerTwoTurnState()

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.AdvancePhase)
  })

  it('passes counter during the counter window', () => {
    const mainState = advanceToMainPhase()
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        mainState.players['player-1'].leaderCardInstanceId,
        mainState.players['player-2'].leaderCardInstanceId,
        nextTimestamp(),
      ),
    )

    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const decision = chooseMediumAIAction(declareResult.state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.PassCounter)
  })

  it('resolves attack after the counter window closes', () => {
    const mainState = advanceToMainPhase()
    const declareResult = applyAction(
      mainState,
      createDeclareAttackAction(
        'player-1',
        mainState.players['player-1'].leaderCardInstanceId,
        mainState.players['player-2'].leaderCardInstanceId,
        nextTimestamp(),
      ),
    )
    expect(declareResult.ok).toBe(true)
    if (!declareResult.ok) {
      return
    }

    const passResult = applyAction(
      declareResult.state,
      createPassCounterAction('player-2', nextTimestamp()),
    )
    expect(passResult.ok).toBe(true)
    if (!passResult.ok) {
      return
    }

    const decision = chooseMediumAIAction(passResult.state, attackingAI)

    expect(decision.chosenAction?.type).toBe(ActionType.ResolveAttack)
  })

  it('plays an affordable Character during MAIN when attacks are not attractive', () => {
    let state = createPlayerTwoMainState()

    state = withLeaderRested(state, 'player-2', true)
    state = withPlayerDon(state, 'player-2', 2, 0)
    state = withHandCards(state, 'player-2', ['OP02-101'])

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.PlayCard)
  })

  it('does not choose unaffordable cards', () => {
    let state = createPlayerTwoMainState()

    state = withLeaderRested(state, 'player-2', true)
    state = withPlayerDon(state, 'player-2', 2, 0)
    state = withHandCards(state, 'player-2', ['OP01-108', 'OP02-101'])

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.PlayCard)
    if (decision.chosenAction?.type !== ActionType.PlayCard) {
      return
    }

    const chosenCardId =
      state.cardInstances[decision.chosenAction.payload.cardInstanceId].cardId

    expect(chosenCardId).toBe('OP02-101')
  })

  it('prefers the stronger or higher-cost affordable Character when multiple are playable', () => {
    let state = createPlayerTwoMainState()

    state = withLeaderRested(state, 'player-2', true)
    state = withPlayerDon(state, 'player-2', 4, 0)
    state = withHandCards(state, 'player-2', ['OP01-113', 'OP01-106'])

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.PlayCard)
    if (decision.chosenAction?.type !== ActionType.PlayCard) {
      return
    }

    const chosenCardId =
      state.cardInstances[decision.chosenAction.payload.cardInstanceId].cardId

    expect(chosenCardId).toBe('OP01-106')
  })

  it('prioritizes a lethal Leader attack when the opponent has zero life', () => {
    let state = createPlayerTwoMainState()

    state = withPlayerDon(state, 'player-2', 0, 2)
    state = withLeaderLifeCount(state, 'player-1', 0)

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.DeclareAttack)
    if (decision.chosenAction?.type !== ActionType.DeclareAttack) {
      return
    }

    expect(decision.chosenAction.payload.targetInstanceId).toBe(
      state.players['player-1'].leaderCardInstanceId,
    )
  })

  it('prefers a favorable rested-character attack over a bad one or a leader swing', () => {
    let state = createPlayerTwoMainState()

    state = withPlayerDon(state, 'player-2', 0, 2)
    state = withLeaderRested(state, 'player-2', true)

    const attackerSeed = seedCharacterOnBoard(state, 'player-2', 'OP01-106', false)
    state = attackerSeed.state
    const weakTargetSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-101', true)
    state = weakTargetSeed.state
    const strongTargetSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-108', true)
    state = strongTargetSeed.state

    const decision = chooseMediumAIAction(state, mediumAI)

    expect(decision.chosenAction?.type).toBe(ActionType.DeclareAttack)
    if (decision.chosenAction?.type !== ActionType.DeclareAttack) {
      return
    }

    expect(decision.chosenAction.payload.attackerInstanceId).toBe(
      attackerSeed.instanceId,
    )
    expect(decision.chosenAction.payload.targetInstanceId).toBe(
      weakTargetSeed.instanceId,
    )
  })

  it('avoids active-character targets because legal actions do not expose them', () => {
    let state = createPlayerTwoMainState()

    state = withPlayerDon(state, 'player-2', 0, 2)

    const targetSeed = seedCharacterOnBoard(state, 'player-1', 'OP01-101', false)
    state = targetSeed.state

    const legalAttackTargets = getLegalActions(state, 'player-2')
      .filter((action) => action.type === ActionType.DeclareAttack)
      .map((action) =>
        action.type === ActionType.DeclareAttack
          ? action.payload.targetInstanceId
          : null,
      )

    expect(legalAttackTargets).not.toContain(targetSeed.instanceId)

    const decision = chooseMediumAIAction(state, mediumAI)

    if (decision.chosenAction?.type === ActionType.DeclareAttack) {
      expect(decision.chosenAction.payload.targetInstanceId).not.toBe(
        targetSeed.instanceId,
      )
    }
  })
})

describe('AI turn runner', () => {
  it('runAIStep applies exactly one AI action', () => {
    const state = createPlayerTwoDrawState()
    const previousHandCount = state.players['player-2'].zones[Zone.Hand].length

    const step = runAIStep(state, mediumAI)

    expect(step.actionResult?.ok).toBe(true)
    expect(step.actionResult?.action.type).toBe(ActionType.DrawCard)
    expect(step.state.players['player-2'].zones[Zone.Hand]).toHaveLength(
      previousHandCount + 1,
    )
    expect(step.state.phase).toBe(state.phase)
  })

  it('runAIUntilHumanTurn stops when the turn leaves AI control', () => {
    let state = createPlayerTwoMainState()

    state = withLeaderRested(state, 'player-2', true)
    state = withPlayerDon(state, 'player-2', 0, 2, 2)
    state = withEmptyHand(state, 'player-2')

    const runResult = runAIUntilHumanTurn(state, mediumAI)

    expect(runResult.results.every((result) => result.ok)).toBe(true)
    expect(runResult.state.turn.activePlayerId).toBe('player-1')
    expect(canPlayerAct(runResult.state, 'player-2')).toBe(false)
    expect(runResult.stoppedReason).toContain('turn moved out of AI control')
  })

  it('runAIUntilHumanTurn stops at the max-step guard', () => {
    const state = createPlayerTwoTurnState()

    const runResult = runAIUntilHumanTurn(state, mediumAI, { maxSteps: 1 })

    expect(runResult.steps).toHaveLength(1)
    expect(runResult.state.turn.activePlayerId).toBe('player-2')
    expect(runResult.stoppedReason).toContain('max-step guard')
  })
})
