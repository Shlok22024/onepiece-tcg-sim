import { sampleCardsById } from '../cards/sampleCards.ts'
import type { Card } from '../cards/cardTypes.ts'
import { BattleStep, Zone } from './gameTypes.ts'
import type {
  BattleState,
  CardInstance,
  CardInstanceId,
  GameState,
  PlayerId,
  PlayerState,
} from './gameTypes.ts'

export function getPlayerState(
  state: GameState,
  playerId: PlayerId,
): PlayerState | undefined {
  return state.players[playerId]
}

export function getOpponentPlayerId(
  state: GameState,
  playerId: PlayerId,
): PlayerId | undefined {
  if (!(playerId in state.players)) {
    return undefined
  }

  return state.playerOrder.find((candidateId) => candidateId !== playerId)
}

export function getActivePlayerState(state: GameState): PlayerState | undefined {
  const activePlayerId = state.turn.activePlayerId

  if (activePlayerId === null) {
    return undefined
  }

  return getPlayerState(state, activePlayerId)
}

export function getInactivePlayerState(
  state: GameState,
): PlayerState | undefined {
  const activePlayer = getActivePlayerState(state)

  if (activePlayer === undefined) {
    return undefined
  }

  const opponentPlayerId = getOpponentPlayerId(state, activePlayer.id)

  if (opponentPlayerId === undefined) {
    return undefined
  }

  return getPlayerState(state, opponentPlayerId)
}

export function getCardInstanceById(
  state: GameState,
  cardInstanceId: CardInstanceId,
): CardInstance | undefined {
  return state.cardInstances[cardInstanceId]
}

export function getCardDefinitionByInstanceId(
  state: GameState,
  cardInstanceId: CardInstanceId,
): Card | undefined {
  const cardInstance = getCardInstanceById(state, cardInstanceId)

  if (cardInstance === undefined) {
    return undefined
  }

  return sampleCardsById[cardInstance.cardId]
}

export function getLeaderInstance(
  state: GameState,
  playerId: PlayerId,
): CardInstance | undefined {
  const player = getPlayerState(state, playerId)

  if (player === undefined) {
    return undefined
  }

  return getCardInstanceById(state, player.leaderCardInstanceId)
}

export function getCharacterInstances(
  state: GameState,
  playerId: PlayerId,
): readonly CardInstance[] {
  const player = getPlayerState(state, playerId)

  if (player === undefined) {
    return []
  }

  return player.zones[Zone.CharacterArea]
    .map((cardInstanceId) => getCardInstanceById(state, cardInstanceId))
    .filter((cardInstance): cardInstance is CardInstance => cardInstance !== undefined)
}

export function getActiveCharacters(
  state: GameState,
  playerId: PlayerId,
): readonly CardInstance[] {
  return getCharacterInstances(state, playerId).filter(
    (cardInstance) => !cardInstance.isRested,
  )
}

export function getRestedCharacters(
  state: GameState,
  playerId: PlayerId,
): readonly CardInstance[] {
  return getCharacterInstances(state, playerId).filter(
    (cardInstance) => cardInstance.isRested,
  )
}

export function getCardsInHand(
  state: GameState,
  playerId: PlayerId,
): readonly CardInstance[] {
  const player = getPlayerState(state, playerId)

  if (player === undefined) {
    return []
  }

  return player.zones[Zone.Hand]
    .map((cardInstanceId) => getCardInstanceById(state, cardInstanceId))
    .filter((cardInstance): cardInstance is CardInstance => cardInstance !== undefined)
}

export function getCurrentBattle(state: GameState): BattleState | null {
  return state.battle
}

export function isBattlePending(state: GameState): boolean {
  return state.battle !== null && state.battle.currentBattleStep !== BattleStep.Resolved
}

export function isGameOver(state: GameState): boolean {
  return state.gameOver || state.status === 'COMPLETE'
}

export function canPlayerAct(
  state: GameState,
  playerId: PlayerId,
): boolean {
  if (!(playerId in state.players) || state.status !== 'IN_PROGRESS' || isGameOver(state)) {
    return false
  }

  if (state.battle !== null) {
    if (state.battle.awaitingCounterResponse) {
      return state.battle.defendingPlayerId === playerId
    }

    return (
      state.turn.activePlayerId === playerId &&
      state.battle.attackerControllerId === playerId
    )
  }

  return state.turn.activePlayerId === playerId
}
