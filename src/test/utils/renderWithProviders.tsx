/**
 * Simplified React Testing Utility for Stage 6.6 Test Modernization
 * 
 * Provides basic component rendering with game providers for test consistency.
 */

import React from 'react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GameProvider } from '../../components/GameProvider';
import { GameModel } from '../../models/GameModel';
import { getGameConfig } from '../../config';

/**
 * Default test game model for rendering
 */
function createTestGameModel() {
  const config = getGameConfig();
  
  return GameModel.create({
    config,
    players: [
      {
        id: 'test-player-1',
        name: 'Test Player 1',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        proposalsPassed: 0,
        accurateVotes: 0,
        inaccurateVotes: 0,
        isActive: false,
        agentType: 'mock'
      }
    ],
    rules: [
      {
        id: 101,
        text: 'Test rule for UI testing',
        mutable: false
      }
    ],
    proposals: [],
    turn: 0,
    phase: 'setup',
    history: [],
    scoreEntries: []
  });
}

/**
 * Custom render options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  gameModel?: any;
  initialRoute?: string;
}

/**
 * Wrapper component with providers
 */
function TestProviderWrapper({ 
  children, 
  gameModel, 
  initialRoute = '/'
}: {
  children: React.ReactNode;
  gameModel?: any;
  initialRoute?: string;
}) {
  const testGameModel = gameModel || createTestGameModel();
  
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <GameProvider game={testGameModel}>
        {children}
      </GameProvider>
    </MemoryRouter>
  );
}

/**
 * Enhanced render function with proper providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    gameModel,
    initialRoute = '/',
    ...renderOptions
  } = options;

  return render(ui, {
    ...renderOptions,
    wrapper: ({ children }) => (
      <TestProviderWrapper
        gameModel={gameModel}
        initialRoute={initialRoute}
      >
        {children}
      </TestProviderWrapper>
    )
  });
}

/**
 * Mock router navigation for testing
 */
export const mockNavigate = vi.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default'
};

/**
 * Helper to create test game models
 */
export { createTestGameModel }; 