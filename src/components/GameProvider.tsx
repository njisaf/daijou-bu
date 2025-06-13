import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { GameModel } from '../models/GameModel';
import { DEFAULT_CONFIG, getGameConfig } from '../config';
import { TurnOrchestrator } from '../orchestrator/TurnOrchestrator';
import { SnapshotLogger } from '../logging/SnapshotLogger';
import { getAgentFactory } from '../agents/AgentFactory';
import { createPersistence, type IGamePersistence } from '../persistence';

/**
 * Context value provided by GameProvider
 */
export interface GameContextValue {
  /** MST game model */
  gameModel: typeof GameModel.Type;
  /** Turn orchestrator for game flow */
  orchestrator: TurnOrchestrator;
  /** Snapshot logger for debugging */
  logger: SnapshotLogger;
  /** Persistence adapter */
  persistence: IGamePersistence;
  /** Whether the game is currently running */
  isRunning: boolean;
  /** Start the game orchestration */
  startGame: () => Promise<void>;
  /** Stop the game orchestration */
  stopGame: () => void;
  /** Resume game from paused state */
  resumeGame: () => Promise<void>;
  /** Last error that occurred */
  lastError: Error | null;
  /** Clear the last error */
  clearError: () => void;
}

/**
 * React context for game state
 */
const GameContext = createContext<GameContextValue | null>(null);

/**
 * Hook to access game context
 */
export const useGame = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

/**
 * Props for GameProvider component
 */
interface GameProviderProps {
  children: React.ReactNode;
  promptP: string;
}

/**
 * Game Provider component that manages MST store and orchestration
 * 
 * This component:
 * - Creates and manages the game model
 * - Sets up persistence and snapshot logging
 * - Provides turn orchestrator for game flow
 * - Handles error states and recovery
 * - Exposes game context to child components
 * 
 * @see daijo-bu_architecture.md Section 4 for provider specification
 */
export const GameProvider: React.FC<GameProviderProps> = ({ children, promptP }) => {
  const [gameModel] = useState(() => {
    // Try to restore from persistence or create new game
    return GameModel.create({
      config: DEFAULT_CONFIG,
      players: [],
      rules: [],
      proposals: [],
      turn: 0,
      phase: 'setup',
      history: []
    });
  });

  // Create LLM service using AgentFactory which properly handles agent type detection
  const [agentFactory] = useState(() => {
    console.log('🚀 [GameProvider] Initializing LLM service...', new Date().toISOString());
    const config = getGameConfig();
    console.log('🚀 [GameProvider] Agent type from config:', config.agent.type);
    console.log('🚀 [GameProvider] AGENT_TYPE env var:', process.env.AGENT_TYPE || 'not set');
    console.log('🚀 [GameProvider] LLM_TOKEN present:', !!process.env.LLM_TOKEN);
    console.log('🚀 [GameProvider] OLLAMA_BASE_URL present:', !!process.env.OLLAMA_BASE_URL);
    console.log('🚀 [GameProvider] OLLAMA_MODEL present:', !!process.env.OLLAMA_MODEL);
    
    return getAgentFactory();
  });

  // Create adapter to make AgentFactory compatible with MCPService interface
  const [mcpServiceAdapter] = useState(() => {
    return {
      // MCPService expects: propose(prompt, gameSnapshot)
      // AgentFactory provides: propose(gameSnapshot, prompt?)
      propose: (prompt: string, gameSnapshot: any) => {
        return agentFactory.propose(gameSnapshot, prompt);
      },
      
      // Both have same signature: vote(proposal, gameSnapshot)
      vote: (proposal: string, gameSnapshot: any) => {
        return agentFactory.vote(proposal, gameSnapshot);
      },
      
      // Both have same signature: getCurrentSeed()
      getCurrentSeed: () => {
        return agentFactory.getCurrentSeed();
      }
    };
  });

  const [logger] = useState(() => new SnapshotLogger(gameModel));
  const [orchestrator] = useState(() => {
    return new TurnOrchestrator(gameModel, mcpServiceAdapter, logger);
  });
  const [persistence, setPersistence] = useState<IGamePersistence | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const initializationRef = useRef(false);

  // Initialize persistence and game state
  useEffect(() => {
    const initializeGame = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      try {
        // Create persistence adapter
        const persistenceAdapter = await createPersistence();
        setPersistence(persistenceAdapter);

                 // Try to load saved state
         const savedSnapshot = await persistenceAdapter.loadSnapshot();
         if (savedSnapshot && savedSnapshot.phase !== 'completed') {
           // Cannot directly load into existing model, but we can restore the data
           // For now, set up new game - TODO: implement proper restoration
           console.log('[GameProvider] Found saved game, but restoration not yet implemented');
           setupNewGame();
         } else {
           // Set up new game
           setupNewGame();
         }

        // Enable automatic snapshot logging
        logger.enableAutoLogging();

        // Set up orchestrator event listeners
        setupOrchestratorListeners();

      } catch (error) {
        console.error('[GameProvider] Failed to initialize:', error);
        setLastError(error as Error);
        // Fall back to new game setup
        setupNewGame();
      }
    };

    initializeGame();
  }, []);

  /**
   * Set up a new game with default players and rules
   */
  const setupNewGame = () => {
    // Add players
    gameModel.addPlayer({
      id: 'alice',
      name: 'Alice',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3001',
      points: 0,
      isActive: false
    });

    gameModel.addPlayer({
      id: 'bob',
      name: 'Bob',
      icon: '🦾',
      llmEndpoint: 'http://localhost:3002',
      points: 0,
      isActive: false
    });

    gameModel.addPlayer({
      id: 'charlie',
      name: 'Charlie',
      icon: '🧠',
      llmEndpoint: 'http://localhost:3003',
      points: 0,
      isActive: false
    });

    // Add initial rules (from initialRules.md)
    gameModel.addRule({
      id: 101,
      text: 'All players must abide by the rules.',
      mutable: false
    });

    gameModel.addRule({
      id: 102,
      text: 'The first player to reach 100 points wins.',
      mutable: false
    });

    gameModel.addRule({
      id: 103,
      text: 'A rule-change is any change in the rules including adding, deleting, or amending.',
      mutable: false
    });

    gameModel.addRule({
      id: 201,
      text: 'Players may form alliances.',
      mutable: true
    });

    gameModel.addRule({
      id: 202,
      text: 'Each player vote must be either FOR, AGAINST, or ABSTAIN.',
      mutable: true
    });

    // Setup the game (this sets it to playing phase)
    gameModel.setupGame();
    console.log('[GameProvider] New game initialized');
  };

  /**
   * Set up event listeners for orchestrator
   */
  const setupOrchestratorListeners = () => {
    orchestrator.on('error', (data) => {
      console.error('[GameProvider] Orchestrator error:', data);
      setLastError(data.error);
      setIsRunning(false);
    });

    orchestrator.on('victory', (data) => {
      console.log('[GameProvider] Victory achieved:', data);
      setIsRunning(false);
      
      // Save final state to persistence
      if (persistence) {
        persistence.saveSnapshot(gameModel.gameSnapshot);
      }
    });

    orchestrator.on('turnComplete', () => {
      // Save snapshot after each turn
      if (persistence) {
        persistence.saveSnapshot(gameModel.gameSnapshot);
      }
    });
  };

  /**
   * Start the game orchestration
   */
  const startGame = async () => {
    if (gameModel.phase !== 'playing') {
      throw new Error('Game must be in playing phase to start');
    }

    try {
      setIsRunning(true);
      setLastError(null);
      await orchestrator.start();
    } catch (error) {
      console.error('[GameProvider] Failed to start game:', error);
      setLastError(error as Error);
      setIsRunning(false);
    }
  };

  /**
   * Stop the game orchestration
   */
  const stopGame = () => {
    orchestrator.stop();
    setIsRunning(false);
  };

  /**
   * Resume game from paused state
   */
  const resumeGame = async () => {
    if (gameModel.phase === 'paused') {
      gameModel.resume();
    }
    
    setLastError(null);
    await startGame();
  };

  /**
   * Clear the last error
   */
  const clearError = () => {
    setLastError(null);
  };

  const contextValue: GameContextValue = {
    gameModel,
    orchestrator,
    logger,
    persistence: persistence!,
    isRunning,
    startGame,
    stopGame,
    resumeGame,
    lastError,
    clearError
  };

  // Don't render until persistence is initialized
  if (!persistence) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Initializing game...</div>
      </div>
    );
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}; 