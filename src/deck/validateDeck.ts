import type { Card, CardId } from '../cards/cardTypes.ts'
import { CardType } from '../cards/cardTypes.ts'
import { sampleCardsById } from '../cards/sampleCards.ts'
import {
  DeckValidationErrorCode,
  type DeckCardEntry,
  type DeckValidationError,
  type DeckValidationResult,
  type ParsedDeckEntry,
  type ValidatedDeckData,
} from './deckTypes.ts'

interface AggregatedDeckEntry {
  readonly cardId: CardId
  readonly quantity: number
  readonly lineNumbers: readonly number[]
}

function createValidationError(
  code: DeckValidationErrorCode,
  message: string,
  options: {
    readonly cardId?: CardId
    readonly lineNumbers?: readonly number[]
  } = {},
): DeckValidationError {
  return {
    code,
    message,
    cardId: options.cardId,
    lineNumbers: options.lineNumbers,
  }
}

function aggregateEntries(
  entries: readonly ParsedDeckEntry[],
): readonly AggregatedDeckEntry[] {
  const aggregatedEntries = new Map<CardId, AggregatedDeckEntry>()

  for (const entry of entries) {
    const existingEntry = aggregatedEntries.get(entry.cardId)

    if (existingEntry === undefined) {
      aggregatedEntries.set(entry.cardId, {
        cardId: entry.cardId,
        quantity: entry.quantity,
        lineNumbers: [entry.lineNumber],
      })
      continue
    }

    aggregatedEntries.set(entry.cardId, {
      cardId: entry.cardId,
      quantity: existingEntry.quantity + entry.quantity,
      lineNumbers: [...existingEntry.lineNumbers, entry.lineNumber],
    })
  }

  return [...aggregatedEntries.values()]
}

function cardMatchesLeaderColors(card: Card, leaderCard: Card): boolean {
  return card.colors.some((color) => leaderCard.colors.includes(color))
}

export function validateDeck(
  entries: readonly ParsedDeckEntry[],
  cardDatabase: Readonly<Record<CardId, Card>> = sampleCardsById,
): DeckValidationResult {
  const errors: DeckValidationError[] = []
  const aggregatedEntries = aggregateEntries(entries)
  const normalizedEntries: DeckCardEntry[] = aggregatedEntries.map((entry) => ({
    cardId: entry.cardId,
    quantity: entry.quantity,
  }))

  const leaderEntries: AggregatedDeckEntry[] = []
  const mainDeckEntries: AggregatedDeckEntry[] = []
  const knownCards = new Map<CardId, Card>()

  for (const entry of aggregatedEntries) {
    const card = cardDatabase[entry.cardId]

    if (card === undefined) {
      errors.push(
        createValidationError(
          DeckValidationErrorCode.UnknownCardId,
          `Card id ${entry.cardId} does not exist in the current sample card database.`,
          {
            cardId: entry.cardId,
            lineNumbers: entry.lineNumbers,
          },
        ),
      )
      continue
    }

    knownCards.set(entry.cardId, card)

    if (card.type === CardType.Leader) {
      leaderEntries.push(entry)
      continue
    }

    mainDeckEntries.push(entry)

    if (entry.quantity > 4) {
      errors.push(
        createValidationError(
          DeckValidationErrorCode.TooManyCopies,
          `Card id ${entry.cardId} exceeds the current 4-copy limit for non-Leader cards.`,
          {
            cardId: entry.cardId,
            lineNumbers: entry.lineNumbers,
          },
        ),
      )
    }
  }

  const totalLeaderCopies = leaderEntries.reduce(
    (total, entry) => total + entry.quantity,
    0,
  )

  if (totalLeaderCopies === 0) {
    errors.push(
      createValidationError(
        DeckValidationErrorCode.MissingLeader,
        'A decklist must contain exactly one Leader card.',
      ),
    )
  }

  if (totalLeaderCopies > 1) {
    errors.push(
      createValidationError(
        DeckValidationErrorCode.MultipleLeaders,
        'A decklist must contain exactly one Leader card total.',
        {
          lineNumbers: leaderEntries.flatMap((entry) => entry.lineNumbers),
        },
      ),
    )
  }

  if (leaderEntries.some((entry) => entry.quantity > 1)) {
    errors.push(
      createValidationError(
        DeckValidationErrorCode.LeaderInMainDeck,
        'Leader cards cannot appear in the main deck or have quantities greater than one.',
        {
          lineNumbers: leaderEntries.flatMap((entry) => entry.lineNumbers),
        },
      ),
    )
  }

  const leaderEntry = totalLeaderCopies === 1 ? leaderEntries[0] : undefined
  const leaderCard =
    leaderEntry === undefined ? undefined : knownCards.get(leaderEntry.cardId)

  if (leaderCard !== undefined) {
    const duplicateLeaderCardInMainDeck = mainDeckEntries.find(
      (entry) => entry.cardId === leaderCard.id,
    )

    if (duplicateLeaderCardInMainDeck !== undefined) {
      errors.push(
        createValidationError(
          DeckValidationErrorCode.MainDeckCardUsedAsLeader,
          'The chosen Leader card cannot also appear as a main deck card.',
          {
            cardId: duplicateLeaderCardInMainDeck.cardId,
            lineNumbers: duplicateLeaderCardInMainDeck.lineNumbers,
          },
        ),
      )
    }
  }

  const totalMainDeckCards = mainDeckEntries.reduce(
    (total, entry) => total + entry.quantity,
    0,
  )

  if (totalMainDeckCards !== 50) {
    errors.push(
      createValidationError(
        DeckValidationErrorCode.InvalidMainDeckCount,
        `The main deck must contain exactly 50 cards. Received ${totalMainDeckCards}.`,
      ),
    )
  }

  if (leaderCard !== undefined) {
    for (const entry of mainDeckEntries) {
      const card = knownCards.get(entry.cardId)

      if (card === undefined) {
        continue
      }

      if (!cardMatchesLeaderColors(card, leaderCard)) {
        errors.push(
          createValidationError(
            DeckValidationErrorCode.LeaderColorMismatch,
            `Card id ${entry.cardId} does not match the current Leader color rules.`,
            {
              cardId: entry.cardId,
              lineNumbers: entry.lineNumbers,
            },
          ),
        )
      }
    }
  }

  if (errors.length > 0 || leaderCard === undefined) {
    return {
      ok: false,
      normalizedEntries,
      errors,
    }
  }

  const validatedDeck: ValidatedDeckData = {
    leaderCardId: leaderCard.id,
    mainDeck: mainDeckEntries.map((entry) => ({
      cardId: entry.cardId,
      quantity: entry.quantity,
    })),
    mainDeckCount: totalMainDeckCards,
  }

  return {
    ok: true,
    normalizedEntries,
    errors: [],
    validatedDeck,
  }
}
