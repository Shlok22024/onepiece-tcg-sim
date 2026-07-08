import {
  DeckParseErrorCode,
  type DeckParseError,
  type DeckParseResult,
  type ParsedDeckEntry,
} from './deckTypes.ts'

const deckLinePatterns = [
  /^(?<quantity>\d+)\s*x\s*(?<cardId>[a-z0-9-]+)$/i,
  /^(?<quantity>\d+)\s+(?<cardId>[a-z0-9-]+)$/i,
  /^(?<cardId>[a-z0-9-]+)\s+x\s*(?<quantity>\d+)$/i,
  /^(?<cardId>[a-z0-9-]+)\s+(?<quantity>\d+)$/i,
]

function createParseError(
  code: DeckParseErrorCode,
  lineNumber: number,
  rawLine: string,
  message: string,
): DeckParseError {
  return {
    code,
    lineNumber,
    rawLine,
    message,
  }
}

function parseLine(
  rawLine: string,
  lineNumber: number,
): ParsedDeckEntry | DeckParseError {
  const trimmedLine = rawLine.trim()

  for (const pattern of deckLinePatterns) {
    const match = trimmedLine.match(pattern)

    if (match?.groups === undefined) {
      continue
    }

    const cardId = match.groups.cardId.toUpperCase()
    const quantity = Number.parseInt(match.groups.quantity, 10)

    if (!Number.isFinite(quantity) || quantity < 1) {
      return createParseError(
        DeckParseErrorCode.InvalidQuantity,
        lineNumber,
        rawLine,
        'Deck quantities must be whole numbers greater than zero.',
      )
    }

    return {
      lineNumber,
      rawLine,
      cardId,
      quantity,
    }
  }

  return createParseError(
    DeckParseErrorCode.InvalidFormat,
    lineNumber,
    rawLine,
    'Unsupported deck line format. Use formats such as "4x OP01-001" or "OP01-001 4".',
  )
}

export function parseDeckList(rawText: string): DeckParseResult {
  const entries: ParsedDeckEntry[] = []
  const errors: DeckParseError[] = []
  const lines = rawText.split(/\r?\n/)

  lines.forEach((rawLine, index) => {
    if (rawLine.trim() === '') {
      return
    }

    const parsedLine = parseLine(rawLine, index + 1)

    if ('message' in parsedLine && 'code' in parsedLine) {
      errors.push(parsedLine)
      return
    }

    entries.push(parsedLine)
  })

  return {
    entries,
    errors,
  }
}
