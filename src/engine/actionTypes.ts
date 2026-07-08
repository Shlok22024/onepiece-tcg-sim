import type { Deck } from '../deck/deckTypes.ts'
import type { GameError } from './gameErrors.ts'
import type { GameLogEntry, GameState, PlayerId } from './gameTypes.ts'

export enum ActionType {
  StartGame = 'START_GAME',
  DrawCard = 'DRAW_CARD',
  EndTurn = 'END_TURN',
  PlayCard = 'PLAY_CARD',
  Attack = 'ATTACK',
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

export interface DrawCardAction extends BaseGameAction {
  readonly type: ActionType.DrawCard
}

export interface EndTurnAction extends BaseGameAction {
  readonly type: ActionType.EndTurn
}

export interface UnsupportedGameAction extends BaseGameAction {
  readonly type: Exclude<
    ActionType,
    ActionType.StartGame | ActionType.DrawCard | ActionType.EndTurn
  >
  readonly payload?: Readonly<Record<string, unknown>>
}

export type GameAction =
  | StartGameAction
  | DrawCardAction
  | EndTurnAction
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
