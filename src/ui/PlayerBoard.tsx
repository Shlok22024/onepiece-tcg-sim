import type { GameState, PlayerId } from '../engine/gameTypes.ts'
import { Zone } from '../engine/gameTypes.ts'
import {
  canPlayerAct,
  getCardsInHand,
  getCharacterInstances,
  getLeaderInstance,
  getPlayerState,
} from '../engine/selectors.ts'
import { CardInstanceView } from './CardInstanceView.tsx'

interface PlayerBoardProps {
  readonly state: GameState
  readonly playerId: PlayerId
}

export function PlayerBoard({
  state,
  playerId,
}: PlayerBoardProps) {
  const player = getPlayerState(state, playerId)

  if (player === undefined) {
    return null
  }

  const leader = getLeaderInstance(state, playerId)
  const hand = getCardsInHand(state, playerId)
  const characters = getCharacterInstances(state, playerId)
  const isActiveTurnPlayer = state.turn.activePlayerId === playerId
  const playerCanAct = canPlayerAct(state, playerId)

  return (
    <section className={`panel player-board${isActiveTurnPlayer ? ' player-board--active' : ''}`}>
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Player Board</p>
          <h2>{player.displayName}</h2>
        </div>
        <span className={`status-badge${playerCanAct ? ' status-badge--active' : ''}`}>
          {playerCanAct ? 'Can Act' : isActiveTurnPlayer ? 'Waiting' : 'Inactive'}
        </span>
      </div>

      <div className="resource-strip">
        <div>
          <span className="status-grid__label">Life</span>
          <strong>{player.zones[Zone.Life].length}</strong>
        </div>
        <div>
          <span className="status-grid__label">Hand</span>
          <strong>{hand.length}</strong>
        </div>
        <div>
          <span className="status-grid__label">Trash</span>
          <strong>{player.zones[Zone.Trash].length}</strong>
        </div>
        <div>
          <span className="status-grid__label">Active DON</span>
          <strong>{player.activeDon}</strong>
        </div>
        <div>
          <span className="status-grid__label">Rested DON</span>
          <strong>{player.restedDon}</strong>
        </div>
      </div>

      <div className="board-section">
        <h3>Leader</h3>
        {leader === undefined ? (
          <p className="panel__muted">Leader not on board yet.</p>
        ) : (
          <CardInstanceView state={state} cardInstanceId={leader.instanceId} />
        )}
      </div>

      <div className="board-section">
        <h3>Hand</h3>
        {hand.length === 0 ? (
          <p className="panel__muted">No cards in hand.</p>
        ) : (
          <div className="card-grid">
            {hand.map((cardInstance) => (
              <CardInstanceView
                key={cardInstance.instanceId}
                state={state}
                cardInstanceId={cardInstance.instanceId}
              />
            ))}
          </div>
        )}
      </div>

      <div className="board-section">
        <h3>Character Area</h3>
        {characters.length === 0 ? (
          <p className="panel__muted">No Characters in play.</p>
        ) : (
          <div className="card-grid">
            {characters.map((cardInstance) => (
              <CardInstanceView
                key={cardInstance.instanceId}
                state={state}
                cardInstanceId={cardInstance.instanceId}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
