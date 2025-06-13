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
 * @see devbot_kickoff_prompt.md Section 2.1 Proposal Markdown Grammar
 */
export const ProposalSchema = z.object({
  /** Unique identifier for the proposal */
  id: z.number().int().positive(),
  
  /** Type of rule change being proposed */
  type: z.enum(['Add', 'Amend', 'Repeal', 'Transmute']),
  
  /** Rule number being targeted or created */
  number: z.number().int().positive(),
  
  /** Full text of the rule */
  text: z.string().min(1, 'Rule text cannot be empty')
});

export type Proposal = z.infer<typeof ProposalSchema>;

/**
 * Parses proposal markdown into a structured Proposal object
 * 
 * Expected format:
 * ### Proposal <id>
 * Type: Add | Amend | Repeal | Transmute
 * Number: <int>
 * Text: "<rule text>"
 * 
 * @param markdown - The proposal markdown string
 * @returns Parsed and validated Proposal object
 * @throws Error if markdown is invalid or doesn't match expected format
 */
export function parseProposalMarkdown(markdown: string): Proposal {
  const lines = markdown.trim().split('\n');
  
  if (lines.length < 4) {
    throw new Error('Invalid proposal format: must have at least 4 lines');
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
  const textMatch = lines[3].match(/^Text: "(.+)"$/);
  if (!textMatch) {
    throw new Error('Missing or invalid Text field: must be "Text: "<text>""');
  }
  
  const text = textMatch[1].trim();

  // Create and validate the proposal object
  const proposal = {
    id,
    type,
    number,
    text
  };

  // Use Zod to validate the parsed object
  const result = ProposalSchema.safeParse(proposal);
  if (!result.success) {
    throw new Error(`Invalid proposal data: ${result.error.message}`);
  }

  return result.data;
} 