import type { GameSnapshot } from '../models/GameModel';

/**
 * Interface for LLM agents that can serve as judges
 * 
 * Per Rule 122: The Judge must state why each Proposal's Proof Section 
 * is sound or unsound. This written justification becomes part of the 
 * public record.
 */
export interface IJudgeAgent {
  /**
   * Evaluates a proposal's proof section for soundness
   * 
   * @param proposalId - ID of the proposal being judged
   * @param proposalText - Full text of the proposal including proof section
   * @param gameSnapshot - Current game state for context
   * @returns Promise resolving to judge verdict and justification
   */
  judge(
    proposalId: number,
    proposalText: string,
    gameSnapshot: GameSnapshot
  ): Promise<{
    verdict: 'sound' | 'unsound';
    justification: string;
  }>;

  /**
   * Checks if this judge agent is available for use
   */
  isAvailable(): boolean;

  /**
   * Returns the agent type for identification
   */
  getType(): 'openai' | 'ollama' | 'mock';
}

/**
 * OpenAI-based judge agent implementation
 * 
 * Uses GPT models to evaluate proof sections according to Rule 121 criteria:
 * (a) adoption does not render the ruleset inconsistent
 * (b) maintains or improves likelihood of satisfying Prompt P
 */
export class OpenAIJudgeAgent implements IJudgeAgent {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';
  private model: string = 'gpt-3.5-turbo';
  private timeout: number = 10000; // 10 seconds

  constructor(apiKey: string, options?: {
    baseUrl?: string;
    model?: string;
    timeout?: number;
  }) {
    this.apiKey = apiKey;
    if (options?.baseUrl) this.baseUrl = options.baseUrl;
    if (options?.model) this.model = options.model;
    if (options?.timeout) this.timeout = options.timeout;

    console.log('⚖️ [OpenAIJudge] Judge agent initialized');
    console.log(`⚖️ [OpenAIJudge] Model: ${this.model}`);
  }

  async judge(
    proposalId: number,
    proposalText: string,
    gameSnapshot: GameSnapshot
  ): Promise<{ verdict: 'sound' | 'unsound'; justification: string }> {
    try {
      const systemPrompt = this.buildJudgeSystemPrompt(gameSnapshot);
      const userPrompt = this.buildJudgeUserPrompt(proposalId, proposalText);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1, // Low temperature for consistent judicial decisions
          max_tokens: 500
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      const judgeResponse = result.choices[0].message.content.trim();
      console.log('⚖️ [OpenAIJudge] Raw response:', judgeResponse);

      return this.parseJudgeResponse(judgeResponse);

    } catch (error) {
      console.error('❌ [OpenAIJudge] Error during judgment:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }

  getType(): 'openai' {
    return 'openai';
  }

  /**
   * Builds the system prompt for judge evaluation
   * @private
   */
  private buildJudgeSystemPrompt(gameSnapshot: GameSnapshot): string {
    const promptPSection = gameSnapshot.proofStatement ? 
      `\nPROOF STATEMENT P:\n${gameSnapshot.proofStatement}\n` : '';

    return `${promptPSection}You are serving as a Judge in a Nomic game. Your role is to evaluate proposal proof sections according to Rule 121.

JUDGING CRITERIA (Rule 121):
A proof section is SOUND if it demonstrates that the proposal's adoption:
(a) does not render the ruleset inconsistent, AND 
(b) maintains or improves the likelihood that an LLM following the Development Rulebook can satisfy Prompt P

A proof section is UNSOUND if:
- It fails to address consistency with existing rules
- It fails to show alignment with Prompt P objectives
- It contains logical errors or contradictions
- It is superficial or lacks proper reasoning

CURRENT GAME STATE:
Rules: ${gameSnapshot.rules.length} total rules
Turn: ${gameSnapshot.turn}
Phase: ${gameSnapshot.phase}

CRITICAL RULES FOR CONTEXT:
${gameSnapshot.rules.filter(r => r.id >= 120 && r.id <= 122).map(r => 
  `Rule ${r.id}: ${r.text}`
).join('\n')}

You must respond with exactly this format:
VERDICT: [SOUND|UNSOUND]
JUSTIFICATION: [Your detailed reasoning explaining why the proof is sound or unsound, referencing the criteria above]

Be thorough but concise. Your justification becomes part of the public record per Rule 122.`;
  }

  /**
   * Builds the user prompt with the specific proposal to judge
   * @private
   */
  private buildJudgeUserPrompt(proposalId: number, proposalText: string): string {
    return `Please evaluate the proof section of this proposal:

PROPOSAL ${proposalId}:
${proposalText}

Analyze the proof section carefully against Rule 121 criteria and provide your verdict with justification.`;
  }

  /**
   * Parses the LLM response into structured verdict and justification
   * @private
   */
  private parseJudgeResponse(response: string): { verdict: 'sound' | 'unsound'; justification: string } {
    try {
      // Extract verdict
      const verdictMatch = response.match(/VERDICT:\s*(SOUND|UNSOUND)/i);
      if (!verdictMatch) {
        throw new Error('Judge response missing required VERDICT field');
      }

      const verdict = verdictMatch[1].toLowerCase() as 'sound' | 'unsound';

      // Extract justification
      const justificationMatch = response.match(/JUSTIFICATION:\s*(.+)$/is);
      if (!justificationMatch) {
        throw new Error('Judge response missing required JUSTIFICATION field');
      }

      const justification = justificationMatch[1].trim();

      if (!justification || justification.length === 0) {
        throw new Error('Judge justification cannot be empty per Rule 122');
      }

      console.log(`⚖️ [OpenAIJudge] Verdict: ${verdict.toUpperCase()}`);
      console.log(`⚖️ [OpenAIJudge] Justification: ${justification}`);

      return { verdict, justification };

    } catch (error) {
      console.error('❌ [OpenAIJudge] Failed to parse judge response:', response);
      throw new Error(`Invalid judge response format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Ollama-based judge agent implementation
 * 
 * Uses local Ollama models to evaluate proof sections
 */
export class OllamaJudgeAgent implements IJudgeAgent {
  private baseUrl: string;
  private model: string;
  private timeout: number = 15000; // 15 seconds for local processing

  constructor(options: {
    baseUrl?: string;
    model?: string;
    timeout?: number;
  } = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.model = options.model || 'mistral:7b-instruct';
    this.timeout = options.timeout || 15000;

    console.log('⚖️ [OllamaJudge] Local judge agent initialized');
    console.log(`⚖️ [OllamaJudge] Base URL: ${this.baseUrl}`);
    console.log(`⚖️ [OllamaJudge] Model: ${this.model}`);
  }

  async judge(
    proposalId: number,
    proposalText: string,
    gameSnapshot: GameSnapshot
  ): Promise<{ verdict: 'sound' | 'unsound'; justification: string }> {
    try {
      const systemPrompt = this.buildJudgeSystemPrompt(gameSnapshot);
      const userPrompt = this.buildJudgeUserPrompt(proposalId, proposalText);

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 500
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from Ollama API');
      }

      const judgeResponse = result.choices[0].message.content.trim();
      console.log('⚖️ [OllamaJudge] Raw response:', judgeResponse);

      return this.parseJudgeResponse(judgeResponse);

    } catch (error) {
      console.error('❌ [OllamaJudge] Error during judgment:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    // For Ollama, we assume it's available if the configuration is provided
    // Real availability would require a health check
    return true;
  }

  getType(): 'ollama' {
    return 'ollama';
  }

  private buildJudgeSystemPrompt(gameSnapshot: GameSnapshot): string {
    const promptPSection = gameSnapshot.proofStatement ? 
      `\nPROOF STATEMENT P:\n${gameSnapshot.proofStatement}\n` : '';

    return `${promptPSection}You are a Judge in Nomic. Evaluate proposal proof sections per Rule 121.

CRITERIA:
- SOUND: Shows (a) no ruleset inconsistency AND (b) maintains/improves Prompt P alignment
- UNSOUND: Fails criteria, has logical errors, or lacks proper reasoning

CURRENT RULES: ${gameSnapshot.rules.length}
TURN: ${gameSnapshot.turn}

Respond exactly as:
VERDICT: [SOUND|UNSOUND]
JUSTIFICATION: [detailed reasoning]

Be thorough but concise.`;
  }

  private buildJudgeUserPrompt(proposalId: number, proposalText: string): string {
    return `Evaluate this proposal's proof section:

PROPOSAL ${proposalId}:
${proposalText}

Apply Rule 121 criteria and provide verdict with justification.`;
  }

  private parseJudgeResponse(response: string): { verdict: 'sound' | 'unsound'; justification: string } {
    try {
      const verdictMatch = response.match(/VERDICT:\s*(SOUND|UNSOUND)/i);
      if (!verdictMatch) {
        throw new Error('Missing VERDICT field');
      }

      const verdict = verdictMatch[1].toLowerCase() as 'sound' | 'unsound';

      const justificationMatch = response.match(/JUSTIFICATION:\s*(.+)$/is);
      if (!justificationMatch) {
        throw new Error('Missing JUSTIFICATION field');
      }

      const justification = justificationMatch[1].trim();
      if (!justification) {
        throw new Error('Empty justification per Rule 122');
      }

      console.log(`⚖️ [OllamaJudge] Verdict: ${verdict.toUpperCase()}`);
      console.log(`⚖️ [OllamaJudge] Justification: ${justification}`);

      return { verdict, justification };

    } catch (error) {
      console.error('❌ [OllamaJudge] Parse error:', response);
      throw new Error(`Invalid judge response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Mock judge agent for testing and development
 * 
 * Provides deterministic judge verdicts for consistent testing
 */
export class MockJudgeAgent implements IJudgeAgent {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    console.log('⚖️ [MockJudge] Mock judge agent initialized');
    console.log(`⚖️ [MockJudge] Seed: ${seed}`);
  }

  async judge(
    proposalId: number,
    proposalText: string,
    gameSnapshot: GameSnapshot
  ): Promise<{ verdict: 'sound' | 'unsound'; justification: string }> {
    // Deterministic verdict based on proposal ID and seed
    const hash = this.simpleHash(proposalId + this.seed);
    const isSound = hash % 3 !== 0; // ~67% sound rate

    const verdict: 'sound' | 'unsound' = isSound ? 'sound' : 'unsound';
    
    const justification = isSound
      ? `The proof section adequately demonstrates rule consistency and alignment with game objectives. The proposed change maintains logical coherence with existing rules and supports the Development Rulebook goals per Rule 121 criteria.`
      : `The proof section fails to sufficiently demonstrate rule consistency or alignment with Prompt P objectives. The reasoning lacks depth in analyzing potential conflicts with existing rules and does not adequately address Rule 121 requirements.`;

    console.log(`⚖️ [MockJudge] Proposal ${proposalId}: ${verdict.toUpperCase()}`);
    console.log(`⚖️ [MockJudge] Justification: ${justification}`);

    // Simulate judge thinking time
    await new Promise(resolve => setTimeout(resolve, 100));

    return { verdict, justification };
  }

  isAvailable(): boolean {
    return true;
  }

  getType(): 'mock' {
    return 'mock';
  }

  /**
   * Simple hash function for deterministic behavior
   * @private
   */
  private simpleHash(input: number): number {
    let hash = input;
    hash = ((hash << 5) - hash + 127) & 0xffffffff;
    hash = ((hash << 5) - hash + 31) & 0xffffffff;
    return Math.abs(hash);
  }
}

/**
 * Factory function to create appropriate judge agent based on configuration
 */
export function createJudgeAgent(): IJudgeAgent {
  // Check for explicit agent type preference
  const agentType = process.env.JUDGE_AGENT_TYPE;
  
  if (agentType === 'openai' || (!agentType && process.env.LLM_TOKEN)) {
    if (process.env.LLM_TOKEN) {
      return new OpenAIJudgeAgent(process.env.LLM_TOKEN);
    }
  }

  if (agentType === 'ollama' || (!agentType && (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL))) {
    return new OllamaJudgeAgent({
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL
    });
  }

  // Default to mock agent
  console.log('⚖️ [JudgeFactory] No real LLM configured, using mock judge agent');
  return new MockJudgeAgent();
} 