import { z } from 'zod';

/**
 * Zod schema for validating proposal objects
 * 
 * Proposal types as specified in the grammar:
 * - Add: Creates a new rule
 * - Amend: Modifies an existing rule  
 * - Repeal: Removes an existing rule
 * - Transmute: Changes a rule's mutability status
 * 
 * Per Rule 121: Every Proposal must include a Proof Section showing:
 * (a) its adoption does not render the ruleset inconsistent, and 
 * (b) maintains or improves the likelihood that an LLM following the 
 *     Development Rulebook can satisfy Prompt P
 * 
 * @see devbot_kickoff_prompt.md Section 2.1 Proposal Markdown Grammar
 * @see initialRules.json Rule 121 (Proof Requirement)
 */
export const ProposalSchema = z.object({
  /** Unique identifier for the proposal */
  id: z.number().int().positive(),
  
  /** Type of rule change being proposed */
  type: z.enum(['Add', 'Amend', 'Repeal', 'Transmute']),
  
  /** Rule number being targeted or created */
  number: z.number().int().positive(),
  
  /** Full text of the rule */
  text: z.string().min(1, 'Rule text cannot be empty'),

  /** Proof section text (required per Rule 121) */
  proof: z.string().min(1, 'Proof section cannot be empty per Rule 121'),

  /** Judge verdict on proof soundness (optional - set during judging phase) */
  judgeVerdict: z.enum(['sound', 'unsound', 'pending']).optional().default('pending'),

  /** Judge's written justification (optional - set during judging phase) */
  judgeJustification: z.string().optional()
});

/**
 * Proposal type derived from schema
 */
export type Proposal = z.infer<typeof ProposalSchema>;

/**
 * Schema for proposals without ID (used during creation)
 */
export const ProposalWithoutIdSchema = ProposalSchema.omit({ id: true });

/**
 * Proposal type without ID (used during creation)
 */
export type ProposalWithoutId = z.infer<typeof ProposalWithoutIdSchema>;

/**
 * Parses proposal markdown into a structured Proposal object
 * 
 * Expected format (Rule 121 compliant):
 * ### Proposal <id>
 * Type: Add | Amend | Repeal | Transmute
 * Number: <int>
 * Text: "<rule text>"
 * Proof: "<proof section demonstrating consistency and Prompt P alignment>"
 * 
 * Note: Supports both ASCII quotes (") and Unicode smart quotes ("") from LLMs
 * 
 * @param markdown - The proposal markdown string
 * @returns Parsed and validated Proposal object
 * @throws Error if markdown is invalid, doesn't match expected format, or lacks proof section
 */
export function parseProposalMarkdown(markdown: string): Proposal {
  const lines = markdown.trim().split('\n');
  
  if (lines.length < 5) {
    throw new Error('Invalid proposal format: must have at least 5 lines (header, type, number, text, proof)');
  }

  // Parse proposal ID from header line
  const headerMatch = lines[0].match(/^### Proposal (\d+)$/);
  if (!headerMatch) {
    throw new Error('Invalid proposal header: must be "### Proposal <number>"');
  }
  
  const id = parseInt(headerMatch[1], 10);
  if (isNaN(id)) {
    throw new Error('Invalid proposal ID: must be a number');
  }

  // Parse type field
  const typeMatch = lines[1].match(/^Type: (.+)$/);
  if (!typeMatch) {
    throw new Error('Missing or invalid Type field');
  }
  const type = typeMatch[1].trim();

  // Parse number field
  const numberMatch = lines[2].match(/^Number: (\d+)$/);
  if (!numberMatch) {
    throw new Error('Missing or invalid Number field: must be "Number: <integer>"');
  }
  
  const number = parseInt(numberMatch[1], 10);
  if (isNaN(number)) {
    throw new Error('Invalid rule number: must be a number');
  }

  // Parse text field
  const { text, nextLineIndex } = parseQuotedField(lines, 3, 'Text');

  // Parse proof field (required per Rule 121)
  const { text: proof } = parseQuotedField(lines, nextLineIndex, 'Proof');

  // Create and validate the proposal object
  const proposal = {
    id,
    type,
    number,
    text,
    proof,
    judgeVerdict: 'pending' as const,
    judgeJustification: undefined
  };

  // Use Zod to validate the parsed object
  const result = ProposalSchema.safeParse(proposal);
  if (!result.success) {
    throw new Error(`Invalid proposal data: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Parses proposal markdown into a ProposalWithoutId object (no ID required)
 * 
 * Expected format (Rule 121 compliant):
 * ### Proposal
 * Type: Add | Amend | Repeal | Transmute
 * Number: <int>
 * Text: "<rule text>"
 * Proof: "<proof section demonstrating consistency and Prompt P alignment>"
 * 
 * Note: Supports both ASCII quotes (") and Unicode smart quotes ("") from LLMs
 * 
 * @param markdown - The proposal markdown string
 * @returns Parsed and validated ProposalWithoutId object
 * @throws Error if markdown is invalid, doesn't match expected format, or lacks proof section
 */
export function parseProposalMarkdownWithoutId(markdown: string): ProposalWithoutId {
  const lines = markdown.trim().split('\n');
  
  if (lines.length < 4) {
    throw new Error('Invalid proposal format: must have at least 4 lines (header, type, number, text, proof)');
  }

  // Parse header line (no ID required)
  const headerMatch = lines[0].match(/^### Proposal$/);
  if (!headerMatch) {
    throw new Error('Invalid proposal header: must be "### Proposal"');
  }

  // Parse type field
  const typeMatch = lines[1].match(/^Type: (.+)$/);
  if (!typeMatch) {
    throw new Error('Missing or invalid Type field');
  }
  const type = typeMatch[1].trim();

  // Parse number field  
  const numberMatch = lines[2].match(/^Number: (\d+)$/);
  if (!numberMatch) {
    throw new Error('Missing or invalid Number field: must be "Number: <integer>"');
  }
  
  const number = parseInt(numberMatch[1], 10);
  if (isNaN(number)) {
    throw new Error('Invalid rule number: must be a number');
  }

  // Parse text field
  const { text, nextLineIndex } = parseQuotedField(lines, 3, 'Text');

  // Parse proof field (required per Rule 121)
  const { text: proof } = parseQuotedField(lines, nextLineIndex, 'Proof');

  // Create and validate the proposal object
  const proposal = {
    type,
    number,
    text,
    proof,
    judgeVerdict: 'pending' as const,
    judgeJustification: undefined
  };

  // Use Zod to validate the parsed object
  const result = ProposalWithoutIdSchema.safeParse(proposal);
  if (!result.success) {
    throw new Error(`Invalid proposal data: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Helper function to parse quoted fields with multi-line support
 * 
 * Handles both ASCII quotes (") and Unicode smart quotes ("") from LLMs.
 * Supports multi-line content within quotes.
 * 
 * @param lines - Array of markdown lines
 * @param startIndex - Line index to start parsing from
 * @param fieldName - Name of the field being parsed (for error messages)
 * @returns Object with parsed text and next line index
 * @throws Error if field is missing or invalid
 */
function parseQuotedField(lines: string[], startIndex: number, fieldName: string): { text: string; nextLineIndex: number } {
  if (startIndex >= lines.length) {
    throw new Error(`Missing ${fieldName} field`);
  }

  const fieldLine = lines[startIndex];
  const fieldPattern = new RegExp(`^${fieldName}: "(.+)"$`);
  const smartQuotePattern = new RegExp(`^${fieldName}: \u201C(.+)\u201D$`);
  
  // Try simple single-line match first
  let textMatch = fieldLine.match(fieldPattern);
  if (textMatch) {
    return {
      text: textMatch[1].trim(),
      nextLineIndex: startIndex + 1
    };
  }

  // Try Unicode smart quotes
  textMatch = fieldLine.match(smartQuotePattern);
  if (textMatch) {
    return {
      text: textMatch[1].trim(),
      nextLineIndex: startIndex + 1
    };
  }

  // Try multi-line parsing
  if (fieldLine.startsWith(`${fieldName}: "`) || fieldLine.startsWith(`${fieldName}: "`)) {
    let textContent = '';
    
    // Handle both ASCII and Unicode quotes
    if (fieldLine.startsWith(`${fieldName}: "`)) {
      textContent = fieldLine.substring(`${fieldName}: "`.length);
    } else if (fieldLine.startsWith(`${fieldName}: "`)) {
      textContent = fieldLine.substring(`${fieldName}: "`.length);
    }
    
    let lineIndex = startIndex;
    
    // Continue reading lines until we find the closing quote
    while (lineIndex < lines.length && !textContent.endsWith('"') && !textContent.endsWith('"')) {
      lineIndex++;
      if (lineIndex < lines.length) {
        textContent += '\n' + lines[lineIndex];
      }
    }
    
    // Remove trailing quote
    if (textContent.endsWith('"') || textContent.endsWith('"')) {
      textContent = textContent.slice(0, -1);
      return {
        text: textContent.trim(),
        nextLineIndex: lineIndex + 1
      };
    }
  }
  
  throw new Error(`Missing or invalid ${fieldName} field: must be "${fieldName}: "<text>"" (supports both ASCII and Unicode quotes)`);
} 