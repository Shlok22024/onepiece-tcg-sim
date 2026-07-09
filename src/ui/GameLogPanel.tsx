import type { GameLogEntry } from '../engine/gameTypes.ts'

interface GameLogPanelProps {
  readonly log: readonly GameLogEntry[]
}

export function GameLogPanel({
  log,
}: GameLogPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Game Log</p>
          <h2>Action History</h2>
        </div>
        <span className="status-badge">{log.length} entries</span>
      </div>

      {log.length === 0 ? (
        <p className="panel__muted">The log will populate as engine actions succeed.</p>
      ) : (
        <ol className="log-list">
          {[...log].reverse().map((entry) => (
            <li key={entry.id} className="log-list__item">
              <div className="log-list__meta">
                <strong>{entry.actionType}</strong>
                <span>{entry.playerId}</span>
              </div>
              <p>{entry.message}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
