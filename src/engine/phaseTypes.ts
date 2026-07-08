export enum GamePhase {
  Setup = 'SETUP',
  Refresh = 'REFRESH',
  Draw = 'DRAW',
  Don = 'DON',
  Main = 'MAIN',
  End = 'END',
}

export const turnPhaseSequence = [
  GamePhase.Refresh,
  GamePhase.Draw,
  GamePhase.Don,
  GamePhase.Main,
  GamePhase.End,
] as const

export function getFirstTurnPhase(): GamePhase {
  return GamePhase.Draw
}

export function getTurnStartPhase(): GamePhase {
  return GamePhase.Refresh
}

export function getNextPhase(currentPhase: GamePhase): GamePhase | null {
  switch (currentPhase) {
    case GamePhase.Refresh:
      return GamePhase.Draw
    case GamePhase.Draw:
      return GamePhase.Don
    case GamePhase.Don:
      return GamePhase.Main
    case GamePhase.Main:
      return GamePhase.End
    default:
      return null
  }
}
