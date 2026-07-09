import type { GameState } from '../engine/gameTypes.ts'
import { getActivePlayerState, isGameOver } from '../engine/selectors.ts'

export interface DebugActionFeedback {
  readonly label: string
  readonly message: string
  readonly ok: boolean
}

interface GameStatusPanelProps {
  readonly state: GameState
  readonly lastFeedback: DebugActionFeedback | null
}

export function GameStatusPanel({
  state,
  lastFeedback,
}: GameStatusPanelProps) {
  const activePlayer = getActivePlayerState(state)
  const gameFinished = isGameOver(state)

  return (
    <section className="panel status-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Debug Match Status</p>
          <h2>Engine Overview</h2>
        </div>
        <span className={`status-badge${gameFinished ? ' status-badge--danger' : ' status-badge--active'}`}>
          {gameFinished ? 'Game Over' : state.status}
        </span>
      </div>

      <div className="status-grid">
        <div>
          <span className="status-grid__label">Active Player</span>
          <strong>{activePlayer?.displayName ?? 'Not started'}</strong>
        </div>
        <div>
          <span className="status-grid__label">Phase</span>
          <strong>{state.phase}</strong>
        </div>
        <div>
          <span className="status-grid__label">Turn</span>
          <strong>{state.turn.turnNumber}</strong>
        </div>
        <div>
          <span className="status-grid__label">Winner</span>
          <strong>{state.winnerId ?? 'None yet'}</strong>
        </div>
      </div>

      <div className="feedback-stack">
        <div className="feedback-card">
          <span className="status-grid__label">Last Action Result</span>
          <strong>{lastFeedback?.label ?? 'No actions yet'}</strong>
          <p>{lastFeedback?.message ?? 'Start the debug match to begin driving the engine.'}</p>
        </div>
        {lastFeedback !== null && !lastFeedback.ok ? (
          <div className="feedback-card feedback-card--error">
            <span className="status-grid__label">Last Error</span>
            <strong>Action rejected</strong>
            <p>{lastFeedback.message}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
