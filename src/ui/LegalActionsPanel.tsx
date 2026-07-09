import type { GameAction } from '../engine/actionTypes.ts'
import type { PlayerId } from '../engine/gameTypes.ts'

interface PlayerActionGroup {
  readonly playerId: PlayerId
  readonly playerName: string
  readonly actions: readonly GameAction[]
}

interface LegalActionsPanelProps {
  readonly canStartGame: boolean
  readonly onStartGame: () => void
  readonly actionGroups: readonly PlayerActionGroup[]
  readonly getActionLabel: (action: GameAction) => string
  readonly onRunAction: (action: GameAction) => void
}

export function LegalActionsPanel({
  canStartGame,
  onStartGame,
  actionGroups,
  getActionLabel,
  onRunAction,
}: LegalActionsPanelProps) {
  return (
    <section className="panel actions-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Legal Actions</p>
          <h2>Manual Engine Controls</h2>
        </div>
      </div>

      {canStartGame ? (
        <button className="action-button action-button--primary" onClick={onStartGame} type="button">
          Start Debug Game
        </button>
      ) : null}

      <div className="actions-groups">
        {actionGroups.map((group) => (
          <div key={group.playerId} className="actions-group">
            <div className="actions-group__header">
              <strong>{group.playerName}</strong>
              <span>{group.actions.length} legal actions</span>
            </div>

            {group.actions.length === 0 ? (
              <p className="panel__muted">No legal actions right now.</p>
            ) : (
              <div className="action-button-grid">
                {group.actions.map((action) => (
                  <button
                    key={action.id}
                    className="action-button"
                    onClick={() => onRunAction(action)}
                    type="button"
                  >
                    {getActionLabel(action)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
