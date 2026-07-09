import type { AIDecision, AIPlayer } from '../ai/aiTypes.ts'

interface AIDebugPanelProps {
  readonly aiPlayer: AIPlayer
  readonly canRunAI: boolean
  readonly legalActionCount: number
  readonly latestDecision: AIDecision | null
  readonly latestRunSummary: string | null
  readonly onRunAIStep: () => void
  readonly onRunAITurn: () => void
}

export function AIDebugPanel({
  aiPlayer,
  canRunAI,
  legalActionCount,
  latestDecision,
  latestRunSummary,
  onRunAIStep,
  onRunAITurn,
}: AIDebugPanelProps) {
  return (
    <section className="panel ai-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Medium AI v1</p>
          <h2>Computer Opponent Controls</h2>
        </div>
        <span
          className={`status-badge${
            canRunAI ? ' status-badge--active' : ' status-badge--warning'
          }`}
        >
          {canRunAI ? 'AI Ready' : 'AI Waiting'}
        </span>
      </div>

      <p className="panel__muted">
        {aiPlayer.displayName} controls <code>{aiPlayer.controlledPlayerId}</code>{' '}
        and currently sees {legalActionCount} legal actions.
      </p>

      <div className="action-button-grid action-button-grid--inline">
        <button
          className="action-button action-button--primary"
          disabled={!canRunAI}
          onClick={onRunAIStep}
          type="button"
        >
          Run AI Step
        </button>
        <button
          className="action-button"
          disabled={!canRunAI}
          onClick={onRunAITurn}
          type="button"
        >
          Run AI Turn
        </button>
      </div>

      <div className="feedback-stack">
        <div className="feedback-card">
          <span className="status-grid__label">Latest AI Reason</span>
          <strong>{latestDecision?.summary ?? 'No AI decisions yet'}</strong>
          <p>
            {latestRunSummary ??
              'Start the debug game, then run AI step-by-step or through a full turn.'}
          </p>
        </div>
      </div>
    </section>
  )
}
