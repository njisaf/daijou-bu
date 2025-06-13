import { type IAgent } from './IAgent';
import { type GameSnapshot } from '../mocks/MockMCPService';

/**
 * Ollama Local LLM Agent
 * 
 * This agent connects to a local Ollama server running on localhost:11434
 * (or configured via OLLAMA_BASE_URL). It uses the OpenAI-compatible API
 * endpoint /v1/chat/completions without requiring authentication.
 * 
 * @see Phase 5 Objective 2: OllamaAgent implementation
 */
export class OllamaAgent implements IAgent {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'mistral:7b-instruct';
    this.timeout = 20000; // 20 second timeout (higher than TurnOrchestrator's 15s)

    // Enhanced initialization logging
    if (this.isAvailable()) {
      console.log('🦙 [Ollama] Local LLM integration initialized');
      console.log('🦙 [Ollama] Base URL:', this.baseUrl);
      console.log('🦙 [Ollama] Model:', this.model);
      console.log('🦙 [Ollama] Timeout:', this.timeout + 'ms');
      console.log('🦙 [Ollama] Integration status: ACTIVE');
      
      // Test connection on initialization
      this.testConnection();
    } else {
      console.log('🦙 [Ollama] Configuration incomplete - agent unavailable');
      console.log('🦙 [Ollama] Base URL:', this.baseUrl);
      console.log('🦙 [Ollama] Model:', this.model);
      console.log('🦙 [Ollama] Integration status: INACTIVE');
    }
  }

  /**
   * Test the Ollama API connection
   * @private
   */
  private async testConnection(): Promise<void> {
    try {
      console.log('🦙 [Ollama] Testing API connection...');
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [Ollama] API connection test successful');
        console.log('✅ [Ollama] Available models:', data.models?.length || 0);
        console.log('✅ [Ollama] Ready for LLM requests');
      } else {
        console.warn('⚠️ [Ollama] API connection test failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('⚠️ [Ollama] API connection test failed:', error);
      console.warn('⚠️ [Ollama] Make sure Ollama is running: ollama serve');
    }
  }

  /**
   * Check if the agent is available
   */
  isAvailable(): boolean {
    return !!(this.baseUrl && this.model);
  }

  /**
   * Get current seed for deterministic replay
   */
  getCurrentSeed(): string {
    return `ollama-${this.model}`;
  }

  /**
   * Get agent type identifier
   */
  getType(): 'ollama' {
    return 'ollama';
  }

  /**
   * Generate a proposal using Ollama's API
   * @param gameSnapshot - Current game state for context
   * @param prompt - Optional prompt text to influence proposal generation
   * @returns Promise resolving to proposal response
   */
  async propose(gameSnapshot: GameSnapshot, prompt?: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Ollama agent not available - check configuration');
    }

    console.log('🦙 [Ollama] Generating proposal...');
    console.log('🦙 [Ollama] Request type: Proposal generation');
    
    const systemPrompt = this.buildSystemPrompt(prompt || 'Generate a rule proposal', gameSnapshot);
    const userPrompt = this.buildProposalPrompt(gameSnapshot);

    try {
      const response = await this.callOllama([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      console.log('✅ [Ollama] Proposal generated successfully');
      console.log('✅ [Ollama] Response length:', response.length, 'characters');
      console.log('🔍 [Ollama] Raw response:', response);
      const formatted = this.formatProposalResponse(response);
      console.log('🔍 [Ollama] Formatted response:', formatted);
      return formatted;
    } catch (error) {
      console.error('❌ [Ollama] Proposal generation failed:', error);
      throw new Error(`Ollama proposal generation failed: ${error}`);
    }
  }

  /**
   * Generate a vote using Ollama's API
   * @param proposal - The proposal to vote on in markdown format
   * @param gameSnapshot - Current game state for context
   * @returns Promise resolving to vote choice
   */
  async vote(proposal: string, gameSnapshot: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> {
    if (!this.isAvailable()) {
      throw new Error('Ollama agent not available - check configuration');
    }

    console.log('🦙 [Ollama] Generating vote...');
    console.log('🦙 [Ollama] Request type: Vote generation');
    
    const systemPrompt = this.buildVotingSystemPrompt(gameSnapshot);
    const userPrompt = this.buildVotingPrompt(proposal);

    try {
      const response = await this.callOllama([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const vote = this.parseVoteResponse(response);
      console.log(`✅ [Ollama] Vote generated: ${vote}`);
      console.log('✅ [Ollama] Response processed successfully');
      return vote;
    } catch (error) {
      console.error('❌ [Ollama] Vote generation failed:', error);
      throw new Error(`Ollama voting failed: ${error}`);
    }
  }

  /**
   * Makes a call to Ollama Chat Completions API
   * @private
   */
  private async callOllama(messages: Array<{role: string, content: string}>): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    console.log('🦙 [Ollama] Making API call...');
    console.log('🦙 [Ollama] Endpoint:', `${this.baseUrl}/v1/chat/completions`);
    console.log('🦙 [Ollama] Message count:', messages.length);
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: No Authorization header needed for Ollama
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Ollama] API Error:', response.status, response.statusText);
        console.error('❌ [Ollama] Error details:', errorText);
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('❌ [Ollama] Invalid response format:', data);
        throw new Error('Invalid response format from Ollama API');
      }

      const content = data.choices[0].message.content;
      console.log('✅ [Ollama] API call successful');
      console.log('✅ [Ollama] Response length:', content.length, 'characters');
      
      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('❌ [Ollama] Request timeout after', this.timeout, 'ms');
        throw new Error(`Ollama request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Build system prompt for proposal generation
   * @private
   */
  private buildSystemPrompt(basePrompt: string, gameSnapshot: GameSnapshot): string {
    const ruleCount = gameSnapshot.rules.length;
    const playerCount = gameSnapshot.players.length;
    const turn = gameSnapshot.turn;
    
    // Include Prompt P (proof statement) if available
    const promptPSection = gameSnapshot.proofStatement ? 
      `\nPROOF STATEMENT P:\n${gameSnapshot.proofStatement}\n` : '';
    
    return `${basePrompt}${promptPSection}

You are playing Nomic, a game where players propose rule changes and vote on them.

Game Context:
- Turn: ${turn}
- Players: ${playerCount}
- Current Rules: ${ruleCount}
- Phase: ${gameSnapshot.phase}

Current Rules:
${gameSnapshot.rules.map(r => `${r.id}. ${r.text} ${r.mutable ? '(mutable)' : '(immutable)'}`).join('\n')}

Generate a proposal in this exact format (DO NOT include an ID number):
### Proposal
Type: [Add|Amend|Repeal|Transmute]
Number: [rule number]
Text: "[rule text]"

Be strategic and consider the current game state.`;
  }

  /**
   * Build user prompt for proposal generation
   * @private
   */
  private buildProposalPrompt(gameSnapshot: GameSnapshot): string {
    const currentPlayer = gameSnapshot.players.find(p => p.isActive);
    const standings = gameSnapshot.players
      .sort((a, b) => b.points - a.points)
      .map(p => `${p.name}: ${p.points} points`)
      .join(', ');
    
    return `Current player: ${currentPlayer?.name || 'Unknown'}
Current standings: ${standings}
Turn: ${gameSnapshot.turn}

Please generate a strategic rule proposal that could help you win the game.`;
  }

  /**
   * Build system prompt for voting
   * @private
   */
  private buildVotingSystemPrompt(gameSnapshot: GameSnapshot): string {
    // Include Prompt P (proof statement) if available
    const promptPSection = gameSnapshot.proofStatement ? 
      `PROOF STATEMENT P:\n${gameSnapshot.proofStatement}\n\n` : '';
    
    return `${promptPSection}You are voting on a rule proposal in Nomic.

Game Context:
- Turn: ${gameSnapshot.turn}
- Players: ${gameSnapshot.players.length}
- Phase: ${gameSnapshot.phase}

Current Standings:
${gameSnapshot.players.map(p => `${p.name}: ${p.points} points`).join('\n')}

Vote strategically based on:
1. How the proposal affects your chances of winning
2. The current game state and rules
3. Your position relative to other players

Respond with exactly one word: FOR, AGAINST, or ABSTAIN`;
  }

  /**
   * Build user prompt for voting
   * @private
   */
  private buildVotingPrompt(proposalMarkdown: string): string {
    return `Please vote on this proposal:

${proposalMarkdown}

Your vote (FOR/AGAINST/ABSTAIN):`;
  }

  /**
   * Format proposal response for consistency
   * @private
   */
  private formatProposalResponse(response: string): string {
    // Ensure the response is in the expected format
    if (!response.includes('### Proposal')) {
      // Try to extract key information and format it
      const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Basic fallback formatting (no ID needed)
      return `### Proposal
Type: Add
Number: ${300 + Math.floor(Math.random() * 100)}
Text: "${lines[0] || 'Generated rule proposal'}"`;
    }
    
    return response.trim();
  }

  /**
   * Parse vote response to ensure valid format
   * @private
   */
  private parseVoteResponse(response: string): 'FOR' | 'AGAINST' | 'ABSTAIN' {
    const cleaned = response.trim().toUpperCase();
    
    if (cleaned.includes('FOR') || cleaned.includes('YES') || cleaned.includes('SUPPORT')) {
      return 'FOR';
    }
    
    if (cleaned.includes('AGAINST') || cleaned.includes('NO') || cleaned.includes('OPPOSE')) {
      return 'AGAINST';
    }
    
    if (cleaned.includes('ABSTAIN') || cleaned.includes('NEUTRAL') || cleaned.includes('PASS')) {
      return 'ABSTAIN';
    }
    
    // Default to ABSTAIN for unclear responses
    console.warn('🦙 [Ollama] Unclear vote response, defaulting to ABSTAIN:', response);
    return 'ABSTAIN';
  }
} 