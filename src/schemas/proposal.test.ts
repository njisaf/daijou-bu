import { describe, it, expect } from 'vitest';
import { ProposalSchema, parseProposalMarkdown } from './proposal';

describe('ProposalSchema', () => {
  it('should validate a valid proposal object', () => {
    const validProposal = {
      id: 1,
      type: 'Add' as const,
      number: 301,
      text: 'Players may submit proposals in haiku format.'
    };

    const result = ProposalSchema.safeParse(validProposal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validProposal);
    }
  });

  it('should reject proposal with invalid type', () => {
    const invalidProposal = {
      id: 1,
      type: 'Invalid',
      number: 301,
      text: 'Some rule text'
    };

    const result = ProposalSchema.safeParse(invalidProposal);
    expect(result.success).toBe(false);
  });

  it('should reject proposal with missing fields', () => {
    const incompleteProposal = {
      id: 1,
      type: 'Add'
      // missing number and text
    };

    const result = ProposalSchema.safeParse(incompleteProposal);
    expect(result.success).toBe(false);
  });

  it('should validate all proposal types', () => {
    const types = ['Add', 'Amend', 'Repeal', 'Transmute'] as const;
    
    types.forEach(type => {
      const proposal = {
        id: 1,
        type,
        number: 301,
        text: 'Rule text'
      };
      
      const result = ProposalSchema.safeParse(proposal);
      expect(result.success).toBe(true);
    });
  });
});

describe('parseProposalMarkdown', () => {
  it('should parse valid Add proposal markdown', () => {
    const markdown = `### Proposal 1
Type: Add
Number: 301
Text: "Players may submit proposals in haiku format."`;

    const result = parseProposalMarkdown(markdown);
    expect(result).toEqual({
      id: 1,
      type: 'Add',
      number: 301,
      text: 'Players may submit proposals in haiku format.'
    });
  });

  it('should parse valid Amend proposal markdown', () => {
    const markdown = `### Proposal 2
Type: Amend
Number: 201
Text: "A proposal must consist of a single rule-change stated clearly, unambiguously, and in haiku format."`;

    const result = parseProposalMarkdown(markdown);
    expect(result).toEqual({
      id: 2,
      type: 'Amend',
      number: 201,
      text: 'A proposal must consist of a single rule-change stated clearly, unambiguously, and in haiku format.'
    });
  });

  it('should parse valid Repeal proposal markdown', () => {
    const markdown = `### Proposal 3
Type: Repeal
Number: 208
Text: "Rule 208 is hereby repealed."`;

    const result = parseProposalMarkdown(markdown);
    expect(result).toEqual({
      id: 3,
      type: 'Repeal',
      number: 208,
      text: 'Rule 208 is hereby repealed.'
    });
  });

  it('should parse valid Transmute proposal markdown', () => {
    const markdown = `### Proposal 4
Type: Transmute
Number: 105
Text: "Rule 105 is hereby transmuted from Immutable to Mutable."`;

    const result = parseProposalMarkdown(markdown);
    expect(result).toEqual({
      id: 4,
      type: 'Transmute',
      number: 105,
      text: 'Rule 105 is hereby transmuted from Immutable to Mutable.'
    });
  });

  it('should handle text with extra whitespace', () => {
    const markdown = `### Proposal 5
Type: Add
Number: 302
Text: "  Rule text with extra spaces.  "`;

    const result = parseProposalMarkdown(markdown);
    expect(result.text).toBe('Rule text with extra spaces.');
  });

  it('should throw error for invalid markdown format', () => {
    const invalidMarkdown = `### Proposal 1
This is not a valid format`;

    expect(() => parseProposalMarkdown(invalidMarkdown)).toThrow();
  });

  it('should throw error for missing required fields', () => {
    const incompleteMarkdown = `### Proposal 1
Type: Add
Number: 301`;

    expect(() => parseProposalMarkdown(incompleteMarkdown)).toThrow();
  });

  it('should throw error for invalid proposal type', () => {
    const invalidTypeMarkdown = `### Proposal 1
Type: Invalid
Number: 301
Text: "Some text"`;

    expect(() => parseProposalMarkdown(invalidTypeMarkdown)).toThrow();
  });

  it('should throw error for non-numeric proposal ID', () => {
    const invalidIdMarkdown = `### Proposal abc
Type: Add
Number: 301
Text: "Some text"`;

    expect(() => parseProposalMarkdown(invalidIdMarkdown)).toThrow();
  });

  it('should throw error for non-numeric rule number', () => {
    const invalidNumberMarkdown = `### Proposal 1
Type: Add
Number: abc
Text: "Some text"`;

    expect(() => parseProposalMarkdown(invalidNumberMarkdown)).toThrow();
  });
}); 