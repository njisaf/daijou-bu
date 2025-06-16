import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  MockJudgeAgent, 
  OpenAIJudgeAgent, 
  OllamaJudgeAgent, 
  createJudgeAgent,
  type IJudgeAgent 
} from './JudgeAgent';
import type { GameSnapshot } from '../models/GameModel';

// Mock game snapshot for testing
const mockGameSnapshot: GameSnapshot = {
  config: {
    victoryTarget: 100,
    proposerPoints: 10,
    forVoterPoints: 5,
    againstVoterPenalty: -5,
    turnDelayMs: 200,
    timeoutMs: 8000,
    warmupTurns: 5,
    snapshotMode: 'full',
    debugSnapshots: false,
    enableSnapshotLogging: true,
    promptP: 'You are a strategic AI player in Nomic'
  },
  players: [
    { id: 'alice', name: 'Alice', icon: '🤖', llmEndpoint: 'mock', points: 0, isActive: true },
    { id: 'bob', name: 'Bob', icon: '🎯', llmEndpoint: 'mock', points: 5, isActive: false }
  ],
  rules: [
    { id: 100, text: 'You are a strategic AI player in Nomic', mutable: false },
    { id: 101, text: 'All people are potential players of Nomic', mutable: false },
    { id: 120, text: 'Purpose: The sole objective is to produce a consistent Development Rulebook', mutable: false },
    { id: 121, text: 'Proof Requirement: Every Proposal must include a Proof Section', mutable: false },
    { id: 122, text: 'Judging Proofs: The Judge must state why each Proof Section is sound or unsound', mutable: false },
    { id: 201, text: 'A proposal must consist of a single rule-change', mutable: true }
  ],
  proposals: [],
  judge: {
    currentJudgeId: 'alice',
    verdicts: [],
    appointmentTurn: 0
  },
  turn: 1,
  phase: 'playing',
  history: [],
  proofStatement: 'You are a strategic AI player in Nomic'
};

describe('MockJudgeAgent', () => {
  let judgeAgent: MockJudgeAgent;

  beforeEach(() => {
    judgeAgent = new MockJudgeAgent(12345); // Fixed seed for deterministic tests
  });

  it('should initialize with correct type and availability', () => {
    expect(judgeAgent.getType()).toBe('mock');
    expect(judgeAgent.isAvailable()).toBe(true);
  });

  it('should provide deterministic verdicts based on proposal ID and seed', async () => {
    const proposalText = `### Proposal 301
Type: Add
Number: 301
Text: "Players may vote by haiku."
Proof: "This rule maintains consistency while adding creative expression to the voting process."`;

    const result1 = await judgeAgent.judge(301, proposalText, mockGameSnapshot);
    const result2 = await judgeAgent.judge(301, proposalText, mockGameSnapshot);

    expect(result1).toEqual(result2); // Deterministic
    expect(['sound', 'unsound']).toContain(result1.verdict);
    expect(result1.justification).toBeTruthy();
    expect(result1.justification.length).toBeGreaterThan(50);
  });

  it('should provide different verdicts for different proposal IDs', async () => {
    const proposalText1 = `### Proposal 301
Type: Add
Number: 301
Text: "Test rule 1"
Proof: "Test proof 1"`;

    const proposalText2 = `### Proposal 302
Type: Add
Number: 302
Text: "Test rule 2"
Proof: "Test proof 2"`;

    const result1 = await judgeAgent.judge(301, proposalText1, mockGameSnapshot);
    const result2 = await judgeAgent.judge(302, proposalText2, mockGameSnapshot);

    // With different proposal IDs, we should get different results (high probability)
    expect(result1.verdict === result2.verdict && result1.justification === result2.justification).toBe(false);
  });

  it('should include Rule 121 references in justifications', async () => {
    const proposalText = `### Proposal 303
Type: Add
Number: 303
Text: "Test rule"
Proof: "Test proof"`;

    const result = await judgeAgent.judge(303, proposalText, mockGameSnapshot);
    expect(result.justification).toContain('Rule 121');
  });

  it('should simulate realistic judge thinking time', async () => {
    const proposalText = `### Proposal 304
Type: Add
Number: 304
Text: "Test rule"
Proof: "Test proof"`;

    const startTime = Date.now();
    await judgeAgent.judge(304, proposalText, mockGameSnapshot);
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(95); // Should take at least ~100ms
  });
});

describe('OpenAIJudgeAgent', () => {
  let judgeAgent: OpenAIJudgeAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    judgeAgent = new OpenAIJudgeAgent('sk-test-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct type and availability', () => {
    expect(judgeAgent.getType()).toBe('openai');
    expect(judgeAgent.isAvailable()).toBe(true);

    const invalidAgent = new OpenAIJudgeAgent('invalid-key');
    expect(invalidAgent.isAvailable()).toBe(false);
  });

  it('should make correct API request to OpenAI', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'VERDICT: SOUND\nJUSTIFICATION: The proof adequately demonstrates rule consistency and alignment with game objectives.'
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const proposalText = `### Proposal 301
Type: Add
Number: 301
Text: "Players may vote by haiku."
Proof: "This enhances creativity while maintaining rule consistency per Rule 121."`;

    const result = await judgeAgent.judge(301, proposalText, mockGameSnapshot);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk-test-key',
          'Content-Type': 'application/json'
        }
      })
    );

    expect(result.verdict).toBe('sound');
    expect(result.justification).toContain('rule consistency');
  });

  it('should parse SOUND verdicts correctly', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'VERDICT: SOUND\nJUSTIFICATION: This proposal maintains consistency with existing rules and improves alignment with Prompt P objectives.'
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await judgeAgent.judge(301, 'test proposal', mockGameSnapshot);
    
    expect(result.verdict).toBe('sound');
    expect(result.justification).toBe('This proposal maintains consistency with existing rules and improves alignment with Prompt P objectives.');
  });

  it('should parse UNSOUND verdicts correctly', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'VERDICT: UNSOUND\nJUSTIFICATION: The proof fails to address potential rule conflicts and lacks analysis of Prompt P alignment.'
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const result = await judgeAgent.judge(302, 'test proposal', mockGameSnapshot);
    
    expect(result.verdict).toBe('unsound');
    expect(result.justification).toBe('The proof fails to address potential rule conflicts and lacks analysis of Prompt P alignment.');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Rate limit exceeded',
      text: () => Promise.resolve('Rate limit exceeded')
    });

    await expect(judgeAgent.judge(303, 'test proposal', mockGameSnapshot))
      .rejects.toThrow('OpenAI API error: 429 Rate limit exceeded');
  });

  it('should handle malformed judge responses', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'This is not a properly formatted judge response'
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    await expect(judgeAgent.judge(304, 'test proposal', mockGameSnapshot))
      .rejects.toThrow('Judge response missing required VERDICT field');
  });

  it('should handle missing justification', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'VERDICT: SOUND\nJUSTIFICATION: '
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    await expect(judgeAgent.judge(305, 'test proposal', mockGameSnapshot))
      .rejects.toThrow('Judge response missing required JUSTIFICATION field');
  });

  it('should include Prompt P in system prompt when available', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'VERDICT: SOUND\nJUSTIFICATION: Valid reasoning'
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    await judgeAgent.judge(306, 'test proposal', mockGameSnapshot);

    const callArgs = (global.fetch as any).mock.calls[0][1];
    const requestBody = JSON.parse(callArgs.body);
    const systemMessage = requestBody.messages[0].content;

    expect(systemMessage).toContain('PROOF STATEMENT P:');
    expect(systemMessage).toContain('You are a strategic AI player in Nomic');
    expect(systemMessage).toContain('Rule 121');
    expect(systemMessage).toContain('VERDICT: [SOUND|UNSOUND]');
  });
});

describe('OllamaJudgeAgent', () => {
  let judgeAgent: OllamaJudgeAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    judgeAgent = new OllamaJudgeAgent({
      baseUrl: 'http://localhost:11434',
      model: 'mistral:7b-instruct'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct type and availability', () => {
    expect(judgeAgent.getType()).toBe('ollama');
    expect(judgeAgent.isAvailable()).toBe(true);
  });

  it('should make correct API request to Ollama', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'VERDICT: SOUND\nJUSTIFICATION: The proof demonstrates proper rule analysis.'
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const proposalText = `### Proposal 301
Type: Add
Number: 301
Text: "Test rule"
Proof: "Test proof"`;

    await judgeAgent.judge(301, proposalText, mockGameSnapshot);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );

    const callArgs = (global.fetch as any).mock.calls[0][1];
    const requestBody = JSON.parse(callArgs.body);
    expect(requestBody.model).toBe('mistral:7b-instruct');
    expect(requestBody.temperature).toBe(0.1);
  });

  it('should handle Ollama API errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Ollama service unavailable')
    });

    await expect(judgeAgent.judge(302, 'test proposal', mockGameSnapshot))
      .rejects.toThrow('Ollama API error: 500 Internal Server Error');
  });

  it('should use compact system prompt for Ollama', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'VERDICT: SOUND\nJUSTIFICATION: Valid reasoning'
        }
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    await judgeAgent.judge(303, 'test proposal', mockGameSnapshot);

    const callArgs = (global.fetch as any).mock.calls[0][1];
    const requestBody = JSON.parse(callArgs.body);
    const systemMessage = requestBody.messages[0].content;

    // Ollama system prompt should be more compact
    expect(systemMessage).toContain('CRITERIA:');
    expect(systemMessage).toContain('SOUND: Shows');
    expect(systemMessage).toContain('UNSOUND: Fails');
    expect(systemMessage.length).toBeLessThan(1000); // Should be more compact than OpenAI version
  });
});

describe('createJudgeAgent factory', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.JUDGE_AGENT_TYPE;
    delete process.env.LLM_TOKEN;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
  });

  afterEach(() => {
    // Restore original environment
    vi.unstubAllEnvs();
  });

  it('should create OpenAI judge when LLM_TOKEN is provided', () => {
    process.env.LLM_TOKEN = 'sk-test-key';
    
    const judge = createJudgeAgent();
    expect(judge.getType()).toBe('openai');
    expect(judge.isAvailable()).toBe(true);
  });

  it('should create Ollama judge when Ollama config is provided', () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
    process.env.OLLAMA_MODEL = 'mistral:7b-instruct';
    
    const judge = createJudgeAgent();
    expect(judge.getType()).toBe('ollama');
    expect(judge.isAvailable()).toBe(true);
  });

  it('should respect explicit JUDGE_AGENT_TYPE preference', () => {
    process.env.JUDGE_AGENT_TYPE = 'mock';
    process.env.LLM_TOKEN = 'sk-test-key'; // Would normally create OpenAI
    
    const judge = createJudgeAgent();
    expect(judge.getType()).toBe('mock');
  });

  it('should default to mock judge when no config is provided', () => {
    const judge = createJudgeAgent();
    expect(judge.getType()).toBe('mock');
    expect(judge.isAvailable()).toBe(true);
  });
});

describe('Judge Agent Integration', () => {
  it('should handle proposal text with complex proof sections', async () => {
    const mockJudge = new MockJudgeAgent(42);
    
    const complexProposal = `### Proposal 401
Type: Add
Number: 401
Text: "Multi-line rule with complex logic that spans several lines and includes detailed specifications for implementation."
Proof: "This proposal demonstrates consistency by:
1. Maintaining compatibility with Rules 101-116 (immutable foundation)
2. Enhancing the Development Rulebook's effectiveness per Rule 120
3. Providing clear implementation guidance that aligns with Prompt P objectives

The proof addresses Rule 121 requirements by showing that:
(a) No existing rules are contradicted or rendered inconsistent
(b) The likelihood of LLM success in satisfying Prompt P is improved

Detailed analysis:
- Rule interaction matrix shows no conflicts
- Prompt P alignment score increases from 0.7 to 0.8
- Implementation complexity remains within acceptable bounds"`;

    const result = await mockJudge.judge(401, complexProposal, mockGameSnapshot);
    
    expect(['sound', 'unsound']).toContain(result.verdict);
    expect(result.justification).toBeTruthy();
    expect(result.justification.length).toBeGreaterThan(50);
  });

  it('should validate that all judge agents implement the same interface', () => {
    const agents: IJudgeAgent[] = [
      new MockJudgeAgent(),
      new OpenAIJudgeAgent('sk-test'),
      new OllamaJudgeAgent()
    ];

    agents.forEach(agent => {
      expect(typeof agent.judge).toBe('function');
      expect(typeof agent.isAvailable).toBe('function');
      expect(typeof agent.getType).toBe('function');
      expect(['openai', 'ollama', 'mock']).toContain(agent.getType());
    });
  });
}); 