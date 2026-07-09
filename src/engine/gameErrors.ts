export enum GameErrorCode {
  AlreadyRestedAttacker = 'ALREADY_RESTED_ATTACKER',
  BattleAlreadyInProgress = 'BATTLE_ALREADY_IN_PROGRESS',
  BattleNotReadyToResolve = 'BATTLE_NOT_READY_TO_RESOLVE',
  CardNotInHand = 'CARD_NOT_IN_HAND',
  CannotAttackOwnCard = 'CANNOT_ATTACK_OWN_CARD',
  CounterWindowNotOpen = 'COUNTER_WINDOW_NOT_OPEN',
  DuplicatePlayerId = 'DUPLICATE_PLAYER_ID',
  EmptyDeck = 'EMPTY_DECK',
  GameAlreadyStarted = 'GAME_ALREADY_STARTED',
  GameAlreadyOver = 'GAME_ALREADY_OVER',
  GameNotStarted = 'GAME_NOT_STARTED',
  InvalidCounterResponder = 'INVALID_COUNTER_RESPONDER',
  InvalidAttackTarget = 'INVALID_ATTACK_TARGET',
  InvalidAttacker = 'INVALID_ATTACKER',
  InvalidAction = 'INVALID_ACTION',
  InvalidPhaseTransition = 'INVALID_PHASE_TRANSITION',
  InvalidPlayerCount = 'INVALID_PLAYER_COUNT',
  InvalidTargetPlayer = 'INVALID_TARGET_PLAYER',
  InsufficientDon = 'INSUFFICIENT_DON',
  IllegalPhaseAction = 'ILLEGAL_PHASE_ACTION',
  NoActiveBattle = 'NO_ACTIVE_BATTLE',
  NotActivePlayer = 'NOT_ACTIVE_PLAYER',
  TargetMustBeRestedCharacter = 'TARGET_MUST_BE_RESTED_CHARACTER',
  UnresolvedBattle = 'UNRESOLVED_BATTLE',
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
