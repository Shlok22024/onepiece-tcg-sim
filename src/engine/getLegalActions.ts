import { CardType } from '../cards/cardTypes.ts'
import { sampleCardsById } from '../cards/sampleCards.ts'
import {
  ActionType,
  type AdvancePhaseAction,
  type DeclareAttackAction,
  type DrawCardAction,
  type EndTurnAction,
  type GameAction,
  type PassCounterAction,
  type PlayCardAction,
  type ResolveAttackAction,
} from './actionTypes.ts'
import { GamePhase, getNextPhase } from './phaseTypes.ts'
import { BattleStep, Zone, type GameState, type PlayerId } from './gameTypes.ts'
import {
  canPlayerAct,
  getActiveCharacters,
  getActivePlayerState,
  getCardsInHand,
  getCurrentBattle,
  getInactivePlayerState,
  getLeaderInstance,
  getOpponentPlayerId,
  getPlayerState,
  getRestedCharacters,
  isGameOver,
} from './selectors.ts'

function createActionTimestamp(state: GameState): number {
  return state.updatedAt
}

function createAdvancePhaseAction(
  state: GameState,
  playerId: PlayerId,
): AdvancePhaseAction {
  return {
    id: `legal-advance-phase-${playerId}-${state.phase}`,
    type: ActionType.AdvancePhase,
    playerId,
    createdAt: createActionTimestamp(state),
  }
}

function createDrawCardAction(
  state: GameState,
  playerId: PlayerId,
): DrawCardAction {
  return {
    id: `legal-draw-card-${playerId}-${state.turn.turnNumber}`,
    type: ActionType.DrawCard,
    playerId,
    createdAt: createActionTimestamp(state),
  }
}

function createEndTurnAction(
  state: GameState,
  playerId: PlayerId,
): EndTurnAction {
  return {
    id: `legal-end-turn-${playerId}-${state.turn.turnNumber}`,
    type: ActionType.EndTurn,
    playerId,
    createdAt: createActionTimestamp(state),
  }
}

function createPlayCardAction(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): PlayCardAction {
  return {
    id: `legal-play-card-${playerId}-${cardInstanceId}`,
    type: ActionType.PlayCard,
    playerId,
    createdAt: createActionTimestamp(state),
    payload: {
      cardInstanceId,
    },
  }
}

function createDeclareAttackAction(
  state: GameState,
  playerId: PlayerId,
  attackerInstanceId: string,
  targetInstanceId: string,
): DeclareAttackAction {
  return {
    id: `legal-declare-attack-${playerId}-${attackerInstanceId}-${targetInstanceId}`,
    type: ActionType.DeclareAttack,
    playerId,
    createdAt: createActionTimestamp(state),
    payload: {
      attackerInstanceId,
      targetInstanceId,
    },
  }
}

function createPassCounterAction(
  state: GameState,
  playerId: PlayerId,
): PassCounterAction {
  return {
    id: `legal-pass-counter-${playerId}-${state.turn.turnNumber}`,
    type: ActionType.PassCounter,
    playerId,
    createdAt: createActionTimestamp(state),
  }
}

function createResolveAttackAction(
  state: GameState,
  playerId: PlayerId,
): ResolveAttackAction {
  return {
    id: `legal-resolve-attack-${playerId}-${state.turn.turnNumber}`,
    type: ActionType.ResolveAttack,
    playerId,
    createdAt: createActionTimestamp(state),
  }
}

function getPlayableCardActions(
  state: GameState,
  playerId: PlayerId,
): readonly PlayCardAction[] {
  const player = getPlayerState(state, playerId)

  if (player === undefined || state.phase !== GamePhase.Main) {
    return []
  }

  return getCardsInHand(state, playerId)
    .filter((cardInstance) => {
      const cardDefinition = sampleCardsById[cardInstance.cardId]

      return (
        cardDefinition !== undefined &&
        cardDefinition.type === CardType.Character &&
        (cardDefinition.cost ?? 0) <= player.activeDon
      )
    })
    .map((cardInstance) =>
      createPlayCardAction(state, playerId, cardInstance.instanceId),
    )
}

function getDeclareAttackActions(
  state: GameState,
  playerId: PlayerId,
): readonly DeclareAttackAction[] {
  if (state.phase !== GamePhase.Main) {
    return []
  }

  const activePlayer = getActivePlayerState(state)
  const inactivePlayer = getInactivePlayerState(state)
  const opponentPlayerId = getOpponentPlayerId(state, playerId)

  if (
    activePlayer?.id !== playerId ||
    inactivePlayer === undefined ||
    opponentPlayerId === undefined
  ) {
    return []
  }

  const attackers = [
    getLeaderInstance(state, playerId),
    ...getActiveCharacters(state, playerId),
  ].filter((cardInstance): cardInstance is NonNullable<typeof cardInstance> => {
    if (cardInstance === undefined) {
      return false
    }

    return (
      cardInstance.controllerId === playerId &&
      (cardInstance.zone === Zone.Leader ||
        cardInstance.zone === Zone.CharacterArea) &&
      !cardInstance.isRested
    )
  })

  const potentialTargets = [
    getLeaderInstance(state, opponentPlayerId),
    ...getRestedCharacters(state, opponentPlayerId),
  ].filter((cardInstance): cardInstance is NonNullable<typeof cardInstance> => {
    if (cardInstance === undefined) {
      return false
    }

    if (cardInstance.controllerId === playerId) {
      return false
    }

    if (cardInstance.zone === Zone.Leader) {
      return true
    }

    return cardInstance.zone === Zone.CharacterArea && cardInstance.isRested
  })

  return attackers.flatMap((attacker) =>
    potentialTargets.map((target) =>
      createDeclareAttackAction(
        state,
        playerId,
        attacker.instanceId,
        target.instanceId,
      ),
    ),
  )
}

export function getLegalActions(
  state: GameState,
  playerId: PlayerId,
): GameAction[] {
  const player = getPlayerState(state, playerId)

  if (
    player === undefined ||
    state.status !== 'IN_PROGRESS' ||
    isGameOver(state) ||
    !canPlayerAct(state, playerId)
  ) {
    return []
  }

  const legalActions: GameAction[] = []
  const battle = getCurrentBattle(state)
  const activePlayer = getActivePlayerState(state)

  if (battle !== null) {
    if (battle.awaitingCounterResponse && battle.defendingPlayerId === playerId) {
      legalActions.push(createPassCounterAction(state, playerId))
    }

    if (
      !battle.awaitingCounterResponse &&
      battle.currentBattleStep === BattleStep.ReadyToResolve &&
      battle.attackerControllerId === playerId &&
      activePlayer?.id === playerId
    ) {
      legalActions.push(createResolveAttackAction(state, playerId))
    }

    return legalActions
  }

  if (activePlayer?.id !== playerId) {
    return legalActions
  }

  if (
    state.phase === GamePhase.Draw &&
    player.zones[Zone.Deck].length > 0
  ) {
    legalActions.push(createDrawCardAction(state, playerId))
  }

  if (getNextPhase(state.phase) !== null) {
    legalActions.push(createAdvancePhaseAction(state, playerId))
  }

  if (state.phase === GamePhase.Main || state.phase === GamePhase.End) {
    legalActions.push(createEndTurnAction(state, playerId))
  }

  if (state.phase === GamePhase.Main) {
    legalActions.push(...getPlayableCardActions(state, playerId))
    legalActions.push(...getDeclareAttackActions(state, playerId))
  }

  return legalActions
}
