import React, { useState, useEffect } from 'react';
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
 * - Point change notifications (Stage 6.5)
 * 
 * @see daijo-bu_architecture.md Section 4 for turn banner specification
 */
const TurnBanner: React.FC = observer(() => {
  const { gameModel, isRunning, startGame, stopGame, resumeGame } = useGame();
  const [pointChanges, setPointChanges] = useState<Array<{
    playerId: string;
    playerName: string;
    change: number;
    id: string;
  }>>([]);
  const [lastProposalCount, setLastProposalCount] = useState(0);

  // Track point changes for flash animations (Stage 6.5)
  useEffect(() => {
    // Check if new proposals have been resolved
    const currentProposalCount = gameModel.proposals.filter(p => p.status !== 'pending').length;
    
    if (currentProposalCount > lastProposalCount) {
      // Get the most recently resolved proposal
      const resolvedProposals = gameModel.proposals.filter(p => p.status !== 'pending');
      const latestProposal = resolvedProposals[resolvedProposals.length - 1];
      
      if (latestProposal && latestProposal.status === 'passed') {
        // Calculate point changes from this proposal
        const changes: Array<{ playerId: string; playerName: string; change: number; id: string }> = [];
        
        // Proposer gets 10 points
        const proposer = gameModel.players.find(p => p.id === latestProposal.proposerId);
        if (proposer) {
          changes.push({
            playerId: proposer.id,
            playerName: proposer.name,
            change: gameModel.config.proposerPoints,
            id: `${latestProposal.id}-proposer`
          });
        }
        
        // Voters get points based on their votes
        latestProposal.votes.forEach(vote => {
          const voter = gameModel.players.find(p => p.id === vote.voterId);
          if (voter) {
            let change = 0;
            if (vote.choice === 'FOR') {
              change = gameModel.config.forVoterPoints;
            } else if (vote.choice === 'AGAINST') {
              change = gameModel.config.againstVoterPenalty; // This is negative
            }
            // ABSTAIN gets 0 points
            
            if (change !== 0) {
              changes.push({
                playerId: voter.id,
                playerName: voter.name,
                change,
                id: `${latestProposal.id}-${vote.voterId}`
              });
            }
          }
        });
        
        // Add penalty notifications for missed votes (-10 per Rule 206)
        const voterIds = new Set(latestProposal.votes.map(v => v.voterId));
        gameModel.players.forEach(player => {
          if (!voterIds.has(player.id)) {
            changes.push({
              playerId: player.id,
              playerName: player.name,
              change: -10,
              id: `${latestProposal.id}-penalty-${player.id}`
            });
          }
        });
        
        setPointChanges(changes);
        setLastProposalCount(currentProposalCount);
        
        // Clear point changes after animation duration (3 seconds)
        setTimeout(() => {
          setPointChanges([]);
        }, 3000);
      } else {
        // Proposal failed, just update count
        setLastProposalCount(currentProposalCount);
      }
    }
  }, [gameModel.proposals, gameModel.players, gameModel.config, lastProposalCount]);

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

      {/* Point Changes Flash Notifications (Stage 6.5) */}
      {pointChanges.length > 0 && (
        <div 
          className={styles.pointChanges}
          role="status"
          aria-live="polite"
          aria-label="Point changes from last proposal"
        >
          <h4 className={styles.pointChangesTitle}>💫 Point Changes</h4>
          <div className={styles.pointChangesList}>
            {pointChanges.map(change => (
              <div
                key={change.id}
                className={`${styles.pointChange} ${change.change > 0 ? styles.positive : styles.negative}`}
                aria-label={`${change.playerName} ${change.change > 0 ? 'gained' : 'lost'} ${Math.abs(change.change)} points`}
              >
                <span className={styles.playerName}>{change.playerName}</span>
                <span className={styles.changeValue}>
                  {change.change > 0 ? '+' : ''}{change.change} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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