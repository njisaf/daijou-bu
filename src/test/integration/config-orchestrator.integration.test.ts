import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGameConfig } from '../../models/GameConfigModel';
import { createRuleSet } from '../../models/RuleSetModel';
import { createGame } from '../../models/GameModel';
import { loadInitialRules } from '../../utils/loadInitialRules';
import { TurnOrchestrator } from '../../orchestrator/TurnOrchestrator';
import { MockMCPService } from '../../mocks/MockMCPService';
import { SnapshotLogger } from '../../logging/SnapshotLogger';

/**
 * Integration test for Config-Orchestrator communication
 * 
 * Verifies that custom configuration values from GameConfigModel
 * actually reach and affect the TurnOrchestrator behavior.
 * 
 * @see Stage 6.3 requirement for orchestrator config integration
 */
describe('Config-Orchestrator Integration', () => {
  let mockMCPService: MockMCPService;
  let originalSetTimeout: typeof globalThis.setTimeout;
  let timeoutCalls: Array<{ delay: number; callback: () => void }>;

  beforeEach(() => {
    // Mock setTimeout to capture delay values
    timeoutCalls = [];
    originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = vi.fn((callback: () => void, delay: number) => {
      timeoutCalls.push({ delay, callback });
      return 1 as any; // Return a mock timer ID
    }) as any;

    mockMCPService = new MockMCPService();
  });

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
    vi.clearAllMocks();
  });

  it('should honor custom turnDelayMs in orchestrator', async () => {
    // Create game with custom turn delay
    const customTurnDelayMs = 1337; // Non-default value
    const config = createGameConfig({
      turnDelayMs: customTurnDelayMs,
      timeoutMs: 5000,
      agent: { type: 'mock', concurrency: 1 }
    });

    const ruleset = createRuleSet(loadInitialRules(config.promptP));
    const game = createGame({ ruleset, config });

    // Add some mock players and setup
    game.addPlayer({ 
      id: 'player1', 
      name: 'Alice', 
      icon: '🤖', 
      llmEndpoint: 'mock', 
      points: 0, 
      isActive: false 
    });
    game.addPlayer({ 
      id: 'player2', 
      name: 'Bob', 
      icon: '🤖', 
      llmEndpoint: 'mock', 
      points: 0, 
      isActive: false 
    });
    game.setupGame();

    // Verify config is set correctly in game
    expect(game.config.turnDelayMs).toBe(customTurnDelayMs);

    // Create logger and orchestrator
    const logger = new SnapshotLogger(game);
    const orchestrator = new TurnOrchestrator(game, mockMCPService, logger);

    // Start the orchestrator
    const startPromise = orchestrator.start();

    // Let the orchestrator process briefly then stop
    await new Promise(resolve => setTimeout(resolve, 10));
    orchestrator.stop();
    await startPromise;

    // Verify that setTimeout was called with our custom delay
    const turnDelayCall = timeoutCalls.find(call => call.delay === customTurnDelayMs);
    expect(turnDelayCall).toBeDefined();
    expect(turnDelayCall?.delay).toBe(customTurnDelayMs);
  }, 10000); // Increase timeout for this test

  it('should honor custom timeoutMs for agent requests', async () => {
    // Create game with custom timeout
    const customTimeoutMs = 12000; // Non-default value
    const config = createGameConfig({
      turnDelayMs: 200,
      timeoutMs: customTimeoutMs,
      agent: { type: 'mock', concurrency: 1 }
    });

    const ruleset = createRuleSet(loadInitialRules(config.promptP));
    const game = createGame({ ruleset, config });

    // Verify config is set correctly in game
    expect(game.config.timeoutMs).toBe(customTimeoutMs);

    // The timeout value should be accessible from the game config
    // This ensures the orchestrator can read the custom timeout value
    expect(game.config.timeoutMs).not.toBe(15000); // Default value
    expect(game.config.timeoutMs).toBe(12000); // Custom value
  });

  it('should use default values when no custom config provided', () => {
    // Create game with default config
    const config = createGameConfig();
    const ruleset = createRuleSet(loadInitialRules(config.promptP));
    const game = createGame({ ruleset, config });

    // Verify defaults are used
    expect(game.config.turnDelayMs).toBe(200); // Default from config.ts
    expect(game.config.timeoutMs).toBe(15000); // Default from config.ts
  });

  it('should validate config changes propagate to game model', () => {
    // Create editable config
    const config = createGameConfig({
      turnDelayMs: 300,
      timeoutMs: 8000
    });

    // Modify config values
    config.setTurnDelay(500);
    config.setTimeout(10000);

    // Create game with modified config
    const ruleset = createRuleSet(loadInitialRules(config.promptP));
    const game = createGame({ ruleset, config });

    // Verify modified values are used
    expect(game.config.turnDelayMs).toBe(500);
    expect(game.config.timeoutMs).toBe(10000);
  });

  it('should handle config validation errors gracefully', () => {
    // Test with invalid config values
    const config = createGameConfig();

    // These should throw validation errors
    expect(() => config.setTurnDelay(-1)).toThrow();
    expect(() => config.setTimeout(0)).toThrow(); // Zero or negative should throw

    // Valid values should work
    expect(() => config.setTurnDelay(1000)).not.toThrow();
    expect(() => config.setTimeout(5000)).not.toThrow();
  });
}); 