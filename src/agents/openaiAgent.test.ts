import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIAgent } from './openaiAgent';
import type { GameSnapshot } from '../mocks/MockMCPService';

// Mock fetch for testing
global.fetch = vi.fn();

describe('OpenAIAgent', () => {
  let agent: OpenAIAgent;
  let mockGameSnapshot: GameSnapshot;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables  
    vi.stubEnv('LLM_TOKEN', 'sk-test-api-key');
    
    agent = new OpenAIAgent();
    
    mockGameSnapshot = {
      players: [
        { id: 'alice', name: 'Alice', points: 50, isActive: true },
        { id: 'bob', name: 'Bob', points: 30, isActive: false }
      ],
      rules: [
        { id: 100, text: 'This is the proof statement P', mutable: false },
        { id: 101, text: 'All players must follow the rules', mutable: false }
      ],
      proposals: [],
      turn: 1,
      phase: 'playing',
      proofStatement: 'You are a strategic AI player in Nomic. Make proposals that help you win while being fair to other players.'
    };
  });

  describe('agent initialization', () => {
    it('should initialize with correct type', () => {
      expect(agent.isAvailable()).toBe(true);
    });

    it('should provide a current seed', () => {
      const seed = agent.getCurrentSeed();
      expect(typeof seed).toBe('string');
      expect(seed.length).toBeGreaterThan(0);
    });
  });

  describe('prompt generation with Prompt P', () => {
    it('should include proof statement in proposal system prompt', async () => {
      // Mock successful OpenAI response
      const mockResponse = {
        choices: [{ 
          message: { 
            content: '### Proposal\nType: Add\nNumber: 301\nText: "Test rule"' 
          } 
        }],
        usage: { total_tokens: 100 },
        model: 'gpt-3.5-turbo'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Spy on the buildSystemPrompt method
      const buildSystemPromptSpy = vi.spyOn(agent as any, 'buildSystemPrompt');
      
      await agent.propose('Generate a test proposal', mockGameSnapshot);
      
      expect(buildSystemPromptSpy).toHaveBeenCalled();
      const systemPrompt = buildSystemPromptSpy.mock.results[0].value;
      
      expect(systemPrompt).toContain('PROOF STATEMENT P:');
      expect(systemPrompt).toContain('You are a strategic AI player in Nomic');
    });

    it('should include proof statement in voting system prompt', async () => {
      // Mock successful OpenAI response
      const mockResponse = {
        choices: [{ 
          message: { 
            content: 'FOR' 
          } 
        }],
        usage: { total_tokens: 50 },
        model: 'gpt-3.5-turbo'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // Spy on the buildVotingSystemPrompt method
      const buildVotingSystemPromptSpy = vi.spyOn(agent as any, 'buildVotingSystemPrompt');
      
      await agent.vote('### Proposal\nType: Add\nNumber: 301\nText: "Test rule"', mockGameSnapshot);
      
      expect(buildVotingSystemPromptSpy).toHaveBeenCalled();
      const systemPrompt = buildVotingSystemPromptSpy.mock.results[0].value;
      
      expect(systemPrompt).toContain('PROOF STATEMENT P:');
      expect(systemPrompt).toContain('You are a strategic AI player in Nomic');
    });

    it('should handle empty proof statement gracefully', async () => {
      const snapshotWithoutProofStatement: GameSnapshot = {
        ...mockGameSnapshot,
        proofStatement: ''
      };

      // Mock successful OpenAI response
      const mockResponse = {
        choices: [{ 
          message: { 
            content: '### Proposal\nType: Add\nNumber: 301\nText: "Test rule"' 
          } 
        }],
        usage: { total_tokens: 100 },
        model: 'gpt-3.5-turbo'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const buildSystemPromptSpy = vi.spyOn(agent as any, 'buildSystemPrompt');
      
      await agent.propose('Generate a test proposal', snapshotWithoutProofStatement);
      
      const systemPrompt = buildSystemPromptSpy.mock.results[0].value;
      
      // Should not contain the proof statement section when empty
      expect(systemPrompt).not.toContain('PROOF STATEMENT P:');
      expect(systemPrompt).toContain('You are playing Nomic');
    });

    it('should handle undefined game snapshot by using defaults with empty proof statement', async () => {
      // Mock successful OpenAI response
      const mockResponse = {
        choices: [{ 
          message: { 
            content: '### Proposal\nType: Add\nNumber: 301\nText: "Test rule"' 
          } 
        }],
        usage: { total_tokens: 100 },
        model: 'gpt-3.5-turbo'
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const buildSystemPromptSpy = vi.spyOn(agent as any, 'buildSystemPrompt');
      
      // Call without gameSnapshot to test default handling
      await agent.propose('Generate a test proposal');
      
      const systemPrompt = buildSystemPromptSpy.mock.results[0].value;
      
      // Should not contain proof statement section with default empty snapshot
      expect(systemPrompt).not.toContain('PROOF STATEMENT P:');
      expect(systemPrompt).toContain('You are playing Nomic');
    });
  });

  describe('rate limiting', () => {
    it('should handle API rate limiting errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Rate limit exceeded',
        text: () => Promise.resolve('Rate limit exceeded')
      });
      
      await expect(agent.propose('Test prompt', mockGameSnapshot)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(agent.propose('Test prompt', mockGameSnapshot)).rejects.toThrow();
    });

    it('should handle invalid response format', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      });
      
      await expect(agent.propose('Test prompt', mockGameSnapshot)).rejects.toThrow();
    });
  });
}); 