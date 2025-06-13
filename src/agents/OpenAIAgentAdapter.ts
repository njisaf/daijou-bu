import { type IAgent } from './IAgent';
import { OpenAIAgent } from './openaiAgent';
import { type GameSnapshot } from '../mocks/MockMCPService';

/**
 * OpenAI Agent Adapter
 * 
 * This adapter wraps the existing OpenAIAgent to implement the IAgent interface.
 * It maintains compatibility with the existing OpenAI integration while providing
 * the standardized interface.
 * 
 * @see Phase 5 Objective 1: IAgent abstraction
 */
export class OpenAIAgentAdapter implements IAgent {
  private openaiAgent: OpenAIAgent;

  constructor() {
    this.openaiAgent = new OpenAIAgent();
  }

  /**
   * Check if the agent is available
   */
  isAvailable(): boolean {
    return this.openaiAgent.isAvailable();
  }

  /**
   * Get current seed for deterministic replay
   */
  getCurrentSeed(): string {
    return this.openaiAgent.getCurrentSeed();
  }

  /**
   * Get agent type identifier
   */
  getType(): 'openai' {
    return 'openai';
  }

  /**
   * Generate a proposal using OpenAI's API
   * @param gameSnapshot - Current game state for context
   * @param prompt - Optional prompt text to influence proposal generation
   * @returns Promise resolving to proposal response
   */
  async propose(gameSnapshot: GameSnapshot, prompt?: string): Promise<string> {
    return this.openaiAgent.propose(prompt || 'Generate a rule proposal', gameSnapshot);
  }

  /**
   * Generate a vote using OpenAI's API
   * @param proposal - The proposal to vote on in markdown format
   * @param gameSnapshot - Current game state for context
   * @returns Promise resolving to vote choice
   */
  async vote(proposal: string, gameSnapshot: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> {
    return this.openaiAgent.vote(proposal, gameSnapshot);
  }
} 