import { type GameSnapshot, type MCPService } from '../mocks/MockMCPService';

/**
 * Real LLM Pilot Adapter for OpenAI Integration
 * 
 * This agent implements the same interface as MockMCPService but uses
 * real OpenAI chat completions API. It's controlled by process.env.LLM_TOKEN.
 * If the token is not provided, this agent is skipped.
 * 
 * @see Phase 4 Objective 5: Real LLM Pilot Adapter
 */
export class OpenAIAgent implements MCPService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private lastApiCall: number = 0;
  private readonly minDelayBetweenCalls: number = 22000; // 22 seconds between API calls (3 req/min = 20s, plus buffer)

  constructor() {
    this.apiKey = process.env.LLM_TOKEN;
    this.baseUrl = 'https://api.openai.com/v1';
    this.timeout = 5000; // 5 second timeout as specified

    // Enhanced initialization logging
    if (this.apiKey) {
      console.log('🤖 [OpenAI] LLM integration initialized');
      console.log('🤖 [OpenAI] Model: gpt-3.5-turbo');
      console.log('🤖 [OpenAI] Max tokens: 500');
      console.log('🤖 [OpenAI] Temperature: 0.7');
      console.log('🤖 [OpenAI] Timeout: 5000ms');
      console.log('🤖 [OpenAI] Rate limit: 3 requests/minute (22s delay between calls)');
      console.log('🤖 [OpenAI] API Key detected:', this.apiKey.substring(0, 7) + '...' + this.apiKey.substring(this.apiKey.length - 4));
      console.log('🤖 [OpenAI] Integration status: ACTIVE');
      
      // Test API connection on initialization
      this.testConnection();
    } else {
      console.log('🤖 [OpenAI] No API key provided - agent unavailable');
      console.log('🤖 [OpenAI] Integration status: INACTIVE');
    }
  }

  /**
   * Test the OpenAI API connection
   * @private
   */
  private async testConnection(): Promise<void> {
    try {
      console.log('🤖 [OpenAI] Testing API connection...');
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (response.ok) {
        console.log('✅ [OpenAI] API connection test successful');
        console.log('✅ [OpenAI] Authentication verified');
        console.log('✅ [OpenAI] Ready for LLM requests');
      } else {
        console.warn('⚠️ [OpenAI] API connection test failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('⚠️ [OpenAI] API connection test failed:', error);
    }
  }

  /**
   * Check if the agent is available (has API key)
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get current seed for deterministic replay
   * OpenAI doesn't use seeds, so return 'openai' as identifier
   */
  getCurrentSeed(): string {
    return 'openai';
  }

  /**
   * Generate a new proposal using OpenAI's API
   * @param prompt - The prompt for proposal generation
   * @param gameSnapshot - Current game state (unused in OpenAI calls)
   * @returns Promise resolving to proposal response
   */
  async propose(prompt: string, _gameSnapshot?: GameSnapshot): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🤖 [OpenAI] Generating proposal...');
    console.log('🤖 [OpenAI] Request type: Proposal generation');
    
    // Create default snapshot if none provided
    const snapshot = _gameSnapshot || {
      rules: [],
      players: [],
      proposals: [],
      turn: 1,
      phase: 'playing',
      proofStatement: ''
    } as GameSnapshot;
    
    const systemPrompt = this.buildSystemPrompt(prompt, snapshot);
    const userPrompt = this.buildProposalPrompt(snapshot);

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      console.log('✅ [OpenAI] Proposal generated successfully');
      console.log('✅ [OpenAI] Response length:', response.length, 'characters');
      return this.formatProposalResponse(response);
    } catch (error) {
      console.error('❌ [OpenAI] Proposal generation failed:', error);
      throw new Error(`OpenAI proposal generation failed: ${error}`);
    }
  }

  /**
   * Generate a vote using OpenAI's API
   * @param prompt - The prompt for vote generation  
   * @param gameSnapshot - Current game state (unused in OpenAI calls)
   * @returns Promise resolving to vote response
   */
  async vote(prompt: string, _gameSnapshot?: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🤖 [OpenAI] Generating vote...');
    console.log('🤖 [OpenAI] Request type: Vote generation');
    
    // Create default snapshot if none provided
    const snapshot = _gameSnapshot || {
      rules: [],
      players: [],
      proposals: [],
      turn: 1,
      phase: 'playing',
      proofStatement: ''
    } as GameSnapshot;
    
    const systemPrompt = this.buildVotingSystemPrompt(snapshot);
    const userPrompt = this.buildVotingPrompt(prompt);

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const vote = this.parseVoteResponse(response);
      console.log(`✅ [OpenAI] Vote generated: ${vote}`);
      console.log('✅ [OpenAI] Response processed successfully');
      return vote;
    } catch (error) {
      console.error('❌ [OpenAI] Vote generation failed:', error);
      throw new Error(`OpenAI voting failed: ${error}`);
    }
  }

  /**
   * Makes a call to OpenAI Chat Completions API with rate limiting
   * 
   * @private
   */
  private async callOpenAI(messages: Array<{role: string, content: string}>): Promise<string> {
    // Rate limiting: ensure minimum delay between API calls
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.minDelayBetweenCalls) {
      const delayNeeded = this.minDelayBetweenCalls - timeSinceLastCall;
      const delaySeconds = Math.ceil(delayNeeded / 1000);
      console.log(`🤖 [OpenAI] Rate limiting: waiting ${delaySeconds}s (${delayNeeded}ms) before API call`);
      console.log(`🤖 [OpenAI] Reason: Free tier limit is 3 requests/minute`);
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    this.lastApiCall = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    console.log('🤖 [OpenAI] Making API call...');
    console.log('🤖 [OpenAI] Endpoint:', `${this.baseUrl}/chat/completions`);
    console.log('🤖 [OpenAI] Message count:', messages.length);
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [OpenAI] API error: HTTP ${response.status} - ${errorText}`);
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          console.warn(`⚠️ [OpenAI] Rate limit exceeded - you have 3 requests/minute limit`);
          console.warn(`⚠️ [OpenAI] Wait 60 seconds and try again, or upgrade your OpenAI plan`);
          console.warn(`⚠️ [OpenAI] Game will pause automatically to respect rate limits`);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ [OpenAI] Invalid response format:', data);
        throw new Error('Invalid response format from OpenAI');
      }

      console.log('✅ [OpenAI] API call successful');
      console.log('✅ [OpenAI] Tokens used:', data.usage?.total_tokens || 'unknown');
      console.log('✅ [OpenAI] Model used:', data.model || 'gpt-3.5-turbo');
      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ [OpenAI] Request timeout after 5000ms');
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Builds system prompt for proposal generation
   * 
   * @private
   */
  private buildSystemPrompt(basePrompt: string, gameSnapshot: GameSnapshot): string {
    // Include Prompt P (proof statement) if available
    const promptPSection = gameSnapshot.proofStatement ? 
      `\nPROOF STATEMENT P:\n${gameSnapshot.proofStatement}\n` : '';
    
    return `${basePrompt}${promptPSection}

You are playing Nomic, a game about changing rules. Here's the current game state:

Rules:
${gameSnapshot.rules.map(rule => `- Rule ${rule.id}: ${rule.text} (${rule.mutable ? 'Mutable' : 'Immutable'})`).join('\n')}

Players:
${gameSnapshot.players.map(player => `- ${player.name}: ${player.points} points`).join('\n')}

Previous Proposals:
${gameSnapshot.proposals.slice(-3).map(proposal => `- Proposal ${proposal.id} (${proposal.type}): ${proposal.ruleText} - ${proposal.status}`).join('\n')}

Current Turn: ${gameSnapshot.turn}

Your goal is to propose a strategic rule change that helps you win while following Nomic conventions.`;
  }

  /**
   * Builds user prompt for proposal generation
   * 
   * @private
   */
  private buildProposalPrompt(gameSnapshot: GameSnapshot): string {
    return `Please propose a new rule change. Your response must be in this exact format (DO NOT include an ID number):

### Proposal
Type: [Add|Amend|Repeal|Transmute]
Number: [rule number]
Text: "[rule text]"

Make sure to:
1. Choose an appropriate proposal type
2. Use a unique rule number for Add proposals
3. Target existing rules for Amend/Repeal/Transmute
4. Write clear, unambiguous rule text
5. Consider the strategic implications`;
  }

  /**
   * Builds system prompt for voting
   * 
   * @private
   */
  private buildVotingSystemPrompt(gameSnapshot: GameSnapshot): string {
    // Include Prompt P (proof statement) if available
    const promptPSection = gameSnapshot.proofStatement ? 
      `PROOF STATEMENT P:\n${gameSnapshot.proofStatement}\n\n` : '';
    
    return `${promptPSection}You are voting on a proposal in Nomic. Consider:

Current Game State:
- Your current standing among players
- How this proposal affects your chances of winning
- The strategic implications of the rule change
- Whether the proposal is well-written and clear

Vote strategically but fairly. You must respond with exactly one of: FOR, AGAINST, or ABSTAIN`;
  }

  /**
   * Builds user prompt for voting
   * 
   * @private
   */
  private buildVotingPrompt(proposalMarkdown: string): string {
    return `Here is the proposal to vote on:

${proposalMarkdown}

Please vote FOR, AGAINST, or ABSTAIN. Consider the strategic implications and rule clarity.

Your vote:`;
  }

  /**
   * Formats the OpenAI response into proper proposal markdown
   * 
   * @private
   */
  private formatProposalResponse(response: string): string {
    // Clean up the response and ensure proper format
    let cleaned = response.trim();
    
    // If response doesn't start with ###, add it
    if (!cleaned.startsWith('### Proposal')) {
      // Try to extract components and reformat (no ID needed)
      const typeMatch = cleaned.match(/Type:\s*(Add|Amend|Repeal|Transmute)/i);
      const numberMatch = cleaned.match(/Number:\s*(\d+)/);
      const textMatch = cleaned.match(/Text:\s*["'](.+)["']/s);
      
      if (typeMatch && numberMatch && textMatch) {
        cleaned = `### Proposal\nType: ${typeMatch[1]}\nNumber: ${numberMatch[1]}\nText: "${textMatch[1]}"`;
      }
    }
    
    return cleaned;
  }

  /**
   * Parses the vote response from OpenAI
   * 
   * @private
   */
  private parseVoteResponse(response: string): 'FOR' | 'AGAINST' | 'ABSTAIN' {
    const cleaned = response.trim().toUpperCase();
    
    if (cleaned.includes('FOR') || cleaned.includes('YES')) {
      return 'FOR';
    } else if (cleaned.includes('AGAINST') || cleaned.includes('NO')) {
      return 'AGAINST';
    } else if (cleaned.includes('ABSTAIN')) {
      return 'ABSTAIN';
    }
    
    // Default to ABSTAIN if unclear
    return 'ABSTAIN';
  }
} 