import type { CardInstanceId, GameState } from '../engine/gameTypes.ts'
import { getCardDefinitionByInstanceId, getCardInstanceById } from '../engine/selectors.ts'

interface CardInstanceViewProps {
  readonly state: GameState
  readonly cardInstanceId: CardInstanceId
}

export function CardInstanceView({
  state,
  cardInstanceId,
}: CardInstanceViewProps) {
  const cardInstance = getCardInstanceById(state, cardInstanceId)
  const cardDefinition = getCardDefinitionByInstanceId(state, cardInstanceId)

  if (cardInstance === undefined || cardDefinition === undefined) {
    return (
      <div className="card-instance card-instance--missing">
        <strong>Missing Card</strong>
        <span>{cardInstanceId}</span>
      </div>
    )
  }

  return (
    <div className={`card-instance${cardInstance.isRested ? ' card-instance--rested' : ''}`}>
      <div className="card-instance__header">
        <strong>{cardDefinition.name}</strong>
        <span>{cardDefinition.code}</span>
      </div>
      <div className="card-instance__meta">
        <span>{cardDefinition.type}</span>
        {cardDefinition.cost !== undefined ? <span>Cost {cardDefinition.cost}</span> : null}
        {cardDefinition.power !== undefined ? <span>Power {cardDefinition.power}</span> : null}
        {cardDefinition.counter !== undefined ? <span>Counter +{cardDefinition.counter}</span> : null}
      </div>
      <div className="card-instance__footer">
        <span>{cardInstance.isRested ? 'Rested' : 'Active'}</span>
        <span>+DON {cardInstance.attachedDonCount}</span>
      </div>
    </div>
  )
}
