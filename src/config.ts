/**
 * Configuration for the Proof-Nomic LLM Game
 * 
 * This file contains all the configurable constants used throughout the game.
 * Values are based on the specifications in the devbot_kickoff_prompt.md
 * 
 * @see https://github.com/microsoft/TypeScript/wiki/Coding-guidelines#names
 */

// Load environment variables from .env file if available
// This is important for server-side contexts and testing
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    // dotenv not available, continue with existing environment
  }
}

/**
 * Detect agent type from environment variables
 * Priority: AGENT_TYPE env var > auto-detect from API keys > fallback to mock
 */
function getAgentTypeFromEnv(): 'openai' | 'ollama' | 'mock' {
  // Explicit override
  const explicitType = process.env.AGENT_TYPE as 'openai' | 'ollama' | 'mock' | undefined;
  if (explicitType && ['openai', 'ollama', 'mock'].includes(explicitType)) {
    return explicitType;
  }
  
  // Auto-detect based on available configuration
  if (process.env.LLM_TOKEN) {
    return 'openai';
  }
  
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
    return 'ollama';
  }
  
  // Default to mock for development/testing
  return 'mock';
}

export interface GameConfig {
  /** Victory target score as per Rule 102 */
  victoryTarget: number;
  
  /** Points awarded to proposer when proposal is adopted */
  proposerPoints: number;
  
  /** Points awarded to each FOR voter when proposal is adopted */
  forVoterPoints: number;
  
  /** Points deducted from each AGAINST voter when proposal is adopted */
  againstVoterPenalty: number;
  
  /** Delay between turns in milliseconds (configurable for dev purposes) */
  turnDelayMs: number;
  
  /** HTTP request timeout for MCP servers in milliseconds */
  timeoutMs: number;
  
  /** Number of turns to use full snapshots before switching to diff mode */
  warmupTurns: number;
  
  /** Snapshot mode: 'full' for complete snapshots, 'diff' for incremental */
  snapshotMode: 'full' | 'diff';
  
  /** Override to always use full snapshots for debugging */
  debugSnapshots: boolean;
  
  /** Whether to enable snapshot logging to console */
  enableSnapshotLogging: boolean;
  
  /** Snapshot compression mode: 'none' for no compression, 'gzip' for gzip compression */
  snapshotCompression: 'none' | 'gzip';
  
  /** Agent type configuration */
  agent: {
    /** Type of agent to use ('openai' | 'ollama' | 'mock') */
    type: 'openai' | 'ollama' | 'mock';
    
    /** Maximum concurrent agent requests */
    concurrency: number;
  };
  
  /** Prompt P - instructions for LLM players */
  promptP: string;
}

/**
 * Default game configuration based on the requirements specification
 */
export const DEFAULT_CONFIG: GameConfig = {
  victoryTarget: 100,          // Rule 102
  proposerPoints: 10,          // Scoring on adoption
  forVoterPoints: 5,           // Scoring on adoption
  againstVoterPenalty: -5,     // Scoring on adoption  
  turnDelayMs: 200,            // Turn delay (default)
  timeoutMs: 15000,            // Request timeout (increased for Ollama)
  warmupTurns: 5,              // Snapshot mode warmup
  snapshotMode: 'full',        // Start with full snapshots
  debugSnapshots: false,       // Production default
  enableSnapshotLogging: true, // Enable by default for development
  snapshotCompression: 'none', // No compression by default
  agent: {
    type: getAgentTypeFromEnv(), // Auto-detect from environment
    concurrency: 4              // Phase 5 Objective 5: Concurrency bump
  },
  promptP: process.env.PROMPT_P || '' // Default to empty string
};

/**
 * Get the current game configuration
 * In the future this could be enhanced to read from localStorage or URL params
 */
export function getGameConfig(): GameConfig {
  return { 
    ...DEFAULT_CONFIG,
    promptP: process.env.PROMPT_P || DEFAULT_CONFIG.promptP
  };
} 