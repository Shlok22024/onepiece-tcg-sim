import { ActionType, type ActionResult, type GameAction } from './actionTypes.ts'
import type { StartGamePlayerConfig } from './actionTypes.ts'
import { createGameError, GameErrorCode } from './gameErrors.ts'
import { appendGameLog, createGameLogEntry } from './gameLog.ts'
import type {
  CardInstance,
  CardInstanceId,
  GameState,
  PlayerId,
  PlayerState,
  PlayerZones,
  Zone,
} from './gameTypes.ts'
import { Zone as PlayerZone } from './gameTypes.ts'
import { GamePhase } from './phaseTypes.ts'

const supportedActions = new Set<ActionType>([
  ActionType.StartGame,
  ActionType.DrawCard,
  ActionType.EndTurn,
])

function createFailureResult(
  state: GameState,
  action: GameAction,
  code: GameErrorCode,
  message: string,
): ActionResult {
  return {
    ok: false,
    action,
    state,
    error: createGameError(code, message),
  }
}

function createSuccessResult(
  state: GameState,
  action: GameAction,
  message: string,
): ActionResult {
  const logEntry = createGameLogEntry(action, message, state.updatedAt)
  const nextState = appendGameLog(state, logEntry)

  return {
    ok: true,
    action,
    state: nextState,
    logEntry,
  }
}

function createEmptyZones(): PlayerZones {
  return {
    [PlayerZone.Leader]: [],
    [PlayerZone.Deck]: [],
    [PlayerZone.Hand]: [],
    [PlayerZone.Life]: [],
    [PlayerZone.Trash]: [],
    [PlayerZone.CharacterArea]: [],
    [PlayerZone.StageArea]: [],
    [PlayerZone.DonDeck]: [],
    [PlayerZone.DonActive]: [],
    [PlayerZone.DonRested]: [],
  }
}

function createCardInstanceId(
  playerId: PlayerId,
  zone: Zone,
  ordinal: number,
): CardInstanceId {
  return `${playerId}-${zone}-${ordinal}`
}

function createLeaderInstance(player: StartGamePlayerConfig): CardInstance {
  return {
    id: createCardInstanceId(player.id, PlayerZone.Leader, 0),
    cardId: player.deck.leaderCardId,
    ownerId: player.id,
    controllerId: player.id,
    zone: PlayerZone.Leader,
    isRested: false,
  }
}

function expandMainDeck(player: StartGamePlayerConfig): readonly CardInstance[] {
  const deckInstances: CardInstance[] = []
  let ordinal = 0

  for (const entry of player.deck.mainDeck) {
    for (let count = 0; count < entry.quantity; count += 1) {
      deckInstances.push({
        id: createCardInstanceId(player.id, PlayerZone.Deck, ordinal),
        cardId: entry.cardId,
        ownerId: player.id,
        controllerId: player.id,
        zone: PlayerZone.Deck,
        isRested: false,
      })

      ordinal += 1
    }
  }

  return deckInstances
}

function buildPlayerState(player: StartGamePlayerConfig): {
  readonly playerState: PlayerState
  readonly cardInstances: readonly CardInstance[]
} {
  const leaderInstance = createLeaderInstance(player)
  const deckInstances = expandMainDeck(player)
  const zones = createEmptyZones()

  zones[PlayerZone.Leader] = [leaderInstance.id]
  zones[PlayerZone.Deck] = deckInstances.map((instance) => instance.id)

  return {
    playerState: {
      id: player.id,
      displayName: player.displayName,
      isHuman: player.isHuman,
      deckDefinition: player.deck,
      leaderCardInstanceId: leaderInstance.id,
      zones,
    },
    cardInstances: [leaderInstance, ...deckInstances],
  }
}

function isGameInProgress(state: GameState): boolean {
  return state.status === 'IN_PROGRESS'
}

function resolveActivePlayer(state: GameState): PlayerState | null {
  const activePlayerId = state.turn.activePlayerId

  if (activePlayerId === null) {
    return null
  }

  return state.players[activePlayerId] ?? null
}

function validateActivePlayerAction(
  state: GameState,
  action: GameAction,
): ActionResult | null {
  if (!isGameInProgress(state)) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.GameNotStarted,
      'The game must be started before this action can be used.',
    )
  }

  if (state.turn.activePlayerId !== action.playerId) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.NotActivePlayer,
      'Only the active player can perform this action right now.',
    )
  }

  return null
}

function startGame(state: GameState, action: GameAction): ActionResult {
  if (action.type !== ActionType.StartGame) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'A START_GAME action is required to start the game.',
    )
  }

  if (state.status !== 'NOT_STARTED') {
    return createFailureResult(
      state,
      action,
      GameErrorCode.GameAlreadyStarted,
      'The game has already been started.',
    )
  }

  const { players } = action.payload

  if (players.length !== 2) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidPlayerCount,
      'START_GAME currently supports exactly two players.',
    )
  }

  if (players[0].id === players[1].id) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.DuplicatePlayerId,
      'Each player must have a unique player id.',
    )
  }

  const firstPlayer = buildPlayerState(players[0])
  const secondPlayer = buildPlayerState(players[1])
  const updatedAt = action.createdAt
  const nextState: GameState = {
    ...state,
    status: 'IN_PROGRESS',
    phase: GamePhase.Main,
    players: {
      [players[0].id]: firstPlayer.playerState,
      [players[1].id]: secondPlayer.playerState,
    },
    playerOrder: [players[0].id, players[1].id],
    cardInstances: Object.fromEntries(
      [...firstPlayer.cardInstances, ...secondPlayer.cardInstances].map(
        (instance) => [instance.id, instance],
      ),
    ),
    turn: {
      activePlayerId: players[0].id,
      activePlayerIndex: 0,
      turnNumber: 1,
    },
    updatedAt,
  }

  return createSuccessResult(
    nextState,
    action,
    `Game started. ${players[0].displayName} takes the first turn.`,
  )
}

function drawCard(state: GameState, action: GameAction): ActionResult {
  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  const activePlayer = resolveActivePlayer(state)

  if (activePlayer === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'The active player could not be resolved.',
    )
  }

  const deckZone = activePlayer.zones[PlayerZone.Deck]

  if (deckZone.length === 0) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.EmptyDeck,
      'The active player cannot draw because their deck is empty.',
    )
  }

  const drawnCardInstanceId = deckZone[0]
  const remainingDeck = deckZone.slice(1)
  const updatedPlayer: PlayerState = {
    ...activePlayer,
    zones: {
      ...activePlayer.zones,
      [PlayerZone.Deck]: remainingDeck,
      [PlayerZone.Hand]: [...activePlayer.zones[PlayerZone.Hand], drawnCardInstanceId],
    },
  }
  const updatedCardInstance: CardInstance = {
    ...state.cardInstances[drawnCardInstanceId],
    zone: PlayerZone.Hand,
  }
  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [activePlayer.id]: updatedPlayer,
    },
    cardInstances: {
      ...state.cardInstances,
      [drawnCardInstanceId]: updatedCardInstance,
    },
    updatedAt: action.createdAt,
  }

  return createSuccessResult(
    nextState,
    action,
    `${activePlayer.displayName} drew one card from the deck.`,
  )
}

function endTurn(state: GameState, action: GameAction): ActionResult {
  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  const activePlayerIndex = state.turn.activePlayerIndex

  if (activePlayerIndex === null || state.playerOrder.length === 0) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'Turn order is not initialized.',
    )
  }

  const nextPlayerIndex = (activePlayerIndex + 1) % state.playerOrder.length
  const nextPlayerId = state.playerOrder[nextPlayerIndex]
  const nextTurnNumber =
    state.turn.turnNumber + (nextPlayerIndex === 0 ? 1 : 0)
  const nextState: GameState = {
    ...state,
    phase: GamePhase.Main,
    turn: {
      activePlayerId: nextPlayerId,
      activePlayerIndex: nextPlayerIndex,
      turnNumber: nextTurnNumber,
    },
    updatedAt: action.createdAt,
  }

  return createSuccessResult(
    nextState,
    action,
    `Turn ended. ${state.players[nextPlayerId].displayName} is now the active player.`,
  )
}

export function applyAction(
  state: GameState,
  action: GameAction,
): ActionResult {
  if (!supportedActions.has(action.type)) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.UnsupportedAction,
      `Action type ${action.type} is not supported in this milestone.`,
    )
  }

  switch (action.type) {
    case ActionType.StartGame:
      return startGame(state, action)
    case ActionType.DrawCard:
      return drawCard(state, action)
    case ActionType.EndTurn:
      return endTurn(state, action)
    default:
      return createFailureResult(
        state,
        action,
        GameErrorCode.UnsupportedAction,
        `Action type ${action.type} is not supported in this milestone.`,
      )
  }
}
