import { type IAgent } from './IAgent';
import { MockMCPService, type GameSnapshot } from '../mocks/MockMCPService';

/**
 * Mock Agent Adapter
 * 
 * This adapter wraps the existing MockMCPService to implement the IAgent interface.
 * It provides deterministic behavior for testing and development.
 * 
 * @see Phase 5 Objective 1: IAgent abstraction
 */
export class MockAgent implements IAgent {
  private mockService: MockMCPService;

  constructor(seed?: number) {
    this.mockService = new MockMCPService(seed);
  }

  /**
   * Check if the agent is available
   */
  isAvailable(): boolean {
    return true; // Mock agent is always available
  }

  /**
   * Get current seed for deterministic replay
   */
  getCurrentSeed(): string {
    return this.mockService.getCurrentSeed();
  }

  /**
   * Get agent type identifier
   */
  getType(): 'mock' {
    return 'mock';
  }

  /**
   * Generate a proposal using the mock service
   * @param gameSnapshot - Current game state for context
   * @param prompt - Optional prompt text (unused in mock)
   * @returns Promise resolving to proposal response
   */
  async propose(gameSnapshot: GameSnapshot, prompt?: string): Promise<string> {
    return Promise.resolve(this.mockService.propose(prompt || 'Generate a rule proposal', gameSnapshot));
  }

  /**
   * Generate a vote using the mock service
   * @param proposal - The proposal to vote on in markdown format
   * @param gameSnapshot - Current game state for context
   * @returns Promise resolving to vote choice
   */
  async vote(proposal: string, gameSnapshot: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> {
    return Promise.resolve(this.mockService.vote(proposal, gameSnapshot));
  }

  /**
   * Reseed the mock service for testing
   */
  reseed(newSeed: number): void {
    this.mockService.reseed(newSeed);
  }
} 