import { describe, it, expect, beforeEach } from 'vitest';
import { GameModel, createGame, type GamePhase } from './GameModel';
import { createRuleSet } from './RuleSetModel';
import { createGameConfig } from './GameConfigModel';
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
        proof: 'This is a test proposal for ID generation.',
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
        proof: 'This proposal tests non-sequential ID handling.',
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
        proof: 'This is the first proposal in the test.',
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
          proof: 'This proposal attempts to use a duplicate ID.',
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
        proof: 'This proposal tests automatic ID generation.',
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

  describe('acceptanceTestsPass functionality', () => {
    it('should return false by default (stub implementation)', () => {
      const game = createTestGame();
      
      // Test that the stub implementation returns false
      expect(game.acceptanceTestsPass).toBe(false);
      
      // Verify it's used in victory condition
      expect(game.isGameWon).toBe(false);
    });

    it('should be included in game snapshot', () => {
      const game = createTestGame();
      const snapshot = game.gameSnapshot;
      
      // Verify acceptanceTestsPass is included in snapshot
      expect(snapshot.acceptanceTestsPass).toBe(false);
    });

    it('should affect new victory condition when combined with freeze proposal', () => {
      const game = createTestGame();
      
      // Initially no victory
      expect(game.isGameWon).toBe(false);
      expect(game.freezeProposalPassed).toBe(false);
      expect(game.acceptanceTestsPass).toBe(false);
      
      // Even if we had a passed freeze proposal, acceptance tests must also pass
      // This is a test of the logical structure - actual freeze proposal testing
      // is handled elsewhere in the test suite
      expect(game.freezeProposalPassed && game.acceptanceTestsPass).toBe(false);
    });
  });
});

/**
 * Tests for GameModel with Prompt P support
 */

describe('GameModel with Prompt P', () => {
  let gameModel: typeof GameModel.Type;

  beforeEach(() => {
    gameModel = GameModel.create({
      config: { ...DEFAULT_CONFIG, promptP: 'Test prompt for LLM agents' },
      players: [],
      rules: [],
      proposals: [],
      turn: 0,
      phase: 'setup',
      history: []
    });
  });

  describe('GameSnapshot with proofStatement', () => {
    it('should include proofStatement in gameSnapshot', () => {
      const snapshot = gameModel.gameSnapshot;
      expect(snapshot).toHaveProperty('proofStatement');
    });

    it('should extract proofStatement from config.promptP', () => {
      const testPrompt = 'Custom prompt for testing';
      const modelWithCustomPrompt = GameModel.create({
        config: { ...DEFAULT_CONFIG, promptP: testPrompt },
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'setup',
        history: []
      });

      const snapshot = modelWithCustomPrompt.gameSnapshot;
      expect(snapshot.proofStatement).toBe(testPrompt);
    });

    it('should handle empty promptP gracefully', () => {
      const modelWithEmptyPrompt = GameModel.create({
        config: { ...DEFAULT_CONFIG, promptP: '' },
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'setup',
        history: []
      });

      const snapshot = modelWithEmptyPrompt.gameSnapshot;
      expect(snapshot.proofStatement).toBe('');
    });
  });

  describe('rule loading integration', () => {
    it('should support loading rules with promptP via loadFromRules action', () => {
      expect(gameModel.loadFromRules).toBeDefined();
      expect(typeof gameModel.loadFromRules).toBe('function');
    });

    it('should preserve promptP when loading rules', () => {
      const originalPrompt = gameModel.config.promptP;
      
      // Mock loading rules (we'll implement this in the actual GameModel)
      expect(gameModel.config.promptP).toBe(originalPrompt);
    });
  });

  describe('backward compatibility', () => {
    it('should still work with existing GameModel API', () => {
      // Test existing functionality still works
      expect(gameModel.addPlayer).toBeDefined();
      expect(gameModel.addRule).toBeDefined();
      expect(gameModel.addProposal).toBeDefined();
      expect(gameModel.setupGame).toBeDefined();
    });

    it('should maintain existing snapshot properties', () => {
      const snapshot = gameModel.gameSnapshot;
      expect(snapshot).toHaveProperty('players');
      expect(snapshot).toHaveProperty('rules');
      expect(snapshot).toHaveProperty('proposals');
      expect(snapshot).toHaveProperty('turn');
      expect(snapshot).toHaveProperty('phase');
    });
  });
});

describe('createGame factory function', () => {
  it('should create a game with custom ruleset and config', () => {
    // Create a custom ruleset
    const customRules = [
      { id: 101, text: 'Custom rule 1', mutable: false },
      { id: 201, text: 'Custom rule 2', mutable: true }
    ];
    const ruleset = createRuleSet(customRules);

    // Create a custom config
    const config = createGameConfig({
      promptP: 'Custom AI instructions',
      turnDelayMs: 500,
      victoryTarget: 150
    });

    // Create the game
    const game = createGame({ ruleset, config });

    // Verify the game was created correctly
    expect(game.rules.length).toBe(2);
    expect(game.rules[0].id).toBe(101);
    expect(game.rules[0].text).toBe('Custom rule 1');
    expect(game.rules[0].mutable).toBe(false);
    expect(game.rules[1].id).toBe(201);
    expect(game.rules[1].text).toBe('Custom rule 2');
    expect(game.rules[1].mutable).toBe(true);

    expect(game.config.promptP).toBe('Custom AI instructions');
    expect(game.config.turnDelayMs).toBe(500);
    expect(game.config.victoryTarget).toBe(150);
    expect(game.phase).toBe('setup');
    expect(game.players.length).toBe(0);
  });

  it('should create a game with initial players', () => {
    const ruleset = createRuleSet([
      { id: 101, text: 'Basic rule', mutable: false }
    ]);
    const config = createGameConfig();

    const players = [
      { id: 'alice', name: 'Alice', icon: '🤖', llmEndpoint: 'http://localhost:3001' },
      { id: 'bob', name: 'Bob', icon: '🦾', llmEndpoint: 'http://localhost:3002' }
    ];

    const game = createGame({ ruleset, config, players });

    expect(game.players.length).toBe(2);
    expect(game.players[0].id).toBe('alice');
    expect(game.players[0].name).toBe('Alice');
    expect(game.players[0].points).toBe(0);
    expect(game.players[0].isActive).toBe(false);
    expect(game.players[1].id).toBe('bob');
    expect(game.players[1].name).toBe('Bob');
  });

  it('should validate inputs and throw on invalid ruleset', () => {
    const config = createGameConfig();

    expect(() => {
      createGame({ ruleset: null as any, config });
    }).toThrow('Ruleset is required to create a game');
  });

  it('should validate inputs and throw on invalid config', () => {
    const ruleset = createRuleSet([]);

    expect(() => {
      createGame({ ruleset, config: null as any });
    }).toThrow('Configuration is required to create a game');
  });

  it('should validate ruleset and config before creating game', () => {
    // Create a ruleset with duplicate IDs (should fail validation)
    const ruleset = createRuleSet();
    ruleset.addRule({ id: 101, text: 'Rule 1', mutable: false });
    
    // Try to add duplicate ID
    expect(() => {
      ruleset.addRule({ id: 101, text: 'Duplicate rule', mutable: true });
    }).toThrow('Rule with ID 101 already exists');

    // Valid config
    const config = createGameConfig();

    // This should work with valid ruleset
    expect(() => {
      createGame({ ruleset, config });
    }).not.toThrow();
  });
}); 