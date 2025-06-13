import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GameProvider } from './GameProvider';
import Scoreboard from './Scoreboard';

/**
 * Scoreboard Component Tests
 * 
 * Tests the scoreboard component rendering and functionality
 */
describe('Scoreboard Component', () => {
  it('should render player names and scores', async () => {
    render(
      <GameProvider promptP="Test prompt">
        <Scoreboard />
      </GameProvider>
    );

    // Wait for GameProvider initialization to complete
    await waitFor(() => {
      expect(screen.queryByText('Initializing game...')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Wait for the actual content to load
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Check that player names are rendered
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Check that scores are rendered (displayed as "0 pts")
    const scoreElements = screen.getAllByText(/0\s*pts/);
    expect(scoreElements).toHaveLength(3); // All players start with 0 points
  });

  it('should highlight the active player', async () => {
    render(
      <GameProvider promptP="Test prompt">
        <Scoreboard />
      </GameProvider>
    );

    // Wait for GameProvider initialization to complete
    await waitFor(() => {
      expect(screen.queryByText('Initializing game...')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Wait for the actual content to load
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Check that one player is active (should have the indicator)
    const activeIndicator = screen.getByText('▶');
    expect(activeIndicator).toBeInTheDocument();

    // The active player should have a class containing "_active_"
    const activePlayerElement = activeIndicator.closest('[class*="_player_"]');
    expect(activePlayerElement?.className).toMatch(/_active_/);
  });

  it('should display player icons', async () => {
    render(
      <GameProvider promptP="Test prompt">
        <Scoreboard />
      </GameProvider>
    );

    // Wait for GameProvider initialization to complete
    await waitFor(() => {
      expect(screen.queryByText('Initializing game...')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Wait for the actual content to load
    await waitFor(() => {
      expect(screen.getByText('🤖')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Check that icons are displayed
    expect(screen.getByText('🤖')).toBeInTheDocument();
    expect(screen.getByText('🦾')).toBeInTheDocument();
    expect(screen.getByText('🧠')).toBeInTheDocument();
  });
}); 