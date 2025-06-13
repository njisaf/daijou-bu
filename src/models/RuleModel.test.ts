import { describe, it, expect } from 'vitest';
import { RuleModel, createRule } from './RuleModel';

describe('RuleModel', () => {
  it('should create an immutable rule', () => {
    const rule = createRule({
      id: 101,
      text: 'All people are potential players of Nomic.',
      mutable: false
    });

    expect(rule.id).toBe(101);
    expect(rule.text).toBe('All people are potential players of Nomic.');
    expect(rule.mutable).toBe(false);
    expect(rule.isImmutable).toBe(true);
    expect(rule.isMutable).toBe(false);
  });

  it('should create a mutable rule', () => {
    const rule = createRule({
      id: 201,
      text: 'A proposal must consist of a single rule-change.',
      mutable: true
    });

    expect(rule.id).toBe(201);
    expect(rule.text).toBe('A proposal must consist of a single rule-change.');
    expect(rule.mutable).toBe(true);
    expect(rule.isImmutable).toBe(false);
    expect(rule.isMutable).toBe(true);
  });

  it('should identify 100-series rules as immutable', () => {
    const rule = createRule({
      id: 115,
      text: 'Some immutable rule text',
      mutable: false
    });

    expect(rule.isInHundredSeries).toBe(true);
    expect(rule.isInTwoHundredSeries).toBe(false);
  });

  it('should identify 200-series rules as mutable by default', () => {
    const rule = createRule({
      id: 205,
      text: 'Some mutable rule text',
      mutable: true
    });

    expect(rule.isInHundredSeries).toBe(false);
    expect(rule.isInTwoHundredSeries).toBe(true);
  });

  it('should allow updating rule text', () => {
    const rule = createRule({
      id: 201,
      text: 'Original text',
      mutable: true
    });

    rule.updateText('Updated text');
    expect(rule.text).toBe('Updated text');
  });

  it('should allow transmuting rule mutability', () => {
    const rule = createRule({
      id: 201,
      text: 'Some rule text',
      mutable: true
    });

    expect(rule.mutable).toBe(true);
    
    rule.transmute();
    expect(rule.mutable).toBe(false);
    
    rule.transmute();
    expect(rule.mutable).toBe(true);
  });

  it('should provide rule summary', () => {
    const rule = createRule({
      id: 102,
      text: 'Initially each player has zero points. A player wins when their score reaches 100 (one hundred) points.',
      mutable: false
    });

    const summary = rule.summary;
    expect(summary).toContain('Rule 102');
    expect(summary).toContain('Immutable');
    expect(summary).toContain('Initially each player has zero points');
  });

  it('should validate rule ID is positive', () => {
    expect(() => createRule({
      id: 0,
      text: 'Invalid rule',
      mutable: true
    })).toThrow();

    expect(() => createRule({
      id: -1,
      text: 'Invalid rule',
      mutable: true
    })).toThrow();
  });

  it('should validate rule text is not empty', () => {
    expect(() => createRule({
      id: 301,
      text: '',
      mutable: true
    })).toThrow();

    expect(() => createRule({
      id: 302,
      text: '   ',
      mutable: true
    })).toThrow();
  });

  it('should serialize to JSON correctly', () => {
    const rule = createRule({
      id: 103,
      text: 'Play proceeds in rounds.',
      mutable: false
    });

    const json = JSON.parse(JSON.stringify(rule));
    expect(json.id).toBe(103);
    expect(json.text).toBe('Play proceeds in rounds.');
    expect(json.mutable).toBe(false);
  });
}); 