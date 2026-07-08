export enum GameErrorCode {
  CardNotInHand = 'CARD_NOT_IN_HAND',
  DuplicatePlayerId = 'DUPLICATE_PLAYER_ID',
  EmptyDeck = 'EMPTY_DECK',
  GameAlreadyStarted = 'GAME_ALREADY_STARTED',
  GameNotStarted = 'GAME_NOT_STARTED',
  InvalidAction = 'INVALID_ACTION',
  InvalidPhaseTransition = 'INVALID_PHASE_TRANSITION',
  InvalidPlayerCount = 'INVALID_PLAYER_COUNT',
  InvalidTargetPlayer = 'INVALID_TARGET_PLAYER',
  InsufficientDon = 'INSUFFICIENT_DON',
  IllegalPhaseAction = 'ILLEGAL_PHASE_ACTION',
  NotActivePlayer = 'NOT_ACTIVE_PLAYER',
  UnknownCardInstance = 'UNKNOWN_CARD_INSTANCE',
  UnsupportedCardType = 'UNSUPPORTED_CARD_TYPE',
  UnsupportedAction = 'UNSUPPORTED_ACTION',
}

export interface GameError {
  readonly code: GameErrorCode
  readonly message: string
}

export function createGameError(
  code: GameErrorCode,
  message: string,
): GameError {
  return {
    code,
    message,
  }
}
