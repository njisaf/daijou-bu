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
        proof: 'This proposal adds a new mutable rule that does not conflict with existing rules.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should allow amending mutable rules', () => {
      const rules = [
        createRule({ id: 201, text: 'Original mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 2,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 201,
        ruleText: 'Amended rule text',
        proof: 'This proposal amends an existing mutable rule without creating conflicts.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should prevent amending immutable rules directly', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const proposal = createProposal({
        id: 3,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 101,
        ruleText: 'Attempted amendment',
        proof: 'This proposal attempts to amend an immutable rule directly.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).toThrow();
    });

    it('should allow transmuting immutable rules to mutable', () => {
      const rules = [
        createRule({ id: 105, text: 'Immutable rule', mutable: false })
      ];

      const proposal = createProposal({
        id: 4,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 105,
        ruleText: 'Rule 105 is hereby transmuted to mutable',
        proof: 'This proposal transmutes an immutable rule to mutable status.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should allow transmuting mutable rules to immutable', () => {
      const rules = [
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 5,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby transmuted to immutable',
        proof: 'This proposal transmutes a mutable rule to immutable status.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should prevent repealing immutable rules directly', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false })
      ];

      const proposal = createProposal({
        id: 6,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby repealed',
        proof: 'This proposal attempts to repeal an immutable rule directly.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).toThrow();
    });

    it('should allow repealing mutable rules', () => {
      const rules = [
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 7,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby repealed',
        proof: 'This proposal repeals a mutable rule which is allowed.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).not.toThrow();
    });

    it('should prevent targeting non-existent rules for amendment', () => {
      const rules = [
        createRule({ id: 201, text: 'Existing rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 8,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 999,
        ruleText: 'Amendment to non-existent rule',
        proof: 'This proposal attempts to amend a non-existent rule.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(proposal, rules)).toThrow();
    });

    it('should prevent adding rules with existing rule numbers', () => {
      const rules = [
        createRule({ id: 201, text: 'Existing rule', mutable: true })
      ];

      const proposal = createProposal({
        id: 9,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 201,
        ruleText: 'Duplicate rule number',
        proof: 'This proposal attempts to add a rule with an existing number.',
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
        id: 10,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 301,
        ruleText: 'New rule text',
        proof: 'This proposal adds a new rule without conflicts.',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposal(proposal, existingRules);
      
      expect(newRules).toHaveLength(2);
      const newRule = newRules.find((r: any) => r.id === 301);
      expect(newRule).toBeDefined();
      expect(newRule?.text).toBe('New rule text');
      expect(newRule?.mutable).toBe(true);
    });

    it('should apply Amend proposal correctly', () => {
      const existingRules = [
        createRule({ id: 201, text: 'Original text', mutable: true })
      ];

      const proposal = createProposal({
        id: 11,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 201,
        ruleText: 'Amended text',
        proof: 'This proposal amends an existing mutable rule.',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposal(proposal, existingRules);
      
      expect(newRules).toHaveLength(1);
      const amendedRule = newRules[0];
      expect(amendedRule.id).toBe(201);
      expect(amendedRule.text).toBe('Amended text');
    });

    it('should apply Repeal proposal correctly', () => {
      const existingRules = [
        createRule({ id: 201, text: 'Rule to be repealed', mutable: true }),
        createRule({ id: 202, text: 'Rule to remain', mutable: true })
      ];

      const proposal = createProposal({
        id: 12,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby repealed',
        proof: 'This proposal repeals an existing mutable rule.',
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
        id: 13,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 201,
        ruleText: 'Rule 201 is hereby transmuted',
        proof: 'This proposal transmutes the rule mutability status.',
        timestamp: Date.now()
      });

      const newRules = engine.applyProposal(proposal, existingRules);
      
      expect(newRules).toHaveLength(1);
      const transmutedRule = newRules[0];
      expect(transmutedRule.id).toBe(201);
      expect(transmutedRule.mutable).toBe(false);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicting rules', () => {
      const rule1 = createRule({ id: 201, text: 'Players must vote FOR all proposals', mutable: true });
      const rule2 = createRule({ id: 202, text: 'Players must vote AGAINST all proposals', mutable: true });

      const conflicts = engine.detectConflicts([rule1, rule2]);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should resolve conflicts using precedence', () => {
      const higherPrecedence = createRule({ id: 101, text: 'Higher precedence rule', mutable: false });
      const lowerPrecedence = createRule({ id: 201, text: 'Lower precedence rule', mutable: true });

      const resolution = engine.resolveConflicts([higherPrecedence, lowerPrecedence]);
      expect(resolution.effectiveRule).toBe(higherPrecedence);
    });
  });

  describe('Rule 115: Consistency Check', () => {
    it('should pass consistency check for valid rule set', () => {
      const rules = [
        createRule({ id: 101, text: 'All players must vote', mutable: false }),
        createRule({ id: 201, text: 'Proposals require majority', mutable: true })
      ];

      expect(() => engine.checkConsistency(rules)).not.toThrow();
    });

    it('should reject rule set with duplicate rule numbers', () => {
      const rules = [
        createRule({ id: 201, text: 'First rule', mutable: true }),
        createRule({ id: 201, text: 'Duplicate rule', mutable: true })
      ];

      expect(() => engine.checkConsistency(rules)).toThrow();
    });

    it('should reject rule set with empty rule text', () => {
      const rules = [
        createRule({ id: 201, text: '', mutable: true })
      ];

      expect(() => engine.checkConsistency(rules)).toThrow();
    });

    it('should reject rule set missing core immutable rules', () => {
      const rules = [
        createRule({ id: 201, text: 'Only mutable rule', mutable: true })
      ];

      expect(() => engine.checkConsistency(rules)).toThrow();
    });

    it('should catch invalid immutable rule repeal in recent proposal', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false }),
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const invalidProposal = createProposal({
        id: 16,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Attempt to repeal immutable rule',
        proof: 'This proposal illegally attempts to repeal an immutable rule.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(invalidProposal, rules)).toThrow();
    });

    it('should apply proposal safely with consistency checking', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false }),
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const safeProposal = createProposal({
        id: 90,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 399,
        ruleText: 'Safe rule addition',
        proof: 'This proposal adds a new rule safely.',
        timestamp: Date.now()
      });

      expect(() => {
        const newRules = engine.applyProposal(safeProposal, rules);
        engine.checkConsistency(newRules);
      }).not.toThrow();
    });

    it('should void mutation if consistency check fails', () => {
      const rules = [
        createRule({ id: 101, text: 'Immutable rule', mutable: false }),
        createRule({ id: 201, text: 'Mutable rule', mutable: true })
      ];

      const conflictingProposal = createProposal({
        id: 91,
        proposerId: 'alice',
        type: 'Add',
        ruleNumber: 101,
        ruleText: 'Conflicting rule with same ID',
        proof: 'This proposal creates a conflict by using an existing rule ID.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(conflictingProposal, rules)).toThrow();
    });
  });

  describe('Enhanced Rule Validation', () => {
    it('should allow repeal of immutable rule if transmuted in same proposal set', () => {
      const rules = [
        createRule({ id: 105, text: 'Immutable rule to be transmuted and repealed', mutable: false })
      ];

      const transmuteProposal = createProposal({
        id: 80,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 105,
        ruleText: 'Rule 105 is transmuted to mutable',
        proof: 'This proposal transmutes rule 105 to mutable status.',
        timestamp: Date.now()
      });

      const repealProposal = createProposal({
        id: 81,
        proposerId: 'bob',
        type: 'Repeal',
        ruleNumber: 105,
        ruleText: 'Rule 105 is hereby repealed',
        proof: 'This proposal repeals rule 105 after it was transmuted to mutable.',
        timestamp: Date.now()
      });

      // Should allow repeal after transmutation
      expect(() => engine.validateProposal(repealProposal, rules, [transmuteProposal])).not.toThrow();
    });

    it('should reject repeal of immutable rule without transmutation', () => {
      const rules = [
        createRule({ id: 105, text: 'Immutable rule', mutable: false })
      ];

      const repealProposal = createProposal({
        id: 82,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 105,
        ruleText: 'Rule 105 is hereby repealed',
        proof: 'This proposal attempts to repeal without transmutation.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(repealProposal, rules, [])).toThrow();
    });

    it('should allow amendment of immutable rule if transmuted in same proposal set', () => {
      const rules = [
        createRule({ id: 105, text: 'Original immutable rule', mutable: false })
      ];

      const transmuteProposal = createProposal({
        id: 83,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 105,
        ruleText: 'Rule 105 is transmuted to mutable',
        proof: 'This proposal transmutes rule 105 to mutable status.',
        timestamp: Date.now()
      });

      const amendProposal = createProposal({
        id: 84,
        proposerId: 'bob',
        type: 'Amend',
        ruleNumber: 105,
        ruleText: 'Amended Rule 101 text',
        proof: 'This proposal amends the rule after transmutation.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(amendProposal, rules, [transmuteProposal])).not.toThrow();
    });

    it('should reject amendment of immutable rule without transmutation', () => {
      const rules = [
        createRule({ id: 105, text: 'Immutable rule', mutable: false })
      ];

      const amendProposal = createProposal({
        id: 85,
        proposerId: 'alice',
        type: 'Amend',
        ruleNumber: 105,
        ruleText: 'Amended Rule 101 text',
        proof: 'This proposal attempts to amend without transmutation.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(amendProposal, rules, [])).toThrow();
    });

    it('should only consider passed transmutation proposals', () => {
      const rules = [
        createRule({ id: 105, text: 'Immutable rule', mutable: false })
      ];

      const failedTransmute = createProposal({
        id: 86,
        proposerId: 'alice',
        type: 'Transmute',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby transmuted to mutable',
        proof: 'This transmutation will fail.',
        timestamp: Date.now()
      });

      const repealAttempt = createProposal({
        id: 87,
        proposerId: 'alice',
        type: 'Repeal',
        ruleNumber: 101,
        ruleText: 'Rule 101 is hereby repealed',
        proof: 'This proposal attempts repeal after failed transmutation.',
        timestamp: Date.now()
      });

      expect(() => engine.validateProposal(repealAttempt, rules, [failedTransmute])).toThrow();
    });

    it('should detect multiple consistency violations', () => {
      const rules = [
        createRule({ id: 201, text: 'First rule', mutable: true }),
        createRule({ id: 201, text: 'Duplicate ID', mutable: true }),
        createRule({ id: 202, text: '', mutable: true })
      ];

      expect(() => engine.checkConsistency(rules)).toThrow();
    });
  });
}); 