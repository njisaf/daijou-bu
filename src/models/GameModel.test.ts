import { describe, it, expect, beforeEach } from 'vitest';
import { GameModel, type GamePhase } from './GameModel';
import { DEFAULT_CONFIG } from '../config';

describe('GameModel', () => {
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
  });

  describe('initialization', () => {
    it('should create with default state', () => {
      expect(gameModel.turn).toBe(0);
      expect(gameModel.phase).toBe('setup');
      expect(gameModel.players.length).toBe(0);
      expect(gameModel.rules.length).toBe(0);
      expect(gameModel.proposals.length).toBe(0);
    });

    it('should have config accessible', () => {
      expect(gameModel.config).toBeDefined();
      expect(gameModel.config.turnDelayMs).toBe(200);
    });
  });

  describe('setup phase', () => {
    it('should allow adding players', () => {
      gameModel.addPlayer({
        id: 'player1',
        name: 'Test Player 1',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      expect(gameModel.players.length).toBe(1);
      expect(gameModel.players[0].id).toBe('player1');
    });

    it('should allow adding initial rules', () => {
      gameModel.addRule({
        id: 101,
        text: 'All players must abide by the rules.',
        mutable: false
      });

      expect(gameModel.rules.length).toBe(1);
      expect(gameModel.rules[0].id).toBe(101);
    });

    it('should transition to playing phase when setup is called', () => {
      // Add required components
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

      gameModel.setupGame();
      
      expect(gameModel.phase).toBe('playing');
      expect(gameModel.currentPlayer).toBeDefined();
    });
  });

  describe('game flow', () => {
    beforeEach(() => {
      // Setup a basic game state
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

      gameModel.setupGame();
    });

    it('should have a current player in playing phase', () => {
      expect(gameModel.currentPlayer).toBeDefined();
      expect(gameModel.currentPlayer!.isActive).toBe(true);
    });

    it('should be able to advance to next turn', () => {
      const currentTurn = gameModel.turn;
      const currentPlayerId = gameModel.currentPlayer!.id;
      
      gameModel.nextTurn();
      
      expect(gameModel.turn).toBe(currentTurn + 1);
      expect(gameModel.currentPlayer!.id).not.toBe(currentPlayerId);
    });

    it('should cycle through players correctly', () => {
      const firstPlayerId = gameModel.currentPlayer!.id;
      
      gameModel.nextTurn(); // Turn 1
      const secondPlayerId = gameModel.currentPlayer!.id;
      
      gameModel.nextTurn(); // Turn 2 - should wrap back to first player
      const thirdPlayerId = gameModel.currentPlayer!.id;
      
      expect(firstPlayerId).not.toBe(secondPlayerId);
      expect(firstPlayerId).toBe(thirdPlayerId);
    });
  });

  describe('pause and resume', () => {
    beforeEach(() => {
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
      
      gameModel.setupGame();
    });

    it('should allow pausing the game', () => {
      gameModel.pause();
      expect(gameModel.phase).toBe('paused');
    });

    it('should allow resuming the game', () => {
      gameModel.pause();
      gameModel.resume();
      expect(gameModel.phase).toBe('playing');
    });
  });

  describe('victory conditions', () => {
    beforeEach(() => {
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
      
      gameModel.setupGame();
    });

    it('should detect victory when player reaches 100 points', () => {
      gameModel.players[0].addPoints(100);
      gameModel.checkVictoryCondition();
      
      expect(gameModel.phase).toBe('completed');
      expect(gameModel.winner).toBeDefined();
      expect(gameModel.winner!.id).toBe('player1');
    });

    it('should not trigger victory below 100 points', () => {
      gameModel.players[0].addPoints(99);
      gameModel.checkVictoryCondition();
      
      expect(gameModel.phase).toBe('playing');
      expect(gameModel.winner).toBeUndefined();
    });
  });

  describe('finalization', () => {
    beforeEach(() => {
      gameModel.addPlayer({
        id: 'player1',
        name: 'Player 1',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 100,
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
      
      gameModel.addRule({
        id: 101,
        text: 'All players must abide by the rules.',
        mutable: false
      });
      
      gameModel.setupGame();
      gameModel.checkVictoryCondition();
    });

    it('should finalize game and generate reports', () => {
      const result = gameModel.finalize();
      
      expect(result.rulebook).toContain('Rule 101');
      expect(result.scoreReport).toContain('Player 1');
      expect(result.scoreReport).toContain('100');
    });
  });
}); 