import { describe, it, expect, beforeEach } from 'vitest';
import { GameModel, type GamePhase } from './GameModel';
import { DEFAULT_CONFIG } from '../config';

/**
 * Helper function to create a test game model
 */
function createTestGame() {
  return GameModel.create({
    config: DEFAULT_CONFIG,
    players: [],
    rules: [],
    proposals: [],
    turn: 0,
    phase: 'setup',
    history: []
  });
}

describe('GameModel', () => {
  let gameModel: typeof GameModel.Type;

  beforeEach(() => {
    gameModel = createTestGame();
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

  describe('proposal management', () => {
    it('should generate unique proposal IDs sequentially', () => {
      const game = createTestGame();
      
      // First proposal should get ID 301
      expect(game.nextProposalId).toBe(301);
      
      // Add a proposal
      game.addProposal({
        id: game.nextProposalId,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 301,
        ruleText: 'Test rule',
        status: 'pending',
        votes: [],
        timestamp: Date.now()
      });
      
      // Next ID should be 302
      expect(game.nextProposalId).toBe(302);
    });

    it('should handle non-sequential proposal IDs correctly', () => {
      const game = createTestGame();
      
      // Manually add proposal with higher ID
      game.addProposal({
        id: 350,
        proposerId: 'alice', 
        type: 'Add',
        ruleNumber: 350,
        ruleText: 'Test rule',
        status: 'pending',
        votes: [],
        timestamp: Date.now()
      });
      
      // Next ID should be 351 (one more than highest existing)
      expect(game.nextProposalId).toBe(351);
    });

    it('should prevent duplicate proposal IDs', () => {
      const game = createTestGame();
      
      // Add first proposal
      game.addProposal({
        id: 301,
        proposerId: 'alice',
        type: 'Add', 
        ruleNumber: 301,
        ruleText: 'First rule',
        status: 'pending',
        votes: [],
        timestamp: Date.now()
      });
      
      // Attempt to add duplicate ID should throw
      expect(() => {
        game.addProposal({
          id: 301,
          proposerId: 'bob',
          type: 'Add',
          ruleNumber: 302, 
          ruleText: 'Duplicate ID rule',
          status: 'pending',
          votes: [],
          timestamp: Date.now()
        });
      }).toThrow('Proposal with ID 301 already exists');
    });

    it('should generate proposal with unique ID automatically', () => {
      const game = createTestGame();
      
      const proposalData = {
        proposerId: 'alice',
        type: 'Add' as const,
        ruleNumber: 301,
        ruleText: 'Auto-generated ID rule',
        status: 'pending' as const,
        votes: [],
        timestamp: Date.now()
      };
      
      const proposal = game.createProposal(proposalData);
      
      expect(proposal.id).toBe(301);
      expect(game.proposals.length).toBe(1);
      expect(game.proposals[0].id).toBe(301);
    });
  });
}); 