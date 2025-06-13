import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useGame } from './GameProvider';
import styles from './DevPanel.module.css';

/**
 * DevPanel - Developer tools and debugging interface
 * 
 * This component provides:
 * - Game state inspection (raw JSON snapshot)
 * - Manual game controls (pause, resume, stop)
 * - Persistence debugging (save/load snapshots manually)
 * - Performance monitoring (turn timing, snapshot sizes)
 * - Replay debugging (restore game state from snapshots)
 * 
 * Only visible when ?dev=1 is in the URL
 * 
 * @see daijo-bu_architecture.md Section 4.5 for developer tools
 */
const DevPanel: React.FC = observer(() => {
  const { gameModel, logger, persistence, stopGame, resumeGame, isRunning } = useGame();
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [selectedReplayTurn, setSelectedReplayTurn] = useState<number | null>(null);

  const handleManualSave = async () => {
    try {
      await persistence.saveSnapshot(gameModel.gameSnapshot);
      console.log('Manual snapshot saved');
    } catch (error) {
      console.error('Failed to save snapshot:', error);
    }
  };

  const handleResetGame = () => {
    if (confirm('Are you sure you want to reset the game? This will lose all progress.')) {
      try {
        // Reset the game by reloading the page (simple approach)
        window.location.reload();
      } catch (error) {
        console.error('Failed to reset game:', error);
      }
    }
  };

  const handleAdvanceTurn = () => {
    try {
      if (gameModel.phase === 'playing') {
        gameModel.nextTurn();
      }
    } catch (error) {
      console.error('Failed to advance turn:', error);
    }
  };

  const handleReplay = () => {
    if (selectedReplayTurn === null) {
      alert('Please select a turn to replay from');
      return;
    }

    try {
      const replayData = logger.getReplayData(selectedReplayTurn);
      if (!replayData) {
        alert('No snapshot found for the selected turn');
        return;
      }

      if (confirm(`Replay from turn ${selectedReplayTurn}? This will restore the game state and lose current progress.`)) {
        const snapshotEntry = {
          timestamp: replayData.timestamp,
          snapshot: replayData.snapshot,
          turn: replayData.turn,
          mcpSeed: replayData.mcpSeed
        };
        
        logger.replayFromSnapshot(snapshotEntry);
        setSelectedReplayTurn(null);
      }
    } catch (error) {
      console.error('Failed to replay snapshot:', error);
      alert('Failed to replay snapshot: ' + String(error));
    }
  };

  const gameSnapshot = gameModel.gameSnapshot;
  const snapshotHistory = logger.getSnapshotHistory();
  const replayPoints = logger.getReplayPoints();
  
  const prettifyJson = (snapshot: unknown): string => {
    try {
      return JSON.stringify(snapshot, null, 2);
    } catch (error) {
      return 'Error serializing snapshot: ' + String(error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>🛠️ Developer Panel</h3>
        <span className={styles.badge}>DEBUG MODE</span>
      </div>

      <div className={styles.section}>
        <h4>Game Controls</h4>
        <div className={styles.controls}>
          <button 
            onClick={handleAdvanceTurn}
            disabled={gameModel.phase !== 'playing'}
            className={styles.button}
          >
            ⏭️ Next Turn
          </button>
          <button 
            onClick={stopGame}
            disabled={!isRunning}
            className={styles.button}
          >
            ⏸️ Pause
          </button>
          <button 
            onClick={() => resumeGame()}
            disabled={isRunning}
            className={styles.button}
          >
            ▶️ Resume
          </button>
          <button 
            onClick={handleResetGame}
            className={`${styles.button} ${styles.danger}`}
          >
            🔄 Reset Game
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h4>Replay Debugging</h4>
        <div className={styles.controls}>
          <select 
            value={selectedReplayTurn || ''} 
            onChange={(e) => setSelectedReplayTurn(e.target.value ? Number(e.target.value) : null)}
            className={styles.select}
          >
            <option value="">Select turn to replay...</option>
            {replayPoints.map(point => (
              <option key={point.turn} value={point.turn}>
                Turn {point.turn} ({new Date(point.timestamp).toLocaleTimeString()})
                {point.mcpSeed ? ' [seeded]' : ''}
              </option>
            ))}
          </select>
          <button 
            onClick={handleReplay}
            disabled={selectedReplayTurn === null}
            className={`${styles.button} ${styles.warning}`}
          >
            🔄 Replay Turn
          </button>
        </div>
        <div className={styles.info}>
          Replay points: {replayPoints.length} available
        </div>
      </div>

      <div className={styles.section}>
        <h4>Persistence</h4>
        <div className={styles.controls}>
          <button onClick={handleManualSave} className={styles.button}>
            💾 Save Snapshot
          </button>
          <span className={styles.info}>
            Snapshots: {snapshotHistory.length} saved
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <h4>Game State</h4>
        <div className={styles.stateInfo}>
          <div>Phase: <strong>{gameModel.phase}</strong></div>
          <div>Turn: <strong>{gameModel.turn}</strong></div>
          <div>Active Player: <strong>{gameModel.currentPlayer?.name || 'None'}</strong></div>
          <div>Proposals: <strong>{gameModel.proposals.length}</strong></div>
          <div>Rules: <strong>{gameModel.rules.length}</strong></div>
          <div>Running: <strong>{isRunning ? 'Yes' : 'No'}</strong></div>
        </div>
        <button 
          onClick={() => setShowSnapshot(!showSnapshot)}
          className={styles.button}
        >
          {showSnapshot ? '🙈 Hide' : '👁️ Show'} Raw Snapshot
        </button>
        {showSnapshot && (
          <pre className={styles.snapshot}>
            {prettifyJson(gameSnapshot)}
          </pre>
        )}
      </div>

      <div className={styles.section}>
        <h4>Snapshot History ({snapshotHistory.length})</h4>
        <div className={styles.logs}>
          {snapshotHistory.slice(-5).map((entry: unknown, index: number) => {
            const typedEntry = entry as { timestamp: number; turn?: number; action?: string; mcpSeed?: string };
            return (
              <div key={index} className={styles.logEntry}>
                <span className={styles.timestamp}>
                  {new Date(typedEntry.timestamp).toLocaleTimeString()}
                </span>
                <span className={styles.logMessage}>
                  Turn {typedEntry.turn || 'N/A'}: {typedEntry.action || 'snapshot'}
                  {typedEntry.mcpSeed ? ' [seeded]' : ''}
                </span>
              </div>
            );
          })}
          {snapshotHistory.length === 0 && (
            <div className={styles.noLogs}>No snapshots yet</div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DevPanel; 