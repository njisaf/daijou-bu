/**
 * Tests for PlayerModel with Rule 301-303 counters
 */

import { describe, it, expect } from 'vitest';
import { PlayerModel } from './PlayerModel';

describe('PlayerModel', () => {
  describe('basic functionality', () => {
    it('should create player with zero counters', () => {
      const player = PlayerModel.create({
        id: 'test-player',
        name: 'Test Player',
        icon: '🎮',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false,
        proposalsPassed: 0,
        accurateVotes: 0,
        inaccurateVotes: 0,
        agentType: 'mock'
      });

      expect(player.id).toBe('test-player');
      expect(player.name).toBe('Test Player');
      expect(player.points).toBe(0);
      expect(player.proposalsPassed).toBe(0);
      expect(player.accurateVotes).toBe(0);
      expect(player.inaccurateVotes).toBe(0);
    });

    it('should award points correctly', () => {
      const player = PlayerModel.create({
        id: 'test',
        name: 'Test',
        icon: '🎮',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      player.awardPoints(10);
      expect(player.points).toBe(10);

      player.awardPoints(5);
      expect(player.points).toBe(15);
    });

    it('should handle negative points and reset to zero per Rule 208', () => {
      const player = PlayerModel.create({
        id: 'test',
        name: 'Test',
        icon: '🎮',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      player.awardPoints(5);
      expect(player.points).toBe(5);

      // Award negative points (penalty)
      player.awardPoints(-10);
      expect(player.points).toBe(0); // Should reset to 0, not -5
    });
  });

  describe('Rule 301: Proposals Passed Counter', () => {
    it('should increment proposals passed counter', () => {
      const player = PlayerModel.create({
        id: 'proposer',
        name: 'Proposer',
        icon: '📝',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      expect(player.proposalsPassed).toBe(0);

      player.incrementProposalCounter(1);
      expect(player.proposalsPassed).toBe(1);

      player.incrementProposalCounter(1);
      expect(player.proposalsPassed).toBe(2);
    });

    it('should decrement proposals passed counter but not below zero', () => {
      const player = PlayerModel.create({
        id: 'proposer',
        name: 'Proposer',
        icon: '📝',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      // Start with some passed proposals
      player.incrementProposalCounter(3);
      expect(player.proposalsPassed).toBe(3);

      // Decrement for failed proposal
      player.incrementProposalCounter(-1);
      expect(player.proposalsPassed).toBe(2);

      // Try to go below zero
      player.incrementProposalCounter(-5);
      expect(player.proposalsPassed).toBe(0); // Should not go negative
    });

    it('should handle mixed increments and decrements', () => {
      const player = PlayerModel.create({
        id: 'proposer',
        name: 'Proposer',
        icon: '📝',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      player.incrementProposalCounter(2); // 2 passed
      player.incrementProposalCounter(-1); // 1 failed
      player.incrementProposalCounter(1); // 1 more passed
      
      expect(player.proposalsPassed).toBe(2);
    });
  });

  describe('Rule 302: Vote Accuracy Tracking', () => {
    it('should track accurate votes', () => {
      const player = PlayerModel.create({
        id: 'voter',
        name: 'Voter',
        icon: '🗳️',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      expect(player.accurateVotes).toBe(0);
      expect(player.inaccurateVotes).toBe(0);

      player.recordVoteAccuracy(true);
      expect(player.accurateVotes).toBe(1);
      expect(player.inaccurateVotes).toBe(0);

      player.recordVoteAccuracy(true);
      expect(player.accurateVotes).toBe(2);
      expect(player.inaccurateVotes).toBe(0);
    });

    it('should track inaccurate votes', () => {
      const player = PlayerModel.create({
        id: 'voter',
        name: 'Voter',
        icon: '🗳️',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      player.recordVoteAccuracy(false);
      expect(player.accurateVotes).toBe(0);
      expect(player.inaccurateVotes).toBe(1);

      player.recordVoteAccuracy(false);
      expect(player.accurateVotes).toBe(0);
      expect(player.inaccurateVotes).toBe(2);
    });

    it('should track mixed vote accuracy', () => {
      const player = PlayerModel.create({
        id: 'voter',
        name: 'Voter',
        icon: '🗳️',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      player.recordVoteAccuracy(true);  // Accurate
      player.recordVoteAccuracy(false); // Inaccurate
      player.recordVoteAccuracy(true);  // Accurate
      player.recordVoteAccuracy(false); // Inaccurate
      player.recordVoteAccuracy(true);  // Accurate

      expect(player.accurateVotes).toBe(3);
      expect(player.inaccurateVotes).toBe(2);
      expect(player.totalVotes).toBe(5);
    });
  });

  describe('Rule 206: Missed Vote Penalty', () => {
    it('should apply -10 point penalty for missed vote', () => {
      const player = PlayerModel.create({
        id: 'absent',
        name: 'Absent Player',
        icon: '😴',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      // Start with some points
      player.awardPoints(20);
      expect(player.points).toBe(20);

      // Apply missed vote penalty
      player.applyMissedVotePenalty();
      expect(player.points).toBe(10); // 20 - 10 = 10
    });

    it('should reset to zero if penalty makes score negative', () => {
      const player = PlayerModel.create({
        id: 'poor',
        name: 'Poor Player',
        icon: '💸',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      // Start with only 5 points
      player.awardPoints(5);
      expect(player.points).toBe(5);

      // Apply missed vote penalty (-10)
      player.applyMissedVotePenalty();
      expect(player.points).toBe(0); // Should reset to 0, not -5
    });
  });

  describe('computed properties', () => {
    it('should calculate total votes correctly', () => {
      const player = PlayerModel.create({
        id: 'voter',
        name: 'Active Voter',
        icon: '📊',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      expect(player.totalVotes).toBe(0);

      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(false);
      player.recordVoteAccuracy(true);

      expect(player.totalVotes).toBe(3);
      expect(player.accurateVotes).toBe(2);
      expect(player.inaccurateVotes).toBe(1);
    });

    it('should calculate vote accuracy percentage', () => {
      const player = PlayerModel.create({
        id: 'voter',
        name: 'Accurate Voter',
        icon: '🎯',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      // No votes yet
      expect(player.voteAccuracyPercentage).toBe(0);

      // 2 accurate, 1 inaccurate = 67% (Math.round(2/3 * 100))
      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(false);

      expect(player.voteAccuracyPercentage).toBe(67);

      // All accurate = 100%
      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(true);

      expect(player.voteAccuracyPercentage).toBe(80); // 4/5 = 80%
    });

    it('should generate performance summary', () => {
      const player = PlayerModel.create({
        id: 'performer',
        name: 'Top Performer',
        icon: '🏆',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      player.awardPoints(50);
      player.incrementProposalCounter(3);
      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(false);

      const summary = player.performanceSummary;

      expect(summary).toContain('Top Performer');
      expect(summary).toContain('⭐50pts');
      expect(summary).toContain('(3 passed)');
      expect(summary).toContain('2/3 accurate votes');
    });

    it('should generate score report data', () => {
      const player = PlayerModel.create({
        id: 'reporter',
        name: 'Score Reporter',
        icon: '📈',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      player.awardPoints(25);
      player.incrementProposalCounter(2);
      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(false);
      player.recordVoteAccuracy(true);
      player.recordVoteAccuracy(true);

      const reportData = player.scoreReportData;

      expect(reportData.name).toBe('Score Reporter');
      expect(reportData.points).toBe(25);
      expect(reportData.proposalsPassed).toBe(2);
      expect(reportData.accurateVotes).toBe(3);
      expect(reportData.inaccurateVotes).toBe(1);
      expect(reportData.totalVotes).toBe(4);
      expect(reportData.voteAccuracy).toBe(75);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete game scenario', () => {
      const player = PlayerModel.create({
        id: 'game-player',
        name: 'Game Player',
        icon: '🎲',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      // Simulate a complete game experience
      
      // Round 1: Successful proposal
      player.awardPoints(10); // Proposer points
      player.incrementProposalCounter(1); // Proposal passed
      player.recordVoteAccuracy(true); // Voted FOR winning proposal
      
      // Round 2: Failed proposal 
      player.incrementProposalCounter(-1); // Proposal failed
      player.recordVoteAccuracy(false); // Voted FOR losing proposal
      
      // Round 3: Voting only
      player.awardPoints(5); // FOR vote bonus
      player.recordVoteAccuracy(true); // Voted FOR winning proposal
      
      // Round 4: Missed vote
      player.applyMissedVotePenalty(); // -10 points for missing vote

      // Final expectations
      expect(player.points).toBe(5); // 10 + 5 - 10 = 5
      expect(player.proposalsPassed).toBe(0); // 1 - 1 = 0 (minimum)
      expect(player.accurateVotes).toBe(2);
      expect(player.inaccurateVotes).toBe(1);
      expect(player.totalVotes).toBe(3);
      expect(player.voteAccuracyPercentage).toBe(67); // Math.round(2/3 * 100)
    });

    it('should handle edge case with no activity', () => {
      const player = PlayerModel.create({
        id: 'inactive',
        name: 'Inactive Player',
        icon: '😴',
        llmEndpoint: 'http://localhost:3001',
        points: 0,
        isActive: false
      });

      // No activity - all should be zero/default
      expect(player.points).toBe(0);
      expect(player.proposalsPassed).toBe(0);
      expect(player.accurateVotes).toBe(0);
      expect(player.inaccurateVotes).toBe(0);
      expect(player.totalVotes).toBe(0);
      expect(player.voteAccuracyPercentage).toBe(0);

      const summary = player.performanceSummary;
      expect(summary).toContain('Inactive Player');
      expect(summary).toContain('⭐0pts'); 
      expect(summary).toContain('(0 passed)');
      expect(summary).toContain('0/0 accurate votes');
    });
  });
}); 