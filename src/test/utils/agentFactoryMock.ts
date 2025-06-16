/**
 * Unified Agent Factory Mock for Stage 6.6 Test Modernization
 * 
 * Provides consistent agent mocking across all test files to eliminate
 * agent configuration and timeout inconsistencies.
 */

import { vi } from 'vitest';

/**
 * Mock agent response configuration
 */
interface MockAgentConfig {
  type: 'mock' | 'ollama' | 'openai';
  mockProposalResponse?: string;
  mockVoteResponse?: 'FOR' | 'AGAINST' | 'ABSTAIN';
  simulateTimeout?: boolean;
  simulateError?: boolean;
  errorMessage?: string;
}

/**
 * Creates a consistent mock agent for testing
 */
export function createMockAgent(config: MockAgentConfig = { type: 'mock' }) {
  const mockAgent = {
    type: config.type,
    isAvailable: !config.simulateError,
    
    async propose(gameSnapshot: any): Promise<string> {
      if (config.simulateTimeout) {
        await new Promise(resolve => setTimeout(resolve, 12000)); // Longer than default timeout
      }
      
      if (config.simulateError) {
        throw new Error(config.errorMessage || `${config.type} proposal generation failed: Test error`);
      }
      
      return config.mockProposalResponse || JSON.stringify({
        type: 'ADD',
        number: 301,
        text: 'Mock proposal rule text',
        proof: 'Mock proof section for testing'
      });
    },
    
    async vote(gameSnapshot: any, proposal: any): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> {
      if (config.simulateTimeout) {
        await new Promise(resolve => setTimeout(resolve, 12000)); // Longer than default timeout
      }
      
      if (config.simulateError) {
        throw new Error(config.errorMessage || `${config.type} voting failed: Test error`);
      }
      
      return config.mockVoteResponse || 'FOR';
    }
  };
  
  return mockAgent;
}

/**
 * Mock AgentFactory for consistent test behavior
 */
export const mockAgentFactory = {
  createAgent: vi.fn((config: any) => {
    // Return appropriate mock based on config type
    return createMockAgent({ 
      type: config.type || 'mock',
      simulateError: config.type === 'unavailable'
    });
  }),
  
  getAvailableTypes: vi.fn(() => ['mock', 'ollama', 'openai']),
  
  validateConfig: vi.fn(() => true)
};

/**
 * Sets up agent factory mocks with consistent behavior
 */
export function setupAgentFactoryMocks() {
  // Mock the AgentFactory module
  vi.doMock('../../agents/AgentFactory', () => ({
    AgentFactory: mockAgentFactory,
    default: mockAgentFactory
  }));
  
  // Mock individual agent classes
  vi.doMock('../../agents/MockAgent', () => ({
    MockAgent: class MockAgent {
      constructor() {}
      async propose() { return JSON.stringify({ type: 'ADD', number: 301, text: 'Mock rule', proof: 'Mock proof' }); }
      async vote() { return 'FOR'; }
      get isAvailable() { return true; }
    }
  }));
  
  vi.doMock('../../agents/OllamaAgent', () => ({
    OllamaAgent: class OllamaAgent {
      constructor() {}
      async propose() { return JSON.stringify({ type: 'ADD', number: 301, text: 'Ollama rule', proof: 'Ollama proof' }); }
      async vote() { return 'FOR'; }
      get isAvailable() { return true; }
    }
  }));
  
  return mockAgentFactory;
}

/**
 * Cleanup function for agent mocks
 */
export function cleanupAgentMocks() {
  vi.clearAllMocks();
  vi.resetModules();
}

/**
 * Helper to create agent timeouts for testing
 */
export function createTimeoutAgent(timeoutMs: number = 12000) {
  return createMockAgent({
    type: 'mock',
    simulateTimeout: true
  });
}

/**
 * Helper to create error agent for testing
 */
export function createErrorAgent(errorMessage: string = 'Test agent error') {
  return createMockAgent({
    type: 'mock',
    simulateError: true,
    errorMessage
  });
} 