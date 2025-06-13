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
 * Schema for proposal data without ID (for creation)
 * The ID will be generated automatically by the GameModel
 */
export const ProposalWithoutIdSchema = z.object({
  /** Type of rule change being proposed */
  type: z.enum(['Add', 'Amend', 'Repeal', 'Transmute']),
  
  /** Rule number being targeted or created */
  number: z.number().int().positive(),
  
  /** Full text of the rule */
  text: z.string().min(1, 'Rule text cannot be empty')
});

export type ProposalWithoutId = z.infer<typeof ProposalWithoutIdSchema>;

/**
 * Parses proposal markdown into a structured Proposal object
 * 
 * Expected format:
 * ### Proposal <id>
 * Type: Add | Amend | Repeal | Transmute
 * Number: <int>
 * Text: "<rule text>"
 * 
 * Note: Supports both ASCII quotes (") and Unicode smart quotes ("") from LLMs
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
    // Enhanced debugging for text parsing failure
    console.error('❌ [ProposalParser] Text field parsing failed');
    console.error('❌ [ProposalParser] Line 3 content:', JSON.stringify(lines[3]));
    console.error('❌ [ProposalParser] Line 3 length:', lines[3].length);
    console.error('❌ [ProposalParser] Line 3 char codes:', Array.from(lines[3]).map(c => c.charCodeAt(0)));
    
    // Try with Unicode smart quotes (common with LLMs like Ollama)
    // U+201C = " (left double quotation mark), U+201D = " (right double quotation mark)
    const smartQuoteMatch = lines[3].match(/^Text: \u201C(.+)\u201D$/);
    if (smartQuoteMatch) {
      console.log('✅ [ProposalParser] Unicode smart quotes detected and handled');
      const text = smartQuoteMatch[1].trim();
      
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
    
    // Try a more flexible regex that handles potential multi-line content
    const flexibleTextMatch = lines[3].match(/^Text: "(.+)"$/s);
    if (flexibleTextMatch) {
      console.log('✅ [ProposalParser] Flexible regex matched!');
      const text = flexibleTextMatch[1].trim();
      
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
    
    // Try to handle case where text might span multiple lines after "Text: ""
    if (lines[3].startsWith('Text: "') || lines[3].startsWith('Text: "')) {
      console.log('✅ [ProposalParser] Attempting multi-line text parsing...');
      let textContent = '';
      
      // Handle both ASCII and Unicode quotes
      if (lines[3].startsWith('Text: "')) {
        textContent = lines[3].substring(7); // Remove 'Text: "'
      } else if (lines[3].startsWith('Text: "')) {
        textContent = lines[3].substring(7); // Remove 'Text: "'
      }
      
      let lineIndex = 3;
      
      // Continue reading lines until we find the closing quote (ASCII or Unicode)
      while (lineIndex < lines.length && !textContent.endsWith('"') && !textContent.endsWith('"')) {
        lineIndex++;
        if (lineIndex < lines.length) {
          textContent += '\n' + lines[lineIndex];
        }
      }
      
      // Remove trailing quote (ASCII or Unicode)
      if (textContent.endsWith('"') || textContent.endsWith('"')) {
        textContent = textContent.slice(0, -1);
        console.log('✅ [ProposalParser] Multi-line text extracted:', textContent);
        
        const text = textContent.trim();
        
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
    }
    
    throw new Error('Missing or invalid Text field: must be "Text: "<text>"" (supports both ASCII and Unicode quotes)');
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

/**
 * Parses proposal markdown into a ProposalWithoutId object (no ID required)
 * 
 * Expected format:
 * ### Proposal
 * Type: Add | Amend | Repeal | Transmute
 * Number: <int>
 * Text: "<rule text>"
 * 
 * Note: Supports both ASCII quotes (") and Unicode smart quotes ("") from LLMs
 * 
 * @param markdown - The proposal markdown string
 * @returns Parsed and validated ProposalWithoutId object
 * @throws Error if markdown is invalid or doesn't match expected format
 */
export function parseProposalMarkdownWithoutId(markdown: string): ProposalWithoutId {
  const lines = markdown.trim().split('\n');
  
  if (lines.length < 3) {
    throw new Error('Invalid proposal format: must have at least 3 lines');
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
  const textMatch = lines[3] ? lines[3].match(/^Text: "(.+)"$/) : null;
  if (!textMatch) {
    // Enhanced debugging for text parsing failure
    console.error('❌ [ProposalParser] Text field parsing failed');
    if (lines[3]) {
      console.error('❌ [ProposalParser] Line 3 content:', JSON.stringify(lines[3]));
      console.error('❌ [ProposalParser] Line 3 length:', lines[3].length);
      console.error('❌ [ProposalParser] Line 3 char codes:', Array.from(lines[3]).map(c => c.charCodeAt(0)));
    }
    
    // Try with Unicode smart quotes (common with LLMs like Ollama)
    const smartQuoteMatch = lines[3] ? lines[3].match(/^Text: \u201C(.+)\u201D$/) : null;
    if (smartQuoteMatch) {
      console.log('✅ [ProposalParser] Unicode smart quotes detected and handled');
      const text = smartQuoteMatch[1].trim();
      
      // Create and validate the proposal object
      const proposal = {
        type,
        number,
        text
      };

      // Use Zod to validate the parsed object
      const result = ProposalWithoutIdSchema.safeParse(proposal);
      if (!result.success) {
        throw new Error(`Invalid proposal data: ${result.error.message}`);
      }

      return result.data;
    }
    
    throw new Error('Missing or invalid Text field: must be "Text: "<text>"" (supports both ASCII and Unicode quotes)');
  }
  
  const text = textMatch[1].trim();

  // Create and validate the proposal object
  const proposal = {
    type,
    number,
    text
  };

  // Use Zod to validate the parsed object
  const result = ProposalWithoutIdSchema.safeParse(proposal);
  if (!result.success) {
    throw new Error(`Invalid proposal data: ${result.error.message}`);
  }

  return result.data;
} 