import { describe, it, expect, beforeEach } from 'vitest';
import { RuleSetModel, createRuleSet, type IRuleSet } from './RuleSetModel';

describe('RuleSetModel', () => {
  let ruleSet: IRuleSet;

  beforeEach(() => {
    ruleSet = RuleSetModel.create({ rules: [] });
  });

  describe('creation and basic functionality', () => {
    it('should create an empty ruleset', () => {
      expect(ruleSet.rules.length).toBe(0);
      expect(ruleSet.sortedRules.length).toBe(0);
    });

    it('should create ruleset with factory function', () => {
      const rules = [
        { id: 101, text: 'Test rule 1', mutable: false },
        { id: 201, text: 'Test rule 2', mutable: true }
      ];
      
      const newRuleSet = createRuleSet(rules);
      expect(newRuleSet.rules.length).toBe(2);
      expect(newRuleSet.hasRuleId(101)).toBe(true);
      expect(newRuleSet.hasRuleId(201)).toBe(true);
    });
  });

  describe('adding rules', () => {
    it('should add a rule successfully', () => {
      ruleSet.addRule({
        id: 101,
        text: 'All players must follow the rules',
        mutable: false
      });

      expect(ruleSet.rules.length).toBe(1);
      expect(ruleSet.hasRuleId(101)).toBe(true);
      expect(ruleSet.findRuleById(101)?.text).toBe('All players must follow the rules');
    });

    it('should throw error for duplicate rule ID', () => {
      ruleSet.addRule({ id: 101, text: 'First rule', mutable: false });
      
      expect(() => {
        ruleSet.addRule({ id: 101, text: 'Duplicate rule', mutable: true });
      }).toThrow('Rule with ID 101 already exists');
    });

    it('should throw error for empty rule text', () => {
      expect(() => {
        ruleSet.addRule({ id: 101, text: '', mutable: false });
      }).toThrow('Rule text cannot be empty');

      expect(() => {
        ruleSet.addRule({ id: 102, text: '   ', mutable: false });
      }).toThrow('Rule text cannot be empty');
    });

    it('should throw error for invalid rule ID', () => {
      expect(() => {
        ruleSet.addRule({ id: 0, text: 'Invalid ID rule', mutable: false });
      }).toThrow('Rule ID must be positive');

      expect(() => {
        ruleSet.addRule({ id: -1, text: 'Negative ID rule', mutable: false });
      }).toThrow('Rule ID must be positive');
    });

    it('should trim rule text when adding', () => {
      ruleSet.addRule({
        id: 101,
        text: '  Whitespace rule  ',
        mutable: false
      });

      expect(ruleSet.findRuleById(101)?.text).toBe('Whitespace rule');
    });
  });

  describe('updating rules', () => {
    beforeEach(() => {
      ruleSet.addRule({ id: 201, text: 'Mutable rule', mutable: true });
      ruleSet.addRule({ id: 101, text: 'Immutable rule', mutable: false });
    });

    it('should update mutable rule text', () => {
      ruleSet.updateRule(201, 'Updated mutable rule');
      expect(ruleSet.findRuleById(201)?.text).toBe('Updated mutable rule');
    });

    it('should throw error when updating immutable rule', () => {
      expect(() => {
        ruleSet.updateRule(101, 'Try to update immutable');
      }).toThrow('Cannot update immutable rule 101 (must transmute first)');
    });

    it('should throw error when updating non-existent rule', () => {
      expect(() => {
        ruleSet.updateRule(999, 'Non-existent rule');
      }).toThrow('Rule with ID 999 not found');
    });
  });

  describe('removing rules', () => {
    beforeEach(() => {
      ruleSet.addRule({ id: 201, text: 'Mutable rule', mutable: true });
      ruleSet.addRule({ id: 101, text: 'Immutable rule', mutable: false });
    });

    it('should remove mutable rule', () => {
      expect(ruleSet.rules.length).toBe(2);
      ruleSet.removeRule(201);
      expect(ruleSet.rules.length).toBe(1);
      expect(ruleSet.hasRuleId(201)).toBe(false);
    });

    it('should throw error when removing immutable rule', () => {
      expect(() => {
        ruleSet.removeRule(101);
      }).toThrow('Cannot remove immutable rule 101 (must transmute first)');
    });

    it('should throw error when removing non-existent rule', () => {
      expect(() => {
        ruleSet.removeRule(999);
      }).toThrow('Rule with ID 999 not found');
    });
  });

  describe('transmutation', () => {
    beforeEach(() => {
      ruleSet.addRule({ id: 101, text: 'Immutable rule', mutable: false });
      ruleSet.addRule({ id: 201, text: 'Mutable rule', mutable: true });
    });

    it('should transmute immutable rule to mutable', () => {
      const rule = ruleSet.findRuleById(101);
      expect(rule?.mutable).toBe(false);
      
      ruleSet.transmuteRule(101);
      expect(rule?.mutable).toBe(true);
    });

    it('should transmute mutable rule to immutable', () => {
      const rule = ruleSet.findRuleById(201);
      expect(rule?.mutable).toBe(true);
      
      ruleSet.transmuteRule(201);
      expect(rule?.mutable).toBe(false);
    });

    it('should throw error when transmuting non-existent rule', () => {
      expect(() => {
        ruleSet.transmuteRule(999);
      }).toThrow('Rule with ID 999 not found');
    });

    it('should allow updating rule after transmutation', () => {
      // Transmute immutable rule to mutable
      ruleSet.transmuteRule(101);
      
      // Should now be able to update it
      ruleSet.updateRule(101, 'Updated after transmutation');
      expect(ruleSet.findRuleById(101)?.text).toBe('Updated after transmutation');
    });

    it('should allow removing rule after transmutation', () => {
      // Transmute immutable rule to mutable
      ruleSet.transmuteRule(101);
      
      // Should now be able to remove it
      ruleSet.removeRule(101);
      expect(ruleSet.hasRuleId(101)).toBe(false);
    });
  });

  describe('views and queries', () => {
    beforeEach(() => {
      ruleSet.addRule({ id: 103, text: 'Rule C', mutable: false });
      ruleSet.addRule({ id: 101, text: 'Rule A', mutable: false });
      ruleSet.addRule({ id: 203, text: 'Rule D', mutable: true });
      ruleSet.addRule({ id: 201, text: 'Rule B', mutable: true });
    });

    it('should return rules sorted by ID', () => {
      const sorted = ruleSet.sortedRules;
      expect(sorted.map(r => r.id)).toEqual([101, 103, 201, 203]);
    });

    it('should filter immutable rules', () => {
      const immutable = ruleSet.immutableRules;
      expect(immutable.length).toBe(2);
      expect(immutable.map(r => r.id)).toEqual([103, 101]);
    });

    it('should filter mutable rules', () => {
      const mutable = ruleSet.mutableRules;
      expect(mutable.length).toBe(2);
      expect(mutable.map(r => r.id)).toEqual([203, 201]);
    });

    it('should find rule by ID', () => {
      const rule = ruleSet.findRuleById(201);
      expect(rule?.text).toBe('Rule B');
      
      const notFound = ruleSet.findRuleById(999);
      expect(notFound).toBeUndefined();
    });

    it('should check if rule ID exists', () => {
      expect(ruleSet.hasRuleId(101)).toBe(true);
      expect(ruleSet.hasRuleId(999)).toBe(false);
    });
  });

  describe('next rule ID calculation', () => {
    beforeEach(() => {
      ruleSet.addRule({ id: 101, text: 'Rule 101', mutable: false });
      ruleSet.addRule({ id: 103, text: 'Rule 103', mutable: false });
      ruleSet.addRule({ id: 201, text: 'Rule 201', mutable: true });
    });

    it('should find next available ID in series with gaps', () => {
      // 100-series has 101, 103 - should return 102
      expect(ruleSet.getNextRuleIdInSeries(100)).toBe(102);
    });

    it('should return next ID after highest in series', () => {
      // 200-series has 201 - should return 202  
      expect(ruleSet.getNextRuleIdInSeries(200)).toBe(202);
    });

    it('should return series start if no rules in series', () => {
      // 300-series has no rules - should return 300
      expect(ruleSet.getNextRuleIdInSeries(300)).toBe(300);
    });
  });

  describe('validation', () => {
    it('should validate empty ruleset', () => {
      const errors = ruleSet.validate();
      expect(errors).toEqual([]);
    });

    it('should validate valid ruleset', () => {
      ruleSet.addRule({ id: 101, text: 'Valid rule', mutable: false });
      ruleSet.addRule({ id: 201, text: 'Another valid rule', mutable: true });
      
      const errors = ruleSet.validate();
      expect(errors).toEqual([]);
    });

    it('should detect duplicate rule IDs', () => {
      // Bypass normal validation by creating invalid state directly
      const invalidRuleSet = RuleSetModel.create({
        rules: [
          { id: 101, text: 'First rule', mutable: false },
          { id: 101, text: 'Duplicate rule', mutable: true }
        ]
      });
      
      const errors = invalidRuleSet.validate();
      expect(errors).toContain('Duplicate rule ID: 101');
    });

    it('should detect empty rule text', () => {
      // Create an invalid ruleset with empty text directly
      const invalidRuleSet = RuleSetModel.create({
        rules: [
          { id: 101, text: '', mutable: false }
        ]
      });
      
      const errors = invalidRuleSet.validate();
      expect(errors).toContain('Rule 101 has empty text');
    });

    it('should validate and throw on errors', () => {
      const invalidRuleSet = RuleSetModel.create({
        rules: [
          { id: 101, text: 'First rule', mutable: false },
          { id: 101, text: 'Duplicate rule', mutable: true }
        ]
      });
      
      expect(() => {
        invalidRuleSet.validateAndThrow();
      }).toThrow('Ruleset validation failed');
    });
  });

  describe('bulk operations', () => {
    it('should clear all rules', () => {
      ruleSet.addRule({ id: 101, text: 'Rule 1', mutable: false });
      ruleSet.addRule({ id: 201, text: 'Rule 2', mutable: true });
      
      expect(ruleSet.rules.length).toBe(2);
      ruleSet.clear();
      expect(ruleSet.rules.length).toBe(0);
    });

    it('should load rules from snapshots', () => {
      const rules = [
        { id: 101, text: 'Loaded rule 1', mutable: false },
        { id: 201, text: 'Loaded rule 2', mutable: true },
        { id: 301, text: 'Loaded rule 3', mutable: true }
      ];
      
      ruleSet.loadRules(rules);
      
      expect(ruleSet.rules.length).toBe(3);
      expect(ruleSet.hasRuleId(101)).toBe(true);
      expect(ruleSet.hasRuleId(201)).toBe(true);
      expect(ruleSet.hasRuleId(301)).toBe(true);
    });

    it('should replace existing rules when loading', () => {
      ruleSet.addRule({ id: 999, text: 'Original rule', mutable: false });
      expect(ruleSet.rules.length).toBe(1);
      
      const newRules = [
        { id: 101, text: 'New rule 1', mutable: false },
        { id: 201, text: 'New rule 2', mutable: true }
      ];
      
      ruleSet.loadRules(newRules);
      
      expect(ruleSet.rules.length).toBe(2);
      expect(ruleSet.hasRuleId(999)).toBe(false);
      expect(ruleSet.hasRuleId(101)).toBe(true);
      expect(ruleSet.hasRuleId(201)).toBe(true);
    });

    it('should export as rule snapshots', () => {
      ruleSet.addRule({ id: 101, text: 'Rule 1', mutable: false });
      ruleSet.addRule({ id: 201, text: 'Rule 2', mutable: true });
      
      const snapshots = ruleSet.asRuleSnapshots;
      
      expect(snapshots).toEqual([
        { id: 101, text: 'Rule 1', mutable: false },
        { id: 201, text: 'Rule 2', mutable: true }
      ]);
    });
  });

  describe('integration with existing rule format', () => {
    it('should work with loadInitialRules format', () => {
      const loadInitialRulesFormat = [
        { id: 100, text: 'Prompt P rule', mutable: false },
        { id: 101, text: 'Players rule', mutable: false },
        { id: 201, text: 'Proposal format', mutable: true }
      ];
      
      ruleSet.loadRules(loadInitialRulesFormat);
      
      expect(ruleSet.rules.length).toBe(3);
      expect(ruleSet.findRuleById(100)?.text).toBe('Prompt P rule');
      expect(ruleSet.immutableRules.length).toBe(2);
      expect(ruleSet.mutableRules.length).toBe(1);
    });

    it('should maintain rule order when exported', () => {
      const rules = [
        { id: 103, text: 'Rule C', mutable: false },
        { id: 101, text: 'Rule A', mutable: false },
        { id: 202, text: 'Rule D', mutable: true },
        { id: 201, text: 'Rule B', mutable: true }
      ];
      
      ruleSet.loadRules(rules);
      const exported = ruleSet.asRuleSnapshots;
      
      // Should preserve insertion order, not sorted
      expect(exported.map(r => r.id)).toEqual([103, 101, 202, 201]);
    });
  });
}); 