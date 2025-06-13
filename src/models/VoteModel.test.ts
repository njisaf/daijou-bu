import { describe, it, expect } from 'vitest';
import { VoteModel, createVote } from './VoteModel';

describe('VoteModel', () => {
  it('should create a FOR vote', () => {
    const vote = createVote({
      voterId: 'player1',
      choice: 'FOR'
    });

    expect(vote.voterId).toBe('player1');
    expect(vote.choice).toBe('FOR');
    expect(vote.isFor).toBe(true);
    expect(vote.isAgainst).toBe(false);
    expect(vote.isAbstain).toBe(false);
  });

  it('should create an AGAINST vote', () => {
    const vote = createVote({
      voterId: 'player2',
      choice: 'AGAINST'
    });

    expect(vote.voterId).toBe('player2');
    expect(vote.choice).toBe('AGAINST');
    expect(vote.isFor).toBe(false);
    expect(vote.isAgainst).toBe(true);
    expect(vote.isAbstain).toBe(false);
  });

  it('should create an ABSTAIN vote', () => {
    const vote = createVote({
      voterId: 'player3',
      choice: 'ABSTAIN'
    });

    expect(vote.voterId).toBe('player3');
    expect(vote.choice).toBe('ABSTAIN');
    expect(vote.isFor).toBe(false);
    expect(vote.isAgainst).toBe(false);
    expect(vote.isAbstain).toBe(true);
  });

  it('should provide vote summary', () => {
    const forVote = createVote({
      voterId: 'alice',
      choice: 'FOR'
    });

    const againstVote = createVote({
      voterId: 'bob',
      choice: 'AGAINST'
    });

    const abstainVote = createVote({
      voterId: 'charlie',
      choice: 'ABSTAIN'
    });

    expect(forVote.summary).toContain('alice');
    expect(forVote.summary).toContain('FOR');

    expect(againstVote.summary).toContain('bob');
    expect(againstVote.summary).toContain('AGAINST');

    expect(abstainVote.summary).toContain('charlie');
    expect(abstainVote.summary).toContain('ABSTAIN');
  });

  it('should validate voter ID', () => {
    expect(() => createVote({
      voterId: '',
      choice: 'FOR'
    })).toThrow();

    expect(() => createVote({
      voterId: '   ',
      choice: 'FOR'
    })).toThrow();
  });

  it('should validate vote choice', () => {
    expect(() => createVote({
      voterId: 'player1',
      choice: 'INVALID' as any
    })).toThrow();
  });

  it('should serialize to JSON correctly', () => {
    const vote = createVote({
      voterId: 'json-test',
      choice: 'FOR'
    });

    const json = JSON.parse(JSON.stringify(vote));
    expect(json.voterId).toBe('json-test');
    expect(json.choice).toBe('FOR');
  });

  it('should handle all valid vote choices', () => {
    const choices = ['FOR', 'AGAINST', 'ABSTAIN'] as const;
    
    choices.forEach(choice => {
      const vote = createVote({
        voterId: `player-${choice.toLowerCase()}`,
        choice
      });
      
      expect(vote.choice).toBe(choice);
    });
  });
}); 