import type { CardId } from '../cards/cardTypes.ts'
import type { Deck } from '../deck/deckTypes.ts'
import type { ActionType } from './actionTypes.ts'
import { GamePhase } from './phaseTypes.ts'

export type PlayerId = string
export type CardInstanceId = string
export type GameId = string
export type GameStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'
export type GameEndReason = 'LEADER_DAMAGE_AT_ZERO_LIFE'

export enum BattleTargetType {
  Leader = 'LEADER',
  Character = 'CHARACTER',
}

export enum BattleStep {
  None = 'NONE',
  AttackDeclared = 'ATTACK_DECLARED',
  CounterWindow = 'COUNTER_WINDOW',
  ReadyToResolve = 'READY_TO_RESOLVE',
  Resolved = 'RESOLVED',
}

export enum Zone {
  Leader = 'LEADER',
  Deck = 'DECK',
  Hand = 'HAND',
  Life = 'LIFE',
  Trash = 'TRASH',
  CharacterArea = 'CHARACTER_AREA',
  StageArea = 'STAGE_AREA',
  DonDeck = 'DON_DECK',
  DonActive = 'DON_ACTIVE',
  DonRested = 'DON_RESTED',
}

export interface CardInstance {
  readonly instanceId: CardInstanceId
  readonly cardId: CardId
  readonly ownerId: PlayerId
  readonly controllerId: PlayerId
  readonly zone: Zone
  readonly isRested: boolean
  readonly attachedDonCount: number
}

export interface PlayerZones {
  readonly [Zone.Leader]: readonly CardInstanceId[]
  readonly [Zone.Deck]: readonly CardInstanceId[]
  readonly [Zone.Hand]: readonly CardInstanceId[]
  readonly [Zone.Life]: readonly CardInstanceId[]
  readonly [Zone.Trash]: readonly CardInstanceId[]
  readonly [Zone.CharacterArea]: readonly CardInstanceId[]
  readonly [Zone.StageArea]: readonly CardInstanceId[]
  readonly [Zone.DonDeck]: readonly CardInstanceId[]
  readonly [Zone.DonActive]: readonly CardInstanceId[]
  readonly [Zone.DonRested]: readonly CardInstanceId[]
}

export interface PlayerState {
  readonly id: PlayerId
  readonly displayName: string
  readonly isHuman: boolean
  readonly deckDefinition: Deck
  readonly leaderCardInstanceId: CardInstanceId
  readonly zones: PlayerZones
  readonly donDeckCount: number
  readonly activeDon: number
  readonly restedDon: number
  readonly totalDonInPlay: number
}

export interface TurnState {
  readonly activePlayerId: PlayerId | null
  readonly activePlayerIndex: number | null
  readonly turnNumber: number
  readonly hasPerformedNormalDraw: boolean
}

export interface BattleState {
  readonly attackerInstanceId: CardInstanceId
  readonly attackerControllerId: PlayerId
  readonly targetInstanceId: CardInstanceId
  readonly targetControllerId: PlayerId
  readonly targetType: BattleTargetType
  readonly attackStartedAtTurn: number
  readonly currentBattleStep: BattleStep
  readonly defendingPlayerId: PlayerId
  readonly counterPowerAdded: number
  readonly awaitingCounterResponse: boolean
}

export interface GameLogEntry {
  readonly id: string
  readonly actionId: string
  readonly actionType: ActionType
  readonly playerId: PlayerId
  readonly message: string
  readonly timestamp: number
}

export interface GameState {
  readonly id: GameId
  readonly status: GameStatus
  readonly gameOver: boolean
  readonly phase: GamePhase
  readonly players: Record<PlayerId, PlayerState>
  readonly playerOrder: readonly PlayerId[]
  readonly cardInstances: Record<CardInstanceId, CardInstance>
  readonly turn: TurnState
  readonly battle: BattleState | null
  readonly log: readonly GameLogEntry[]
  readonly createdAt: number
  readonly updatedAt: number
  readonly winnerId?: PlayerId
  readonly loserId?: PlayerId
  readonly endReason?: GameEndReason
}
