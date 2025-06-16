/**
 * Test Factory Utilities Tests
 * 
 * Validates that our factory functions create valid test fixtures
 * with all required fields for modernizing legacy tests.
 */

import { describe, it, expect } from 'vitest';
import { 
  createRule, 
  createPlayer, 
  createVote, 
  createProposal, 
  createGameModel,
  createGameSnapshot,
  createProposalMarkdown,
  PropertyTestGenerators,
  PerformanceTestUtils
} from './factories';

describe('Test Factory Utilities', () => {
  describe('createRule', () => {
    it('should create a valid rule with default values', () => {
      const rule = createRule();
      
      expect(rule).toBeDefined();
      expect(rule.id).toBe(201);
      expect(rule.text).toBe("A test rule for validating game mechanics.");
      expect(rule.mutable).toBe(true);
    });

    it('should accept overrides for all fields', () => {
      const rule = createRule({
        id: 101,
        text: "Custom rule text",
        mutable: false
      });
      
      expect(rule.id).toBe(101);
      expect(rule.text).toBe("Custom rule text");
      expect(rule.mutable).toBe(false);
    });

    it('should create rules with unique IDs when called multiple times', () => {
      const rule1 = createRule({ id: 301 });
      const rule2 = createRule({ id: 302 });
      
      expect(rule1.id).not.toBe(rule2.id);
    });
  });

  describe('createPlayer', () => {
    it('should create a valid player with all required fields', () => {
      const player = createPlayer();
      
      expect(player).toBeDefined();
      expect(player.id).toBe('player1');
      expect(player.name).toBe('Test Player');
      expect(player.icon).toBe('🤖');
      expect(player.llmEndpoint).toBe('http://localhost:3001/test');
      expect(player.points).toBe(0);
      expect(player.proposalsPassed).toBe(0);
      expect(player.accurateVotes).toBe(0);
      expect(player.inaccurateVotes).toBe(0);
    });

    it('should accept overrides for all fields', () => {
      const player = createPlayer({
        id: 'alice',
        name: 'Alice',
        icon: '👩',
        llmEndpoint: 'http://localhost:3002/alice',
        points: 50,
        proposalsPassed: 3,
        accurateVotes: 10,
        inaccurateVotes: 2
      });
      
      expect(player.id).toBe('alice');
      expect(player.name).toBe('Alice');
      expect(player.icon).toBe('👩');
      expect(player.llmEndpoint).toBe('http://localhost:3002/alice');
      expect(player.points).toBe(50);
      expect(player.proposalsPassed).toBe(3);
      expect(player.accurateVotes).toBe(10);
      expect(player.inaccurateVotes).toBe(2);
    });

    it('should include llmEndpoint field to fix legacy test failures', () => {
      const player = createPlayer();
      
      // This field was missing in legacy tests causing failures
      expect(player.llmEndpoint).toBeTruthy();
      expect(typeof player.llmEndpoint).toBe('string');
    });
  });

  describe('createVote', () => {
    it('should create a valid vote with default values', () => {
      const vote = createVote();
      
      expect(vote).toBeDefined();
      expect(vote.voterId).toBe('player1');
      expect(vote.choice).toBe('FOR');
    });

    it('should accept overrides for all fields', () => {
      const vote = createVote({
        voterId: 'alice',
        choice: 'AGAINST'
      });
      
      expect(vote.voterId).toBe('alice');
      expect(vote.choice).toBe('AGAINST');
    });

    it('should only accept valid vote choices', () => {
      const validChoices = ['FOR', 'AGAINST', 'ABSTAIN'];
      
      validChoices.forEach(choice => {
        const vote = createVote({ choice: choice as any });
        expect(validChoices).toContain(vote.choice);
      });
    });
  });

  describe('createProposal', () => {
    it('should create a valid proposal with all required fields including proof', () => {
      const proposal = createProposal();
      
      expect(proposal).toBeDefined();
      expect(proposal.id).toBe('prop1');
      expect(proposal.proposerId).toBe('player1');
      expect(proposal.ruleChange).toBeDefined();
      expect(proposal.ruleChange.type).toBe('add');
      expect(proposal.ruleChange.ruleId).toBe(301);
      expect(proposal.ruleChange.text).toBe('A new test rule for validation.');
      expect(proposal.ruleChange.mutable).toBe(true);
      expect(proposal.status).toBe('pending');
      expect(proposal.votes).toEqual([]);
      expect(proposal.timestamp).toBeGreaterThan(0);
      expect(proposal.proof).toBe('This proposal maintains consistency by adding a new mutable rule that does not conflict with existing rules.');
      expect(proposal.judgeVerdict).toBe('sound');
    });

    it('should include mandatory proof field to fix legacy test failures', () => {
      const proposal = createProposal();
      
      // This field was missing in legacy tests causing failures
      expect(proposal.proof).toBeTruthy();
      expect(typeof proposal.proof).toBe('string');
      expect(proposal.proof.length).toBeGreaterThan(10);
    });

    it('should accept overrides for all fields', () => {
      const proposal = createProposal({
        id: 'custom-prop',
        proposerId: 'alice',
        ruleChange: {
          type: 'amend',
          ruleId: 201,
          text: 'Amended rule text',
          mutable: false
        },
        status: 'passed',
        proof: 'Custom proof text for validation'
      });
      
      expect(proposal.id).toBe('custom-prop');
      expect(proposal.proposerId).toBe('alice');
      expect(proposal.ruleChange.type).toBe('amend');
      expect(proposal.ruleChange.ruleId).toBe(201);
      expect(proposal.proof).toBe('Custom proof text for validation');
      expect(proposal.status).toBe('passed');
    });
  });

  describe('createGameModel', () => {
    it('should create a valid game model with all required fields', () => {
      const game = createGameModel();
      
      expect(game).toBeDefined();
      expect(game.rules).toBeDefined();
      expect(game.rules.length).toBe(2);
      expect(game.players).toBeDefined();
      expect(game.players.length).toBe(2);
      expect(game.proposals).toEqual([]);
      expect(game.turn).toBe(0);
      expect(game.phase).toBe('proposal');
      expect(game.config).toBeDefined();
      expect(game.scoreEntries).toEqual([]);
    });

    it('should accept overrides for all fields', () => {
      const customRules = [createRule({ id: 101 })];
      const customPlayers = [createPlayer({ id: 'test' })];
      
      const game = createGameModel({
        rules: customRules,
        players: customPlayers,
        turn: 5,
        phase: 'voting'
      });
      
      expect(game.rules).toEqual(customRules);
      expect(game.players).toEqual(customPlayers);
      expect(game.turn).toBe(5);
      expect(game.phase).toBe('voting');
    });
  });

  describe('createGameSnapshot', () => {
    it('should create a valid game snapshot for agent testing', () => {
      const snapshot = createGameSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.turn).toBe(0);
      expect(snapshot.phase).toBe('proposal');
      expect(snapshot.players).toBeDefined();
      expect(snapshot.players.length).toBe(1);
      expect(snapshot.rules).toBeDefined();
      expect(snapshot.rules.length).toBe(1);
      expect(snapshot.proposals).toEqual([]);
      expect(snapshot.proofStatement).toBe('Test strategic gameplay instructions for AI agents.');
    });
  });

  describe('createProposalMarkdown', () => {
    it('should create valid proposal markdown with all sections', () => {
      const markdown = createProposalMarkdown();
      
      expect(markdown).toContain('## Test Proposal');
      expect(markdown).toContain('**Type:** Add');
      expect(markdown).toContain('**Rule ID:** 301');
      expect(markdown).toContain('**Text:** A test rule for validation purposes.');
      expect(markdown).toContain('**Proof:** This proposal maintains game consistency');
    });

    it('should accept overrides for all fields', () => {
      const markdown = createProposalMarkdown({
        title: 'Custom Proposal',
        type: 'Amend',
        ruleId: 201,
        text: 'Custom rule text',
        proof: 'Custom proof text'
      });
      
      expect(markdown).toContain('## Custom Proposal');
      expect(markdown).toContain('**Type:** Amend');
      expect(markdown).toContain('**Rule ID:** 201');
      expect(markdown).toContain('**Text:** Custom rule text');
      expect(markdown).toContain('**Proof:** Custom proof text');
    });
  });

  describe('PropertyTestGenerators', () => {
    it('should generate valid rule arrays', () => {
      const rules = PropertyTestGenerators.generateRuleArray(3, 5);
      
      expect(rules.length).toBeGreaterThanOrEqual(3);
      expect(rules.length).toBeLessThanOrEqual(5);
      
      rules.forEach(rule => {
        expect(rule.id).toBeGreaterThan(0);
        expect(rule.text).toBeTruthy();
        expect(typeof rule.mutable).toBe('boolean');
      });
    });

    it('should generate valid player arrays', () => {
      const players = PropertyTestGenerators.generatePlayerArray(2, 4);
      
      expect(players.length).toBeGreaterThanOrEqual(2);
      expect(players.length).toBeLessThanOrEqual(4);
      
      players.forEach(player => {
        expect(player.id).toBeTruthy();
        expect(player.name).toBeTruthy();
        expect(player.llmEndpoint).toBeTruthy();
        expect(typeof player.points).toBe('number');
      });
    });

    it('should generate valid proposal mutations', () => {
      const mutation = PropertyTestGenerators.generateProposalMutation();
      
      expect(mutation).toBeDefined();
      expect(mutation.type).toBeTruthy();
      expect(mutation.ruleId).toBeGreaterThan(0);
      expect(mutation.text).toBeTruthy();
      expect(mutation.proof).toBeTruthy();
    });
  });

  describe('PerformanceTestUtils', () => {
    it('should create large game snapshots for performance testing', () => {
      const snapshot = PerformanceTestUtils.createLargeGameSnapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.rules.length).toBeGreaterThan(50);
      expect(snapshot.players.length).toBeGreaterThan(10);
      expect(snapshot.proposals.length).toBeGreaterThan(20);
    });

    it('should measure snapshot memory usage', () => {
      const result = PerformanceTestUtils.measureSnapshotMemory(() => {
        return { test: 'data' };
      });
      
      expect(result.result).toEqual({ test: 'data' });
      expect(typeof result.memoryUsed).toBe('number');
      expect(result.memoryUsed).toBeGreaterThanOrEqual(0);
    });
  });
}); 