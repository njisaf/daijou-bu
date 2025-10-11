/**
 * Tests for cloneDefaultRuleset utility
 * 
 * @author AI Assistant  
 * @since Stage 6.1 - Model & Store Refactor
 */

import { describe, it, expect } from 'vitest';
import { cloneDefaultRuleset } from './cloneDefaultRuleset';

describe('cloneDefaultRuleset', () => {
  describe('basic functionality', () => {
    it('should return a new RuleSetModel instance', () => {
      const ruleset = cloneDefaultRuleset();
      
      expect(ruleset).toBeDefined();
      expect(typeof ruleset.addRule).toBe('function');
      expect(typeof ruleset.findRuleById).toBe('function');
      expect(Array.isArray(ruleset.rules)).toBe(true);
    });

    it('should load the default rules (36 rules including Rule 100)', () => {
      const ruleset = cloneDefaultRuleset();
      
      expect(ruleset.rules.length).toBe(36);
      
      // Should have Rule 100 (Prompt P)
      const rule100 = ruleset.findRuleById(100);
      expect(rule100).toBeDefined();
      expect(rule100?.mutable).toBe(false);
    });

    it('should include standard immutable rules', () => {
      const ruleset = cloneDefaultRuleset();
      
      // Check for key immutable rules
      expect(ruleset.findRuleById(101)).toBeDefined(); // Players rule
      expect(ruleset.findRuleById(103)).toBeDefined(); // Play proceeds rule
      expect(ruleset.findRuleById(109)).toBeDefined(); // Immutable/Mutable precedence
      expect(ruleset.findRuleById(113)).toBeDefined(); // Lower number precedence
    });

    it('should include standard mutable rules', () => {
      const ruleset = cloneDefaultRuleset();
      
      // Check for key mutable rules
      expect(ruleset.findRuleById(201)).toBeDefined(); // Proposal format
      expect(ruleset.findRuleById(202)).toBeDefined(); // Vote choices
      expect(ruleset.findRuleById(207)).toBeDefined(); // Freeze proposal
    });
  });

  describe('Prompt P injection', () => {
    it('should inject default Rule 100 when no promptP provided', () => {
      const ruleset = cloneDefaultRuleset();
      
      const rule100 = ruleset.findRuleById(100);
      expect(rule100?.text).toContain('This is the fundamental proof statement P');
    });

    it('should inject custom Prompt P into Rule 100', () => {
      const customPrompt = 'Custom AI behavioral guidance for testing';
      const ruleset = cloneDefaultRuleset(customPrompt);
      
      const rule100 = ruleset.findRuleById(100);
      expect(rule100?.text).toBe(customPrompt);
      expect(rule100?.mutable).toBe(false);
    });

    it('should handle empty string promptP', () => {
      const ruleset = cloneDefaultRuleset('');
      
      const rule100 = ruleset.findRuleById(100);
      // Empty string is falsy, so loadInitialRules uses default text
      expect(rule100?.text).toContain('This is the fundamental proof statement P');
    });

    it('should handle multiline promptP', () => {
      const multilinePrompt = 'Line 1\nLine 2\nLine 3';
      const ruleset = cloneDefaultRuleset(multilinePrompt);
      
      const rule100 = ruleset.findRuleById(100);
      expect(rule100?.text).toBe(multilinePrompt);
    });
  });

  describe('independence and cloning', () => {
    it('should return independent instances', () => {
      const ruleset1 = cloneDefaultRuleset('Prompt 1');
      const ruleset2 = cloneDefaultRuleset('Prompt 2');
      
      // Different instances
      expect(ruleset1).not.toBe(ruleset2);
      
      // Different Rule 100 content
      expect(ruleset1.findRuleById(100)?.text).toBe('Prompt 1');
      expect(ruleset2.findRuleById(100)?.text).toBe('Prompt 2');
    });

    it('should allow independent modifications', () => {
      const ruleset1 = cloneDefaultRuleset();
      const ruleset2 = cloneDefaultRuleset();
      
      // Add rule to first instance
      ruleset1.addRule({ id: 999, text: 'Test rule 1', mutable: true });
      
      // Second instance should not be affected
      expect(ruleset1.rules.length).toBe(37);
      expect(ruleset2.rules.length).toBe(36);
      expect(ruleset1.findRuleById(999)).toBeDefined();
      expect(ruleset2.findRuleById(999)).toBeUndefined();
    });

    it('should preserve original rules when modified', () => {
      const original = cloneDefaultRuleset();
      const modified = cloneDefaultRuleset();
      
      // Modify a rule in the cloned instance
      modified.transmuteRule(101); // Make immutable rule mutable
      modified.updateRule(101, 'Modified rule text');
      
      // Original should be unchanged
      expect(original.findRuleById(101)?.mutable).toBe(false);
      expect(modified.findRuleById(101)?.mutable).toBe(true);
      expect(original.findRuleById(101)?.text).not.toBe('Modified rule text');
      expect(modified.findRuleById(101)?.text).toBe('Modified rule text');
    });
  });

  describe('rule series distribution', () => {
    it('should have proper rule series distribution', () => {
      const ruleset = cloneDefaultRuleset();
      
      const immutableRules = ruleset.immutableRules;
      const mutableRules = ruleset.mutableRules;
      
      // Should have both series
      expect(immutableRules.length).toBeGreaterThan(0);
      expect(mutableRules.length).toBeGreaterThan(0);
      
      // Total should equal all rules
      expect(immutableRules.length + mutableRules.length).toBe(36);
    });

    it('should have Rule 100 as highest precedence immutable rule', () => {
      const ruleset = cloneDefaultRuleset('Test prompt');
      
      const rule100 = ruleset.findRuleById(100);
      expect(rule100?.mutable).toBe(false);
      
      // Should be the lowest-numbered rule (highest precedence)
      const sortedRules = ruleset.sortedRules;
      expect(sortedRules[0].id).toBe(100);
    });
  });

  describe('validation and consistency', () => {
    it('should return a valid ruleset', () => {
      const ruleset = cloneDefaultRuleset();
      
      const errors = ruleset.validate();
      expect(errors).toEqual([]);
    });

    it('should not throw when validation called', () => {
      const ruleset = cloneDefaultRuleset();
      
      expect(() => {
        ruleset.validateAndThrow();
      }).not.toThrow();
    });

    it('should have unique rule IDs', () => {
      const ruleset = cloneDefaultRuleset();
      
      const ruleIds = ruleset.rules.map(rule => rule.id);
      const uniqueIds = new Set(ruleIds);
      
      expect(uniqueIds.size).toBe(ruleIds.length);
    });
  });

  describe('integration with RuleSetModel features', () => {
    it('should support next rule ID calculation', () => {
      const ruleset = cloneDefaultRuleset();
      
      // Should be able to find next available IDs
      const next100Series = ruleset.getNextRuleIdInSeries(100);
      const next200Series = ruleset.getNextRuleIdInSeries(200);
      const next300Series = ruleset.getNextRuleIdInSeries(300);
      
      expect(typeof next100Series).toBe('number');
      expect(typeof next200Series).toBe('number');  
      expect(typeof next300Series).toBe('number');
      
      // 300-series has rules 301, 302, 303 so next should be 304
      expect(next300Series).toBe(304);
    });

    it('should support rule export format', () => {
      const ruleset = cloneDefaultRuleset();
      
      const snapshots = ruleset.asRuleSnapshots;
      
      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBe(36);
      expect(snapshots[0]).toHaveProperty('id');
      expect(snapshots[0]).toHaveProperty('text');
      expect(snapshots[0]).toHaveProperty('mutable');
    });
  });
}); 