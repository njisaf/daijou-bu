/**
 * Seeded pseudo-random number generator for deterministic behavior
 * Uses a simple Linear Congruential Generator (LCG) algorithm
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generates a pseudo-random number between 0 and 1
   */
  random(): number {
    // LCG algorithm: (a * seed + c) % m
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  /**
   * Generates a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Selects a random element from an array
   */
  choice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length)];
  }
}

/**
 * Game snapshot interface for MCP requests
 */
export interface GameSnapshot {
  players: any[];
  rules: any[];
  proposals: any[];
  turn: number;
  phase: string;
  proofStatement: string;
}

/**
 * Common interface for MCP (LLM) services
 * Implemented by both OpenAI and Mock services
 */
export interface MCPService {
  /**
   * Generate a proposal based on game state
   */
  propose(prompt: string, gameSnapshot: GameSnapshot): Promise<string> | string;
  
  /**
   * Generate a vote based on proposal and game state
   */
  vote(proposalMarkdown: string, gameSnapshot: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> | 'FOR' | 'AGAINST' | 'ABSTAIN';
  
  /**
   * Get current seed for deterministic replay (optional)
   */
  getCurrentSeed?(): string;
}

/**
 * Mock MCP Service that simulates LLM responses with deterministic behavior
 * 
 * This service uses a seeded pseudo-random number generator to ensure
 * reproducible behavior for testing. The same seed will always produce
 * the same sequence of responses.
 * 
 * @see devbot_kickoff_prompt.md Section 4 for mock MCP requirements
 */
export class MockMCPService implements MCPService {
  private rng: SeededRandom;
  private proposalTemplates: string[];
  private ruleTexts: string[];
  private currentSeed: number;

  constructor(seed: number = Date.now()) {
    this.currentSeed = seed;
    this.rng = new SeededRandom(seed);
    
    // Log initialization status
    console.log('🎭 [MockMCP] Using deterministic mock LLM service');
    console.log(`🎭 [MockMCP] Seed: ${seed}`);
    console.log('🎭 [MockMCP] Behavior: Deterministic and predictable');
    
    // Template proposals for different types
    this.proposalTemplates = [
      'Players may submit proposals in haiku format.',
      'All votes must be cast within 12 hours.',
      'Players receive bonus points for witty rule proposals.',
      'The game may be paused by unanimous consent.',
      'Points are awarded for participation in discussions.',
      'Rule amendments require a detailed justification.',
      'Players may form temporary alliances for voting.',
      'The judge may request clarification on ambiguous rules.',
      'Voting records must be preserved for audit purposes.',
      'New players may join with approval from existing players.',
      'Rules affecting scoring require a 2/3 majority.',
      'Players may challenge rule interpretations.',
      'Time limits for phases may be extended by majority vote.',
      'Rule proposals must cite affected existing rules.',
      'The game ends when any player reaches 200 points.'
    ];

    this.ruleTexts = [
      'Communication between players is encouraged.',
      'Rule changes take effect immediately upon adoption.',
      'Players must act in good faith.',
      'Disputes are resolved by the current judge.',
      'Game state must be publicly visible.',
      'No player may vote twice on the same proposal.',
      'Rule numbers must be unique within each series.',
      'Proposals may not retroactively change scores.',
      'The turn order cycles through all active players.',
      'Emergency rules may suspend normal gameplay.'
    ];
  }

  /**
   * Simulates the /propose endpoint
   * Generates a proposal markdown string based on game state
   * 
   * @param promptP - The prompt text (may influence proposal generation)
   * @param gameSnapshot - Current game state
   * @returns Proposal in markdown format
   */
  propose(promptP: string, gameSnapshot: GameSnapshot): string {
    console.log('🎭 [MockMCP] Generating mock proposal...');
    
    // Get existing rule numbers to avoid conflicts
    const existingRuleNumbers = new Set(gameSnapshot.rules.map(rule => rule.id));
    
    // Determine proposal type based on game state and randomness
    const proposalTypes = ['Add', 'Amend', 'Repeal', 'Transmute'];
    
    // Prefer Add for new games, allow others as game progresses
    let allowedTypes = ['Add'];
    if (gameSnapshot.rules.length > 0) {
      allowedTypes = proposalTypes;
    }
    
    const proposalType = this.rng.choice(allowedTypes);

    // Generate rule number based on proposal type
    let ruleNumber: number;
    if (proposalType === 'Add') {
      // For Add, generate a new rule number not in use
      do {
        ruleNumber = this.rng.randomInt(301, 400); // New rules typically in 300s
      } while (existingRuleNumbers.has(ruleNumber));
    } else {
      // For Amend/Repeal/Transmute, target an existing rule
      const mutableRules = gameSnapshot.rules.filter(rule => rule.mutable);
      if (mutableRules.length > 0) {
        const targetRule = this.rng.choice(mutableRules);
        ruleNumber = targetRule.id;
      } else {
        // Fallback to Add if no mutable rules exist
        do {
          ruleNumber = this.rng.randomInt(301, 400);
        } while (existingRuleNumbers.has(ruleNumber));
      }
    }

    // Generate rule text
    let ruleText: string;
    if (proposalType === 'Repeal') {
      ruleText = `Rule ${ruleNumber} is hereby repealed.`;
    } else if (proposalType === 'Transmute') {
      const targetRule = gameSnapshot.rules.find(rule => rule.id === ruleNumber);
      const newMutability = targetRule?.mutable ? 'immutable' : 'mutable';
      ruleText = `Rule ${ruleNumber} is hereby transmuted to ${newMutability}.`;
    } else {
      // Add or Amend
      ruleText = this.rng.choice(this.proposalTemplates);
    }

    // Format as markdown without ID
    const result = `### Proposal
Type: ${proposalType}
Number: ${ruleNumber}
Text: "${ruleText}"`;

    console.log(`✅ [MockMCP] Mock proposal generated (Type: ${proposalType}, Number: ${ruleNumber})`);
    return result;
  }

  /**
   * Simulates the /vote endpoint
   * Generates a vote choice based on proposal content and game state
   * 
   * @param proposalMarkdown - The proposal to vote on
   * @param gameSnapshot - Current game state
   * @returns Vote choice: 'FOR', 'AGAINST', or 'ABSTAIN'
   */
  vote(proposalMarkdown: string, gameSnapshot: GameSnapshot): 'FOR' | 'AGAINST' | 'ABSTAIN' {
    console.log('🎭 [MockMCP] Generating mock vote...');
    
    // Extract proposal text for analysis
    const textMatch = proposalMarkdown.match(/Text: "(.+)"/);
    const proposalText = textMatch ? textMatch[1].toLowerCase() : '';

    // Analyze proposal content for voting decision
    let bias = 0.5; // Start neutral
    
    // Positive keywords increase FOR bias
    const positiveKeywords = ['bonus', 'points', 'award', 'benefit', 'improve', 'enhance'];
    const negativeKeywords = ['lose', 'penalty', 'restrict', 'forbid', 'ban', 'decrease'];
    
    positiveKeywords.forEach(keyword => {
      if (proposalText.includes(keyword)) {
        bias += 0.2;
      }
    });
    
    negativeKeywords.forEach(keyword => {
      if (proposalText.includes(keyword)) {
        bias -= 0.2;
      }
    });

    // Add some game state context
    if (gameSnapshot.rules.length < 5) {
      // Early game: more likely to vote FOR new rules
      bias += 0.1;
    }

    // Clamp bias between 0 and 1
    bias = Math.max(0, Math.min(1, bias));

    // Generate random vote based on bias
    const rand = this.rng.random();
    
    let result: 'FOR' | 'AGAINST' | 'ABSTAIN';
    if (rand < bias * 0.7) {
      result = 'FOR';
    } else if (rand < bias * 0.7 + 0.2) {
      result = 'AGAINST';
    } else {
      result = 'ABSTAIN';
    }

    console.log(`✅ [MockMCP] Mock vote generated: ${result}`);
    return result;
  }

  /**
   * Get current seed for deterministic replay
   */
  getCurrentSeed(): string {
    return this.currentSeed.toString();
  }

  /**
   * Resets the RNG to a specific state
   * Useful for reproducing specific sequences
   */
  reseed(newSeed: number): void {
    this.currentSeed = newSeed;
    this.rng = new SeededRandom(newSeed);
  }
} 