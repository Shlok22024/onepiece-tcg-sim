import type { CardId } from '../cards/cardTypes.ts'

export type DeckId = string

export type DeckSource = 'LOCAL_PLACEHOLDER' | 'USER_CREATED'

export interface DeckCardEntry {
  readonly cardId: CardId
  readonly quantity: number
}

export interface Deck {
  readonly id: DeckId
  readonly name: string
  readonly leaderCardId: CardId
  readonly mainDeck: readonly DeckCardEntry[]
  readonly notes?: string
  readonly source: DeckSource
}

export interface ParsedDeckEntry {
  readonly lineNumber: number
  readonly rawLine: string
  readonly cardId: CardId
  readonly quantity: number
}

export enum DeckParseErrorCode {
  InvalidFormat = 'INVALID_FORMAT',
  InvalidQuantity = 'INVALID_QUANTITY',
}

export interface DeckParseError {
  readonly code: DeckParseErrorCode
  readonly lineNumber: number
  readonly rawLine: string
  readonly message: string
}

export interface DeckParseResult {
  readonly entries: readonly ParsedDeckEntry[]
  readonly errors: readonly DeckParseError[]
}

export enum DeckValidationErrorCode {
  MissingLeader = 'MISSING_LEADER',
  MultipleLeaders = 'MULTIPLE_LEADERS',
  InvalidMainDeckCount = 'INVALID_MAIN_DECK_COUNT',
  TooManyCopies = 'TOO_MANY_COPIES',
  UnknownCardId = 'UNKNOWN_CARD_ID',
  LeaderColorMismatch = 'LEADER_COLOR_MISMATCH',
  LeaderInMainDeck = 'LEADER_IN_MAIN_DECK',
  MainDeckCardUsedAsLeader = 'MAIN_DECK_CARD_USED_AS_LEADER',
}

export interface DeckValidationError {
  readonly code: DeckValidationErrorCode
  readonly message: string
  readonly cardId?: CardId
  readonly lineNumbers?: readonly number[]
}

export interface ValidatedDeckData {
  readonly leaderCardId: CardId
  readonly mainDeck: readonly DeckCardEntry[]
  readonly mainDeckCount: number
}

export interface DeckValidationResult {
  readonly ok: boolean
  readonly normalizedEntries: readonly DeckCardEntry[]
  readonly errors: readonly DeckValidationError[]
  readonly validatedDeck?: ValidatedDeckData
}

export interface BuildDeckFromListOptions {
  readonly deckId?: DeckId
  readonly deckName?: string
  readonly deckSource?: DeckSource
  readonly notes?: string
}

export interface BuildDeckFromListResult {
  readonly ok: boolean
  readonly parsedEntries: readonly ParsedDeckEntry[]
  readonly parseErrors: readonly DeckParseError[]
  readonly validationErrors: readonly DeckValidationError[]
  readonly deck?: Deck
}
