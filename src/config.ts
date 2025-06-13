/**
 * Configuration for the Proof-Nomic LLM Game
 * 
 * This file contains all the configurable constants used throughout the game.
 * Values are based on the specifications in the devbot_kickoff_prompt.md
 * 
 * @see https://github.com/microsoft/TypeScript/wiki/Coding-guidelines#names
 */

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
  timeoutMs: 8000,             // Request timeout
  warmupTurns: 5,              // Snapshot mode warmup
  snapshotMode: 'full',        // Start with full snapshots
  debugSnapshots: false,       // Production default
  enableSnapshotLogging: true  // Enable by default for development
};

/**
 * Get the current game configuration
 * In the future this could be enhanced to read from localStorage or URL params
 */
export function getGameConfig(): GameConfig {
  return { ...DEFAULT_CONFIG };
} 