import { describe, expect, it } from 'vitest'

import { sampleCardsById } from '../src/cards/sampleCards.ts'
import { buildDeckFromList } from '../src/deck/buildDeckFromList.ts'
import { parseDeckList } from '../src/deck/parseDeckList.ts'
import {
  DeckParseErrorCode,
  DeckValidationErrorCode,
} from '../src/deck/deckTypes.ts'
import { validateDeck } from '../src/deck/validateDeck.ts'

function createValidDeckList(): string {
  return [
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
}

describe('parseDeckList', () => {
  it('valid decklist parses correctly', () => {
    const result = parseDeckList('1x OP01-001\n4x OP01-101')

    expect(result.errors).toEqual([])
    expect(result.entries).toEqual([
      {
        lineNumber: 1,
        rawLine: '1x OP01-001',
        cardId: 'OP01-001',
        quantity: 1,
      },
      {
        lineNumber: 2,
        rawLine: '4x OP01-101',
        cardId: 'OP01-101',
        quantity: 4,
      },
    ])
  })

  it('all supported decklist formats parse correctly', () => {
    const result = parseDeckList(
      ['4x OP01-101', '4 OP01-102', 'OP01-103 x4', 'op01-104 4'].join('\n'),
    )

    expect(result.errors).toEqual([])
    expect(result.entries.map((entry) => entry.cardId)).toEqual([
      'OP01-101',
      'OP01-102',
      'OP01-103',
      'OP01-104',
    ])
    expect(result.entries.map((entry) => entry.quantity)).toEqual([4, 4, 4, 4])
  })

  it('blank lines are ignored', () => {
    const result = parseDeckList('1x OP01-001\n\n  \n4x OP01-101')

    expect(result.errors).toEqual([])
    expect(result.entries).toHaveLength(2)
    expect(result.entries[1].lineNumber).toBe(4)
  })

  it('invalid lines return parse errors with line numbers', () => {
    const result = parseDeckList('1x OP01-001\nbad deck line\nOP01-101 0')

    expect(result.entries).toHaveLength(1)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0].code).toBe(DeckParseErrorCode.InvalidFormat)
    expect(result.errors[0].lineNumber).toBe(2)
    expect(result.errors[1].code).toBe(DeckParseErrorCode.InvalidQuantity)
    expect(result.errors[1].lineNumber).toBe(3)
  })
})

describe('validateDeck', () => {
  it('unknown card IDs fail validation', () => {
    const parsed = parseDeckList(['1x OP01-001', '4x OP99-999'].join('\n'))

    const result = validateDeck(parsed.entries, sampleCardsById)

    expect(result.ok).toBe(false)
    expect(
      result.errors.some(
        (error) => error.code === DeckValidationErrorCode.UnknownCardId,
      ),
    ).toBe(true)
  })

  it('missing Leader fails validation', () => {
    const parsed = parseDeckList('4x OP01-101')

    const result = validateDeck(parsed.entries, sampleCardsById)

    expect(result.ok).toBe(false)
    expect(result.errors[0].code).toBe(DeckValidationErrorCode.MissingLeader)
  })

  it('multiple Leaders fail validation', () => {
    const parsed = parseDeckList(['1x OP01-001', '1x OP01-002'].join('\n'))

    const result = validateDeck(parsed.entries, sampleCardsById)

    expect(result.ok).toBe(false)
    expect(
      result.errors.some(
        (error) => error.code === DeckValidationErrorCode.MultipleLeaders,
      ),
    ).toBe(true)
  })

  it('too few main deck cards fail validation', () => {
    const parsed = parseDeckList(['1x OP01-001', '4x OP01-101'].join('\n'))

    const result = validateDeck(parsed.entries, sampleCardsById)

    expect(result.ok).toBe(false)
    expect(
      result.errors.some(
        (error) =>
          error.code === DeckValidationErrorCode.InvalidMainDeckCount &&
          error.message.includes('Received 4'),
      ),
    ).toBe(true)
  })

  it('too many main deck cards fail validation', () => {
    const parsed = parseDeckList(
      [createValidDeckList(), '1x OP01-113'].join('\n'),
    )

    const result = validateDeck(parsed.entries, sampleCardsById)

    expect(result.ok).toBe(false)
    expect(
      result.errors.some(
        (error) =>
          error.code === DeckValidationErrorCode.InvalidMainDeckCount &&
          error.message.includes('Received 51'),
      ),
    ).toBe(true)
  })

  it('more than 4 copies fails validation', () => {
    const parsed = parseDeckList(['1x OP01-001', '5x OP01-101'].join('\n'))

    const result = validateDeck(parsed.entries, sampleCardsById)

    expect(result.ok).toBe(false)
    expect(
      result.errors.some(
        (error) => error.code === DeckValidationErrorCode.TooManyCopies,
      ),
    ).toBe(true)
  })

  it('leader color mismatch fails validation', () => {
    const parsed = parseDeckList(['1x OP01-001', '4x OP02-101'].join('\n'))

    const result = validateDeck(parsed.entries, sampleCardsById)

    expect(result.ok).toBe(false)
    expect(
      result.errors.some(
        (error) => error.code === DeckValidationErrorCode.LeaderColorMismatch,
      ),
    ).toBe(true)
  })
})

describe('buildDeckFromList', () => {
  it('valid 50 card deck with 1 Leader succeeds', () => {
    const result = buildDeckFromList(createValidDeckList(), {
      deckName: 'Red Practice Deck',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.deck.name).toBe('Red Practice Deck')
    expect(result.deck.leaderCardId).toBe('OP01-001')
    expect(
      result.deck.mainDeck.reduce((total, entry) => total + entry.quantity, 0),
    ).toBe(50)
    expect(result.validationErrors).toEqual([])
  })
})
