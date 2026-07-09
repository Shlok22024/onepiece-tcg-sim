import { CardType } from '../cards/cardTypes.ts'
import { ActionType, type GameAction } from '../engine/actionTypes.ts'
import { GamePhase } from '../engine/phaseTypes.ts'
import type { GameState, PlayerId } from '../engine/gameTypes.ts'
import { Zone } from '../engine/gameTypes.ts'
import {
  getCardDefinitionByInstanceId,
  getCardInstanceById,
  getPlayerState,
} from '../engine/selectors.ts'
import type { AIScoredAction } from './aiTypes.ts'

function getPower(cardInstanceId: string, state: GameState): number {
  return getCardDefinitionByInstanceId(state, cardInstanceId)?.power ?? 0
}

function normalizePower(power: number): number {
  return Math.floor(power / 100)
}

function scorePlayCardAction(
  state: GameState,
  playerId: PlayerId,
  action: GameAction,
): AIScoredAction {
  if (action.type !== ActionType.PlayCard) {
    return {
      action,
      score: -1,
      reason: 'This helper can only score PLAY_CARD actions.',
    }
  }

  const player = getPlayerState(state, playerId)
  const cardDefinition = getCardDefinitionByInstanceId(
    state,
    action.payload.cardInstanceId,
  )

  if (player === undefined || cardDefinition === undefined) {
    return {
      action,
      score: 0,
      reason: 'The AI could not resolve the card definition for this play.',
    }
  }

  if (cardDefinition.type !== CardType.Character) {
    return {
      action,
      score: 0,
      reason: `${cardDefinition.name} is not a supported Character play in this milestone.`,
    }
  }

  const cost = cardDefinition.cost ?? 0
  const power = cardDefinition.power ?? 0
  const spendsAllAvailableDon = player.activeDon - cost === 0
  const score =
    7000 + cost * 100 + normalizePower(power) + (spendsAllAvailableDon ? 25 : 0)
  const reason = spendsAllAvailableDon
    ? `Play ${cardDefinition.name} because it is the strongest affordable Character and uses the remaining active DON efficiently.`
    : `Play ${cardDefinition.name} because it is one of the strongest affordable Character options available right now.`

  return {
    action,
    score,
    reason,
  }
}

function scoreDeclareAttackAction(
  state: GameState,
  action: GameAction,
): AIScoredAction {
  if (action.type !== ActionType.DeclareAttack) {
    return {
      action,
      score: -1,
      reason: 'This helper can only score DECLARE_ATTACK actions.',
    }
  }

  const attackerInstance = getCardInstanceById(state, action.payload.attackerInstanceId)
  const targetInstance = getCardInstanceById(state, action.payload.targetInstanceId)
  const attackerDefinition = getCardDefinitionByInstanceId(
    state,
    action.payload.attackerInstanceId,
  )
  const targetDefinition = getCardDefinitionByInstanceId(
    state,
    action.payload.targetInstanceId,
  )

  if (
    attackerInstance === undefined ||
    targetInstance === undefined ||
    attackerDefinition === undefined ||
    targetDefinition === undefined
  ) {
    return {
      action,
      score: 0,
      reason: 'The AI could not fully resolve this attack target or attacker.',
    }
  }

  const attackerPower = getPower(attackerInstance.instanceId, state)
  const targetPower = getPower(targetInstance.instanceId, state)

  if (targetInstance.zone === Zone.Leader) {
    const defendingPlayer = state.players[targetInstance.controllerId]
    const lifeCount = defendingPlayer?.zones[Zone.Life].length ?? 0
    const score =
      lifeCount === 0
        ? 9000 + normalizePower(attackerPower)
        : 7800 + normalizePower(attackerPower)
    const reason =
      lifeCount === 0
        ? `Attack the opposing Leader with ${attackerDefinition.name} because the opponent is at zero life and this attack is immediately lethal.`
        : `Attack the opposing Leader with ${attackerDefinition.name} because no better rested-character battle is available.`

    return {
      action,
      score,
      reason,
    }
  }

  if (targetInstance.zone !== Zone.CharacterArea) {
    return {
      action,
      score: 0,
      reason: 'This attack does not target a currently supported battle zone.',
    }
  }

  if (attackerPower > targetPower) {
    return {
      action,
      score:
        8400 +
        normalizePower(attackerPower - targetPower) +
        normalizePower(attackerPower),
      reason: `Attack ${targetDefinition.name} with ${attackerDefinition.name} because the AI wins this rested-character battle on base power.`,
    }
  }

  if (attackerPower === targetPower) {
    return {
      action,
      score: 7300 + normalizePower(attackerPower),
      reason: `Attack ${targetDefinition.name} with ${attackerDefinition.name} only as a neutral trade option after stronger attacks are exhausted.`,
    }
  }

  return {
    action,
    score: 400 + normalizePower(attackerPower),
    reason: `Avoid attacking ${targetDefinition.name} with ${attackerDefinition.name} because the attacker would lose this battle on base power.`,
  }
}

function scoreAdvancePhaseAction(state: GameState, action: GameAction): AIScoredAction {
  const reason =
    state.phase === GamePhase.Main
      ? 'Advance from MAIN because no stronger attack or Character play is available.'
      : `Advance from ${state.phase} because there is no higher-priority action for this phase.`
  const score = state.phase === GamePhase.Main ? 1100 : 8600

  return {
    action,
    score,
    reason,
  }
}

function scoreEndTurnAction(state: GameState, action: GameAction): AIScoredAction {
  const score = state.phase === GamePhase.End ? 1200 : 1000
  const reason =
    state.phase === GamePhase.End
      ? 'End the turn because the phase sequence is complete.'
      : 'End the turn because no stronger MAIN-phase action is available.'

  return {
    action,
    score,
    reason,
  }
}

export function scoreAction(
  state: GameState,
  playerId: PlayerId,
  action: GameAction,
): AIScoredAction {
  switch (action.type) {
    case ActionType.PassCounter:
      return {
        action,
        score: 10000,
        reason: 'Pass counter because real counter cards are not implemented yet.',
      }
    case ActionType.ResolveAttack:
      return {
        action,
        score: 9600,
        reason: 'Resolve the queued battle because the counter window is already closed.',
      }
    case ActionType.DrawCard:
      return {
        action,
        score: 9200,
        reason: 'Draw because DRAW_CARD is legal during the DRAW phase.',
      }
    case ActionType.AdvancePhase:
      return scoreAdvancePhaseAction(state, action)
    case ActionType.EndTurn:
      return scoreEndTurnAction(state, action)
    case ActionType.PlayCard:
      return scorePlayCardAction(state, playerId, action)
    case ActionType.DeclareAttack:
      return scoreDeclareAttackAction(state, action)
    default:
      return {
        action,
        score: 0,
        reason: `Skip prioritizing ${action.type} because this milestone does not teach the AI how to value it yet.`,
      }
  }
}

export function compareScoredActions(
  left: AIScoredAction,
  right: AIScoredAction,
): number {
  if (left.score !== right.score) {
    return right.score - left.score
  }

  if (left.action.type !== right.action.type) {
    return left.action.type.localeCompare(right.action.type)
  }

  return left.action.id.localeCompare(right.action.id)
}
