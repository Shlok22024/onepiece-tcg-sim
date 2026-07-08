export interface DeckCardEntry {
  cardCode: string
  quantity: number
  isLeader?: boolean
  isDonCard?: boolean
}

export interface Deck {
  id: string
  name: string
  leaderCardCode: string
  mainDeck: DeckCardEntry[]
  notes?: string
  source: 'LOCAL_PLACEHOLDER' | 'USER_CREATED'
}
