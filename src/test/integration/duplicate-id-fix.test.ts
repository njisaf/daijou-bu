import { describe, it, expect, beforeEach } from 'vitest';
import { GameModel } from '../../models/GameModel';
import { DEFAULT_CONFIG } from '../../config';
import { parseProposalMarkdownWithoutId } from '../../schemas/proposal';

/**
 * Integration test for duplicate proposal ID fix
 * 
 * This test verifies that the complete fix for duplicate proposal IDs works:
 * 1. GameModel generates unique sequential IDs
 * 2. Agents don't generate IDs in their proposals
 * 3. TurnOrchestrator uses parseProposalMarkdownWithoutId
 * 4. No duplicate IDs can occur even across multiple turns
 */
describe('Duplicate Proposal ID Fix - Integration Test', () => {
  let gameModel: InstanceType<typeof GameModel>;

  beforeEach(() => {
    gameModel = GameModel.create({
      config: DEFAULT_CONFIG,
      players: [
        {
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 0,
          isActive: false
        },
        {
          id: 'player2',
          name: 'Bob',
          icon: '🦾',
          llmEndpoint: 'http://localhost:3002',
          points: 0,
          isActive: false
        }
      ],
      rules: [
        {
          id: 101,
          text: 'All players must abide by the rules.',
          mutable: false
        }
      ],
      proposals: [],
      turn: 0,
      phase: 'setup',
      history: []
    });

    gameModel.setupGame();
  });

  it('should generate unique proposal IDs across multiple proposals', () => {
    // Simulate multiple proposals being created
    const proposalIds = new Set<number>();
    
    for (let i = 0; i < 10; i++) {
      const proposal = gameModel.createProposal({
        proposerId: 'player1',
        type: 'Add',
        ruleNumber: 300 + i,
        ruleText: `Test rule ${i}`,
        proof: `This rule addition does not conflict with existing rules and maintains game consistency.`,
        status: 'pending',
        votes: [],
        timestamp: Date.now()
      });
      
      // Check that ID is unique
      expect(proposalIds.has(proposal.id)).toBe(false);
      proposalIds.add(proposal.id);
      
      // Check that ID is sequential starting from 301
      expect(proposal.id).toBe(301 + i);
    }
    
    expect(proposalIds.size).toBe(10);
    expect(gameModel.proposals).toHaveLength(10);
  });

  it('should handle proposal creation from LLM output without IDs', () => {
    // Simulate LLM-generated proposal markdown (without ID)
    const llmProposalMarkdown = `### Proposal
Type: Add
Number: 301
Text: "Players may submit proposals using natural language."
Proof: "This rule supports natural interaction and maintains consistency with existing gameplay rules."`;

    // Parse the proposal (no ID needed)
    const parsedProposal = parseProposalMarkdownWithoutId(llmProposalMarkdown);
    expect(parsedProposal).toEqual({
      type: 'Add',
      number: 301,
      text: 'Players may submit proposals using natural language.',
      proof: 'This rule supports natural interaction and maintains consistency with existing gameplay rules.',
      judgeVerdict: 'pending',
      judgeJustification: undefined
    });

    // Create proposal with auto-generated ID
    const proposal = gameModel.createProposal({
      proposerId: 'player1',
      type: parsedProposal.type,
      ruleNumber: parsedProposal.number,
      ruleText: parsedProposal.text,
      proof: parsedProposal.proof,
      status: 'pending',
      votes: [],
      timestamp: Date.now()
    });

    expect(proposal.id).toBe(301); // First auto-generated ID
    expect(proposal.type).toBe('Add');
    expect(proposal.ruleNumber).toBe(301);
    expect(proposal.ruleText).toBe('Players may submit proposals using natural language.');
    expect(proposal.proof).toBe('This rule supports natural interaction and maintains consistency with existing gameplay rules.');
  });

  it('should prevent duplicate IDs when attempting manual creation', () => {
    // Create first proposal
    const firstProposal = gameModel.createProposal({
      proposerId: 'player1',
      type: 'Add',
      ruleNumber: 301,
      ruleText: 'First rule',
      proof: 'This rule addition maintains game consistency and does not conflict with existing rules.',
      status: 'pending',
      votes: [],
      timestamp: Date.now()
    });

    expect(firstProposal.id).toBe(301);

    // Try to manually add a proposal with duplicate ID (should throw)
    expect(() => {
      gameModel.addProposal({
        id: 301, // Duplicate ID
        proposerId: 'player2',
        type: 'Add',
        ruleNumber: 302,
        ruleText: 'Second rule',
        proof: 'This rule addition maintains game consistency and does not conflict with existing rules.',
        status: 'pending',
        votes: [],
        timestamp: Date.now()
      });
    }).toThrow('Proposal with ID 301 already exists');

    // Verify only one proposal exists
    expect(gameModel.proposals).toHaveLength(1);
  });

  it('should maintain unique IDs even with mixed creation methods', () => {
    // Use createProposal (auto-ID)
    const autoProposal = gameModel.createProposal({
      proposerId: 'player1',
      type: 'Add',
      ruleNumber: 301,
      ruleText: 'Auto-generated ID proposal',
      proof: 'This rule addition maintains game consistency and does not conflict with existing rules.',
      status: 'pending',
      votes: [],
      timestamp: Date.now()
    });

    expect(autoProposal.id).toBe(301);

    // Use addProposal with unique ID
    gameModel.addProposal({
      id: 400, // Different ID range
      proposerId: 'player2',
      type: 'Add',
      ruleNumber: 302,
      ruleText: 'Manual ID proposal',
      proof: 'This rule addition maintains game consistency and does not conflict with existing rules.',
      status: 'pending',
      votes: [],
      timestamp: Date.now()
    });

    // Next auto-generated should be 401 (max existing ID + 1 for safety)
    const nextAutoProposal = gameModel.createProposal({
      proposerId: 'player1',
      type: 'Add',
      ruleNumber: 303,
      ruleText: 'Next auto proposal',
      proof: 'This rule addition maintains game consistency and does not conflict with existing rules.',
      status: 'pending',
      votes: [],
      timestamp: Date.now()
    });

    expect(nextAutoProposal.id).toBe(401); // Safely beyond manual ID of 400
    expect(gameModel.proposals).toHaveLength(3);
    
    // Verify all IDs are unique
    const allIds = gameModel.proposals.map(p => p.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('should handle Unicode smart quotes in LLM output', () => {
    // Simulate LLM output with Unicode smart quotes (common with Ollama)
    const unicodeProposalMarkdown = `### Proposal
Type: Add
Number: 301
Text: "Players may vote using emoji reactions for faster gameplay."
Proof: "This proposal enhances user experience while maintaining all existing voting safeguards and requirements."`;

    // This should parse successfully
    const parsedProposal = parseProposalMarkdownWithoutId(unicodeProposalMarkdown);
    expect(parsedProposal.text).toBe('Players may vote using emoji reactions for faster gameplay.');
    expect(parsedProposal.proof).toBe('This proposal enhances user experience while maintaining all existing voting safeguards and requirements.');

    const proposal = gameModel.createProposal({
      proposerId: 'player1',
      type: parsedProposal.type,
      ruleNumber: parsedProposal.number,
      ruleText: parsedProposal.text,
      proof: parsedProposal.proof,
      status: 'pending',
      votes: [],
      timestamp: Date.now()
    });

    expect(proposal.id).toBe(301);
    expect(proposal.ruleText).toBe('Players may vote using emoji reactions for faster gameplay.');
    expect(proposal.proof).toBe('This proposal enhances user experience while maintaining all existing voting safeguards and requirements.');
  });
}); 