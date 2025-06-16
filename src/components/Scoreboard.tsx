import React from 'react';
import { observer } from 'mobx-react-lite';
import { useGame } from './GameProvider';
import styles from './Scoreboard.module.css';

/**
 * Scoreboard component displaying player avatars and live point totals
 * 
 * Shows:
 * - Player avatars with icons
 * - Current point scores
 * - Proposals passed counter (Rule 301)
 * - Active player indicator
 * - Victory status when game completes
 * - Accessibility announcements for score changes
 * 
 * Per Rule 301: Each player has a public counter "Proposals Passed"
 * Per Stage 6.5: Scoreboard shows live counters with accessibility support
 * 
 * @see daijo-bu_architecture.md Section 4 for scoreboard specification
 * @see initialRules.json Rule 301 for proposals passed counter
 */
const Scoreboard: React.FC = observer(() => {
  const { gameModel } = useGame();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Players</h3>
      
      {/* Accessibility: Live region for score announcements */}
      <div aria-live="polite" aria-label="Score updates" className={styles.srOnly}>
        {/* This will announce score changes to screen readers */}
      </div>
      
      <div className={styles.players}>
        {gameModel.players.map((player) => (
          <div 
            key={player.id}
            className={`${styles.player} ${player.isActive ? styles.active : ''} ${(player as any).hasWon ? styles.winner : ''}`}
            role="listitem"
            aria-label={`Player ${player.name}: ${player.points} points, ${(player as any).proposalsPassed} proposals passed`}
          >
            <div className={styles.avatar}>
              <span className={styles.icon} role="img" aria-label={`${player.name} avatar`}>
                {player.icon}
              </span>
              {player.isActive && (
                <span className={styles.indicator} role="img" aria-label="Active player">
                  ▶
                </span>
              )}
              {(player as any).hasWon && (
                <span className={styles.crown} role="img" aria-label="Winner">
                  👑
                </span>
              )}
            </div>
            
            <div className={styles.info}>
              <div className={styles.name}>{player.name}</div>
              <div className={styles.points}>
                <span className={styles.scoreValue}>{player.points} pts</span>
              </div>
              <div className={styles.proposalsCount}>
                <span className={styles.proposalsLabel}>Proposals:</span>
                <span className={styles.proposalsValue}>{(player as any).proposalsPassed}</span>
              </div>
              <div className={styles.voteAccuracy}>
                <span className={styles.accuracyLabel}>Accuracy:</span>
                <span className={styles.accuracyValue}>{(player as any).voteAccuracyPercentage}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {gameModel.isCompleted && (gameModel as any).winner && (
        <div className={styles.victory} role="alert" aria-live="assertive">
          🎉 {(gameModel as any).winner.name} Wins with {(gameModel as any).winner.points} points!
        </div>
      )}
    </div>
  );
});

export default Scoreboard; 