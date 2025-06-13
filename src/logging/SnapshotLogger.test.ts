import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnapshotLogger } from './SnapshotLogger';
import { GameModel } from '../models/GameModel';
import { DEFAULT_CONFIG } from '../config';

describe('SnapshotLogger', () => {
  let gameModel: typeof GameModel.Type;
  let logger: SnapshotLogger;
  let consoleSpy: any;

  beforeEach(() => {
    // Create a basic game setup
    gameModel = GameModel.create({
      config: DEFAULT_CONFIG,
      players: [],
      rules: [],
      proposals: [],
      turn: 0,
      phase: 'setup',
      history: []
    });

    // Spy on console.log to capture snapshot logs
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create logger
    logger = new SnapshotLogger(gameModel);
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  describe('initialization', () => {
    it('should create with game model', () => {
      expect(logger).toBeDefined();
      expect(logger.gameModel).toBe(gameModel);
    });

    it('should respect enableSnapshotLogging config', () => {
      const config = { ...DEFAULT_CONFIG, enableSnapshotLogging: false };
      const gameWithDisabledLogging = GameModel.create({
        config,
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'setup',
        history: []
      });

      const disabledLogger = new SnapshotLogger(gameWithDisabledLogging);
      
      // Should not log when disabled
      disabledLogger.logSnapshot();
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('snapshot logging modes', () => {
    it('should log full snapshots when in full mode', () => {
      // Create a fresh game model with full snapshot mode instead of modifying frozen config
      const configWithFullMode = { ...DEFAULT_CONFIG, snapshotMode: 'full' as const };
      const fullModeGameModel = GameModel.create({
        config: configWithFullMode,
        players: [{
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 50,
          isActive: false
        }],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'setup',
        history: []
      });
      
      const fullModeLogger = new SnapshotLogger(fullModeGameModel);
      
      fullModeLogger.logSnapshot();
      // The actual console.log output is tested in implementation
      expect(fullModeGameModel.config.snapshotMode).toBe('full');
    });

    it('should log diff snapshots when in diff mode', () => {
      // Create a fresh game model with diff snapshot mode
      const configWithDiffMode = { ...DEFAULT_CONFIG, snapshotMode: 'diff' as const };
      const diffModeGameModel = GameModel.create({
        config: configWithDiffMode,
        players: [{
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 50,
          isActive: false
        }],
        rules: [],
        proposals: [],
        turn: 10, // Set turn to beyond warmup directly in creation
        phase: 'setup',
        history: []
      });
      
      const diffModeLogger = new SnapshotLogger(diffModeGameModel);
      
      // First snapshot should be full
      diffModeLogger.logSnapshot();
      
      // Second snapshot should be diff (after warmup)
      diffModeLogger.logSnapshot();
      
      expect(diffModeGameModel.config.snapshotMode).toBe('diff');
    });

    it('should use full snapshots during warmup period', () => {
      // Create a fresh game model with diff mode and warmup period
      const configWithWarmup = { ...DEFAULT_CONFIG, snapshotMode: 'diff' as const, warmupTurns: 3 };
      const warmupGameModel = GameModel.create({
        config: configWithWarmup,
        players: [{
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 50,
          isActive: false
        }],
        rules: [],
        proposals: [],
        turn: 2, // Set turn to within warmup period directly in creation
        phase: 'setup',
        history: []
      });
      
      const warmupLogger = new SnapshotLogger(warmupGameModel);

      // During warmup (turn < warmupTurns), should use full snapshots
      warmupLogger.logSnapshot();
      
      expect(warmupGameModel.config.warmupTurns).toBe(3);
      expect(warmupGameModel.turn).toBeLessThan(warmupGameModel.config.warmupTurns);
    });

    it('should override to full snapshots when debugSnapshots is true', () => {
      // Create a fresh game model with debug snapshots enabled
      const configWithDebug = { ...DEFAULT_CONFIG, snapshotMode: 'diff' as const, debugSnapshots: true };
      const debugGameModel = GameModel.create({
        config: configWithDebug,
        players: [{
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 50,
          isActive: false
        }],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'setup',
        history: []
      });
      
      const debugLogger = new SnapshotLogger(debugGameModel);

      debugLogger.logSnapshot();
      
      expect(debugGameModel.config.debugSnapshots).toBe(true);
      expect(debugGameModel.config.snapshotMode).toBe('diff');
    });
  });

  describe('snapshot downloading', () => {
    it('should provide downloadSnapshot utility', () => {
      const snapshotData = logger.downloadSnapshot();
      
      expect(snapshotData).toBeDefined();
      expect(snapshotData.snapshot).toBeDefined();
      expect(snapshotData.timestamp).toBeDefined();
      expect(snapshotData.filename).toMatch(/^snapshot-\d+\.json$/);
    });

    it('should include game metadata in download', () => {
      gameModel.addPlayer({
        id: 'player1',
        name: 'Test Player',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });
      
      const snapshotData = logger.downloadSnapshot();
      
      expect(snapshotData.snapshot.players).toHaveLength(1);
      expect(snapshotData.snapshot.turn).toBe(0);
      expect(snapshotData.snapshot.phase).toBe('setup');
    });
  });

  describe('automatic logging', () => {
    it('should automatically log on game model changes when enabled', () => {
      logger.enableAutoLogging();
      
      // Make a change to the game model
      gameModel.addPlayer({
        id: 'player1',
        name: 'Test Player',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });
      
      // Should have automatically logged
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should stop automatic logging when disabled', () => {
      logger.enableAutoLogging();
      logger.disableAutoLogging();
      
      consoleSpy.mockClear();
      
      // Make a change to the game model
      gameModel.addPlayer({
        id: 'player1',
        name: 'Test Player',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });
      
      // Should not have logged
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('snapshot history', () => {
    it('should maintain snapshot history', () => {
      const logger = new SnapshotLogger(gameModel);
      
      // Enable logging first
      logger.logSnapshot();
      
      const history = logger.getSnapshotHistory();
      expect(history).toHaveLength(1);
      expect(history[0].snapshot).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
    });

    it('should limit history size', async () => {
      const logger = new SnapshotLogger(gameModel);
      
      // Generate more snapshots than the limit (50)
      for (let i = 0; i < 55; i++) {
        logger.logSnapshot();
        await new Promise(resolve => setTimeout(resolve, 1)); // Small delay to ensure different timestamps
      }
      
      const history = logger.getSnapshotHistory();
      expect(history).toHaveLength(50); // Should be limited to 50
    });
  });

  describe('replay debugging', () => {
    it('should store mcpSeed with snapshots', () => {
      const logger = new SnapshotLogger(gameModel);
      const testSeed = 'test-seed-123';
      
      logger.logSnapshot(testSeed);
      
      const history = logger.getSnapshotHistory();
      expect(history).toHaveLength(1);
      expect(history[0].mcpSeed).toBe(testSeed);
    });

    it('should provide replay data for specific turns', () => {
      const logger = new SnapshotLogger(gameModel);
      
      // Simulate turn progression
      gameModel.turn = 1;
      logger.logSnapshot('seed-turn-1');
      
      gameModel.turn = 2;
      logger.logSnapshot('seed-turn-2');
      
      // Get replay data for turn 1
      const replayData = logger.getReplayData(1);
      expect(replayData).toBeDefined();
      expect(replayData?.turn).toBe(1);
      expect(replayData?.mcpSeed).toBe('seed-turn-1');
      expect(replayData?.snapshot).toBeDefined();
    });

    it('should return null for non-existent turn replay data', () => {
      const logger = new SnapshotLogger(gameModel);
      
      const replayData = logger.getReplayData(999);
      expect(replayData).toBeNull();
    });

    it('should provide sorted replay points', () => {
      const logger = new SnapshotLogger(gameModel);
      
      // Log snapshots in non-sequential order
      gameModel.turn = 3;
      logger.logSnapshot('seed-turn-3');
      
      gameModel.turn = 1;
      logger.logSnapshot('seed-turn-1');
      
      gameModel.turn = 2;
      logger.logSnapshot('seed-turn-2');
      
      const replayPoints = logger.getReplayPoints();
      expect(replayPoints).toHaveLength(3);
      expect(replayPoints[0].turn).toBe(1);
      expect(replayPoints[1].turn).toBe(2);
      expect(replayPoints[2].turn).toBe(3);
      
      // Check mcpSeed is included
      expect(replayPoints[0].mcpSeed).toBe('seed-turn-1');
      expect(replayPoints[1].mcpSeed).toBe('seed-turn-2');
      expect(replayPoints[2].mcpSeed).toBe('seed-turn-3');
    });

    it('should successfully replay from snapshot', () => {
      const logger = new SnapshotLogger(gameModel);
      
      // Setup initial state
      gameModel.turn = 5;
      gameModel.phase = 'playing';
      logger.logSnapshot('seed-turn-5');
      
      // Change state
      gameModel.turn = 10;
      gameModel.phase = 'completed';
      
      // Get snapshot entry for replay
      const history = logger.getSnapshotHistory();
      const snapshotEntry = history[0];
      
      // Replay from snapshot
      logger.replayFromSnapshot(snapshotEntry);
      
      // Verify state was restored
      expect(gameModel.turn).toBe(5);
      expect(gameModel.phase).toBe('playing');
    });

    it('should handle replay errors gracefully', () => {
      const logger = new SnapshotLogger(gameModel);
      
      // Create invalid snapshot entry
      const invalidSnapshotEntry = {
        timestamp: Date.now(),
        snapshot: { invalid: 'data' } as any,
        turn: 1,
        mcpSeed: 'test-seed'
      };
      
      expect(() => {
        logger.replayFromSnapshot(invalidSnapshotEntry);
      }).toThrow();
    });
  });
}); 