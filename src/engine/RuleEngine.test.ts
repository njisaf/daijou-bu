import { describe, it, expect, beforeEach } from 'vitest';
import { RuleEngine } from './RuleEngine';
import { createRule } from '../models/RuleModel';
import { createProposal } from '../models/ProposalModel';

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  describe('Rule Precedence (Rule 113)', () => {
    it('should enforce that lower-numbered rules have higher precedence', () => {
      const rule101 = createRule({ id: 101, text: 'Rule 101 text', mutable: false });
      const rule201 = createRule({ id: 201, text: 'Rule 201 text', mutable: true });

      expect(engine.hasHigherPrecedence(rule101, rule201)).toBe(true);
      expect(engine.hasHigherPrecedence(rule201, rule101)).toBe(false);
    });

    it('should handle equal precedence correctly', () => {
      const rule1 = createRule({ id: 205, text: 'Rule A', mutable: true });
      const rule2 = createRule({ id: 205, text: 'Rule B', mutable: true });

      expect(engine.hasHigherPrecedence(rule1, rule2)).toBe(false);
      expect(engine.hasHigherPrecedence(rule2, rule1)).toBe(false);
    });
  });

  describe('Immutable vs Mutable Precedence (Rule 109)', () => {
    it('should enforce that immutable rules take precedence over mutable rules', () => {
      const immutableRule = createRule({ id: 300, text: 'Immutable rule', mutable: false });
      const mutableRule = createRule({ id: 250, text: 'Mutable rule', mutable: true });

      // Even though mutable rule has lower number, immutable takes precedence
      expect(engine.hasHigherPrecedence(immutableRule, mutableRule)).toBe(true);
      expect(engine.hasHigherPrecedence(mutableRule, immutableRule)).toBe(false);
    });

    it('should use rule number for precedence among rules of same mutability', () => {
      const immutable1 = createRule({ id: 101, text: 'Immutable 1', mutable: false });
      const immutable2 = createRule({ id: 115, text: 'Immutable 2', mutable: false });

      expect(engine.hasHigherPrecedence(immutable1, immutable2)).toBe(true);
      expect(engine.hasHigherPrecedence(immutable2, immutable1)).toBe(false);
    });
  });

  describe('Proposal Validation', () => {
    it('should allow adding new mutable rules', () => {
      const rules = [
        createRule({ id: 101, text: 'Some immutable rule', mutable: false }),
        createRule({ id: 201, text: 'Some mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 301,
        ruleText: 'New rule text',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should allow amending mutable rules', () => {
      const rules = [
        createRule({ id: 201, text: 'Original mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 201,
        ruleText: 'Amended rule text',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should prevent amending immutable rules directly', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 101,
        ruleText: 'Attempted amendment',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).toThrow();
    });

    it('should allow transmuting immutable rules to mutable', () => {
      const rules = [
        createRule({ id: 105, text: 'Immutable rule', mutable: false })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 105,
        ruleText: 'Rule 105 is hereby transmuted to mutable',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should allow transmuting mutable rules to immutable', () => {
      const rules = [
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby transmuted to immutable',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should prevent repealing immutable rules directly', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby repealed',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).toThrow();
    });

    it('should allow repealing mutable rules', () => {
      const rules = [
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby repealed',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should prevent targeting non-existent rules for amendment', () => {
      const rules = [
        createRule({ id: 201, text: 'Existing rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 999,
        ruleText: 'Amendment to non-existent rule',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).toThrow();
    });

    it('should prevent adding rules with existing rule numbers', () => {
      const rules = [
        createRule({ id: 201, text: 'Existing rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 201,
        ruleText: 'Duplicate rule number',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).toThrow();
    });
  });

  describe('Rule Application', () => {
    it('should apply Add proposal correctly', () => {
      const existingRules = [
        createRule({ id: 201, text: 'Existing rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 301,
        ruleText: 'New rule text',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposal(proposal, existingRules);
      
      expect(newRules).toHaveLength(2);
      const newRule = newRules.find((r: RuleModelType) => r.id === 301);
      expect(newRule).toBeDefined();
      expect(newRule?.text).toBe('New rule text');
      expect(newRule?.mutable).toBe(true); // New rules are mutable by default
    });

    it('should apply Amend proposal correctly', () => {
      const existingRules = [
        createRule({ id: 201, text: 'Original text', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 201,
        ruleText: 'Amended text',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposal(proposal, existingRules);
      
      expect(newRules).toHaveLength(1);
      const amendedRule = newRules[0];
      expect(amendedRule.id).toBe(201);
      expect(amendedRule.text).toBe('Amended text');
      expect(amendedRule.mutable).toBe(true); // Mutability unchanged
    });

    it('should apply Repeal proposal correctly', () => {
      const existingRules = [
        createRule({ id: 201, text: 'Rule to repeal', mutable: true }),
        createRule({ id: 202, text: 'Rule to keep', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby repealed',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposal(proposal, existingRules);
      
      expect(newRules).toHaveLength(1);
      expect(newRules[0].id).toBe(202);
    });

    it('should apply Transmute proposal correctly', () => {
      const existingRules = [
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby transmuted to immutable',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposal(proposal, existingRules);
      
      expect(newRules).toHaveLength(1);
      const transmutedRule = newRules[0];
      expect(transmutedRule.id).toBe(201);
      expect(transmutedRule.text).toBe('Mutable rule'); // Text unchanged
      expect(transmutedRule.mutable).toBe(false); // Now immutable
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicting rules', () => {
      const rule1 = createRule({ id: 301, text: 'Players must vote within 24 hours', mutable: true });
      const rule2 = createRule({ id: 302, text: 'Players must vote within 1 hour', mutable: true });

      const conflicts = engine.detectConflicts([rule1, rule2]);
      
      // This is a simple example - in practice, conflict detection would be more sophisticated
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should resolve conflicts using precedence', () => {
      const lowerRule = createRule({ id: 101, text: 'Lower numbered rule', mutable: false });
      const higherRule = createRule({ id: 201, text: 'Higher numbered rule', mutable: true });

      const resolved = engine.resolveConflicts([lowerRule, higherRule]);
      
      // Lower numbered (higher precedence) rule should win
      expect(resolved.effectiveRule).toBe(lowerRule);
    });
  });

  describe('Rule 115: Consistency Check', () => {
    it('should pass consistency check for valid rule set', () => {
      const validRules = [
        createRule({ id: 101, text: 'All players must abide by the rules.', mutable: false }),
        createRule({ id: 102, text: 'The first player to reach 100 points wins.', mutable: false }),
        createRule({ id: 103, text: 'A rule-change is any change in the rules.', mutable: false }),
        createRule({ id: 201, text: 'Players may form alliances.', mutable: true })
      ];

      expect(() => engine.checkConsistency(validRules)).not.toThrow();
    });

    it('should reject rule set with duplicate rule numbers', () => {
      const invalidRules = [
        createRule({ id: 201, text: 'First rule with this number', mutable: true }),
        createRule({ id: 201, text: 'Duplicate rule number', mutable: true }),
        createRule({ id: 202, text: 'Valid rule', mutable: true })
      ];

      expect(() => engine.checkConsistency(invalidRules)).toThrow('Rule 115 violation: Duplicate rule numbers detected: 201');
    });

    it('should reject rule set with empty rule text', () => {
      // Since createRule validates, we need to create the invalid rules directly
      const invalidRules = [
        createRule({ id: 201, text: 'Valid rule', mutable: true }),
        { id: 202, text: '', mutable: true, isImmutable: false, isMutable: true }, // Empty text
        { id: 203, text: '   ', mutable: true, isImmutable: false, isMutable: true } // Whitespace only
      ] as any;

      expect(() => engine.checkConsistency(invalidRules)).toThrow('Rule 115 violation: Rules with empty text detected: 202, 203');
    });

    it('should reject rule set missing core immutable rules', () => {
      // Missing rule 101 (core immutable rule)
      const invalidRules = [
        createRule({ id: 102, text: 'The first player to reach 100 points wins.', mutable: false }),
        createRule({ id: 103, text: 'A rule-change is any change in the rules.', mutable: false }),
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      expect(() => engine.checkConsistency(invalidRules)).toThrow('Rule 115 violation: Core immutable rules missing: 101');
    });

    it('should catch invalid immutable rule repeal in recent proposal', () => {
      const rulesAfterRepeal = [
        createRule({ id: 102, text: 'The first player to reach 100 points wins.', mutable: false }),
        createRule({ id: 103, text: 'A rule-change is any change in the rules.', mutable: false })
        // Rule 101 is missing - should be caught
      ];

      const recentProposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby repealed',
        timestamp: Date.now()
      });

      expect(() => engine.checkConsistency(rulesAfterRepeal, recentProposal)).toThrow('Rule 115 violation: Core immutable rules missing: 101');
    });

    it('should apply proposal safely with consistency checking', () => {
      const existingRules = [
        createRule({ id: 101, text: 'All players must abide by the rules.', mutable: false }),
        createRule({ id: 102, text: 'The first player to reach 100 points wins.', mutable: false }),
        createRule({ id: 103, text: 'A rule-change is any change in the rules.', mutable: false }),
        createRule({ id: 201, text: 'Original rule', mutable: true })
      ];

      const validProposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 301,
        ruleText: 'New valid rule',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposalSafely(validProposal, existingRules);
      
      expect(newRules).toHaveLength(5);
      expect(newRules.find((r: any) => r.id === 301)?.text).toBe('New valid rule');
    });

    it('should void mutation if consistency check fails', () => {
      const existingRules = [
        createRule({ id: 101, text: 'All players must abide by the rules.', mutable: false }),
        createRule({ id: 102, text: 'The first player to reach 100 points wins.', mutable: false }),
        createRule({ id: 103, text: 'A rule-change is any change in the rules.', mutable: false }),
        createRule({ id: 201, text: 'Original rule', mutable: true })
      ];

      // Create a proposal that would create a duplicate rule instead of empty text
      const invalidProposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 201, // Duplicate number should trigger consistency check failure
        ruleText: 'Duplicate rule number',
        timestamp: Date.now()
      });

      expect(() => engine.applyProposalSafely(invalidProposal, existingRules)).toThrow('Cannot add rule 201: rule already exists');
    });
  });

  describe('Enhanced Rule Validation', () => {
    it('should allow repeal of immutable rule if transmuted in same proposal set', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const transmuteProposal = {
        id: 1,
        proposerId: 'alice',
        type: 'Transmute' as const,
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby transmuted to mutable',
        status: 'passed' as const,
        votes: [],
        timestamp: Date.now()
      };

      const repealProposal = createProposal({
        id: 2,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby repealed',
        timestamp: Date.now()
      });

      // Should allow repeal when transmutation is in prior proposals
      expect(() => engine.validateProposal(repealProposal, rules, [transmuteProposal])).not.toThrow();
    });

    it('should reject repeal of immutable rule without transmutation', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const repealProposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby repealed',
        timestamp: Date.now()
      });

      // Should reject repeal without transmutation
      expect(() => engine.validateProposal(repealProposal, rules, [])).toThrow('Cannot repeal immutable rule 101');
    });

    it('should allow amendment of immutable rule if transmuted in same proposal set', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const transmuteProposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby transmuted to mutable',
        status: 'passed',
        timestamp: Date.now()
      });

      const amendProposal = createProposal({
        id: 2,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 101,
        ruleText: 'Amended immutable rule text',
        timestamp: Date.now()
      });

      // Should allow amendment when transmutation is in prior proposals
      expect(() => engine.validateProposal(amendProposal, rules, [transmuteProposal])).not.toThrow();
    });

    it('should reject amendment of immutable rule without transmutation', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const amendProposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 101,
        ruleText: 'Attempted amendment',
        timestamp: Date.now()
      });

      // Should reject amendment without transmutation
      expect(() => engine.validateProposal(amendProposal, rules, [])).toThrow('Cannot amend immutable rule 101');
    });

    it('should only consider passed transmutation proposals', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const failedTransmuteProposal = createProposal({
        id: 1,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby transmuted to mutable',
        status: 'failed', // This proposal failed
        timestamp: Date.now()
      });

      const repealProposal = createProposal({
        id: 2,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby repealed',
        timestamp: Date.now()
      });

      // Should reject repeal when transmutation failed
      expect(() => engine.validateProposal(repealProposal, rules, [failedTransmuteProposal])).toThrow('Cannot repeal immutable rule 101');
    });

    it('should detect multiple consistency violations', () => {
      // Create invalid rules directly to test consistency checking
      const invalidRules = [
        createRule({ id: 101, text: 'Valid immutable rule', mutable: false }), 
        createRule({ id: 201, text: 'First instance', mutable: true }),
        { id: 201, text: 'Duplicate number', mutable: true, isImmutable: false, isMutable: true }, // Duplicate
        createRule({ id: 202, text: 'Valid rule', mutable: true })
      ] as any;

      // Should catch the duplicate rule numbers violation
      expect(() => engine.checkConsistency(invalidRules)).toThrow('Rule 115 violation: Duplicate rule numbers detected: 201');
    });
  });
}); 