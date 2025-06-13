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
 * 
 * Only visible when ?dev=1 is in the URL
 * 
 * @see daijo-bu_architecture.md Section 4.5 for developer tools
 */
const DevPanel: React.FC = observer(() => {
  const { gameModel, logger, persistence, stopGame, resumeGame, isRunning } = useGame();
  const [showSnapshot, setShowSnapshot] = useState(false);

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

  const gameSnapshot = gameModel.gameSnapshot;
  const snapshotHistory = logger.getSnapshotHistory();
  
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
            {JSON.stringify(gameSnapshot, null, 2)}
          </pre>
        )}
      </div>

      <div className={styles.section}>
        <h4>Snapshot History ({snapshotHistory.length})</h4>
        <div className={styles.logs}>
          {snapshotHistory.slice(-5).map((entry: any, index: number) => (
            <div key={index} className={styles.logEntry}>
              <span className={styles.timestamp}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className={styles.logMessage}>
                Turn {entry.turn || 'N/A'}: {entry.action || 'snapshot'}
              </span>
            </div>
          ))}
          {snapshotHistory.length === 0 && (
            <div className={styles.noLogs}>No snapshots yet</div>
          )}
        </div>
      </div>
    </div>
  );
});

export default DevPanel; 