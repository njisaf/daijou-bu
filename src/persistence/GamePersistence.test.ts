import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NoOpPersistence } from './NoOpPersistence';
import { DexiePersistence } from './DexiePersistence';
import { GameModel } from '../models/GameModel';
import { DEFAULT_CONFIG } from '../config';

describe('Persistence Layer', () => {
  let gameModel: typeof GameModel.Type;

  beforeEach(() => {
    gameModel = GameModel.create({
      config: DEFAULT_CONFIG,
      players: [],
      rules: [],
      proposals: [],
      turn: 0,
      phase: 'setup',
      history: []
    });

    // Add some test data
    gameModel.addPlayer({
      id: 'player1',
      name: 'Test Player 1',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3001',
      points: 10,
      isActive: false
    });

    gameModel.addRule({
      id: 101,
      text: 'All players must abide by the rules.',
      mutable: false
    });
  });

  describe('NoOpPersistence', () => {
    let persistence: NoOpPersistence;

    beforeEach(() => {
      persistence = new NoOpPersistence();
    });

    it('should create without errors', () => {
      expect(persistence).toBeDefined();
    });

    it('should save snapshots without errors', async () => {
      await expect(persistence.saveSnapshot(gameModel.gameSnapshot)).resolves.toBeUndefined();
    });

    it('should return null for load attempts', async () => {
      const result = await persistence.loadSnapshot();
      expect(result).toBeNull();
    });

    it('should clear without errors', async () => {
      await expect(persistence.clear()).resolves.toBeUndefined();
    });

    it('should indicate unavailability correctly', () => {
      expect(persistence.isAvailable()).toBe(false);
    });
  });

  describe('DexiePersistence', () => {
    let persistence: DexiePersistence;

    beforeEach(async () => {
      persistence = new DexiePersistence();
      // Clear any existing data
      await persistence.clear();
    });

    afterEach(async () => {
      await persistence.clear();
      persistence.close();
    });

    it('should create and initialize database', async () => {
      expect(persistence).toBeDefined();
      await persistence.initialize();
      expect(persistence.isAvailable()).toBe(true);
    });

    it('should save and load snapshots', async () => {
      await persistence.initialize();
      
      const originalSnapshot = gameModel.gameSnapshot;
      await persistence.saveSnapshot(originalSnapshot);

      const loadedSnapshot = await persistence.loadSnapshot();
      expect(loadedSnapshot).not.toBeNull();
      expect(loadedSnapshot!.turn).toBe(originalSnapshot.turn);
      expect(loadedSnapshot!.players).toHaveLength(1);
      expect(loadedSnapshot!.players[0].id).toBe('player1');
    });

    it('should handle multiple saves and load latest', async () => {
      await persistence.initialize();

      // Save first snapshot
      await persistence.saveSnapshot(gameModel.gameSnapshot);

      // Modify game state
      gameModel.addPlayer({
        id: 'player2',
        name: 'Test Player 2',
        icon: '🦾',
        llmEndpoint: 'http://localhost:3002',
        points: 5,
        isActive: false
      });

      // Save second snapshot
      await persistence.saveSnapshot(gameModel.gameSnapshot);

      // Load should return the latest
      const loadedSnapshot = await persistence.loadSnapshot();
      expect(loadedSnapshot!.players).toHaveLength(2);
    });

    it('should provide snapshot history', async () => {
      await persistence.initialize();

      // Save multiple snapshots
      await persistence.saveSnapshot(gameModel.gameSnapshot);
      
      gameModel.addRule({
        id: 102,
        text: 'Another test rule.',
        mutable: true
      });
      
      await persistence.saveSnapshot(gameModel.gameSnapshot);

      const history = await persistence.getSnapshotHistory(10);
      expect(history).toHaveLength(2);
      expect(history[0].timestamp).toBeLessThanOrEqual(history[1].timestamp);
    });

    it('should limit history results', async () => {
      await persistence.initialize();

      // Save many snapshots
      for (let i = 0; i < 15; i++) {
        gameModel.addRule({
          id: 200 + i,
          text: `Rule ${i}`,
          mutable: true
        });
        await persistence.saveSnapshot(gameModel.gameSnapshot);
      }

      const limitedHistory = await persistence.getSnapshotHistory(5);
      expect(limitedHistory).toHaveLength(5);
    });

    it('should clear all snapshots', async () => {
      await persistence.initialize();

      await persistence.saveSnapshot(gameModel.gameSnapshot);
      
      let loadedSnapshot = await persistence.loadSnapshot();
      expect(loadedSnapshot).not.toBeNull();

      await persistence.clear();
      
      loadedSnapshot = await persistence.loadSnapshot();
      expect(loadedSnapshot).toBeNull();
    });

    it('should handle IndexedDB unavailability gracefully', async () => {
      // Create persistence that will fail to initialize
      const mockPersistence = new DexiePersistence();
      
      // Mock Dexie to throw on open
      const originalOpen = mockPersistence['db'].open;
      mockPersistence['db'].open = () => Promise.reject(new Error('IndexedDB not available'));

      await mockPersistence.initialize();
      expect(mockPersistence.isAvailable()).toBe(false);

      // Should behave like NoOp when unavailable
      await expect(mockPersistence.saveSnapshot(gameModel.gameSnapshot)).resolves.toBeUndefined();
      const result = await mockPersistence.loadSnapshot();
      expect(result).toBeNull();
    });
  });

  describe('Persistence Factory', () => {
    it('should create appropriate persistence based on availability', async () => {
      const { createPersistence } = await import('./index');
      
      const persistence = await createPersistence();
      expect(persistence).toBeDefined();
      
      // Should be either DexiePersistence or NoOpPersistence
      expect(persistence.constructor.name).toMatch(/^(DexiePersistence|NoOpPersistence)$/);
    });
  });
}); 