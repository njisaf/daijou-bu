import { describe, it, expect } from 'vitest';
import { ProposalModel, createProposal } from './ProposalModel';
import { createVote } from './VoteModel';

describe('ProposalModel', () => {
  it('should create a pending proposal', () => {
    const proposal = createProposal({
      id: 1,
      proposerId: 'alice',
      type: 'Add',
      ruleNumber: 301,
      ruleText: 'Players may submit proposals in haiku format.',
      timestamp: Date.now()
    });

    expect(proposal.id).toBe(1);
    expect(proposal.proposerId).toBe('alice');
    expect(proposal.type).toBe('Add');
    expect(proposal.ruleNumber).toBe(301);
    expect(proposal.ruleText).toBe('Players may submit proposals in haiku format.');
    expect(proposal.status).toBe('pending');
    expect(proposal.votes).toHaveLength(0);
    expect(proposal.isPending).toBe(true);
    expect(proposal.isPassed).toBe(false);
    expect(proposal.isFailed).toBe(false);
  });

  it('should allow adding votes', () => {
    const proposal = createProposal({
      id: 2,
      proposerId: 'bob',
      type: 'Amend',
      ruleNumber: 201,
      ruleText: 'Updated rule text',
      timestamp: Date.now()
    });

    const vote1 = createVote({ voterId: 'alice', choice: 'FOR' });
    const vote2 = createVote({ voterId: 'charlie', choice: 'AGAINST' });
    
    proposal.addVote('alice', 'FOR');
    proposal.addVote('charlie', 'AGAINST');

    expect(proposal.votes).toHaveLength(2);
    expect(proposal.getVoteFor('alice')?.choice).toBe('FOR');
    expect(proposal.getVoteFor('charlie')?.choice).toBe('AGAINST');
  });

  it('should prevent duplicate votes from same player', () => {
    const proposal = createProposal({
      id: 3,
      proposerId: 'charlie',
      type: 'Repeal',
      ruleNumber: 208,
      ruleText: 'Rule 208 is hereby repealed.',
      timestamp: Date.now()
    });

    proposal.addVote('alice', 'FOR');
    
    expect(() => proposal.addVote('alice', 'AGAINST')).toThrow();
  });

  it('should allow changing votes before resolution', () => {
    const proposal = createProposal({
      id: 4,
      proposerId: 'diana',
      type: 'Transmute',
      ruleNumber: 105,
      ruleText: 'Rule 105 is hereby transmuted.',
      timestamp: Date.now()
    });

    proposal.addVote('alice', 'FOR');
    expect(proposal.getVoteFor('alice')?.choice).toBe('FOR');

    proposal.changeVote('alice', 'AGAINST');
    expect(proposal.getVoteFor('alice')?.choice).toBe('AGAINST');
  });

  it('should calculate vote counts correctly', () => {
    const proposal = createProposal({
      id: 5,
      proposerId: 'eve',
      type: 'Add',
      ruleNumber: 302,
      ruleText: 'New rule text',
      timestamp: Date.now()
    });

    proposal.addVote('alice', 'FOR');
    proposal.addVote('bob', 'FOR');
    proposal.addVote('charlie', 'AGAINST');
    proposal.addVote('diana', 'ABSTAIN');

    expect(proposal.forVotes).toBe(2);
    expect(proposal.againstVotes).toBe(1);
    expect(proposal.abstainVotes).toBe(1);
    expect(proposal.totalVotes).toBe(4);
  });

  it('should resolve proposal as passed when majority FOR', () => {
    const proposal = createProposal({
      id: 6,
      proposerId: 'frank',
      type: 'Add',
      ruleNumber: 303,
      ruleText: 'Another new rule',
      timestamp: Date.now()
    });

    proposal.addVote('alice', 'FOR');
    proposal.addVote('bob', 'FOR');
    proposal.addVote('charlie', 'FOR');
    proposal.addVote('diana', 'AGAINST');

    proposal.resolve();

    expect(proposal.status).toBe('passed');
    expect(proposal.isPassed).toBe(true);
  });

  it('should resolve proposal as failed when majority AGAINST', () => {
    const proposal = createProposal({
      id: 7,
      proposerId: 'grace',
      type: 'Repeal',
      ruleNumber: 209,
      ruleText: 'Repeal rule 209',
      timestamp: Date.now()
    });

    proposal.addVote('alice', 'AGAINST');
    proposal.addVote('bob', 'AGAINST');
    proposal.addVote('charlie', 'FOR');
    proposal.addVote('diana', 'ABSTAIN');

    proposal.resolve();

    expect(proposal.status).toBe('failed');
    expect(proposal.isFailed).toBe(true);
  });

  it('should resolve proposal as failed when tied', () => {
    const proposal = createProposal({
      id: 8,
      proposerId: 'henry',
      type: 'Add',
      ruleNumber: 304,
      ruleText: 'Tied proposal',
      timestamp: Date.now()
    });

    proposal.addVote('alice', 'FOR');
    proposal.addVote('bob', 'FOR');
    proposal.addVote('charlie', 'AGAINST');
    proposal.addVote('diana', 'AGAINST');

    proposal.resolve();

    expect(proposal.status).toBe('failed');
    expect(proposal.isFailed).toBe(true);
  });

  it('should not allow modifications after resolution', () => {
    const proposal = createProposal({
      id: 9,
      proposerId: 'ivan',
      type: 'Add',
      ruleNumber: 305,
      ruleText: 'Resolved proposal',
      timestamp: Date.now()
    });

    proposal.addVote('alice', 'FOR');
    proposal.resolve();

    expect(() => proposal.addVote('bob', 'FOR')).toThrow();
    expect(() => proposal.changeVote('alice', 'AGAINST')).toThrow();
  });

  it('should provide proposal summary', () => {
    const proposal = createProposal({
      id: 10,
      proposerId: 'jane',
      type: 'Amend',
      ruleNumber: 202,
      ruleText: 'Updated voting options rule',
      timestamp: Date.now()
    });

    const summary = proposal.summary;
    expect(summary).toContain('Proposal 10');
    expect(summary).toContain('Amend');
    expect(summary).toContain('jane');
    expect(summary).toContain('pending');
  });

  it('should validate proposal input', () => {
    expect(() => createProposal({
      id: 0,
      proposerId: 'alice',
      type: 'Add',
      ruleNumber: 301,
      ruleText: 'Valid text',
      timestamp: Date.now()
    })).toThrow();

    expect(() => createProposal({
      id: 1,
      proposerId: '',
      type: 'Add',
      ruleNumber: 301,
      ruleText: 'Valid text',
      timestamp: Date.now()
    })).toThrow();

    expect(() => createProposal({
      id: 1,
      proposerId: 'alice',
      type: 'Add',
      ruleNumber: 0,
      ruleText: 'Valid text',
      timestamp: Date.now()
    })).toThrow();

    expect(() => createProposal({
      id: 1,
      proposerId: 'alice',
      type: 'Add',
      ruleNumber: 301,
      ruleText: '',
      timestamp: Date.now()
    })).toThrow();
  });

  it('should serialize to JSON correctly', () => {
    const proposal = createProposal({
      id: 11,
      proposerId: 'json-test',
      type: 'Add',
      ruleNumber: 306,
      ruleText: 'JSON test rule',
      timestamp: 1234567890
    });

    proposal.addVote('alice', 'FOR');

    const json = JSON.parse(JSON.stringify(proposal));
    expect(json.id).toBe(11);
    expect(json.proposerId).toBe('json-test');
    expect(json.type).toBe('Add');
    expect(json.ruleNumber).toBe(306);
    expect(json.ruleText).toBe('JSON test rule');
    expect(json.status).toBe('pending');
    expect(json.timestamp).toBe(1234567890);
    expect(json.votes).toHaveLength(1);
  });
}); 