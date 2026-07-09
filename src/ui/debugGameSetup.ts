import type { StartGameAction, StartGamePlayerConfig } from '../engine/actionTypes.ts'
import { ActionType } from '../engine/actionTypes.ts'
import { buildDeckFromList } from '../deck/buildDeckFromList.ts'

const redPracticeDeckList = [
  '1x OP01-001',
  '4x OP01-101',
  '4x OP01-102',
  '4x OP01-103',
  '4x OP01-104',
  '4x OP01-105',
  '4x OP01-106',
  '4x OP01-107',
  '4x OP01-108',
  '4x OP01-109',
  '4x OP01-110',
  '4x OP01-111',
  '4x OP01-112',
  '2x OP01-113',
].join('\n')

function createDebugPlayerDeck(
  deckId: string,
  deckName: string,
) {
  const result = buildDeckFromList(redPracticeDeckList, {
    deckId,
    deckName,
    deckSource: 'LOCAL_PLACEHOLDER',
    notes: 'Debug-only placeholder mirror match deck.',
  })

  if (!result.ok) {
    throw new Error('Debug deck setup is invalid. The placeholder deck list must remain buildable.')
  }

  if (result.deck === undefined) {
    throw new Error('Debug deck setup did not return a deck payload.')
  }

  return result.deck
}

export function createDebugPlayers(): readonly [
  StartGamePlayerConfig,
  StartGamePlayerConfig,
] {
  return [
    {
      id: 'player-1',
      displayName: 'Player One',
      isHuman: true,
      deck: createDebugPlayerDeck('debug-red-1', 'Red Practice Mirror A'),
    },
    {
      id: 'player-2',
      displayName: 'Player Two',
      isHuman: false,
      deck: createDebugPlayerDeck('debug-red-2', 'Red Practice Mirror B'),
    },
  ]
}

export function createDebugStartGameAction(
  now: number = Date.now(),
): StartGameAction {
  return {
    id: `debug-start-${now}`,
    type: ActionType.StartGame,
    playerId: 'player-1',
    createdAt: now,
    payload: {
      players: createDebugPlayers(),
    },
  }
}
