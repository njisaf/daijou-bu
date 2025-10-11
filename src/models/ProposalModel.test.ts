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
      proof: 'This proposal adds a new rule without conflicts.',
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
      proof: 'This proposal amends an existing mutable rule.',
      timestamp: Date.now()
    });

    const vote1 = createVote({ voterId: 'alice', choice: 'FOR' });
    const vote2 = createVote({ voterId: 'charlie', choice: 'AGAINST' });
    
    proposal.addVote(vote1);
    proposal.addVote(vote2);

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
      proof: 'This proposal repeals a mutable rule.',
      timestamp: Date.now()
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));
    
    expect(() => proposal.addVote(createVote({ voterId: 'alice', choice: 'AGAINST' }))).toThrow();
  });

  it('should allow changing votes before resolution', () => {
    const proposal = createProposal({
      id: 4,
      proposerId: 'diana',
      type: 'Transmute',
      ruleNumber: 105,
      ruleText: 'Rule 105 is hereby transmuted.',
      proof: 'This proposal transmutes rule mutability.',
      timestamp: Date.now()
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));
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
      proof: 'This proposal adds a new rule safely.',
      timestamp: Date.now()
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'bob', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'charlie', choice: 'AGAINST' }));
    proposal.addVote(createVote({ voterId: 'diana', choice: 'ABSTAIN' }));

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
      proof: 'This proposal adds another new rule.',
      timestamp: Date.now()
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'bob', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'charlie', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'diana', choice: 'AGAINST' }));

    proposal.resolveForTesting();

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
      proof: 'This proposal repeals an existing mutable rule.',
      timestamp: Date.now()
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'AGAINST' }));
    proposal.addVote(createVote({ voterId: 'bob', choice: 'AGAINST' }));
    proposal.addVote(createVote({ voterId: 'charlie', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'diana', choice: 'ABSTAIN' }));

    proposal.resolveForTesting();

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
      proof: 'This proposal tests tie-breaking logic.',
      timestamp: Date.now()
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'bob', choice: 'FOR' }));
    proposal.addVote(createVote({ voterId: 'charlie', choice: 'AGAINST' }));
    proposal.addVote(createVote({ voterId: 'diana', choice: 'AGAINST' }));

    proposal.resolveForTesting();

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
      proof: 'This proposal tests post-resolution state.',
      timestamp: Date.now()
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));
    proposal.resolveForTesting();

    expect(() => proposal.addVote(createVote({ voterId: 'bob', choice: 'FOR' }))).toThrow();
    expect(() => proposal.changeVote('alice', 'AGAINST')).toThrow();
  });

  it('should provide proposal summary', () => {
    const proposal = createProposal({
      id: 10,
      proposerId: 'jane',
      type: 'Amend',
      ruleNumber: 202,
      ruleText: 'Updated voting options rule',
      proof: 'This proposal amends voting rules.',
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
      proof: 'This is a valid proof section.',
      timestamp: Date.now()
    })).toThrow();

    expect(() => createProposal({
      id: 1,
      proposerId: '',
      type: 'Add',
      ruleNumber: 301,
      ruleText: 'Valid text',
      proof: 'This is a valid proof section.',
      timestamp: Date.now()
    })).toThrow();

    expect(() => createProposal({
      id: 1,
      proposerId: 'alice',
      type: 'Add',
      ruleNumber: 0,
      ruleText: 'Valid text',
      proof: 'This is a valid proof section.',
      timestamp: Date.now()
    })).toThrow();

    expect(() => createProposal({
      id: 1,
      proposerId: 'alice',
      type: 'Add',
      ruleNumber: 301,
      ruleText: '',
      proof: 'This is a valid proof section.',
      timestamp: Date.now()
    })).toThrow();
  });

  it('should serialize to JSON correctly', () => {
    const proposal = createProposal({
      id: 11,
      proposerId: 'json-test',
      type: 'Add',
      ruleNumber: 306,
      ruleText: 'Test proposal',
      proof: 'This is a test proof section.',
      timestamp: 1234567890
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));

    const json = JSON.parse(JSON.stringify(proposal));
    expect(json.id).toBe(11);
    expect(json.proposerId).toBe('json-test');
    expect(json.type).toBe('Add');
    expect(json.ruleNumber).toBe(306);
    expect(json.ruleText).toBe('Test proposal');
    expect(json.status).toBe('pending');
    expect(json.timestamp).toBe(1234567890);
    expect(json.votes).toHaveLength(1);
  });

  it('should serialize to JSON correctly with proof', () => {
    const proposal = createProposal({
      id: 12,
      proposerId: 'json-test',
      type: 'Add',
      ruleNumber: 307,
      ruleText: 'JSON test proposal',
      proof: 'This proposal tests JSON serialization.',
      timestamp: 1234567890
    });

    proposal.addVote(createVote({ voterId: 'alice', choice: 'FOR' }));

    const json = JSON.parse(JSON.stringify(proposal));
    expect(json.id).toBe(12);
    expect(json.proposerId).toBe('json-test');
    expect(json.type).toBe('Add');
    expect(json.ruleNumber).toBe(307);
    expect(json.ruleText).toBe('JSON test proposal');
    expect(json.status).toBe('pending');
    expect(json.timestamp).toBe(1234567890);
    expect(json.votes).toHaveLength(1);
  });
}); 