import type { Deck } from '../deck/deckTypes.ts'
import { GamePhase } from './phaseTypes.ts'

export interface PlayerState {
  id: string
  displayName: string
  isHuman: boolean
  deck: Deck
  leaderCardId?: string
  handCardIds: string[]
  lifeCardIds: string[]
  trashCardIds: string[]
  fieldCardIds: string[]
  donDeckCardIds: string[]
  activeDonCardIds: string[]
  restedDonCardIds: string[]
}

export interface GameState {
  id: string
  status: 'SETUP' | 'IN_PROGRESS' | 'COMPLETE'
  phase: GamePhase
  turnNumber: number
  activePlayerId: string
  priorityPlayerId: string
  players: Record<string, PlayerState>
  actionHistoryIds: string[]
  winnerId?: string
  createdAt: number
  updatedAt: number
}
