import type { Card, CardId } from '../cards/cardTypes.ts'
import { sampleCardsById } from '../cards/sampleCards.ts'
import { parseDeckList } from './parseDeckList.ts'
import type {
  BuildDeckFromListOptions,
  BuildDeckFromListResult,
  Deck,
} from './deckTypes.ts'
import { validateDeck } from './validateDeck.ts'

function createDeckId(leaderCardId: CardId): string {
  return `deck-${leaderCardId.toLowerCase()}`
}

function createDeckName(
  leaderCardId: CardId,
  cardDatabase: Readonly<Record<CardId, Card>>,
): string {
  const leaderCard = cardDatabase[leaderCardId]

  if (leaderCard === undefined) {
    return 'Imported Deck'
  }

  return `${leaderCard.name} Practice Deck`
}

export function buildDeckFromList(
  rawDeckList: string,
  options: BuildDeckFromListOptions = {},
  cardDatabase: Readonly<Record<CardId, Card>> = sampleCardsById,
): BuildDeckFromListResult {
  const parseResult = parseDeckList(rawDeckList)
  const validationResult = validateDeck(parseResult.entries, cardDatabase)

  if (
    parseResult.errors.length > 0 ||
    !validationResult.ok ||
    validationResult.validatedDeck === undefined
  ) {
    return {
      ok: false,
      parsedEntries: parseResult.entries,
      parseErrors: parseResult.errors,
      validationErrors: validationResult.errors,
    }
  }

  const { validatedDeck } = validationResult

  const deck: Deck = {
    id: options.deckId ?? createDeckId(validatedDeck.leaderCardId),
    name:
      options.deckName ??
      createDeckName(validatedDeck.leaderCardId, cardDatabase),
    leaderCardId: validatedDeck.leaderCardId,
    mainDeck: validatedDeck.mainDeck,
    notes: options.notes,
    source: options.deckSource ?? 'USER_CREATED',
  }

  return {
    ok: true,
    parsedEntries: parseResult.entries,
    parseErrors: [],
    validationErrors: [],
    deck,
  }
}
