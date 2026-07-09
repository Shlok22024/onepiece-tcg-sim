import type { GameAction } from '../engine/actionTypes.ts'
import { ActionType } from '../engine/actionTypes.ts'
import { getNextPhase } from '../engine/phaseTypes.ts'
import type { GameState } from '../engine/gameTypes.ts'
import { Zone } from '../engine/gameTypes.ts'
import {
  getCardDefinitionByInstanceId,
  getCardInstanceById,
  getCurrentBattle,
} from '../engine/selectors.ts'

function getCardName(state: GameState, cardInstanceId: string): string {
  return getCardDefinitionByInstanceId(state, cardInstanceId)?.name ?? cardInstanceId
}

export function describeLegalAction(
  state: GameState,
  action: GameAction,
): string {
  switch (action.type) {
    case ActionType.DrawCard:
      return 'Draw Card'
    case ActionType.AdvancePhase: {
      const nextPhase = getNextPhase(state.phase)
      return nextPhase === null ? 'Advance Phase' : `Advance to ${nextPhase} Phase`
    }
    case ActionType.EndTurn:
      return 'End Turn'
    case ActionType.PlayCard:
      return `Play ${getCardName(state, action.payload.cardInstanceId)}`
    case ActionType.DeclareAttack: {
      const attackerName = getCardName(state, action.payload.attackerInstanceId)
      const targetInstance = getCardInstanceById(state, action.payload.targetInstanceId)
      const targetName = getCardName(state, action.payload.targetInstanceId)

      return targetInstance?.zone === Zone.Leader
        ? `Attack Leader with ${attackerName}`
        : `Attack ${targetName} with ${attackerName}`
    }
    case ActionType.PassCounter:
      return 'Pass Counter'
    case ActionType.ResolveAttack: {
      const battle = getCurrentBattle(state)

      if (battle === null) {
        return 'Resolve Attack'
      }

      return `Resolve Attack on ${getCardName(state, battle.targetInstanceId)}`
    }
    case ActionType.StartGame:
      return 'Start Debug Game'
    default:
      return action.type
  }
}
