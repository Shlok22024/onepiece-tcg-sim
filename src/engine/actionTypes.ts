export enum ActionType {
  StartGame = 'START_GAME',
  Mulligan = 'MULLIGAN',
  DrawCard = 'DRAW_CARD',
  AttachDon = 'ATTACH_DON',
  PlayCard = 'PLAY_CARD',
  ActivateEffect = 'ACTIVATE_EFFECT',
  Attack = 'ATTACK',
  EndTurn = 'END_TURN',
  PassPriority = 'PASS_PRIORITY',
}

export interface GameAction {
  id: string
  type: ActionType
  playerId: string
  sourceCardId?: string
  targetCardIds?: string[]
  payload?: Record<string, unknown>
  createdAt: number
}
