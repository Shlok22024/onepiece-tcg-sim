import { ActionType } from '../engine/actionTypes.ts'
import type { GameState } from '../engine/gameTypes.ts'
import { getCurrentBattle, getPlayerState } from '../engine/selectors.ts'
import { describeLegalAction } from './describeLegalAction.ts'

interface BattleStatePanelProps {
  readonly state: GameState
}

export function BattleStatePanel({
  state,
}: BattleStatePanelProps) {
  const battle = getCurrentBattle(state)

  if (battle === null) {
    return (
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Battle State</p>
            <h2>No Active Battle</h2>
          </div>
        </div>
        <p className="panel__muted">
          Declare an attack to open the counter window and inspect the current battle flow.
        </p>
      </section>
    )
  }

  const defendingPlayer = getPlayerState(state, battle.defendingPlayerId)
  const attackerLabel = describeLegalAction(state, {
    id: 'battle-preview',
    type: ActionType.DeclareAttack,
    playerId: battle.attackerControllerId,
    createdAt: state.updatedAt,
    payload: {
      attackerInstanceId: battle.attackerInstanceId,
      targetInstanceId: battle.targetInstanceId,
    },
  })

  return (
    <section className="panel battle-panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Battle State</p>
          <h2>{battle.currentBattleStep}</h2>
        </div>
        <span className={`status-badge${battle.awaitingCounterResponse ? ' status-badge--warning' : ' status-badge--active'}`}>
          {battle.awaitingCounterResponse ? 'Awaiting Counter' : 'Ready To Resolve'}
        </span>
      </div>

      <div className="battle-grid">
        <div>
          <span className="status-grid__label">Battle Summary</span>
          <strong>{attackerLabel}</strong>
        </div>
        <div>
          <span className="status-grid__label">Defending Player</span>
          <strong>{defendingPlayer?.displayName ?? battle.defendingPlayerId}</strong>
        </div>
        <div>
          <span className="status-grid__label">Target Type</span>
          <strong>{battle.targetType}</strong>
        </div>
        <div>
          <span className="status-grid__label">Counter Power Added</span>
          <strong>{battle.counterPowerAdded}</strong>
        </div>
      </div>
    </section>
  )
}
