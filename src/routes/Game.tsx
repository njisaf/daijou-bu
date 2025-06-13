import React, { useEffect, useState } from 'react';
import { GameProvider } from '../components/GameProvider';
import Scoreboard from '../components/Scoreboard';
import TurnBanner from '../components/TurnBanner';
import ProposalViewer from '../components/ProposalViewer';
import DevPanel from '../components/DevPanel';
import DownloadRulebook from '../components/DownloadRulebook';
import ErrorBanner from '../components/ErrorBanner';
import styles from './Game.module.css';

/**
 * Game route component that houses the main game interface
 * 
 * This component:
 * - Wraps the game in GameProvider context
 * - Displays the live game state via child components
 * - Manages error states and recovery
 * - Shows download button when game completes
 * 
 * @see daijo-bu_architecture.md Section 4 for UI breakdown
 */
const Game: React.FC = () => {
  const [promptP, setPromptP] = useState('');

  useEffect(() => {
    // Get the prompt from sessionStorage
    const storedPrompt = sessionStorage.getItem('promptP');
    if (storedPrompt) {
      setPromptP(storedPrompt);
    } else {
      // Fallback prompt if none provided
      setPromptP('You are an AI player in a Nomic game. Propose rule changes that help you win while being strategic about voting.');
    }
  }, []);

  // Check for dev mode (URL query ?dev=1)
  const urlParams = new URLSearchParams(window.location.search);
  const isDevMode = urlParams.get('dev') === '1';

  if (!promptP) {
    return (
      <div className={styles.loading}>
        <div>Loading game...</div>
      </div>
    );
  }

  return (
    <GameProvider promptP={promptP}>
      <div className={styles.container}>
        <div className={styles.gameArea}>
          {/* Error banner appears at top when there are errors */}
          <ErrorBanner />
          
          {/* Main game interface */}
          <div className={styles.topSection}>
            <Scoreboard />
            <TurnBanner />
          </div>
          
          <div className={styles.middleSection}>
            <ProposalViewer />
          </div>
          
          <div className={styles.bottomSection}>
            <DownloadRulebook />
          </div>
        </div>
        
        {/* Dev panel (only visible in dev mode) */}
        {isDevMode && (
          <div className={styles.devSection}>
            <DevPanel />
          </div>
        )}
      </div>
    </GameProvider>
  );
};

export default Game; 