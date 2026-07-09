import { useMemo, useState } from 'react'

import type { GameAction } from '../engine/actionTypes.ts'
import { applyAction } from '../engine/applyAction.ts'
import { createInitialGameState } from '../engine/createInitialGameState.ts'
import { getLegalActions } from '../engine/getLegalActions.ts'
import type { GameState, PlayerId } from '../engine/gameTypes.ts'
import { getPlayerState } from '../engine/selectors.ts'
import { BattleStatePanel } from './BattleStatePanel.tsx'
import { createDebugStartGameAction } from './debugGameSetup.ts'
import { describeLegalAction } from './describeLegalAction.ts'
import { GameLogPanel } from './GameLogPanel.tsx'
import { type DebugActionFeedback, GameStatusPanel } from './GameStatusPanel.tsx'
import { LegalActionsPanel } from './LegalActionsPanel.tsx'
import { PlayerBoard } from './PlayerBoard.tsx'

function createDebugInitialState(): GameState {
  return createInitialGameState({
    gameId: 'debug-ui-game',
    now: Date.now(),
  })
}

export function DebugGame() {
  const [gameState, setGameState] = useState<GameState>(() => createDebugInitialState())
  const [lastFeedback, setLastFeedback] = useState<DebugActionFeedback | null>(null)

  const actionGroups = useMemo(() => {
    const playerIds: readonly PlayerId[] = gameState.playerOrder

    return playerIds.map((playerId) => ({
      playerId,
      playerName: getPlayerState(gameState, playerId)?.displayName ?? playerId,
      actions: getLegalActions(gameState, playerId),
    }))
  }, [gameState])

  function runAction(action: GameAction) {
    const result = applyAction(gameState, action)
    const label = describeLegalAction(gameState, action)

    setGameState(result.state)
    setLastFeedback({
      label,
      ok: result.ok,
      message: result.ok ? result.logEntry.message : result.error.message,
    })
  }

  function startGame() {
    runAction(createDebugStartGameAction(Date.now()))
  }

  return (
    <main className="debug-layout">
      <section className="debug-hero">
        <p className="debug-hero__eyebrow">Internal Debug Gameplay UI</p>
        <h1>Engine-Driven Practice Surface</h1>
        <p>
          This screen is a minimal internal harness for driving the current game
          engine. It uses local React state, selectors, and legal action generation,
          while leaving all rule authority inside <code>applyAction</code>.
        </p>
      </section>

      <GameStatusPanel state={gameState} lastFeedback={lastFeedback} />

      <div className="debug-layout__columns">
        <LegalActionsPanel
          canStartGame={gameState.status === 'NOT_STARTED'}
          onStartGame={startGame}
          actionGroups={actionGroups}
          getActionLabel={(action) => describeLegalAction(gameState, action)}
          onRunAction={runAction}
        />
        <BattleStatePanel state={gameState} />
      </div>

      <div className="boards-grid">
        {gameState.playerOrder.length === 0 ? (
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Boards</p>
                <h2>Waiting To Start</h2>
              </div>
            </div>
            <p className="panel__muted">
              Start the debug match to render both player boards, legal actions, and
              current battle state.
            </p>
          </section>
        ) : (
          gameState.playerOrder.map((playerId) => (
            <PlayerBoard key={playerId} state={gameState} playerId={playerId} />
          ))
        )}
      </div>

      <GameLogPanel log={gameState.log} />
    </main>
  )
}
