import React from 'react';
import { observer } from 'mobx-react-lite';
import { useGame } from './GameProvider';
import styles from './ErrorBanner.module.css';

/**
 * Error Banner component for displaying MCP errors and recovery controls
 * 
 * Shows:
 * - Error messages when orchestrator encounters problems
 * - Details about the error (player, phase, type)
 * - Resume and abort controls
 * - Error dismissal option
 * 
 * @see Phase 3 requirements for error handling specification
 */
const ErrorBanner: React.FC = observer(() => {
  const { gameModel, lastError, clearError, resumeGame } = useGame();

  if (!lastError || gameModel.phase !== 'paused') {
    return null;
  }

  const handleResume = async () => {
    try {
      await resumeGame();
    } catch (error) {
      console.error('Failed to resume game:', error);
    }
  };

  const handleAbort = () => {
    // For now, just clear the error and leave the game paused
    // In a full implementation, this might reset the game or navigate away
    clearError();
    alert('Game aborted. You can start a new game from the home page.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>⚠️</div>
        
        <div className={styles.message}>
          <div className={styles.title}>Game Paused Due to Error</div>
          <div className={styles.description}>
            {lastError.message || 'An unexpected error occurred'}
          </div>
          {lastError.stack && (
            <details className={styles.details}>
              <summary>Technical Details</summary>
              <pre className={styles.stack}>{lastError.stack}</pre>
            </details>
          )}
        </div>
        
        <div className={styles.actions}>
          <button 
            onClick={handleResume}
            className={`${styles.button} ${styles.resume}`}
          >
            🔄 Resume
          </button>
          <button 
            onClick={handleAbort}
            className={`${styles.button} ${styles.abort}`}
          >
            ❌ Abort
          </button>
          <button 
            onClick={clearError}
            className={`${styles.button} ${styles.dismiss}`}
          >
            ✖ Dismiss
          </button>
        </div>
      </div>
    </div>
  );
});

export default ErrorBanner; 