import { CardType } from '../cards/cardTypes.ts'
import { sampleCardsById } from '../cards/sampleCards.ts'
import {
  ActionType,
  type ActionResult,
  type AttackPayload,
  type GameAction,
  type StartGamePlayerConfig,
} from './actionTypes.ts'
import { createGameError, GameErrorCode } from './gameErrors.ts'
import { appendGameLog, createGameLogEntry } from './gameLog.ts'
import type {
  BattleState,
  CardInstance,
  CardInstanceId,
  GameState,
  PlayerId,
  PlayerState,
  PlayerZones,
  Zone,
} from './gameTypes.ts'
import { BattleStep, BattleTargetType, Zone as PlayerZone } from './gameTypes.ts'
import { payCost } from './payCost.ts'
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
  ActionType.PlayCard,
  ActionType.DeclareAttack,
  ActionType.PassCounter,
  ActionType.ResolveAttack,
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

function appendActionLog(
  state: GameState,
  action: GameAction,
  message: string,
  suffix: string,
): GameState {
  return appendGameLog(
    state,
    createGameLogEntry(action, message, state.updatedAt, suffix),
  )
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
    instanceId: createCardInstanceId(player.id, PlayerZone.Leader, 0),
    cardId: player.deck.leaderCardId,
    ownerId: player.id,
    controllerId: player.id,
    zone: PlayerZone.Leader,
    isRested: false,
    attachedDonCount: 0,
  }
}

function expandMainDeck(player: StartGamePlayerConfig): readonly CardInstance[] {
  const deckInstances: CardInstance[] = []
  let ordinal = 0

  for (const entry of player.deck.mainDeck) {
    for (let count = 0; count < entry.quantity; count += 1) {
      deckInstances.push({
        instanceId: createCardInstanceId(player.id, PlayerZone.Deck, ordinal),
        cardId: entry.cardId,
        ownerId: player.id,
        controllerId: player.id,
        zone: PlayerZone.Deck,
        isRested: false,
        attachedDonCount: 0,
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
  const leaderLife = sampleCardsById[player.deck.leaderCardId]?.life ?? 0
  const lifeCount = Math.min(leaderLife, deckInstances.length)
  const lifeInstances = deckInstances.slice(0, lifeCount).map((instance) => ({
    ...instance,
    zone: PlayerZone.Life,
  }))
  const remainingDeckInstances = deckInstances.slice(lifeCount)
  const zones: PlayerZones = {
    ...createEmptyZones(),
    [PlayerZone.Leader]: [leaderInstance.instanceId],
    [PlayerZone.Life]: lifeInstances.map((instance) => instance.instanceId),
    [PlayerZone.Deck]: remainingDeckInstances.map((instance) => instance.instanceId),
  }

  return {
    playerState: {
      id: player.id,
      displayName: player.displayName,
      isHuman: player.isHuman,
      deckDefinition: player.deck,
      leaderCardInstanceId: leaderInstance.instanceId,
      zones,
      donDeckCount: 10,
      activeDon: 0,
      restedDon: 0,
      totalDonInPlay: 0,
    },
    cardInstances: [leaderInstance, ...lifeInstances, ...remainingDeckInstances],
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

function replaceCardInstance(
  state: GameState,
  cardInstance: CardInstance,
  updatedAt: number,
): GameState {
  return {
    ...state,
    cardInstances: {
      ...state.cardInstances,
      [cardInstance.instanceId]: cardInstance,
    },
    updatedAt,
  }
}

function replaceBattleState(
  state: GameState,
  battle: BattleState | null,
  updatedAt: number,
): GameState {
  return {
    ...state,
    battle,
    updatedAt,
  }
}

function getCardPower(cardInstance: CardInstance): number {
  return sampleCardsById[cardInstance.cardId]?.power ?? 0
}

function getCardName(cardInstanceId: CardInstanceId, state: GameState): string {
  const cardInstance = state.cardInstances[cardInstanceId]

  if (cardInstance === undefined) {
    return cardInstanceId
  }

  return sampleCardsById[cardInstance.cardId]?.name ?? cardInstance.cardId
}

function updateCardZone(
  player: PlayerState,
  cardInstanceId: CardInstanceId,
  fromZone: Zone,
  toZone: Zone,
): PlayerState {
  return {
    ...player,
    zones: {
      ...player.zones,
      [fromZone]: player.zones[fromZone].filter((id) => id !== cardInstanceId),
      [toZone]: [...player.zones[toZone], cardInstanceId],
    },
  }
}

function readyBoardCards(
  state: GameState,
  player: PlayerState,
): {
  readonly state: GameState
  readonly player: PlayerState
  readonly readiedCardCount: number
} {
  const boardCardIds = [
    ...player.zones[PlayerZone.Leader],
    ...player.zones[PlayerZone.CharacterArea],
  ]
  let nextState = state
  let readiedCardCount = 0

  for (const cardInstanceId of boardCardIds) {
    const instance = nextState.cardInstances[cardInstanceId]

    if (!instance.isRested) {
      continue
    }

    nextState = replaceCardInstance(
      nextState,
      {
        ...instance,
        isRested: false,
      },
      state.updatedAt,
    )
    readiedCardCount += 1
  }

  return {
    state: nextState,
    player: nextState.players[player.id] ?? player,
    readiedCardCount,
  }
}

function validateGameStarted(
  state: GameState,
  action: GameAction,
): ActionResult | null {
  if (state.gameOver || state.status === 'COMPLETE') {
    return createFailureResult(
      state,
      action,
      GameErrorCode.GameAlreadyOver,
      'The game is already over.',
    )
  }

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

function validateNoUnresolvedBattle(
  state: GameState,
  action: GameAction,
  message: string,
): ActionResult | null {
  if (state.battle !== null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.UnresolvedBattle,
      message,
    )
  }

  return null
}

function requireBattleState(
  state: GameState,
  action: GameAction,
): BattleState | ActionResult {
  if (state.battle === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.NoActiveBattle,
      'There is no active battle to continue.',
    )
  }

  return state.battle
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
    const refreshDonResult = readyRestedDon(activePlayer)
    const donReadyState = replacePlayerState(
      {
        ...state,
        phase,
      },
      refreshDonResult.player,
      updatedAt,
    )
    const refreshBoardResult = readyBoardCards(
      donReadyState,
      refreshDonResult.player,
    )

    return {
      state: {
        ...refreshBoardResult.state,
        phase,
        updatedAt,
      },
      detailMessage: `${activePlayer.displayName} entered refresh and readied ${refreshDonResult.refreshedDon} DON plus ${refreshBoardResult.readiedCardCount} board cards.`,
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
    gameOver: false,
    phase: firstTurnPhase,
    players: {
      [players[0].id]: firstPlayer.playerState,
      [players[1].id]: secondPlayer.playerState,
    },
    playerOrder: [players[0].id, players[1].id],
    cardInstances: Object.fromEntries(
      [...firstPlayer.cardInstances, ...secondPlayer.cardInstances].map(
        (instance) => [instance.instanceId, instance],
      ),
    ),
    turn: {
      activePlayerId: players[0].id,
      activePlayerIndex: 0,
      turnNumber: 1,
      hasPerformedNormalDraw: false,
    },
    battle: null,
    updatedAt,
    winnerId: undefined,
    loserId: undefined,
    endReason: undefined,
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

  const battleFailure = validateNoUnresolvedBattle(
    state,
    action,
    'Cannot advance the phase while a battle is unresolved.',
  )

  if (battleFailure !== null) {
    return battleFailure
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

  return createSuccessResult(
    phaseTransition.state,
    action,
    phaseTransition.detailMessage,
  )
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
  const updatedPlayer = updateCardZone(
    targetPlayer,
    drawnCardInstanceId,
    PlayerZone.Deck,
    PlayerZone.Hand,
  )
  const updatedCardInstance: CardInstance = {
    ...state.cardInstances[drawnCardInstanceId],
    zone: PlayerZone.Hand,
  }
  const nextState: GameState = {
    ...replaceCardInstance(
      replacePlayerState(state, updatedPlayer, action.createdAt),
      updatedCardInstance,
      action.createdAt,
    ),
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

function playCard(state: GameState, action: GameAction): ActionResult {
  if (action.type !== ActionType.PlayCard) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'A PLAY_CARD action is required to play a card.',
    )
  }

  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  const battleFailure = validateNoUnresolvedBattle(
    state,
    action,
    'PLAY_CARD is not legal while a battle is unresolved.',
  )

  if (battleFailure !== null) {
    return battleFailure
  }

  if (state.phase !== GamePhase.Main) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.IllegalPhaseAction,
      'PLAY_CARD is only legal during the MAIN phase.',
    )
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

  const { cardInstanceId } = action.payload
  const cardInstance = state.cardInstances[cardInstanceId]

  if (cardInstance === undefined) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.UnknownCardInstance,
      `Card instance ${cardInstanceId} could not be found.`,
    )
  }

  if (!activePlayer.zones[PlayerZone.Hand].includes(cardInstanceId)) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.CardNotInHand,
      'The chosen card must be in the active player hand to be played.',
    )
  }

  const cardDefinition = sampleCardsById[cardInstance.cardId]

  if (cardDefinition === undefined) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      `Card definition ${cardInstance.cardId} could not be found in the placeholder card database.`,
    )
  }

  if (cardDefinition.type !== CardType.Character) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.UnsupportedCardType,
      'Only Character cards can be played in this milestone.',
    )
  }

  const costResult = payCost(activePlayer, cardDefinition.cost ?? 0)

  if (!costResult.ok) {
    return {
      ok: false,
      action,
      state,
      error: costResult.error,
    }
  }

  const updatedPlayer = updateCardZone(
    costResult.player,
    cardInstanceId,
    PlayerZone.Hand,
    PlayerZone.CharacterArea,
  )
  const updatedCardInstance: CardInstance = {
    ...cardInstance,
    zone: PlayerZone.CharacterArea,
    isRested: false,
  }
  const nextState = replaceCardInstance(
    replacePlayerState(state, updatedPlayer, action.createdAt),
    updatedCardInstance,
    action.createdAt,
  )

  return createSuccessResult(
    nextState,
    action,
    `${activePlayer.displayName} played ${cardDefinition.name} by paying ${cardDefinition.cost ?? 0} DON.`,
  )
}

function resolveAttackPayload(action: GameAction): AttackPayload | null {
  if (action.type === ActionType.DeclareAttack) {
    return action.payload
  }

  return null
}

function validateAttackParticipants(
  state: GameState,
  action: GameAction,
  payload: AttackPayload,
): {
  readonly attacker: CardInstance
  readonly target: CardInstance
  readonly defendingPlayer: PlayerState
  readonly targetType: BattleTargetType
} | ActionResult {
  const activePlayer = resolveActivePlayer(state)

  if (activePlayer === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'The active player could not be resolved.',
    )
  }

  const attacker = state.cardInstances[payload.attackerInstanceId]
  const target = state.cardInstances[payload.targetInstanceId]

  if (attacker === undefined || target === undefined) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.UnknownCardInstance,
      'Both attacker and target card instances must exist.',
    )
  }

  if (attacker.controllerId !== activePlayer.id) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttacker,
      'The attacker must belong to the active player.',
    )
  }

  if (
    attacker.zone !== PlayerZone.Leader &&
    attacker.zone !== PlayerZone.CharacterArea
  ) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttacker,
      'Only the active leader or a character on the board can attack.',
    )
  }

  if (attacker.isRested) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.AlreadyRestedAttacker,
      'A rested attacker cannot attack again this turn.',
    )
  }

  if (target.controllerId === activePlayer.id) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.CannotAttackOwnCard,
      'An attacker cannot target its own leader or characters.',
    )
  }

  if (target.zone === PlayerZone.Leader) {
    const defendingPlayer = resolvePlayer(state, target.controllerId)

    if (defendingPlayer === null) {
      return createFailureResult(
        state,
        action,
        GameErrorCode.InvalidAttackTarget,
        'The defending player could not be resolved for the chosen leader target.',
      )
    }

    return {
      attacker,
      target,
      defendingPlayer,
      targetType: BattleTargetType.Leader,
    }
  }

  if (target.zone !== PlayerZone.CharacterArea) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttackTarget,
      'The target must be an opposing leader or an opposing rested character.',
    )
  }

  if (!target.isRested) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.TargetMustBeRestedCharacter,
      'Only opposing rested characters can be targeted for battle in this milestone.',
    )
  }

  const defendingPlayer = resolvePlayer(state, target.controllerId)

  if (defendingPlayer === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttackTarget,
      'The defending player could not be resolved for the chosen character target.',
    )
  }

  return {
    attacker,
    target,
    defendingPlayer,
    targetType: BattleTargetType.Character,
  }
}

function createBattleState(
  state: GameState,
  attacker: CardInstance,
  target: CardInstance,
  targetType: BattleTargetType,
  defendingPlayer: PlayerState,
): BattleState {
  return {
    attackerInstanceId: attacker.instanceId,
    attackerControllerId: attacker.controllerId,
    targetInstanceId: target.instanceId,
    targetControllerId: target.controllerId,
    targetType,
    attackStartedAtTurn: state.turn.turnNumber,
    currentBattleStep: BattleStep.CounterWindow,
    defendingPlayerId: defendingPlayer.id,
    counterPowerAdded: 0,
    awaitingCounterResponse: true,
  }
}

function declareAttack(state: GameState, action: GameAction): ActionResult {
  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  if (action.type !== ActionType.DeclareAttack) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'A DECLARE_ATTACK action is required to declare an attack.',
    )
  }

  if (state.phase !== GamePhase.Main) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.IllegalPhaseAction,
      'Attacks are only legal during the MAIN phase in this milestone.',
    )
  }

  if (state.battle !== null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.BattleAlreadyInProgress,
      'A new attack cannot be declared while another battle is unresolved.',
    )
  }

  const payload = resolveAttackPayload(action)

  if (payload === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'An attack payload is required to declare combat.',
    )
  }

  const validatedParticipants = validateAttackParticipants(state, action, payload)

  if ('ok' in validatedParticipants) {
    return validatedParticipants
  }

  const { attacker, target, defendingPlayer, targetType } = validatedParticipants
  const restedAttacker: CardInstance = {
    ...attacker,
    isRested: true,
  }
  const battleState = createBattleState(
    state,
    restedAttacker,
    target,
    targetType,
    defendingPlayer,
  )
  const declaredState = replaceBattleState(
    replaceCardInstance(state, restedAttacker, action.createdAt),
    battleState,
    action.createdAt,
  )
  const counterWindowState = appendActionLog(
    declaredState,
    action,
    `Counter window opened for ${defendingPlayer.displayName}.`,
    'counter-window-opened',
  )
  const attackerName = getCardName(attacker.instanceId, state)
  const targetName = getCardName(target.instanceId, state)

  return createSuccessResult(
    counterWindowState,
    action,
    `${state.players[action.playerId].displayName} declared an attack with ${attackerName} against ${targetName}.`,
  )
}

function passCounter(state: GameState, action: GameAction): ActionResult {
  const gameStartedFailure = validateGameStarted(state, action)

  if (gameStartedFailure !== null) {
    return gameStartedFailure
  }

  if (action.type !== ActionType.PassCounter) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'A PASS_COUNTER action is required to pass the counter window.',
    )
  }

  const battleOrFailure = requireBattleState(state, action)

  if ('ok' in battleOrFailure) {
    return battleOrFailure
  }

  if (!battleOrFailure.awaitingCounterResponse) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.CounterWindowNotOpen,
      'The counter window is not currently open.',
    )
  }

  if (action.playerId !== battleOrFailure.defendingPlayerId) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidCounterResponder,
      'Only the defending player can respond to the counter window.',
    )
  }

  const nextBattleState: BattleState = {
    ...battleOrFailure,
    currentBattleStep: BattleStep.ReadyToResolve,
    awaitingCounterResponse: false,
  }
  const nextState = replaceBattleState(state, nextBattleState, action.createdAt)
  const defendingPlayer = state.players[action.playerId]

  return createSuccessResult(
    nextState,
    action,
    `${defendingPlayer.displayName} passed the counter window.`,
  )
}

function resolveBattleParticipants(
  state: GameState,
  action: GameAction,
  battle: BattleState,
): {
  readonly attacker: CardInstance
  readonly target: CardInstance
  readonly defendingPlayer: PlayerState
} | ActionResult {
  const attacker = state.cardInstances[battle.attackerInstanceId]
  const target = state.cardInstances[battle.targetInstanceId]

  if (attacker === undefined || target === undefined) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.UnknownCardInstance,
      'The stored battle participants could not be found.',
    )
  }

  const defendingPlayer = resolvePlayer(state, battle.defendingPlayerId)

  if (defendingPlayer === null) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttackTarget,
      'The defending player could not be resolved for the current battle.',
    )
  }

  if (attacker.controllerId !== battle.attackerControllerId) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttacker,
      'The stored attacker no longer matches the current battle state.',
    )
  }

  if (
    attacker.zone !== PlayerZone.Leader &&
    attacker.zone !== PlayerZone.CharacterArea
  ) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttacker,
      'The stored attacker is no longer in a legal battle zone.',
    )
  }

  if (
    battle.targetType === BattleTargetType.Leader &&
    target.zone !== PlayerZone.Leader
  ) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttackTarget,
      'The stored leader target is no longer valid.',
    )
  }

  if (
    battle.targetType === BattleTargetType.Character &&
    target.zone !== PlayerZone.CharacterArea
  ) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAttackTarget,
      'The stored character target is no longer valid.',
    )
  }

  return {
    attacker,
    target,
    defendingPlayer,
  }
}

function knockOutCharacter(
  state: GameState,
  action: GameAction,
  player: PlayerState,
  cardInstance: CardInstance,
  suffix: string,
): GameState {
  const updatedPlayer = updateCardZone(
    player,
    cardInstance.instanceId,
    PlayerZone.CharacterArea,
    PlayerZone.Trash,
  )
  const updatedCardInstance: CardInstance = {
    ...cardInstance,
    zone: PlayerZone.Trash,
    isRested: false,
  }
  const movedState = replaceCardInstance(
    replacePlayerState(state, updatedPlayer, action.createdAt),
    updatedCardInstance,
    action.createdAt,
  )
  const cardName = sampleCardsById[cardInstance.cardId]?.name ?? cardInstance.cardId

  return appendActionLog(
    movedState,
    action,
    `${cardName} was KO'd and moved to trash.`,
    suffix,
  )
}

function dealLeaderDamage(
  state: GameState,
  action: GameAction,
  defendingPlayer: PlayerState,
): {
  readonly state: GameState
  readonly message: string
} {
  const lifeZone = defendingPlayer.zones[PlayerZone.Life]

  if (lifeZone.length === 0) {
    const finishedState = appendActionLog(
      {
        ...state,
        status: 'COMPLETE',
        gameOver: true,
        winnerId: action.playerId,
        loserId: defendingPlayer.id,
        endReason: 'LEADER_DAMAGE_AT_ZERO_LIFE',
        updatedAt: action.createdAt,
      },
      action,
      `${state.players[action.playerId].displayName} dealt the final damage and won the game.`,
      'game-over',
    )

    return {
      state: finishedState,
      message: 'The attack ended the game.',
    }
  }

  const lifeCardId = lifeZone[0]
  const updatedDefendingPlayer = updateCardZone(
    defendingPlayer,
    lifeCardId,
    PlayerZone.Life,
    PlayerZone.Hand,
  )
  const updatedLifeCard: CardInstance = {
    ...state.cardInstances[lifeCardId],
    zone: PlayerZone.Hand,
  }
  const nextState = appendActionLog(
    replaceCardInstance(
      replacePlayerState(state, updatedDefendingPlayer, action.createdAt),
      updatedLifeCard,
      action.createdAt,
    ),
    action,
    `${updatedDefendingPlayer.displayName} lost 1 life and added that life card to hand.`,
    'life-damage',
  )

  return {
    state: nextState,
    message: 'The attack dealt 1 life damage.',
  }
}

function resolveCombat(
  state: GameState,
  action: GameAction,
  attacker: CardInstance,
  target: CardInstance,
  defendingPlayer: PlayerState,
  battle: BattleState,
): {
  readonly state: GameState
  readonly message: string
} {
  if (battle.targetType === BattleTargetType.Leader) {
    return dealLeaderDamage(state, action, defendingPlayer)
  }

  const attackerPower = getCardPower(attacker)
  const targetPower = getCardPower(target) + battle.counterPowerAdded
  const attackerCardType = sampleCardsById[attacker.cardId]?.type
  const targetCardType = sampleCardsById[target.cardId]?.type
  let nextState = state

  if (attackerPower > targetPower) {
    nextState = knockOutCharacter(
      nextState,
      action,
      defendingPlayer,
      target,
      'target-ko',
    )

    return {
      state: nextState,
      message: 'The stronger attacker KO\'d the defending character.',
    }
  }

  if (
    attackerPower < targetPower &&
    attackerCardType === CardType.Character &&
    targetCardType === CardType.Character
  ) {
    const attackingPlayer = resolvePlayer(nextState, attacker.controllerId)

    if (attackingPlayer !== null) {
      nextState = knockOutCharacter(
        nextState,
        action,
        attackingPlayer,
        attacker,
        'attacker-ko',
      )
    }

    return {
      state: nextState,
      message: 'The weaker attacking character was KO\'d in battle.',
    }
  }

  return {
    state: nextState,
    message: 'The battle ended with no characters KO\'d.',
  }
}

function resolveAttack(state: GameState, action: GameAction): ActionResult {
  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  if (action.type !== ActionType.ResolveAttack) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.InvalidAction,
      'A RESOLVE_ATTACK action is required to resolve combat.',
    )
  }

  const battleOrFailure = requireBattleState(state, action)

  if ('ok' in battleOrFailure) {
    return battleOrFailure
  }

  if (battleOrFailure.attackerControllerId !== action.playerId) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.NotActivePlayer,
      'Only the attacking active player can resolve the current battle.',
    )
  }

  if (battleOrFailure.awaitingCounterResponse) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.BattleNotReadyToResolve,
      'The current battle cannot resolve until the counter window is closed.',
    )
  }

  if (battleOrFailure.currentBattleStep !== BattleStep.ReadyToResolve) {
    return createFailureResult(
      state,
      action,
      GameErrorCode.BattleNotReadyToResolve,
      'The current battle is not ready to resolve.',
    )
  }

  const participants = resolveBattleParticipants(state, action, battleOrFailure)

  if ('ok' in participants) {
    return participants
  }

  const { attacker, target, defendingPlayer } = participants
  const clearedBattleState = replaceBattleState(state, null, action.createdAt)
  const resolution = resolveCombat(
    clearedBattleState,
    action,
    attacker,
    target,
    defendingPlayer,
    battleOrFailure,
  )
  const targetName = getCardName(target.instanceId, state)

  return createSuccessResult(
    resolution.state,
    action,
    `${state.players[action.playerId].displayName} resolved the attack against ${targetName}. ${resolution.message}`,
  )
}

function endTurn(state: GameState, action: GameAction): ActionResult {
  const validationFailure = validateActivePlayerAction(state, action)

  if (validationFailure !== null) {
    return validationFailure
  }

  const battleFailure = validateNoUnresolvedBattle(
    state,
    action,
    'END_TURN is not legal while a battle is unresolved.',
  )

  if (battleFailure !== null) {
    return battleFailure
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
    case ActionType.PlayCard:
      return playCard(state, action)
    case ActionType.DeclareAttack:
      return declareAttack(state, action)
    case ActionType.PassCounter:
      return passCounter(state, action)
    case ActionType.ResolveAttack:
      return resolveAttack(state, action)
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
