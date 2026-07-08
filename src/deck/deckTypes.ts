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
