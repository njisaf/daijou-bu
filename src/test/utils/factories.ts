/**
 * Test Factories for Stage 6.6 Test Suite Modernization
 * 
 * Provides comprehensive factories for creating valid test fixtures that
 * comply with current schema requirements including mandatory proof fields.
 * 
 * @module TestFactories
 */

import React from 'react';
import { types } from 'mobx-state-tree';
import { RuleModel } from '../../models/RuleModel';
import { PlayerModel } from '../../models/PlayerModel';
import { VoteModel } from '../../models/VoteModel';
import { ProposalModel } from '../../models/ProposalModel';
import { getGameConfig } from '../../config';

/**
 * Creates a valid rule with sensible defaults
 */
export function createRule(overrides: Partial<{
  id: number;
  text: string;
  mutable: boolean;
}> = {}): any {
  return {
    id: 201,
    text: "A test rule for validating game mechanics.",
    mutable: true,
    ...overrides
  };
}

/**
 * Creates a valid player with all required fields including llmEndpoint
 */
export function createPlayer(overrides: Partial<{
  id: string;
  name: string;
  icon: string;
  llmEndpoint: string;
  points: number;
  proposalsPassed: number;
  accurateVotes: number;
  inaccurateVotes: number;
}> = {}): any {
  return {
    id: 'player1',
    name: 'Test Player',
    icon: '🤖',
    llmEndpoint: 'http://localhost:3001/test',
    points: 0,
    proposalsPassed: 0,
    accurateVotes: 0,
    inaccurateVotes: 0,
    ...overrides
  };
}

/**
 * Creates a valid vote
 */
export function createVote(overrides: Partial<{
  voterId: string;
  choice: 'FOR' | 'AGAINST' | 'ABSTAIN';
}> = {}): any {
  return {
    voterId: 'player1',
    choice: 'FOR' as const,
    ...overrides
  };
}

/**
 * Creates a mock proposal with minimal data
 */
export function createMockProposal(overrides: Partial<{
  id: number;
  proposerId: string;
  type: 'Add' | 'Amend' | 'Repeal' | 'Transmute';
  ruleNumber: number;
  ruleText: string;
  proof: string;
  judgeVerdict: 'pending' | 'sound' | 'unsound';
  judgeJustification: string;
  status: 'pending' | 'passed' | 'failed' | 'void';
  votes: any[];
  timestamp: number;
}> = {}): any {
  return {
    id: Math.floor(Math.random() * 1000) + 1,
    proposerId: 'testPlayer',
    type: 'Add' as const,
    ruleNumber: 301,
    ruleText: 'Test rule for automated testing purposes.',
    proof: 'This proposal maintains consistency by adding a new rule that does not conflict with existing rules and supports the Prompt P objectives.',
    judgeVerdict: 'sound' as const, // Default to sound for easier testing
    judgeJustification: 'Proof section demonstrates clear reasoning and maintains ruleset consistency.',
    status: 'pending' as const,
    votes: [],
    timestamp: Date.now(),
    ...overrides
  };
}

/**
 * Creates a valid proposal with mandatory proof field
 */
export function createProposal(overrides: Partial<{
  id: string | number;
  proposerId: string;
  ruleChange: any;
  status: 'pending' | 'passed' | 'failed';
  votes: any[];
  timestamp: number;
  proof: string;
  judgeVerdict: 'pending' | 'sound' | 'unsound';
}> = {}): any {
  return {
    id: 'prop1',
    proposerId: 'player1',
    ruleChange: {
      type: 'add',
      ruleId: 301,
      text: 'A new test rule for validation.',
      mutable: true
    },
    status: 'pending' as const,
    votes: [],
    timestamp: Date.now(),
    proof: 'This proposal maintains consistency by adding a new mutable rule that does not conflict with existing rules.',
    judgeVerdict: 'sound' as const, // Default to sound for easier testing
    ...overrides
  };
}

/**
 * Creates a valid game model with all required fields
 */
export function createGameModel(overrides: Partial<{
  rules: any[];
  players: any[];
  proposals: any[];
  turn: number;
  phase: string;
  config: any;
}> = {}): any {
  const config = getGameConfig();
  
  return {
    rules: [
      createRule({ id: 101, text: "All people are potential players of Nomic.", mutable: false }),
      createRule({ id: 201, text: "A proposal must consist of a single rule-change.", mutable: true })
    ],
    players: [
      createPlayer({ id: 'alice', name: 'Alice' }),
      createPlayer({ id: 'bob', name: 'Bob' })
    ],
    proposals: [],
    turn: 0,
    phase: 'proposal',
    config,
    scoreEntries: [],
    ...overrides
  };
}

/**
 * Creates a valid game snapshot for agent testing
 */
export function createGameSnapshot(overrides: Partial<{
  turn: number;
  phase: string;
  players: any[];
  rules: any[];
  proposals: any[];
  proofStatement: string;
}> = {}): any {
  return {
    turn: 0,
    phase: 'proposal',
    players: [createPlayer()],
    rules: [createRule()],
    proposals: [],
    proofStatement: 'Test strategic gameplay instructions for AI agents.',
    ...overrides
  };
}

/**
 * Creates a minimal valid proposal markdown string
 */
export function createProposalMarkdown(overrides: Partial<{
  title: string;
  type: string;
  ruleId: number;
  text: string;
  proof: string;
}> = {}): string {
  const {
    title = 'Test Proposal',
    type = 'Add',
    ruleId = 301,
    text = 'A test rule for validation purposes.',
    proof = 'This proposal maintains game consistency and does not conflict with existing rules.'
  } = overrides;

  return `## ${title}

**Type:** ${type}
**Rule ID:** ${ruleId}
**Text:** ${text}

**Proof:** ${proof}`;
}

/**
 * Creates a test wrapper component for React testing
 */
export function createTestWrapper(children: React.ReactNode): React.ReactElement {
  // This would be imported from testing setup
  // For now, just return the children wrapped in a div
  return React.createElement('div', { 'data-testid': 'test-wrapper' }, children);
}

/**
 * Property-based test data generators for robustness testing
 */
export class PropertyTestGenerators {
  /**
   * Generates random valid rule arrays of different sizes
   */
  static generateRuleArray(minSize = 1, maxSize = 50): any[] {
    const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const rules: any[] = [];
    
    for (let i = 0; i < size; i++) {
      rules.push(createRule({
        id: 100 + i,
        text: `Random rule ${i} for property testing.`,
        mutable: Math.random() > 0.5
      }));
    }
    
    return rules;
  }

  /**
   * Generates random valid player arrays
   */
  static generatePlayerArray(minSize = 1, maxSize = 10): any[] {
    const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const players: any[] = [];
    
    for (let i = 0; i < size; i++) {
      players.push(createPlayer({
        id: `player${i}`,
        name: `Player ${i}`,
        points: Math.floor(Math.random() * 100)
      }));
    }
    
    return players;
  }

  /**
   * Generates random proposal mutations for rule engine testing
   */
  static generateProposalMutation(): any {
    const types = ['add', 'amend', 'repeal', 'transmute'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      type,
      ruleId: Math.floor(Math.random() * 100) + 200,
      text: `Random ${type} rule for mutation testing.`,
      mutable: Math.random() > 0.5,
      proof: `Proof for ${type} mutation: This change maintains game consistency.`
    };
  }
}

/**
 * Performance test utilities
 */
export class PerformanceTestUtils {
  /**
   * Creates large game snapshot for performance testing
   */
  static createLargeGameSnapshot(): any {
    const rules = [];
    for (let i = 101; i < 156; i++) { // Generate 55 rules (> 50)
      rules.push(createRule({
        id: i,
        text: `Performance test rule ${i} with sufficient text content for testing.`,
        mutable: i % 2 === 0 // Mix of mutable/immutable
      }));
    }

    const players = [];
    for (let i = 1; i <= 12; i++) { // Generate 12 players (> 10)
      players.push(createPlayer({
        id: `perf-player-${i}`,
        name: `Performance Player ${i}`,
        icon: '🚀',
        llmEndpoint: `http://localhost:${3000 + i}`,
        points: Math.floor(Math.random() * 100)
      }));
    }

    const proposals = [];
    for (let i = 301; i <= 325; i++) { // Generate 25 proposals (> 20)
      proposals.push(createMockProposal({
        id: i,
        proposerId: `perf-player-${Math.floor(Math.random() * 12) + 1}`,
        ruleNumber: 200 + i,
        ruleText: `Performance test rule ${i} generated for load testing scenarios.`,
        proof: `Automated proof for proposal ${i} demonstrating consistency with existing ruleset.`,
        status: Math.random() > 0.5 ? 'passed' : 'failed'
      }));
    }

    return createGameSnapshot({
      rules,
      players,
      proposals,
      turn: 50,
      phase: 'playing'
    });
  }

  /**
   * Measures memory usage of snapshot operations
   */
  static measureSnapshotMemory<T>(operation: () => T): { result: T; memoryUsed: number } {
    // Note: performance.memory is a Chrome-specific API
    const before = (performance as any).memory?.usedJSHeapSize || 0;
    const result = operation();
    const after = (performance as any).memory?.usedJSHeapSize || 0;
    
    return {
      result,
      memoryUsed: after - before
    };
  }
}

/**
 * Creates a valid Rule object for testing
 * 
 * @param overrides - Properties to override defaults
 * @returns Complete Rule object with valid defaults
 */
export function createMockRule(overrides: any = {}) {
  return {
    id: 201,
    text: 'Test rule text that is non-empty and valid for testing purposes.',
    mutable: true,
    ...overrides
  };
}

/**
 * Creates a valid Player object for testing
 * 
 * @param overrides - Properties to override defaults  
 * @returns Complete Player object with valid defaults
 */
export function createMockPlayer(overrides: any = {}) {
  return {
    id: 'test-player-1',
    name: 'Alice',
    icon: '🤖',
    llmEndpoint: 'http://localhost:3001',
    points: 0,
    proposalsPassed: 0,
    accurateVotes: 0,
    inaccurateVotes: 0,
    isActive: false,
    agentType: 'mock',
    ...overrides
  };
}

/**
 * Creates a valid Vote object for testing
 * 
 * @param overrides - Properties to override defaults
 * @returns Complete Vote object with valid defaults
 */
export function createMockVote(overrides: any = {}) {
  return {
    voterId: 'test-player-1',
    choice: 'FOR' as const,
    ...overrides
  };
}

/**
 * Creates a valid GameConfig object for testing
 * 
 * @param overrides - Properties to override defaults
 * @returns Complete GameConfig object with valid defaults
 */
export function createMockGameConfig(overrides: any = {}) {
  return {
    victoryTarget: 100,
    proposerPoints: 10,
    forVoterPoints: 5,
    againstVoterPenalty: -5,
    turnDelayMs: 200,
    warmupTurns: 5,
    snapshotMode: 'full' as const,
    debugSnapshots: false,
    enableSnapshotLogging: true,
    agentType: 'mock' as const,
    promptP: '',
    ...overrides
  };
}

/**
 * Creates a valid GameSnapshot object for testing
 * 
 * @param overrides - Properties to override defaults
 * @returns Complete GameSnapshot object with valid defaults
 */
export function createMockGameSnapshot(overrides: any = {}) {
  const defaultSnapshot = {
    players: [createMockPlayer()],
    rules: [createMockRule()],
    proposals: [],
    turn: 0,
    phase: 'setup' as const,
    config: createMockGameConfig(),
    history: [],
    scoreEntries: [],
    judge: {
      currentProposalId: null,
      verdictHistory: []
    },
    proofStatement: '' // Mandatory field for Stage 6.5+
  };

  return {
    ...defaultSnapshot,
    ...overrides
  };
}

/**
 * Creates an array of valid Rules for testing
 * 
 * @param count - Number of rules to create
 * @param overrides - Properties to override for all rules
 * @returns Array of valid Rule objects
 */
export function createMockRules(count: number = 3, overrides: any = {}) {
  return Array.from({ length: count }, (_, i) => createMockRule({
    id: 201 + i,
    text: `Test rule ${i + 1} with valid content for testing purposes.`,
    ...overrides
  }));
}

/**
 * Creates an array of valid Players for testing
 * 
 * @param count - Number of players to create
 * @param overrides - Properties to override for all players
 * @returns Array of valid Player objects
 */
export function createMockPlayers(count: number = 3, overrides: any = {}) {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
  const icons = ['🤖', '🦾', '🔮', '⚡', '🌟', '🎯'];
  
  return Array.from({ length: count }, (_, i) => createMockPlayer({
    id: `test-player-${i + 1}`,
    name: names[i] || `Player${i + 1}`,
    icon: icons[i] || '🤖',
    llmEndpoint: `http://localhost:${3001 + i}`,
    ...overrides
  }));
}

/**
 * Creates an array of valid Votes for testing
 * 
 * @param playerIds - Array of player IDs to create votes for
 * @param choice - Vote choice for all votes (optional)
 * @returns Array of valid Vote objects
 */
export function createMockVotes(playerIds: string[], choice?: 'FOR' | 'AGAINST' | 'ABSTAIN') {
  const choices: ('FOR' | 'AGAINST' | 'ABSTAIN')[] = ['FOR', 'AGAINST', 'ABSTAIN'];
  
  return playerIds.map((playerId, i) => createMockVote({
    voterId: playerId,
    choice: choice || choices[i % choices.length]
  }));
}

/**
 * Creates a valid proposal markdown string for testing
 * 
 * @param type - Type of rule change
 * @param number - Rule number
 * @param text - Rule text
 * @param proof - Proof section content
 * @returns Valid proposal markdown string
 */
export function createMockProposalMarkdown(
  type: 'ADD' | 'AMEND' | 'REPEAL' | 'TRANSMUTE' = 'ADD',
  number: number = 301,
  text: string = 'Test rule for mock proposal with valid content.',
  proof: string = 'This proposal maintains ruleset consistency and improves Prompt P alignment by providing clearer test guidance.'
): string {
  return `# Proposal

Type: ${type}
Number: ${number}
Text: ${text}
Proof: ${proof}`;
}

/**
 * Creates a complete GameSnapshot with populated data for integration tests
 * 
 * @param playerCount - Number of players to include
 * @param ruleCount - Number of rules to include
 * @param proposalCount - Number of proposals to include
 * @returns Complete GameSnapshot with realistic test data
 */
export function createIntegrationGameSnapshot(
  playerCount: number = 3,
  ruleCount: number = 5,
  proposalCount: number = 2
) {
  const players = createMockPlayers(playerCount);
  const rules = createMockRules(ruleCount);
  const proposals = Array.from({ length: proposalCount }, (_, i) => createMockProposal({
    id: i + 1,
    proposerId: players[i % players.length].id,
    type: 'Add',
    ruleNumber: 301 + i,
    ruleText: `Integration test rule ${i + 1} with comprehensive content.`,
    proof: `Proof ${i + 1}: This proposal maintains system consistency and enhances AI guidance capabilities.`,
    votes: createMockVotes(players.map(p => p.id)),
    status: i === 0 ? 'passed' : 'pending'
  }));

  return createMockGameSnapshot({
    players,
    rules,
    proposals,
    turn: proposalCount,
    phase: 'playing',
    config: createMockGameConfig({
      promptP: 'Integration test AI guidance for comprehensive testing scenarios.'
    })
  });
}

/**
 * Factory for creating test DOM elements in React tests
 * 
 * @returns DOM element suitable for React testing
 */
export function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

/**
 * Cleanup function for test DOM elements
 * 
 * @param container - Container element to cleanup
 */
export function cleanupTestContainer(container: HTMLElement): void {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

/**
 * Creates a mock MST snapshot for testing time-travel functionality
 * 
 * @param overrides - Properties to override defaults
 * @returns Mock MST snapshot object
 */
export function createMockMSTSnapshot(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    players: [
      {
        id: 'test-player-1',
        name: 'Alice',
        icon: '🤖',
        llmEndpoint: 'http://localhost:3001',
        points: 10,
        proposalsPassed: 1,
        accurateVotes: 2,
        inaccurateVotes: 0,
        isActive: false,
        agentType: 'mock'
      }
    ],
    rules: [
      {
        id: 201,
        text: 'Test rule with valid content.',
        mutable: true
      }
    ],
    proposals: [],
    turn: 1,
    phase: 'playing',
    config: createMockGameConfig(),
    history: [],
    scoreEntries: ['Turn 1 — Alice ⭐10pts (1 passed) | — 1 proposals passed, 0 failed'],
    judge: {
      currentProposalId: null,
      verdictHistory: []
    },
    ...overrides
  };
}

/**
 * Helper function to auto-resolve judge verdicts for testing
 * Call this on proposals before attempting to resolve them
 */
export function autoResolveJudgeVerdict(proposal: any): void {
  if (proposal.judgeVerdict === 'pending') {
    if (proposal.setJudgeVerdict) {
      proposal.setJudgeVerdict('sound', 'Automated test verdict: Proof section is sound for testing purposes.');
    }
  }
}

/**
 * Helper function to resolve proposals safely in tests
 * Uses resolveForTesting if available, otherwise auto-resolves judge verdict first
 */
export function resolveProposalForTesting(proposal: any): void {
  if (proposal.resolveForTesting) {
    // Use test-only resolution method that bypasses judge verdict
    proposal.resolveForTesting();
  } else {
    // Fallback: auto-resolve judge verdict then use normal resolve
    autoResolveJudgeVerdict(proposal);
    proposal.resolve();
  }
}

/**
 * Creates a resolved proposal (with judge verdict) ready for testing
 */
export function createResolvedProposal(overrides: Partial<{
  id: number;
  proposerId: string;
  type: 'Add' | 'Amend' | 'Repeal' | 'Transmute';
  ruleNumber: number;
  ruleText: string;
  proof: string;
  judgeVerdict: 'sound' | 'unsound';
  status: 'passed' | 'failed' | 'void';
  votes: any[];
}> = {}): any {
  const proposal = createMockProposal({
    judgeVerdict: 'sound',
    judgeJustification: 'Test judge verdict for automated testing.',
    ...overrides
  });
  
  // Auto-resolve if needed
  autoResolveJudgeVerdict(proposal);
  
  return proposal;
} 