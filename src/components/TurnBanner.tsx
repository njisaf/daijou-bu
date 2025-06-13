import React from 'react';
import { observer } from 'mobx-react-lite';
import { useGame } from './GameProvider';
import styles from './TurnBanner.module.css';

/**
 * Turn Banner component showing current game state and controls
 * 
 * Displays:
 * - Current turn number and phase
 * - Active player information
 * - Prompt P (proof statement) when available
 * - Game control buttons (start/stop/resume)
 * - Game status indicators
 * 
 * @see daijo-bu_architecture.md Section 4 for turn banner specification
 */
const TurnBanner: React.FC = observer(() => {
  const { gameModel, isRunning, startGame, stopGame, resumeGame } = useGame();

  const handleGameControl = async () => {
    try {
      if (gameModel.phase === 'paused') {
        await resumeGame();
      } else if (isRunning) {
        stopGame();
      } else {
        await startGame();
      }
    } catch (error) {
      console.error('Game control error:', error);
    }
  };

  const getPhaseDisplay = () => {
    switch (gameModel.phase) {
      case 'setup':
        return 'Setting up...';
      case 'playing':
        return isRunning ? 'Playing' : 'Ready to play';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Game Complete';
      default:
        return gameModel.phase;
    }
  };

  const getControlButtonText = () => {
    if (gameModel.phase === 'completed') {
      return 'Game Complete';
    } else if (gameModel.phase === 'paused') {
      return '▶ Resume';
    } else if (isRunning) {
      return '⏸ Pause';
    } else {
      return '▶ Start';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Game Status</h3>
        <div className={`${styles.phase} ${styles[gameModel.phase]}`}>
          {getPhaseDisplay()}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.turnInfo}>
          <div className={styles.turnNumber}>
            Turn {gameModel.turn + 1}
          </div>
          
          {gameModel.currentPlayer && (
            <div className={styles.activePlayer}>
              <span className={styles.playerIcon}>{gameModel.currentPlayer.icon}</span>
              <span className={styles.playerName}>
                {gameModel.currentPlayer.name}'s turn
              </span>
            </div>
          )}
        </div>

        <div className={styles.controls}>
          <button
            onClick={handleGameControl}
            disabled={gameModel.phase === 'completed' || gameModel.phase === 'setup'}
            className={`${styles.controlButton} ${isRunning ? styles.pause : styles.play}`}
          >
            {getControlButtonText()}
          </button>
        </div>
      </div>

      {/* Prompt P Section */}
      {gameModel.config.promptP && (
        <div className={styles.promptSection}>
          <div className={styles.promptHeader}>
            <h4 className={styles.promptTitle}>🎯 Prompt P</h4>
            <span className={styles.promptBadge}>AI Instructions</span>
          </div>
          <div className={styles.promptContent}>
            {gameModel.config.promptP}
          </div>
        </div>
      )}

      {isRunning && (
        <div className={styles.runningIndicator}>
          <div className={styles.spinner}></div>
          <span>Game in progress...</span>
        </div>
      )}
    </div>
  );
});

export default TurnBanner; 