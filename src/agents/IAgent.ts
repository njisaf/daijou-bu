import { type GameSnapshot } from '../mocks/MockMCPService';

/**
 * Common interface for all LLM agents (OpenAI, Ollama, Mock)
 * 
 * This interface standardizes the agent contract across different LLM providers.
 * All agents must implement proposal generation and voting capabilities.
 * 
 * @see Phase 5 Objective 1: IAgent abstraction
 */
export interface IAgent {
  /**
   * Generate a proposal based on game state
   * @param gameSnapshot - Current game state for context
   * @param prompt - Optional prompt text to influence proposal generation
   * @returns Promise resolving to proposal response in markdown format
   */
  propose(gameSnapshot: GameSnapshot, prompt?: string): Promise<string>;
  
  /**
   * Generate a vote based on proposal and game state
   * @param proposal - The proposal to vote on in markdown format
   * @param gameSnapshot - Current game state for context
   * @returns Promise resolving to vote choice
   */
  vote(proposal: string, gameSnapshot: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'>;
  
  /**
   * Check if the agent is available for use
   * @returns true if agent is properly configured and ready
   */
  isAvailable(): boolean;
  
  /**
   * Get current seed for deterministic replay (optional)
   * @returns seed string for logging and debugging
   */
  getCurrentSeed?(): string;
  
  /**
   * Get agent type identifier
   * @returns Agent type string for logging and switching
   */
  getType(): 'openai' | 'ollama' | 'mock';
} 