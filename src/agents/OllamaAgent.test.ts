import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { OllamaAgent } from './OllamaAgent';
import { type GameSnapshot } from '../mocks/MockMCPService';

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
vi.stubGlobal('fetch', mockFetch);

describe('OllamaAgent', () => {
  let agent: OllamaAgent;
  let mockGameSnapshot: GameSnapshot;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment variables
    vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
    vi.stubEnv('OLLAMA_MODEL', 'mistral:7b-instruct');
    
    // Create agent
    agent = new OllamaAgent();
    
    // Create mock game snapshot
    mockGameSnapshot = {
      players: [
        { id: 'player1', name: 'Alice', points: 0, isActive: true },
        { id: 'player2', name: 'Bob', points: 5, isActive: false }
      ],
      rules: [
        { id: 101, text: 'All players must abide by the rules.', mutable: false },
        { id: 201, text: 'Players take turns clockwise.', mutable: true }
      ],
      proposals: [],
      turn: 1,
      phase: 'playing'
    };
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(agent.isAvailable()).toBe(true);
      expect(agent.getType()).toBe('ollama');
      expect(agent.getCurrentSeed()).toBe('ollama-mistral:7b-instruct');
    });

    it('should handle custom configuration', () => {
      vi.stubEnv('OLLAMA_BASE_URL', 'http://custom:8080');
      vi.stubEnv('OLLAMA_MODEL', 'llama2:13b');
      
      const customAgent = new OllamaAgent();
      expect(customAgent.getCurrentSeed()).toBe('ollama-llama2:13b');
    });

    it('should be available with proper configuration', () => {
      expect(agent.isAvailable()).toBe(true);
    });
  });

  describe('propose', () => {
    it('should generate a proposal successfully', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: `### Proposal 123
Type: Add
Number: 301
Text: "Players may submit multiple proposals per turn."`
            }
          }]
        })
      } as Response);

      const result = await agent.propose(mockGameSnapshot, 'Generate a proposal');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('mistral:7b-instruct')
        })
      );

      expect(result).toContain('### Proposal');
      expect(result).toContain('Type:');
      expect(result).toContain('Number:');
      expect(result).toContain('Text:');
    });

    it('should handle malformed responses gracefully', async () => {
      // Mock response with malformed content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'This is not a proper proposal format'
            }
          }]
        })
      } as Response);

      const result = await agent.propose(mockGameSnapshot);

      // Should fallback to formatted response
      expect(result).toContain('### Proposal');
      expect(result).toContain('Type: Add');
      expect(result).toContain('Number:');
      expect(result).toContain('Text:');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      } as Response);

      await expect(agent.propose(mockGameSnapshot)).rejects.toThrow(
        'Ollama proposal generation failed'
      );
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

      await expect(agent.propose(mockGameSnapshot)).rejects.toThrow(
        'Ollama request timeout after 10000ms'
      );
    });

    it('should throw error when not available', async () => {
      // Create agent with no configuration
      vi.stubEnv('OLLAMA_BASE_URL', '');
      vi.stubEnv('OLLAMA_MODEL', '');
      
      const unavailableAgent = new OllamaAgent();
      
      await expect(unavailableAgent.propose(mockGameSnapshot)).rejects.toThrow(
        'Ollama agent not available - check configuration'
      );
    });
  });

  describe('vote', () => {
    const mockProposal = `### Proposal 123
Type: Add
Number: 301
Text: "Players may submit multiple proposals per turn."`;

    it('should generate a vote successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'FOR'
            }
          }]
        })
      } as Response);

      const result = await agent.vote(mockProposal, mockGameSnapshot);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result).toBe('FOR');
    });

    it('should parse different vote formats', async () => {
      const testCases = [
        { response: 'FOR', expected: 'FOR' },
        { response: 'Yes, I support this', expected: 'FOR' },
        { response: 'AGAINST', expected: 'AGAINST' },
        { response: 'No way!', expected: 'AGAINST' },
        { response: 'ABSTAIN', expected: 'ABSTAIN' },
        { response: 'I will pass on this', expected: 'ABSTAIN' },
        { response: 'Maybe later', expected: 'ABSTAIN' } // Unclear response defaults to ABSTAIN
      ];

      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: testCase.response
              }
            }]
          })
        } as Response);

        const result = await agent.vote(mockProposal, mockGameSnapshot);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should handle API errors during voting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service unavailable'
      } as Response);

      await expect(agent.vote(mockProposal, mockGameSnapshot)).rejects.toThrow(
        'Ollama voting failed'
      );
    });

    it('should throw error when not available', async () => {
      // Create agent with no configuration
      vi.stubEnv('OLLAMA_BASE_URL', '');
      vi.stubEnv('OLLAMA_MODEL', '');
      
      const unavailableAgent = new OllamaAgent();
      
      await expect(unavailableAgent.vote(mockProposal, mockGameSnapshot)).rejects.toThrow(
        'Ollama agent not available - check configuration'
      );
    });
  });

  describe('API integration', () => {
    it('should use correct API endpoint and parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test response'
            }
          }]
        })
      } as Response);

      await agent.propose(mockGameSnapshot);

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe('http://localhost:11434/v1/chat/completions');
      
      const options = call[1] as RequestInit;
      expect(options.method).toBe('POST');
      expect(options.headers).toEqual({
        'Content-Type': 'application/json'
      });
      
      const body = JSON.parse(options.body as string);
      expect(body.model).toBe('mistral:7b-instruct');
      expect(body.messages).toHaveLength(2);
      expect(body.max_tokens).toBe(500);
      expect(body.temperature).toBe(0.7);
      expect(body.stream).toBe(false);
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing choices array
          error: 'Invalid format'
        })
      } as Response);

      await expect(agent.propose(mockGameSnapshot)).rejects.toThrow(
        'Invalid response format from Ollama API'
      );
    });
  });
}); 