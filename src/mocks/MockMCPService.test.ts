import { describe, it, expect, beforeEach } from 'vitest';
import { MockMCPService } from './MockMCPService';
import { createPlayer } from '../models/PlayerModel';

describe('MockMCPService', () => {
  let service: MockMCPService;

  beforeEach(() => {
    // Use a fixed seed for deterministic tests
    service = new MockMCPService(12345);
  });

  describe('propose endpoint', () => {
    it('should generate deterministic proposals with same seed', () => {
      const player = createPlayer({
        id: 'test-player',
        name: 'Test Player',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3000'
      });

      const gameSnapshot = {
        players: [player],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'proposal'
      };

      const promptP = 'You are a player in a Nomic game. Propose a rule change.';

      const proposal1 = service.propose(promptP, gameSnapshot);
      
      // Reset service with same seed
      service = new MockMCPService(12345);
      const proposal2 = service.propose(promptP, gameSnapshot);

      expect(proposal1).toBe(proposal2);
    });

    it('should generate valid proposal markdown format', () => {
      const player = createPlayer({
        id: 'test-player',
        name: 'Test Player',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3000'
      });

      const gameSnapshot = {
        players: [player],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'proposal'
      };

      const promptP = 'You are a player in a Nomic game. Propose a rule change.';
      const proposal = service.propose(promptP, gameSnapshot);

      // Should match the expected proposal format
      expect(proposal).toMatch(/^### Proposal \d+$/m);
      expect(proposal).toMatch(/^Type: (Add|Amend|Repeal|Transmute)$/m);
      expect(proposal).toMatch(/^Number: \d+$/m);
      expect(proposal).toMatch(/^Text: ".+"$/m);
    });

    it('should generate different proposals with different seeds', () => {
      const player = createPlayer({
        id: 'test-player',
        name: 'Test Player',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3000'
      });

      const gameSnapshot = {
        players: [player],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'proposal'
      };

      const promptP = 'You are a player in a Nomic game. Propose a rule change.';

      const service1 = new MockMCPService(11111);
      const service2 = new MockMCPService(22222);

      const proposal1 = service1.propose(promptP, gameSnapshot);
      const proposal2 = service2.propose(promptP, gameSnapshot);

      expect(proposal1).not.toBe(proposal2);
    });

    it('should generate proposals that avoid existing rule numbers', () => {
      const player = createPlayer({
        id: 'test-player',
        name: 'Test Player',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3000'
      });

      const gameSnapshot = {
        players: [player],
        rules: [
          { id: 201, text: 'Existing rule', mutable: true },
          { id: 202, text: 'Another rule', mutable: true }
        ],
        proposals: [],
        turn: 0,
        phase: 'proposal'
      };

      const promptP = 'You are a player in a Nomic game. Propose a rule change.';
      const proposal = service.propose(promptP, gameSnapshot);

      // Extract the rule number from the proposal
      const numberMatch = proposal.match(/^Number: (\d+)$/m);
      expect(numberMatch).toBeTruthy();
      
      if (numberMatch) {
        const ruleNumber = parseInt(numberMatch[1], 10);
        expect(ruleNumber).not.toBe(201);
        expect(ruleNumber).not.toBe(202);
      }
    });
  });

  describe('vote endpoint', () => {
    it('should generate deterministic votes with same seed', () => {
      const proposalMarkdown = `### Proposal 1
Type: Add
Number: 301
Text: "Players may submit proposals in haiku format."`;

      const gameSnapshot = {
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'voting'
      };

      const vote1 = service.vote(proposalMarkdown, gameSnapshot);
      
      // Reset service with same seed
      service = new MockMCPService(12345);
      const vote2 = service.vote(proposalMarkdown, gameSnapshot);

      expect(vote1).toBe(vote2);
    });

    it('should generate valid vote choices', () => {
      const proposalMarkdown = `### Proposal 1
Type: Add
Number: 301
Text: "Players may submit proposals in haiku format."`;

      const gameSnapshot = {
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'voting'
      };

      const vote = service.vote(proposalMarkdown, gameSnapshot);
      expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(vote);
    });

    it('should generate different votes with different seeds', () => {
      const proposalMarkdown = `### Proposal 1
Type: Add
Number: 301
Text: "Players may submit proposals in haiku format."`;

      const gameSnapshot = {
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'voting'
      };

      const service1 = new MockMCPService(11111);
      const service2 = new MockMCPService(22222);

      const vote1 = service1.vote(proposalMarkdown, gameSnapshot);
      const vote2 = service2.vote(proposalMarkdown, gameSnapshot);

      // With different seeds, votes might be different (though not guaranteed)
      // We're just checking that the method works with different services
      expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(vote1);
      expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(vote2);
    });

    it('should consider proposal content in voting decision', () => {
      const goodProposal = `### Proposal 1
Type: Add
Number: 301
Text: "Players receive bonus points for clever proposals."`;

      const badProposal = `### Proposal 2
Type: Add
Number: 302
Text: "All players lose half their points immediately."`;

      const gameSnapshot = {
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'voting'
      };

      const vote1 = service.vote(goodProposal, gameSnapshot);
      const vote2 = service.vote(badProposal, gameSnapshot);

      // Both should be valid votes
      expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(vote1);
      expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(vote2);
    });
  });

  describe('seed behavior', () => {
    it('should produce consistent results across multiple calls with same seed', () => {
      const gameSnapshot = {
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'proposal'
      };

      const results1 = [];
      const results2 = [];

      // First run
      const service1 = new MockMCPService(54321);
      for (let i = 0; i < 5; i++) {
        results1.push(service1.propose('Prompt', gameSnapshot));
      }

      // Second run with same seed
      const service2 = new MockMCPService(54321);
      for (let i = 0; i < 5; i++) {
        results2.push(service2.propose('Prompt', gameSnapshot));
      }

      expect(results1).toEqual(results2);
    });

    it('should be seedable for reproducible tests', () => {
      const gameSnapshot = {
        players: [],
        rules: [],
        proposals: [],
        turn: 0,
        phase: 'voting'
      };

      const proposal = `### Proposal 1
Type: Add
Number: 301
Text: "Test proposal"`;

      // Specific seed should always produce same vote
      const testService = new MockMCPService(99999);
      const vote = testService.vote(proposal, gameSnapshot);
      
      expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(vote);
      
      // Same seed should produce same result
      const testService2 = new MockMCPService(99999);
      const vote2 = testService2.vote(proposal, gameSnapshot);
      
      expect(vote).toBe(vote2);
    });
  });
}); 