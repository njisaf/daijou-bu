import pLimit from 'p-limit';
import { type IAgent } from './IAgent';
import { OpenAIAgentAdapter } from './OpenAIAgentAdapter';
import { OllamaAgent } from './OllamaAgent';
import { MockAgent } from './MockAgent';
import { type GameSnapshot } from '../mocks/MockMCPService';
import { getGameConfig } from '../config';

/**
 * Agent Factory with Fallback and Concurrency Management
 * 
 * This factory creates and manages LLM agents with automatic fallback on failures.
 * It implements retry logic and switches to MockAgent after consecutive failures.
 * 
 * @see Phase 5 Objective 3: Agent factory
 * @see Phase 5 Objective 4: Fallback & retry
 * @see Phase 5 Objective 5: Concurrency bump
 */
export class AgentFactory {
  private primaryAgent: IAgent;
  private fallbackAgent: MockAgent;
  private consecutiveFailures: Map<string, number> = new Map();
  private maxConsecutiveFailures = 3;
  private limit: ReturnType<typeof pLimit>;
  private hasFallenBack = false;

  constructor() {
    const config = getGameConfig();
    this.limit = pLimit(config.agent.concurrency);
    
    // Create primary agent based on configuration
    this.primaryAgent = this.createPrimaryAgent(config.agent.type);
    
    // Always have a fallback mock agent ready
    this.fallbackAgent = new MockAgent();
    
    console.log(`🏭 [AgentFactory] Initialized with ${config.agent.type} agent`);
    console.log(`🏭 [AgentFactory] Concurrency limit: ${config.agent.concurrency}`);
    console.log(`🏭 [AgentFactory] Primary agent available: ${this.primaryAgent.isAvailable()}`);
  }

  /**
   * Create the primary agent based on configuration
   * @private
   */
  private createPrimaryAgent(type: 'openai' | 'ollama' | 'mock'): IAgent {
    switch (type) {
      case 'openai':
        const openaiAgent = new OpenAIAgentAdapter();
        if (openaiAgent.isAvailable()) {
          console.log('🚀 [AgentFactory] OpenAI agent configured and ready');
          return openaiAgent;
        } else {
          console.warn('⚠️ [AgentFactory] OpenAI agent not available, falling back to mock');
          return new MockAgent();
        }
        
      case 'ollama':
        const ollamaAgent = new OllamaAgent();
        if (ollamaAgent.isAvailable()) {
          console.log('🦙 [AgentFactory] Ollama agent configured and ready');
          return ollamaAgent;
        } else {
          console.warn('⚠️ [AgentFactory] Ollama agent not available, falling back to mock');
          return new MockAgent();
        }
        
      case 'mock':
      default:
        console.log('🎭 [AgentFactory] Mock agent selected');
        return new MockAgent();
    }
  }

  /**
   * Get the current active agent (primary or fallback)
   */
  getAgent(): IAgent {
    return this.hasFallenBack ? this.fallbackAgent : this.primaryAgent;
  }

  /**
   * Generate a proposal with fallback and concurrency control
   */
  async propose(gameSnapshot: GameSnapshot, prompt?: string): Promise<string> {
    return this.limit(async () => {
      const agent = this.getAgent();
      const agentType = agent.getType();
      
      try {
        const result = await agent.propose(gameSnapshot, prompt);
        
        // Reset failure count on success
        this.consecutiveFailures.set(agentType, 0);
        
        return result;
      } catch (error) {
        console.error(`❌ [AgentFactory] Proposal failed with ${agentType} agent:`, error);
        
        // Track consecutive failures
        const currentFailures = this.consecutiveFailures.get(agentType) || 0;
        const newFailures = currentFailures + 1;
        this.consecutiveFailures.set(agentType, newFailures);
        
        // Check if we should fallback
        if (newFailures >= this.maxConsecutiveFailures && !this.hasFallenBack) {
          console.warn(`🔄 [AgentFactory] ${newFailures} consecutive failures with ${agentType}, switching to mock agent`);
          console.warn('🔄 [AgentFactory] ====================================');
          console.warn('🔄 [AgentFactory] AUTOMATIC FALLBACK TO MOCK AGENT');
          console.warn('🔄 [AgentFactory] Primary agent has failed too many times');
          console.warn('🔄 [AgentFactory] Game will continue with deterministic responses');
          console.warn('🔄 [AgentFactory] ====================================');
          
          this.hasFallenBack = true;
          
          // Retry with fallback agent
          return this.fallbackAgent.propose(gameSnapshot, prompt);
        }
        
        throw error;
      }
    });
  }

  /**
   * Generate a vote with fallback and concurrency control
   */
  async vote(proposal: string, gameSnapshot: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> {
    return this.limit(async () => {
      const agent = this.getAgent();
      const agentType = agent.getType();
      
      try {
        const result = await agent.vote(proposal, gameSnapshot);
        
        // Reset failure count on success
        this.consecutiveFailures.set(agentType, 0);
        
        return result;
      } catch (error) {
        console.error(`❌ [AgentFactory] Vote failed with ${agentType} agent:`, error);
        
        // Track consecutive failures
        const currentFailures = this.consecutiveFailures.get(agentType) || 0;
        const newFailures = currentFailures + 1;
        this.consecutiveFailures.set(agentType, newFailures);
        
        // Check if we should fallback
        if (newFailures >= this.maxConsecutiveFailures && !this.hasFallenBack) {
          console.warn(`🔄 [AgentFactory] ${newFailures} consecutive failures with ${agentType}, switching to mock agent`);
          console.warn('🔄 [AgentFactory] ====================================');
          console.warn('🔄 [AgentFactory] AUTOMATIC FALLBACK TO MOCK AGENT');
          console.warn('🔄 [AgentFactory] Primary agent has failed too many times');
          console.warn('🔄 [AgentFactory] Game will continue with deterministic responses');
          console.warn('🔄 [AgentFactory] ====================================');
          
          this.hasFallenBack = true;
          
          // Retry with fallback agent
          return this.fallbackAgent.vote(proposal, gameSnapshot);
        }
        
        throw error;
      }
    });
  }

  /**
   * Get current seed for deterministic replay
   */
  getCurrentSeed(): string {
    return this.getAgent().getCurrentSeed?.() || 'unknown';
  }

  /**
   * Check if the primary agent is still being used
   */
  isUsingPrimaryAgent(): boolean {
    return !this.hasFallenBack;
  }

  /**
   * Get agent status information
   */
  getStatus(): {
    primaryAgent: string;
    currentAgent: string;
    isUsingPrimary: boolean;
    consecutiveFailures: Record<string, number>;
    concurrencyLimit: number;
  } {
    return {
      primaryAgent: this.primaryAgent.getType(),
      currentAgent: this.getAgent().getType(),
      isUsingPrimary: this.isUsingPrimaryAgent(),
      consecutiveFailures: Object.fromEntries(this.consecutiveFailures),
      concurrencyLimit: getGameConfig().agent.concurrency
    };
  }

  /**
   * Reset failure counts and fallback state (useful for testing)
   */
  reset(): void {
    this.consecutiveFailures.clear();
    this.hasFallenBack = false;
    console.log('🔄 [AgentFactory] Reset to primary agent');
  }
}

/**
 * Global agent factory instance
 */
let globalAgentFactory: AgentFactory | null = null;

/**
 * Get or create the global agent factory instance
 */
export function getAgentFactory(): AgentFactory {
  if (!globalAgentFactory) {
    globalAgentFactory = new AgentFactory();
  }
  return globalAgentFactory;
}

/**
 * Reset the global agent factory (useful for testing)
 */
export function resetAgentFactory(): void {
  globalAgentFactory = null;
} 