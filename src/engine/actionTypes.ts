import type { Deck } from '../deck/deckTypes.ts'
import type { GameError } from './gameErrors.ts'
import type { GameLogEntry, GameState, PlayerId } from './gameTypes.ts'

export enum ActionType {
  StartGame = 'START_GAME',
  AdvancePhase = 'ADVANCE_PHASE',
  DrawCard = 'DRAW_CARD',
  EndTurn = 'END_TURN',
  PlayCard = 'PLAY_CARD',
  DeclareAttack = 'DECLARE_ATTACK',
  ResolveAttack = 'RESOLVE_ATTACK',
  ActivateEffect = 'ACTIVATE_EFFECT',
}

export interface BaseGameAction {
  readonly id: string
  readonly type: ActionType
  readonly playerId: PlayerId
  readonly createdAt: number
}

export interface StartGamePlayerConfig {
  readonly id: PlayerId
  readonly displayName: string
  readonly isHuman: boolean
  readonly deck: Deck
}

export interface StartGameAction extends BaseGameAction {
  readonly type: ActionType.StartGame
  readonly payload: {
    readonly players: readonly [StartGamePlayerConfig, StartGamePlayerConfig]
  }
}

export interface AdvancePhaseAction extends BaseGameAction {
  readonly type: ActionType.AdvancePhase
}

export interface DrawCardAction extends BaseGameAction {
  readonly type: ActionType.DrawCard
  readonly payload?: {
    readonly internal?: boolean
    readonly targetPlayerId?: PlayerId
  }
}

export interface EndTurnAction extends BaseGameAction {
  readonly type: ActionType.EndTurn
}

export interface PlayCardAction extends BaseGameAction {
  readonly type: ActionType.PlayCard
  readonly payload: {
    readonly cardInstanceId: string
  }
}

export interface AttackPayload {
  readonly attackerInstanceId: string
  readonly targetInstanceId: string
}

export interface DeclareAttackAction extends BaseGameAction {
  readonly type: ActionType.DeclareAttack
  readonly payload: AttackPayload
}

export interface ResolveAttackAction extends BaseGameAction {
  readonly type: ActionType.ResolveAttack
  readonly payload: AttackPayload
}

export interface UnsupportedGameAction extends BaseGameAction {
  readonly type: Exclude<
    ActionType,
    | ActionType.StartGame
    | ActionType.AdvancePhase
    | ActionType.DrawCard
    | ActionType.EndTurn
    | ActionType.PlayCard
    | ActionType.DeclareAttack
    | ActionType.ResolveAttack
  >
  readonly payload?: Readonly<Record<string, unknown>>
}

export type GameAction =
  | StartGameAction
  | AdvancePhaseAction
  | DrawCardAction
  | EndTurnAction
  | PlayCardAction
  | DeclareAttackAction
  | ResolveAttackAction
  | UnsupportedGameAction

export interface SuccessfulActionResult {
  readonly ok: true
  readonly action: GameAction
  readonly state: GameState
  readonly logEntry: GameLogEntry
  readonly error?: undefined
}

export interface FailedActionResult {
  readonly ok: false
  readonly action: GameAction
  readonly state: GameState
  readonly error: GameError
  readonly logEntry?: undefined
}

export type ActionResult = SuccessfulActionResult | FailedActionResult
