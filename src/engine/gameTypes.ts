import type { CardId } from '../cards/cardTypes.ts'
import type { Deck } from '../deck/deckTypes.ts'
import type { ActionType } from './actionTypes.ts'
import { GamePhase } from './phaseTypes.ts'

export type PlayerId = string
export type CardInstanceId = string
export type GameId = string
export type GameStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'

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
  readonly id: CardInstanceId
  readonly cardId: CardId
  readonly ownerId: PlayerId
  readonly controllerId: PlayerId
  readonly zone: Zone
  readonly isRested: boolean
}

export type PlayerZones = Record<Zone, readonly CardInstanceId[]>

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
  readonly phase: GamePhase
  readonly players: Record<PlayerId, PlayerState>
  readonly playerOrder: readonly PlayerId[]
  readonly cardInstances: Record<CardInstanceId, CardInstance>
  readonly turn: TurnState
  readonly log: readonly GameLogEntry[]
  readonly createdAt: number
  readonly updatedAt: number
  readonly winnerId?: PlayerId
}
