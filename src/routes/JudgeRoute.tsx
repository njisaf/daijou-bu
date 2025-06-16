import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { createJudgeAgent, type IJudgeAgent } from '../agents/JudgeAgent';
import { createGame } from '../models/GameModel';
import { RuleSetModel } from '../models/RuleSetModel';
import { GameConfigModel } from '../models/GameConfigModel';
import { parseProposalMarkdown } from '../schemas/proposal';
import { loadInitialRules } from '../assets/initialRules';

/**
 * Judge Route Component
 * 
 * Provides a development interface for testing judge functionality.
 * Also serves as the endpoint for judge API operations.
 * 
 * Per Rule 107: The game shall have a Judge.
 * Per Rule 122: The Judge must state why each Proposal's Proof Section is sound or unsound.
 * 
 * @see daijo-bu_architecture.md Judge section
 */
const JudgeRoute: React.FC = observer(() => {
  const [judgeAgent, setJudgeAgent] = useState<IJudgeAgent | null>(null);
  const [proposalText, setProposalText] = useState<string>('');
  const [judgeResult, setJudgeResult] = useState<{
    verdict: 'sound' | 'unsound';
    justification: string;
  } | null>(null);
  const [isJudging, setIsJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentType, setAgentType] = useState<'openai' | 'ollama' | 'mock'>('mock');

  // Initialize judge agent on component mount
  useEffect(() => {
    try {
      const agent = createJudgeAgent();
      setJudgeAgent(agent);
      setAgentType(agent.getType());
      console.log('⚖️ [JudgeRoute] Judge agent initialized:', agent.getType());
    } catch (error) {
      console.error('❌ [JudgeRoute] Failed to initialize judge agent:', error);
      setError(`Failed to initialize judge agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Default proposal template with proof section
  const defaultProposal = `### Proposal 301
Type: Add
Number: 301
Text: "Players may submit proposals in haiku format to enhance creative expression while maintaining rule clarity."
Proof: "This rule enhances creativity while maintaining game balance and consistency with existing proposal mechanisms per Rule 121. The haiku constraint ensures conciseness without breaking existing proposal validation logic. This change maintains compatibility with Rules 101-116 and improves the Development Rulebook's effectiveness per Rule 120."`;

  // Set default proposal if empty
  useEffect(() => {
    if (!proposalText.trim()) {
      setProposalText(defaultProposal);
    }
  }, []);

  /**
   * Creates a mock game snapshot for judge testing
   */
  const createMockGameSnapshot = () => {
    const initialRules = loadInitialRules();
    const ruleset = RuleSetModel.create({
      name: 'Judge Test Ruleset',
      description: 'Mock ruleset for testing judge functionality',
      rules: initialRules
    });

    const config = GameConfigModel.create({
      victoryTarget: 100,
      proposerPoints: 10,
      forVoterPoints: 5,
      againstVoterPenalty: -5,
      turnDelayMs: 200,
      timeoutMs: 8000,
      warmupTurns: 5,
      snapshotMode: 'full' as const,
      debugSnapshots: false,
      enableSnapshotLogging: true,
      promptP: 'You are a strategic AI player in Nomic',
      agent: {
        type: 'mock' as const,
        baseUrl: 'http://localhost:11434',
        model: 'mistral:7b-instruct',
        timeout: 10000
      }
    });

    const game = createGame({
      ruleset,
      config,
      players: [
        { id: 'alice', name: 'Alice', icon: '🤖', llmEndpoint: 'mock' },
        { id: 'bob', name: 'Bob', icon: '🎯', llmEndpoint: 'mock' }
      ]
    });

    return game.gameSnapshot;
  };

  /**
   * Handles judge evaluation of the current proposal
   */
  const handleJudgeProposal = async () => {
    if (!judgeAgent) {
      setError('Judge agent not initialized');
      return;
    }

    if (!proposalText.trim()) {
      setError('Please enter a proposal to judge');
      return;
    }

    setIsJudging(true);
    setError(null);
    setJudgeResult(null);

    try {
      // Parse the proposal to get ID
      const proposal = parseProposalMarkdown(proposalText);
      
      // Create mock game snapshot
      const gameSnapshot = createMockGameSnapshot();
      
      // Judge the proposal
      console.log('⚖️ [JudgeRoute] Judging proposal:', proposal.id);
      const result = await judgeAgent.judge(proposal.id, proposalText, gameSnapshot);
      
      setJudgeResult(result);
      console.log('⚖️ [JudgeRoute] Judge verdict:', result.verdict.toUpperCase());

    } catch (error) {
      console.error('❌ [JudgeRoute] Judge evaluation failed:', error);
      setError(`Judge evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsJudging(false);
    }
  };

  /**
   * Resets the judge interface
   */
  const handleReset = () => {
    setProposalText(defaultProposal);
    setJudgeResult(null);
    setError(null);
  };

  /**
   * Loads a sample complex proposal for testing
   */
  const loadSampleComplexProposal = () => {
    const complexProposal = `### Proposal 401
Type: Add
Number: 401
Text: "Multi-turn proposal discussion: Before a proposal is voted on, there must be a discussion period of at least 3 turns where players may ask questions and the proposer may provide clarifications."
Proof: "This proposal demonstrates consistency by:
1. Maintaining compatibility with Rules 101-116 (immutable foundation)
2. Enhancing the Development Rulebook's effectiveness per Rule 120
3. Providing clear implementation guidance that aligns with Prompt P objectives

The proof addresses Rule 121 requirements by showing that:
(a) No existing rules are contradicted or rendered inconsistent
(b) The likelihood of LLM success in satisfying Prompt P is improved

Detailed analysis:
- Rule interaction matrix shows no conflicts with voting procedures
- Prompt P alignment score increases from 0.7 to 0.8 due to improved deliberation
- Implementation complexity remains within acceptable bounds
- Discussion period enhances rule quality without breaking existing voting mechanisms"`;

    setProposalText(complexProposal);
    setJudgeResult(null);
    setError(null);
  };

  return (
    <div className="judge-route" style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        color: '#2563eb', 
        borderBottom: '2px solid #e5e7eb', 
        paddingBottom: '10px',
        marginBottom: '30px'
      }}>
        ⚖️ Judge Development Interface
      </h1>

      {/* Judge Agent Status */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Judge Agent Status</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span>
            <strong>Type:</strong> 
            <span style={{ 
              marginLeft: '8px',
              padding: '2px 8px',
              backgroundColor: agentType === 'mock' ? '#fef3c7' : agentType === 'openai' ? '#dbeafe' : '#dcfce7',
              color: agentType === 'mock' ? '#92400e' : agentType === 'openai' ? '#1e40af' : '#166534',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {agentType.toUpperCase()}
            </span>
          </span>
          <span>
            <strong>Available:</strong> 
            <span style={{ 
              marginLeft: '8px',
              color: judgeAgent?.isAvailable() ? '#059669' : '#dc2626',
              fontWeight: 'bold'
            }}>
              {judgeAgent?.isAvailable() ? '✅ Yes' : '❌ No'}
            </span>
          </span>
        </div>
        
        {agentType === 'mock' && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            backgroundColor: '#fef3c7', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#92400e'
          }}>
            💡 <strong>Mock Mode:</strong> Using deterministic mock judge for development. 
            Set LLM_TOKEN or OLLAMA_* environment variables for real judge agents.
          </div>
        )}
      </div>

      {/* Proposal Input */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Proposal to Judge</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={loadSampleComplexProposal}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Load Complex Sample
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>
        
        <textarea
          value={proposalText}
          onChange={(e) => setProposalText(e.target.value)}
          placeholder="Enter proposal markdown with proof section..."
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'Monaco, monospace',
            lineHeight: '1.5',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Judge Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleJudgeProposal}
          disabled={isJudging || !judgeAgent}
          style={{
            padding: '12px 24px',
            backgroundColor: isJudging ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: isJudging ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isJudging ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Judging...
            </>
          ) : (
            <>⚖️ Judge Proposal</>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Judge Result */}
      {judgeResult && (
        <div style={{
          backgroundColor: judgeResult.verdict === 'sound' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${judgeResult.verdict === 'sound' ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: judgeResult.verdict === 'sound' ? '#166534' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {judgeResult.verdict === 'sound' ? '✅' : '❌'} 
            Judge Verdict: {judgeResult.verdict.toUpperCase()}
          </h3>
          
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#374151' }}>Justification:</h4>
            <p style={{ 
              margin: 0, 
              lineHeight: '1.6',
              color: '#1f2937',
              whiteSpace: 'pre-wrap'
            }}>
              {judgeResult.justification}
            </p>
          </div>
        </div>
      )}

      {/* Development Information */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '30px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1e293b' }}>Development Information</h3>
        
        <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
          <p><strong>Purpose:</strong> This interface allows testing of judge functionality per Rules 107 and 122.</p>
          
          <p><strong>Rule 121 Requirements:</strong> Every proposal must include a proof section demonstrating:</p>
          <ul style={{ marginLeft: '20px' }}>
            <li>(a) adoption does not render the ruleset inconsistent</li>
            <li>(b) maintains or improves likelihood of satisfying Prompt P</li>
          </ul>
          
          <p><strong>Rule 122:</strong> The Judge must state why each Proof Section is sound or unsound.</p>
          
          <p><strong>API Usage:</strong> Judge agents can be programmatically accessed via the IJudgeAgent interface.</p>
          
          <p><strong>Configuration:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li><code>LLM_TOKEN</code> - OpenAI API key for GPT-based judging</li>
            <li><code>OLLAMA_BASE_URL</code> / <code>OLLAMA_MODEL</code> - Local Ollama configuration</li>
            <li><code>JUDGE_AGENT_TYPE</code> - Explicit agent type preference</li>
          </ul>
        </div>
      </div>

      {/* CSS for loading spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
});

export default JudgeRoute; 