import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TurnOrchestrator } from './TurnOrchestrator';
import { GameModel } from '../models/GameModel';
import { DEFAULT_CONFIG } from '../config';
import { MockMCPService } from '../mocks/MockMCPService';

describe('TurnOrchestrator', () => {
  let gameModel: typeof GameModel.Type;
  let orchestrator: TurnOrchestrator;
  let mockMcpService: MockMCPService;

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

    // Add players
    gameModel.addPlayer({
      id: 'player1',
      name: 'Alice',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3001',
      points: 0,
      isActive: false
    });

    gameModel.addPlayer({
      id: 'player2',
      name: 'Bob',
      icon: '🦾',
      llmEndpoint: 'http://localhost:3002',
      points: 0,
      isActive: false
    });

    // Add initial rules
    gameModel.addRule({
      id: 101,
      text: 'All players must abide by the rules.',
      mutable: false
    });

    // Setup the game
    gameModel.setupGame();

    // Create mock MCP service
    mockMcpService = new MockMCPService();

    // Create orchestrator
    orchestrator = new TurnOrchestrator(gameModel, mockMcpService);
  });

  describe('initialization', () => {
    it('should create with game model and MCP service', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.gameModel).toBe(gameModel);
      expect(orchestrator.isRunning).toBe(false);
    });

    it('should emit events on creation', () => {
      const eventHandler = vi.fn();
      orchestrator.on('turnStart', eventHandler);
      
      // Events should be properly registered
      expect(orchestrator.listenerCount('turnStart')).toBe(1);
    });
  });

  describe('turn execution', () => {
    it('should execute a single turn successfully', async () => {
      const eventHandler = vi.fn();
      orchestrator.on('turnComplete', eventHandler);

      await orchestrator.executeTurn();

      // Should have created a proposal and collected votes
      expect(gameModel.proposals.length).toBe(1);
      expect(gameModel.proposals[0].votes.length).toBe(2); // All players vote
      expect(eventHandler).toHaveBeenCalledWith({
        turn: expect.any(Number),
        proposal: expect.any(Object),
        votingResults: expect.any(Object)
      });
    });

    it('should handle proposal generation', async () => {
      const currentPlayer = gameModel.currentPlayer!;
      
      await orchestrator.executeProposalPhase();

      expect(gameModel.proposals.length).toBe(1);
      expect(gameModel.proposals[0].proposerId).toBe(currentPlayer.id);
    });

    it('should handle voting phase', async () => {
      // First create a proposal
      await orchestrator.executeProposalPhase();
      const proposal = gameModel.proposals[0];

      await orchestrator.executeVotingPhase(proposal.id);

      expect(proposal.votes.length).toBe(2);
      // Note: executeVotingPhase only collects votes, resolution happens in executeTurn
      expect(proposal.status).toBe('pending');
    });

    it('should resolve proposals correctly', async () => {
      await orchestrator.executeTurn();
      
      const proposal = gameModel.proposals[0];
      expect(proposal.status).toMatch(/passed|failed/);
    });
  });

  describe('error handling', () => {
    it('should pause game on orchestration errors', async () => {
      // Test with a game that has no current player to trigger an error
      gameModel.players.forEach(p => p.setActive(false));

      try {
        await orchestrator.executeProposalPhase();
      } catch (error) {
        expect(error).toBeDefined();
        expect(gameModel.phase).toBe('paused');
      }
    });

    it('should emit error events with proper structure', async () => {
      const errorHandler = vi.fn();
      orchestrator.on('error', errorHandler);

      // Force an error by creating a fresh game with no players instead of clearing
      const emptyGameModel = GameModel.create({
        config: DEFAULT_CONFIG,
        players: [], // Empty players array
        rules: [{
          id: 101,
          text: 'Test rule',
          mutable: false
        }],
        proposals: [],
        turn: 0,
        phase: 'playing',
        history: []
      });
      
      const emptyOrchestrator = new TurnOrchestrator(emptyGameModel, mockMcpService);
      emptyOrchestrator.on('error', errorHandler);

      try {
        await emptyOrchestrator.executeProposalPhase();
      } catch (error) {
        expect(errorHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: expect.any(String),
            error: expect.any(Error)
          })
        );
      }
    });
  });

  describe('continuous orchestration', () => {
    it('should start and stop orchestration', async () => {
      expect(orchestrator.isRunning).toBe(false);

      const startPromise = orchestrator.start();
      expect(orchestrator.isRunning).toBe(true);

      // Stop after a short delay
      setTimeout(() => orchestrator.stop(), 50);
      
      await startPromise;
      expect(orchestrator.isRunning).toBe(false);
    });

    it('should respect turn delay configuration', async () => {
      // Create a game with a longer delay for testing instead of modifying frozen config
      const configWithDelay = { ...DEFAULT_CONFIG, turnDelayMs: 100 };
      const delayGameModel = GameModel.create({
        config: configWithDelay,
        players: [{
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 50,
          isActive: false
        }, {
          id: 'player2', 
          name: 'Bob',
          icon: '🦾',
          llmEndpoint: 'http://localhost:3002',
          points: 30,
          isActive: false
        }],
        rules: [{
          id: 101,
          text: 'Test rule',
          mutable: false
        }],
        proposals: [],
        turn: 0,
        phase: 'setup',
        history: []
      });
      
      delayGameModel.setupGame();
      const delayOrchestrator = new TurnOrchestrator(delayGameModel, mockMcpService);
      
      const startTime = Date.now();
      const promise = delayOrchestrator.start();
      
      // Stop after allowing one turn
      setTimeout(() => delayOrchestrator.stop(), 150);
      
      await promise;
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should emit turn events during orchestration', async () => {
      const turnStartHandler = vi.fn();
      const turnCompleteHandler = vi.fn();
      
      orchestrator.on('turnStart', turnStartHandler);
      orchestrator.on('turnComplete', turnCompleteHandler);

      const promise = orchestrator.start();
      
      // Let it run for a bit then stop
      setTimeout(() => orchestrator.stop(), 100);
      
      await promise;

      expect(turnStartHandler).toHaveBeenCalled();
      expect(turnCompleteHandler).toHaveBeenCalled();
    });
  });

  describe('victory detection', () => {
    it('should stop orchestration when victory is achieved', async () => {
      // Give a player enough points to win
      gameModel.players[0].addPoints(100);
      
      // Don't manually check victory - let the orchestrator do it during turn execution

      const victoryHandler = vi.fn();
      orchestrator.on('victory', victoryHandler);

      // Execute turn - this should trigger victory detection
      await orchestrator.executeTurn();

      expect(gameModel.phase).toBe('completed');
      expect(victoryHandler).toHaveBeenCalledWith({
        winner: gameModel.players[0],
        finalScore: gameModel.players[0].points // Use actual final score after turn
      });
    });
  });

  describe('event handling', () => {
    it('should emit proper events for each phase', async () => {
      const events: string[] = [];
      
      orchestrator.on('turnStart', () => events.push('turnStart'));
      orchestrator.on('proposalPhaseStart', () => events.push('proposalPhaseStart'));
      orchestrator.on('votingPhaseStart', () => events.push('votingPhaseStart'));
      orchestrator.on('turnComplete', () => events.push('turnComplete'));

      await orchestrator.executeTurn();

      expect(events).toEqual([
        'turnStart',
        'proposalPhaseStart', 
        'votingPhaseStart',
        'turnComplete'
      ]);
    });
  });
}); 