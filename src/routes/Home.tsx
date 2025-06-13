import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

/**
 * Landing page with prompt form and game setup
 * 
 * Allows users to:
 * - Enter Prompt P for LLM players
 * - Configure basic game settings
 * - Start a new game
 * 
 * @see daijo-bu_architecture.md Section 4 for UI breakdown
 */
const Home: React.FC = () => {
  const navigate = useNavigate();
  const [promptP, setPromptP] = useState('You are an AI player in a Nomic game. Propose rule changes that help you win while being strategic about voting.');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartGame = async () => {
    if (!promptP.trim()) {
      alert('Please enter a prompt for the LLM players');
      return;
    }

    setIsLoading(true);
    
    try {
      // Store the prompt in sessionStorage for the game to use
      sessionStorage.setItem('promptP', promptP);
      
      // Navigate to game with the prompt
      navigate('/game');
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2>Setup New Game</h2>
        <p>Configure your Proof-Nomic LLM game and start playing!</p>
        
        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="promptP">
              <strong>Prompt P</strong> - Instructions for LLM Players
            </label>
            <textarea
              id="promptP"
              value={promptP}
              onChange={(e) => setPromptP(e.target.value)}
              placeholder="Enter instructions for the AI players..."
              rows={6}
              className={styles.textarea}
            />
            <small className={styles.hint}>
              This prompt will guide how the AI players behave during the game.
            </small>
          </div>

          <div className={styles.gameInfo}>
            <h3>Game Configuration</h3>
            <ul>
              <li><strong>Players:</strong> 3 AI agents (Alice 🤖, Bob 🦾, Charlie 🧠)</li>
              <li><strong>Victory Condition:</strong> First to 100 points wins</li>
              <li><strong>Turn Speed:</strong> Fast (200ms delays)</li>
              <li><strong>Mock Mode:</strong> Deterministic AI responses</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleStartGame}
            disabled={isLoading || !promptP.trim()}
            className={styles.playButton}
          >
            {isLoading ? 'Starting Game...' : '🎮 Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home; 