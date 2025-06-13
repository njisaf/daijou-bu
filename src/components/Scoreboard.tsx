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
 * - Active player indicator
 * - Victory status when game completes
 * 
 * @see daijo-bu_architecture.md Section 4 for scoreboard specification
 */
const Scoreboard: React.FC = observer(() => {
  const { gameModel } = useGame();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Players</h3>
      
      <div className={styles.players}>
        {gameModel.players.map((player) => (
          <div 
            key={player.id}
            className={`${styles.player} ${player.isActive ? styles.active : ''} ${player.hasWon ? styles.winner : ''}`}
          >
            <div className={styles.avatar}>
              <span className={styles.icon}>{player.icon}</span>
              {player.isActive && <span className={styles.indicator}>▶</span>}
              {player.hasWon && <span className={styles.crown}>👑</span>}
            </div>
            
            <div className={styles.info}>
              <div className={styles.name}>{player.name}</div>
              <div className={styles.points}>{player.points} pts</div>
            </div>
          </div>
        ))}
      </div>
      
      {gameModel.isCompleted && gameModel.winner && (
        <div className={styles.victory}>
          🎉 {gameModel.winner.name} Wins with {gameModel.winner.points} points!
        </div>
      )}
    </div>
  );
});

export default Scoreboard; 