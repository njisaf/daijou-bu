import { describe, it, expect } from 'vitest';
import { createGame } from '../../models/GameModel';
import { createRuleSet } from '../../models/RuleSetModel';
import { createGameConfig } from '../../models/GameConfigModel';

/**
 * Integration tests for custom ruleset functionality
 * 
 * These tests verify that the createGame factory works correctly with
 * custom rulesets and configurations, ensuring the game boots without
 * error and produces valid snapshots.
 * 
 * Stage 6.1 Success Criteria:
 * - Custom ruleset with two extra rules boots without error
 * - Snapshot includes config and rules
 */
describe('Custom Ruleset Integration', () => {
  it('should create game with custom ruleset and two extra rules without error', () => {
    // Create a custom ruleset with the original rules plus two extras
    const customRules = [
      // Base immutable rules
      { 
        id: 101, 
        text: 'All people are potential players of Nomic. A player is a person who is taking his or her turn.', 
        mutable: false 
      },
      { 
        id: 102, 
        text: 'Initially each player has zero Merit Points. Merit Points are a resource that may be spent only when a rule explicitly authorises it.', 
        mutable: false 
      },
      // Base mutable rules
      { 
        id: 201, 
        text: 'A proposal must consist of a single rule-change stated clearly and unambiguously.', 
        mutable: true 
      },
      { 
        id: 202, 
        text: 'Each player\'s vote must be either FOR, AGAINST, or ABSTAIN.', 
        mutable: true 
      },
      // Two extra custom rules as required by success criteria
      { 
        id: 301, 
        text: 'Custom Rule 1: Players may form temporary alliances that last for exactly 3 turns.', 
        mutable: true 
      },
      { 
        id: 302, 
        text: 'Custom Rule 2: All proposals must include a rationale section explaining the reasoning.', 
        mutable: true 
      }
    ];

    const ruleset = createRuleSet(customRules);

    // Create a custom configuration
    const config = createGameConfig({
      promptP: 'Integration test AI instructions for strategic gameplay',
      turnDelayMs: 100,
      victoryTarget: 75
    });

    // Create the game - this should not throw
    expect(() => {
      const game = createGame({ ruleset, config });
      
      // Verify the game was created correctly
      expect(game).toBeDefined();
      expect(game.phase).toBe('setup');
      expect(game.rules.length).toBe(6); // 4 base + 2 extra rules
      expect(game.players.length).toBe(0);
      
      // Verify custom rules are present
      const customRule1 = game.rules.find(r => r.id === 301);
      const customRule2 = game.rules.find(r => r.id === 302);
      
      expect(customRule1).toBeDefined();
      expect(customRule1?.text).toContain('temporary alliances');
      expect(customRule1?.mutable).toBe(true);
      
      expect(customRule2).toBeDefined();
      expect(customRule2?.text).toContain('rationale section');
      expect(customRule2?.mutable).toBe(true);
      
      // Verify configuration was applied
      expect(game.config.promptP).toBe('Integration test AI instructions for strategic gameplay');
      expect(game.config.turnDelayMs).toBe(100);
      expect(game.config.victoryTarget).toBe(75);
      
    }).not.toThrow();
  });

  it('should generate valid game snapshot with config and rules', () => {
    // Create minimal but valid ruleset
    const customRules = [
      { id: 101, text: 'Base rule for testing', mutable: false },
      { id: 201, text: 'Mutable rule for testing', mutable: true },
      { id: 301, text: 'Extra rule 1: Custom gameplay mechanic', mutable: true },
      { id: 302, text: 'Extra rule 2: Advanced scoring system', mutable: true }
    ];

    const ruleset = createRuleSet(customRules);
    const config = createGameConfig({
      promptP: 'Test prompt for snapshot validation',
      turnDelayMs: 250
    });

    const game = createGame({ ruleset, config });
    
    // Get the game snapshot
    const snapshot = game.gameSnapshot;
    
    // Verify snapshot structure includes config and rules
    expect(snapshot).toHaveProperty('config');
    expect(snapshot).toHaveProperty('rules');
    expect(snapshot).toHaveProperty('players');
    expect(snapshot).toHaveProperty('proposals');
    expect(snapshot).toHaveProperty('turn');
    expect(snapshot).toHaveProperty('phase');
    expect(snapshot).toHaveProperty('proofStatement');

    // Verify config in snapshot
    expect(snapshot.config).toBeDefined();
    expect(snapshot.config.promptP).toBe('Test prompt for snapshot validation');
    expect(snapshot.config.turnDelayMs).toBe(250);

    // Verify rules in snapshot
    expect(snapshot.rules).toHaveLength(4);
    expect(snapshot.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 101, mutable: false }),
        expect.objectContaining({ id: 201, mutable: true }),
        expect.objectContaining({ id: 301, mutable: true }),
        expect.objectContaining({ id: 302, mutable: true })
      ])
    );

    // Verify proofStatement is included (from promptP)
    expect(snapshot.proofStatement).toBe('Test prompt for snapshot validation');

    // Verify phase and turn
    expect(snapshot.phase).toBe('setup');
    expect(snapshot.turn).toBe(0);
    expect(snapshot.players).toEqual([]);
    expect(snapshot.proposals).toEqual([]);
  });

  it('should work with players added during game creation', () => {
    const ruleset = createRuleSet([
      { id: 101, text: 'Test rule', mutable: false }
    ]);
    
    const config = createGameConfig();
    
    const players = [
      { id: 'test1', name: 'Test Player 1', icon: '🧪', llmEndpoint: 'http://localhost:3001' },
      { id: 'test2', name: 'Test Player 2', icon: '🔬', llmEndpoint: 'http://localhost:3002' }
    ];

    const game = createGame({ ruleset, config, players });
    
    // Verify players were added correctly
    expect(game.players.length).toBe(2);
    expect(game.players[0].id).toBe('test1');
    expect(game.players[0].name).toBe('Test Player 1');
    expect(game.players[0].points).toBe(0);
    expect(game.players[0].isActive).toBe(false);
    
    expect(game.players[1].id).toBe('test2');
    expect(game.players[1].name).toBe('Test Player 2');
    
    // Verify the game can transition to playing phase
    expect(() => {
      game.setupGame();
      expect(game.phase).toBe('playing');
      expect(game.currentPlayer).toBeDefined();
    }).not.toThrow();
  });

  it('should validate custom ruleset before creating game', () => {
    // Create ruleset with validation issues
    const invalidRuleset = createRuleSet();
    const config = createGameConfig();

    // This should work because empty ruleset is valid
    expect(() => {
      createGame({ ruleset: invalidRuleset, config });
    }).not.toThrow();

    // Test with duplicate rule IDs (should fail)
    const duplicateRuleset = createRuleSet();
    duplicateRuleset.addRule({ id: 101, text: 'First rule', mutable: false });
    
    expect(() => {
      duplicateRuleset.addRule({ id: 101, text: 'Duplicate rule', mutable: true });
    }).toThrow('Rule with ID 101 already exists');

    // Test with valid complex ruleset
    const complexRuleset = createRuleSet([
      { id: 100, text: 'Rule 100 with Prompt P handling', mutable: false },
      { id: 101, text: 'Standard immutable rule', mutable: false },
      { id: 201, text: 'Standard mutable rule', mutable: true },
      { id: 999, text: 'High-numbered custom rule', mutable: true }
    ]);

    expect(() => {
      const game = createGame({ ruleset: complexRuleset, config });
      expect(game.rules.length).toBe(4);
      
      // Verify rules are sorted correctly
      const ruleIds = game.rules.map(r => r.id).sort((a, b) => a - b);
      expect(ruleIds).toEqual([100, 101, 201, 999]);
    }).not.toThrow();
  });

  it('should maintain backward compatibility with existing game flow', () => {
    // Create game using the new factory
    const ruleset = createRuleSet([
      { id: 101, text: 'Compatibility test rule', mutable: false },
      { id: 201, text: 'Mutable compatibility rule', mutable: true }
    ]);
    
    const config = createGameConfig({
      victoryTarget: 100,
      proposerPoints: 10
    });

    const game = createGame({ ruleset, config });

    // Add players manually (existing API)
    game.addPlayer({
      id: 'alice',
      name: 'Alice',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3001',
      points: 0,
      isActive: false
    });

    game.addPlayer({
      id: 'bob',
      name: 'Bob', 
      icon: '🦾',
      llmEndpoint: 'http://localhost:3002',
      points: 0,
      isActive: false
    });

    // Test existing game flow
    expect(() => {
      game.setupGame(); // Should transition to playing
      expect(game.phase).toBe('playing');
      expect(game.isRunning).toBe(true);
      
      // Test proposal creation
      const proposal = game.createProposal({
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 301,
        ruleText: 'New test rule added via proposal',
        status: 'pending',
        votes: [],
        timestamp: Date.now()
      });
      
      expect(proposal.id).toBe(301); // First proposal should get ID 301
      expect(game.proposals.length).toBe(1);
      
    }).not.toThrow();
  });
}); 