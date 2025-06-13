import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentFactory, resetAgentFactory } from './AgentFactory';
import { type GameSnapshot } from '../mocks/MockMCPService';

// Mock the individual agents
vi.mock('./OpenAIAgentAdapter', () => ({
  OpenAIAgentAdapter: vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockReturnValue(false), // Default to unavailable
    getType: vi.fn().mockReturnValue('openai'),
    getCurrentSeed: vi.fn().mockReturnValue('openai-test'),
    propose: vi.fn().mockResolvedValue('### Proposal 123\nType: Add\nNumber: 301\nText: "Test"'),
    vote: vi.fn().mockResolvedValue('FOR')
  }))
}));

vi.mock('./OllamaAgent', () => ({
  OllamaAgent: vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockReturnValue(false), // Default to unavailable
    getType: vi.fn().mockReturnValue('ollama'),
    getCurrentSeed: vi.fn().mockReturnValue('ollama-test'),
    propose: vi.fn().mockResolvedValue('### Proposal 123\nType: Add\nNumber: 301\nText: "Test"'),
    vote: vi.fn().mockResolvedValue('FOR')
  }))
}));

vi.mock('./MockAgent', () => ({
  MockAgent: vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockReturnValue(true),
    getType: vi.fn().mockReturnValue('mock'),
    getCurrentSeed: vi.fn().mockReturnValue('mock-test'),
    propose: vi.fn().mockResolvedValue('### Proposal 123\nType: Add\nNumber: 301\nText: "Test"'),
    vote: vi.fn().mockResolvedValue('FOR'),
    reseed: vi.fn()
  }))
}));

describe('AgentFactory', () => {
  let factory: AgentFactory;
  let mockGameSnapshot: GameSnapshot;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAgentFactory();
    
    // Mock environment to force mock agent usage
    vi.stubEnv('AGENT_TYPE', 'mock');
    
    factory = new AgentFactory();
    
    mockGameSnapshot = {
      players: [
        { id: 'player1', name: 'Alice', points: 0, isActive: true },
        { id: 'player2', name: 'Bob', points: 5, isActive: false }
      ],
      rules: [
        { id: 101, text: 'All players must abide by the rules.', mutable: false }
      ],
      proposals: [],
      turn: 1,
      phase: 'playing'
    };
  });

  describe('initialization', () => {
    it('should create factory with mock agent', () => {
      expect(factory.getAgent().getType()).toBe('mock');
      expect(factory.isUsingPrimaryAgent()).toBe(true);
    });

    it('should select openai agent when configured', async () => {
      vi.stubEnv('AGENT_TYPE', 'openai');
      vi.stubEnv('LLM_TOKEN', 'sk-test');
      
      // Import and mock the module
      const openaiModule = await import('./OpenAIAgentAdapter');
      const mockConstructor = vi.mocked(openaiModule.OpenAIAgentAdapter);
      const mockInstance = mockConstructor.mock.results[0]?.value;
      if (mockInstance) {
        mockInstance.isAvailable.mockReturnValue(true);
      }
      
      const openaiFactory = new AgentFactory();
      expect(openaiFactory.getAgent().getType()).toBe('openai');
    });

    it('should select ollama agent when configured', () => {
      vi.stubEnv('AGENT_TYPE', 'ollama');
      vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
      
      // Mock Ollama as available
      const { OllamaAgent } = require('./OllamaAgent');
      const mockInstance = OllamaAgent.mock.results[0].value;
      mockInstance.isAvailable.mockReturnValue(true);
      
      const ollamaFactory = new AgentFactory();
      expect(ollamaFactory.getAgent().getType()).toBe('ollama');
    });

    it('should fallback to mock when primary agent unavailable', () => {
      vi.stubEnv('AGENT_TYPE', 'openai');
      vi.stubEnv('LLM_TOKEN', ''); // No token
      
      const fallbackFactory = new AgentFactory();
      expect(fallbackFactory.getAgent().getType()).toBe('mock');
    });
  });

  describe('propose', () => {
    it('should generate proposals successfully', async () => {
      const result = await factory.propose(mockGameSnapshot, 'Generate a proposal');
      
      expect(result).toContain('### Proposal');
      expect(factory.getAgent().propose).toHaveBeenCalledWith(
        mockGameSnapshot,
        'Generate a proposal'
      );
    });

    it('should handle failures and track consecutive failures', async () => {
      const mockAgent = factory.getAgent();
      mockAgent.propose = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('### Proposal 123\nType: Add\nNumber: 301\nText: "Fallback"');

      // First three calls should fail
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow('Network error');
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow('Network error');
      
      // Third failure should trigger fallback
      const result = await factory.propose(mockGameSnapshot);
      expect(result).toContain('### Proposal');
      expect(factory.isUsingPrimaryAgent()).toBe(false);
    });

    it('should reset failure count on success', async () => {
      const mockAgent = factory.getAgent();
      mockAgent.propose = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce('### Proposal 123\nType: Add\nNumber: 301\nText: "Success"');

      // First call fails
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow('Temporary error');
      
      // Second call succeeds and should reset failure count
      const result = await factory.propose(mockGameSnapshot);
      expect(result).toContain('### Proposal');
      expect(factory.isUsingPrimaryAgent()).toBe(true);
    });
  });

  describe('vote', () => {
    const mockProposal = '### Proposal 123\nType: Add\nNumber: 301\nText: "Test"';

    it('should generate votes successfully', async () => {
      const result = await factory.vote(mockProposal, mockGameSnapshot);
      
      expect(['FOR', 'AGAINST', 'ABSTAIN']).toContain(result);
      expect(factory.getAgent().vote).toHaveBeenCalledWith(mockProposal, mockGameSnapshot);
    });

    it('should handle vote failures with fallback', async () => {
      const mockAgent = factory.getAgent();
      mockAgent.vote = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('ABSTAIN');

      // First three calls should fail
      await expect(factory.vote(mockProposal, mockGameSnapshot)).rejects.toThrow('Network error');
      await expect(factory.vote(mockProposal, mockGameSnapshot)).rejects.toThrow('Network error');
      
      // Third failure should trigger fallback
      const result = await factory.vote(mockProposal, mockGameSnapshot);
      expect(result).toBe('ABSTAIN');
      expect(factory.isUsingPrimaryAgent()).toBe(false);
    });
  });

  describe('concurrency control', () => {
    it('should limit concurrent requests', async () => {
      const mockAgent = factory.getAgent();
      let activeRequests = 0;
      let maxConcurrent = 0;

      mockAgent.propose = vi.fn().mockImplementation(async () => {
        activeRequests++;
        maxConcurrent = Math.max(maxConcurrent, activeRequests);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 10));
        
        activeRequests--;
        return '### Proposal 123\nType: Add\nNumber: 301\nText: "Test"';
      });

      // Start multiple concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        factory.propose(mockGameSnapshot)
      );

      await Promise.all(promises);

      // Should not exceed configured concurrency limit (4)
      expect(maxConcurrent).toBeLessThanOrEqual(4);
    });
  });

  describe('status and management', () => {
    it('should provide status information', () => {
      const status = factory.getStatus();
      
      expect(status.primaryAgent).toBe('mock');
      expect(status.currentAgent).toBe('mock');
      expect(status.isUsingPrimary).toBe(true);
      expect(status.concurrencyLimit).toBe(4);
      expect(status.consecutiveFailures).toEqual({});
    });

    it('should reset properly', async () => {
      // Force a fallback
      const mockAgent = factory.getAgent();
      mockAgent.propose = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValueOnce('### Proposal 123\nType: Add\nNumber: 301\nText: "Fallback"');

      // Trigger fallback
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow();
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow();
      await factory.propose(mockGameSnapshot); // This should trigger fallback

      expect(factory.isUsingPrimaryAgent()).toBe(false);

      // Reset should restore primary
      factory.reset();
      expect(factory.isUsingPrimaryAgent()).toBe(true);
    });

    it('should get current seed', () => {
      const seed = factory.getCurrentSeed();
      expect(typeof seed).toBe('string');
      expect(seed.length).toBeGreaterThan(0);
    });
  });

  describe('fallback behavior', () => {
    it('should fallback after maximum consecutive failures', async () => {
      const mockAgent = factory.getAgent();
      mockAgent.propose = vi.fn()
        .mockRejectedValue(new Error('Persistent error'));

      // Should stay on primary for first 2 failures
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow();
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow();
      expect(factory.isUsingPrimaryAgent()).toBe(true);

      // Third failure should trigger fallback and succeed
      const result = await factory.propose(mockGameSnapshot);
      expect(result).toContain('### Proposal');
      expect(factory.isUsingPrimaryAgent()).toBe(false);
    });

    it('should not fallback if already using fallback', async () => {
      // Force fallback
      factory.reset();
      const mockAgent = factory.getAgent();
      mockAgent.propose = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'))
        .mockResolvedValueOnce('### Proposal 123\nType: Add\nNumber: 301\nText: "Fallback"');

      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow();
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow();
      await factory.propose(mockGameSnapshot);

      expect(factory.isUsingPrimaryAgent()).toBe(false);

      // Further failures on fallback should not cause additional fallback
      factory.getAgent().propose = vi.fn().mockRejectedValue(new Error('Fallback error'));
      await expect(factory.propose(mockGameSnapshot)).rejects.toThrow('Fallback error');
    });
  });
}); 