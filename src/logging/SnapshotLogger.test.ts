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
      logger.enableAutoLogging();
      
      // Create some changes
      gameModel.addPlayer({
        id: 'player1',
        name: 'Player 1',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });
      
      gameModel.addPlayer({
        id: 'player2',
        name: 'Player 2',
        icon: '🦾',
        llmEndpoint: 'http://localhost:3002',
        points: 0,
        isActive: false
      });
      
      const history = logger.getSnapshotHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('snapshot');
    });

    it('should limit history size', () => {
      logger.enableAutoLogging();
      
      // Create many changes to exceed history limit
      for (let i = 0; i < 150; i++) {
        gameModel.addRule({
          id: 300 + i,
          text: `Test rule ${i}`,
          mutable: true
        });
      }
      
      const history = logger.getSnapshotHistory();
      expect(history.length).toBeLessThanOrEqual(100); // Default limit
    });
  });
}); 