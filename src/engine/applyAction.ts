import {
  ActionType,
  type ActionResult,
  type GameAction,
  type StartGamePlayerConfig,
} from './actionTypes.ts'
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
import {
  GamePhase,
  getFirstTurnPhase,
  getNextPhase,
  getTurnStartPhase,
} from './phaseTypes.ts'

const supportedActions = new Set<ActionType>([
  ActionType.StartGame,
  ActionType.AdvancePhase,
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
      donDeckCount: 10,
      activeDon: 0,
      restedDon: 0,
      totalDonInPlay: 0,
    },
    cardInstances: [leaderInstance, ...deckInstances],
  }
}

function isGameInProgress(state: GameState): boolean {
  return state.status === 'IN_PROGRESS'
}

function resolvePlayer(state: GameState, playerId: PlayerId): PlayerState | null {
  return state.players[playerId] ?? null
}

function resolveActivePlayer(state: GameState): PlayerState | null {
  const activePlayerId = state.turn.activePlayerId

  if (activePlayerId === null) {
    return null
  }

  return resolvePlayer(state, activePlayerId)
}

function replacePlayerState(
  state: GameState,
  player: PlayerState,
  updatedAt: number,
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [player.id]: player,
    },
    updatedAt,
  }
}

function validateGameStarted(
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

  return null
}

function validateActivePlayerAction(
  state: GameState,
  action: GameAction,
): ActionResult | null {
  const gameStartedFailure = validateGameStarted(state, action)

  if (gameStartedFailure !== null) {
    return gameStartedFailure
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

function phaseLabel(phase: GamePhase): string {
  return phase.toLowerCase()
}

function readyRestedDon(player: PlayerState): {
  readonly player: PlayerState
  readonly refreshedDon: number
} {
  if (player.restedDon === 0) {
    return {
      player,
      refreshedDon: 0,
    }
  }

  return {
    player: {
      ...player,
      activeDon: player.activeDon + player.restedDon,
      restedDon: 0,
      totalDonInPlay: player.totalDonInPlay,
    },
    refreshedDon: player.restedDon,
  }
}

function addDonFromDeck(player: PlayerState): {
  readonly player: PlayerState
  readonly gainedDon: number
} {
  const remainingCapacity = Math.max(0, 10 - player.totalDonInPlay)
  const gainedDon = Math.min(2, player.donDeckCount, remainingCapacity)

  if (gainedDon === 0) {
    return {
      player,
      gainedDon,
    }
  }

  return {
    player: {
      ...player,
      donDeckCount: player.donDeckCount - gainedDon,
      activeDon: player.activeDon + gainedDon,
      totalDonInPlay: player.totalDonInPlay + gainedDon,
    },
    gainedDon,
  }
}

function enterPhase(
  state: GameState,
  phase: GamePhase,
  updatedAt: number,
): {
  readonly state: GameState
  readonly detailMessage: string
} {
  const activePlayer = resolveActivePlayer(state)

  if (activePlayer === null) {
    return {
      state: {
        ...state,
        phase,
        updatedAt,
      },
      detailMessage: `Phase advanced to ${phaseLabel(phase)}.`,
    }
  }

  if (phase === GamePhase.Refresh) {
    const refreshResult = readyRestedDon(activePlayer)
    const nextState = replacePlayerState(
      {
        ...state,
        phase,
      },
      refreshResult.player,
      updatedAt,
    )

    return {
      state: nextState,
      detailMessage:
        refreshResult.refreshedDon > 0
          ? `${activePlayer.displayName} entered refresh and readied ${refreshResult.refreshedDon} DON.`
          : `${activePlayer.displayName} entered refresh with no rested DON to ready.`,
    }
  }

  if (phase === GamePhase.Don) {
    const donResult = addDonFromDeck(activePlayer)
    const nextState = replacePlayerState(
      {
        ...state,
        phase,
      },
      donResult.player,
      updatedAt,
    )

    return {
      state: nextState,
      detailMessage:
        donResult.gainedDon > 0
          ? `${activePlayer.displayName} entered DON phase and gained ${donResult.gainedDon} DON.`
          : `${activePlayer.displayName} entered DON phase but could not gain additional DON.`,
    }
  }

  return {
    state: {
      ...state,
      phase,
      updatedAt,
    },
    detailMessage: `${activePlayer.displayName} advanced to ${phaseLabel(phase)} phase.`,
  }
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
  const firstTurnPhase = getFirstTurnPhase()
  const updatedAt = action.createdAt
  const nextState: GameState = {
    ...state,
    status: 'IN_PROGRESS',
    phase: firstTurnPhase,
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
      hasPerformedNormalDraw: false,
    },
    updatedAt,
  }

  return createSuccessResult(
    nextState,
    action,
    `Game started. ${players[0].displayName} begins turn 1 in ${phaseLabel(firstTurnPhase)} phase.`,
  )
}

function advancePhase(state: GameState, action: GameAction): ActionResult {
  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  const nextPhase = getNextPhase(state.phase)

  if (nextPhase === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidPhaseTransition,
      `Phase ${state.phase} cannot advance automatically. Use END_TURN or a future rule-specific action instead.`,
    )
  }

  const phaseTransition = enterPhase(state, nextPhase, action.createdAt)

  return createSuccessResult(state.phase === nextPhase ? state : phaseTransition.state, action, phaseTransition.detailMessage)
}

function drawCard(state: GameState, action: GameAction): ActionResult {
  if (action.type !== ActionType.DrawCard) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'A DRAW_CARD action is required to draw a card.',
    )
  }

  const gameStartedFailure = validateGameStarted(state, action)

  if (gameStartedFailure !== null) {
    return gameStartedFailure
  }

  const isInternalDraw = action.payload?.internal === true
  const targetPlayerId = action.payload?.targetPlayerId ?? action.playerId
  const targetPlayer = resolvePlayer(state, targetPlayerId)

  if (targetPlayer === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidTargetPlayer,
      `Player ${targetPlayerId} could not be found for the draw action.`,
    )
  }

  if (!isInternalDraw) {
    const validationFailure = validateActivePlayerAction(state, action)

    if (validationFailure !== null) {
      return validationFailure
    }

    if (state.phase !== GamePhase.Draw) {
      return createFailureResult(
        state,
        action,
        GameErrorCode.IllegalPhaseAction,
        'DRAW_CARD is only legal during the DRAW phase unless it is marked as internal.',
      )
    }
  }

  const deckZone = targetPlayer.zones[PlayerZone.Deck]

  if (deckZone.length === 0) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.EmptyDeck,
      'The chosen player cannot draw because their deck is empty.',
    )
  }

  const drawnCardInstanceId = deckZone[0]
  const remainingDeck = deckZone.slice(1)
  const updatedPlayer: PlayerState = {
    ...targetPlayer,
    zones: {
      ...targetPlayer.zones,
      [PlayerZone.Deck]: remainingDeck,
      [PlayerZone.Hand]: [...targetPlayer.zones[PlayerZone.Hand], drawnCardInstanceId],
    },
  }
  const updatedCardInstance: CardInstance = {
    ...state.cardInstances[drawnCardInstanceId],
    zone: PlayerZone.Hand,
  }
  const nextState: GameState = {
    ...replacePlayerState(state, updatedPlayer, action.createdAt),
    cardInstances: {
      ...state.cardInstances,
      [drawnCardInstanceId]: updatedCardInstance,
    },
    turn: isInternalDraw
      ? state.turn
      : {
          ...state.turn,
          hasPerformedNormalDraw: true,
        },
  }

  return createSuccessResult(
    nextState,
    action,
    isInternalDraw
      ? `${targetPlayer.displayName} drew one card through an internal effect.`
      : `${targetPlayer.displayName} drew one card during the draw phase.`,
  )
}

function endTurn(state: GameState, action: GameAction): ActionResult {
  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  if (state.phase !== GamePhase.Main && state.phase !== GamePhase.End) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.IllegalPhaseAction,
      'END_TURN is only legal during the MAIN or END phase.',
    )
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
  const turnStartPhase = getTurnStartPhase()
  const nextBaseState: GameState = {
    ...state,
    phase: turnStartPhase,
    turn: {
      activePlayerId: nextPlayerId,
      activePlayerIndex: nextPlayerIndex,
      turnNumber: nextTurnNumber,
      hasPerformedNormalDraw: false,
    },
    updatedAt: action.createdAt,
  }
  const phaseTransition = enterPhase(
    nextBaseState,
    turnStartPhase,
    action.createdAt,
  )

  return createSuccessResult(
    phaseTransition.state,
    action,
    `Turn ended. ${state.players[nextPlayerId].displayName} begins turn ${nextTurnNumber} in ${phaseLabel(turnStartPhase)} phase. ${phaseTransition.detailMessage}`,
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
    case ActionType.AdvancePhase:
      return advancePhase(state, action)
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
