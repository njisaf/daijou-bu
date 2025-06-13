/**
 * Tests for loadInitialRules utility
 */

import { describe, it, expect } from 'vitest';
import { loadInitialRules } from './loadInitialRules';
import type { SnapshotIn } from 'mobx-state-tree';
import type { RuleModel } from '../models/RuleModel';

type RuleSnapshotIn = SnapshotIn<typeof RuleModel>;

describe('loadInitialRules', () => {
  describe('basic functionality', () => {
    it('should load rules from JSON and return array', () => {
      const rules = loadInitialRules('');
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should return 30 total rules (29 from JSON + 1 injected)', () => {
      const rules = loadInitialRules('');
      expect(rules.length).toBe(30);
    });

    it('should inject rule 100 with Prompt P', () => {
      const promptP = 'Test prompt for rule 100';
      const rules = loadInitialRules(promptP);
      
      const rule100 = rules.find(rule => rule.id === 100);
      expect(rule100).toBeDefined();
      expect(rule100?.text).toBe(promptP);
      expect(rule100?.mutable).toBe(false);
    });

    it('should inject rule 100 as immutable for top precedence', () => {
      const rules = loadInitialRules('Any prompt');
      const rule100 = rules.find(rule => rule.id === 100);
      
      expect(rule100?.mutable).toBe(false);
    });

    it('should sort rules by ID with rule 100 first', () => {
      const rules = loadInitialRules('Test prompt');
      
      expect(rules[0].id).toBe(100);
      expect(rules[1].id).toBe(101);
      expect(rules[2].id).toBe(102);
    });
  });

  describe('Prompt P handling', () => {
    it('should use provided promptP text for rule 100', () => {
      const customPrompt = 'You are a strategic AI player in Nomic. Win by any means necessary.';
      const rules = loadInitialRules(customPrompt);
      
      const rule100 = rules.find(rule => rule.id === 100);
      expect(rule100?.text).toBe(customPrompt);
    });

    it('should use default text when promptP is empty', () => {
      const rules = loadInitialRules('');
      
      const rule100 = rules.find(rule => rule.id === 100);
      expect(rule100?.text).toBe('This is the fundamental proof statement P for this game.');
    });

    it('should handle multiline promptP', () => {
      const multilinePrompt = `You are an AI player in Nomic.
Your goal is to reach 100 points.
Be strategic in your proposals and voting.`;
      
      const rules = loadInitialRules(multilinePrompt);
      const rule100 = rules.find(rule => rule.id === 100);
      expect(rule100?.text).toBe(multilinePrompt);
    });
  });

  describe('rule validation', () => {
    it('should return rules with correct schema', () => {
      const rules = loadInitialRules('Test');
      
      rules.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('text');
        expect(rule).toHaveProperty('mutable');
        expect(typeof rule.id).toBe('number');
        expect(typeof rule.text).toBe('string');
        expect(typeof rule.mutable).toBe('boolean');
      });
    });

    it('should have correct mutability for rule series', () => {
      const rules = loadInitialRules('Test');
      
      // Rule 100 should be immutable (injected)
      const rule100 = rules.find((r: RuleSnapshotIn) => r.id === 100);
      expect(rule100?.mutable).toBe(false);
      
      // 100-series should be immutable
      const immutableRules = rules.filter((r: RuleSnapshotIn) => r.id >= 101 && r.id < 200);
      immutableRules.forEach((rule: RuleSnapshotIn) => {
        expect(rule.mutable).toBe(false);
      });
      
      // 200-series should be mutable
      const mutableRules = rules.filter((r: RuleSnapshotIn) => r.id >= 200);
      mutableRules.forEach((rule: RuleSnapshotIn) => {
        expect(rule.mutable).toBe(true);
      });
    });

    it('should preserve all original rules from JSON', () => {
      const rules = loadInitialRules('Test');
      
      // Should have rules 101-116 (immutable series)
      for (let id = 101; id <= 116; id++) {
        const rule = rules.find((r: RuleSnapshotIn) => r.id === id);
        expect(rule).toBeDefined();
        expect(rule?.mutable).toBe(false);
      }
      
      // Should have rules 201-213 (mutable series)
      for (let id = 201; id <= 213; id++) {
        const rule = rules.find((r: RuleSnapshotIn) => r.id === id);
        expect(rule).toBeDefined();
        expect(rule?.mutable).toBe(true);
      }
    });
  });
}); 