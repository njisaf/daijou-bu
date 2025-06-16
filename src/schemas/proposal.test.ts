import { describe, it, expect } from 'vitest';
import { ProposalSchema, parseProposalMarkdown, parseProposalMarkdownWithoutId } from './proposal';

describe('ProposalSchema', () => {
  it('should validate a valid proposal object with proof section', () => {
    const validProposal = {
      id: 1,
      type: 'Add' as const,
      number: 301,
      text: 'Players may submit proposals in haiku format.',
      proof: 'This rule enhances creativity while maintaining consistency with existing proposal mechanisms.',
      judgeVerdict: 'pending' as const,
      judgeJustification: undefined
    };

    const result = ProposalSchema.safeParse(validProposal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validProposal);
    }
  });

  it('should reject proposal missing proof section', () => {
    const invalidProposal = {
      id: 1,
      type: 'Add',
      number: 301,
      text: 'Some rule text'
      // missing proof section
    };

    const result = ProposalSchema.safeParse(invalidProposal);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('proof');
    }
  });

  it('should reject proposal with empty proof section', () => {
    const invalidProposal = {
      id: 1,
      type: 'Add',
      number: 301,
      text: 'Some rule text',
      proof: '' // empty proof
    };

    const result = ProposalSchema.safeParse(invalidProposal);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Proof section cannot be empty per Rule 121');
    }
  });

  it('should validate different judge verdicts', () => {
    const verdicts = ['sound', 'unsound', 'pending'] as const;
    
    verdicts.forEach(verdict => {
      const proposal = {
        id: 1,
        type: 'Add' as const,
        number: 301,
        text: 'Rule text',
        proof: 'Valid proof section',
        judgeVerdict: verdict,
        judgeJustification: verdict === 'pending' ? undefined : 'Judge reasoning'
      };
      
      const result = ProposalSchema.safeParse(proposal);
      expect(result.success).toBe(true);
    });
  });

  it('should reject proposal with invalid type', () => {
    const invalidProposal = {
      id: 1,
      type: 'Invalid',
      number: 301,
      text: 'Some rule text',
      proof: 'Some proof'
    };

    const result = ProposalSchema.safeParse(invalidProposal);
    expect(result.success).toBe(false);
  });

  it('should validate all proposal types with proof', () => {
    const types = ['Add', 'Amend', 'Repeal', 'Transmute'] as const;
    
    types.forEach(type => {
      const proposal = {
        id: 1,
        type,
        number: 301,
        text: 'Rule text',
        proof: 'This change maintains consistency and improves the ruleset.'
      };
      
      const result = ProposalSchema.safeParse(proposal);
      expect(result.success).toBe(true);
    });
  });
});

describe('parseProposalMarkdown', () => {
  it('should parse valid Add proposal markdown with proof section', () => {
    const markdown = `### Proposal 1
Type: Add
Number: 301
Text: "Players may submit proposals in haiku format."
Proof: "This rule enhances creativity while maintaining game balance and consistency with existing proposal mechanisms per Rule 121."`;

    const result = parseProposalMarkdown(markdown);
    expect(result).toEqual({
      id: 1,
      type: 'Add',
      number: 301,
      text: 'Players may submit proposals in haiku format.',
      proof: 'This rule enhances creativity while maintaining game balance and consistency with existing proposal mechanisms per Rule 121.',
      judgeVerdict: 'pending',
      judgeJustification: undefined
    });
  });

  it('should parse valid Amend proposal markdown with proof section', () => {
    const markdown = `### Proposal 2
Type: Amend
Number: 201
Text: "A proposal must consist of a single rule-change stated clearly, unambiguously, and in haiku format."
Proof: "This amendment improves rule clarity while maintaining backward compatibility. The haiku format constraint ensures conciseness without breaking existing proposal validation logic."`;

    const result = parseProposalMarkdown(markdown);
    expect(result).toEqual({
      id: 2,
      type: 'Amend',
      number: 201,
      text: 'A proposal must consist of a single rule-change stated clearly, unambiguously, and in haiku format.',
      proof: 'This amendment improves rule clarity while maintaining backward compatibility. The haiku format constraint ensures conciseness without breaking existing proposal validation logic.',
      judgeVerdict: 'pending',
      judgeJustification: undefined
    });
  });

  it('should handle multi-line proof sections', () => {
    const markdown = `### Proposal 3
Type: Add
Number: 302
Text: "Multi-line rule text example."
Proof: "This is a multi-line proof section that explains
why this rule change is necessary and beneficial.
It demonstrates consistency with existing rules
and shows how it improves the game mechanics."`;

    const result = parseProposalMarkdown(markdown);
    expect(result.proof).toContain('multi-line proof section');
    expect(result.proof).toContain('improves the game mechanics');
  });

  it('should handle Unicode smart quotes in proof sections', () => {
    const unicodeQuoteMarkdown = `### Proposal 4
Type: Add
Number: 303
Text: "Rule with Unicode quotes."
Proof: "This proof demonstrates Unicode quote handling per Rule 121 requirements."`;

    const result = parseProposalMarkdown(unicodeQuoteMarkdown);
    expect(result).toEqual({
      id: 4,
      type: 'Add',
      number: 303,
      text: 'Rule with Unicode quotes.',
      proof: 'This proof demonstrates Unicode quote handling per Rule 121 requirements.',
      judgeVerdict: 'pending',
      judgeJustification: undefined
    });
  });

  it('should throw error for missing proof section', () => {
    const markdownWithoutProof = `### Proposal 5
Type: Add
Number: 304
Text: "Rule without proof section."`;

    expect(() => parseProposalMarkdown(markdownWithoutProof)).toThrow('Invalid proposal format: must have at least 5 lines');
  });

  it('should throw error for insufficient line count', () => {
    const shortMarkdown = `### Proposal 6
Type: Add
Number: 305`;

    expect(() => parseProposalMarkdown(shortMarkdown)).toThrow('must have at least 5 lines');
  });

  it('should handle text with extra whitespace in all sections', () => {
    const markdown = `### Proposal 7
Type: Add
Number: 306
Text: "  Rule text with extra spaces.  "
Proof: "  Proof text with extra spaces and proper justification.  "`;

    const result = parseProposalMarkdown(markdown);
    expect(result.text).toBe('Rule text with extra spaces.');
    expect(result.proof).toBe('Proof text with extra spaces and proper justification.');
  });

  it('should parse all proposal types with proof sections', () => {
    const testCases = [
      { type: 'Add', number: 301 },
      { type: 'Amend', number: 202 },
      { type: 'Repeal', number: 203 },
      { type: 'Transmute', number: 101 }
    ];

    testCases.forEach(({ type, number }) => {
      const markdown = `### Proposal 1
Type: ${type}
Number: ${number}
Text: "Test rule for ${type} operation."
Proof: "This ${type} operation maintains consistency and improves the ruleset per Rule 121."`;

      const result = parseProposalMarkdown(markdown);
      expect(result.type).toBe(type);
      expect(result.number).toBe(number);
      expect(result.proof).toContain(`${type} operation maintains consistency`);
    });
  });
});

describe('parseProposalMarkdownWithoutId', () => {
  it('should parse valid proposal markdown without ID but with proof', () => {
    const markdown = `### Proposal
Type: Add
Number: 301
Text: "This is a new rule for the game."
Proof: "This rule enhances gameplay while maintaining consistency with existing mechanics per Rule 121."`;

    const result = parseProposalMarkdownWithoutId(markdown);
    expect(result).toEqual({
      type: 'Add',
      number: 301,
      text: 'This is a new rule for the game.',
      proof: 'This rule enhances gameplay while maintaining consistency with existing mechanics per Rule 121.',
      judgeVerdict: 'pending',
      judgeJustification: undefined
    });
  });

  it('should handle different proposal types with proof sections', () => {
    const testCases = [
      { type: 'Add', number: 301 },
      { type: 'Amend', number: 202 },
      { type: 'Repeal', number: 203 },
      { type: 'Transmute', number: 101 }
    ];

    testCases.forEach(({ type, number }) => {
      const markdown = `### Proposal
Type: ${type}
Number: ${number}
Text: "Test rule for ${type} operation."
Proof: "This ${type} operation is justified because it improves game mechanics while maintaining rule consistency."`;

      const result = parseProposalMarkdownWithoutId(markdown);
      expect(result.type).toBe(type);
      expect(result.number).toBe(number);
      expect(result.text).toBe(`Test rule for ${type} operation.`);
      expect(result.proof).toContain('improves game mechanics');
    });
  });

  it('should handle Unicode smart quotes without ID', () => {
    const unicodeQuoteMarkdown = `### Proposal
Type: Add
Number: 301
Text: "Rule with Unicode smart quotes without ID."
Proof: "This proof section uses Unicode quotes and demonstrates compliance with Rule 121."`;

    const result = parseProposalMarkdownWithoutId(unicodeQuoteMarkdown);
    expect(result).toEqual({
      type: 'Add',
      number: 301,
      text: 'Rule with Unicode smart quotes without ID.',
      proof: 'This proof section uses Unicode quotes and demonstrates compliance with Rule 121.',
      judgeVerdict: 'pending',
      judgeJustification: undefined
    });
  });

  it('should throw error for invalid header without ID', () => {
    const invalidHeaderMarkdown = `### Wrong Header
Type: Add
Number: 301
Text: "Some text"
Proof: "Some proof"`;

    expect(() => parseProposalMarkdownWithoutId(invalidHeaderMarkdown)).toThrow('Invalid proposal header: must be "### Proposal"');
  });

  it('should throw error for missing type field', () => {
    const missingTypeMarkdown = `### Proposal
Number: 301
Text: "Some text"
Proof: "Some proof"`;

    expect(() => parseProposalMarkdownWithoutId(missingTypeMarkdown)).toThrow('Missing or invalid Type field');
  });

  it('should throw error for missing proof section', () => {
    const missingProofMarkdown = `### Proposal
Type: Add
Number: 301
Text: "Some text"`;

    expect(() => parseProposalMarkdownWithoutId(missingProofMarkdown)).toThrow('Missing Proof field');
  });

  it('should require minimum line count including proof', () => {
    const shortMarkdown = `### Proposal
Type: Add
Number: 301`;

    expect(() => parseProposalMarkdownWithoutId(shortMarkdown)).toThrow('must have at least 4 lines');
  });
});

describe('parseQuotedField helper function integration', () => {
  it('should handle complex multi-line proof with various formatting', () => {
    const complexMarkdown = `### Proposal 1
Type: Add
Number: 307
Text: "Complex rule with detailed explanation."
Proof: "This is a comprehensive proof section that:
1. Demonstrates rule consistency
2. Shows alignment with Prompt P objectives
3. Explains how this enhances the Development Rulebook
4. Provides specific examples of improved LLM behavior

The proof spans multiple lines and includes formatting
to ensure clarity and thoroughness per Rule 121."`;

    const result = parseProposalMarkdown(complexMarkdown);
    expect(result.proof).toContain('comprehensive proof section');
    expect(result.proof).toContain('Rule 121');
    expect(result.proof).toContain('1. Demonstrates rule consistency');
    expect(result.proof).toContain('multiple lines');
  });

  it('should handle edge cases with quotes in proof content', () => {
    const quotedContentMarkdown = `### Proposal 1
Type: Add
Number: 308
Text: "Rule about 'quoted content' handling."
Proof: "This proof addresses the 'quoted content' scenario by ensuring that internal quotes don't break parsing. The rule maintains consistency with the existing 'proposal validation' framework."`;

    const result = parseProposalMarkdown(quotedContentMarkdown);
    expect(result.text).toBe("Rule about 'quoted content' handling.");
    expect(result.proof).toContain("'quoted content' scenario");
    expect(result.proof).toContain("'proposal validation' framework");
  });
}); 