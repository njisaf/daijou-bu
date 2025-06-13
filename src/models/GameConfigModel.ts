import { types, type Instance, type SnapshotIn, type SnapshotOut } from 'mobx-state-tree';

/**
 * Agent configuration sub-model
 */
const AgentConfigModel = types
  .model('AgentConfig', {
    /** Type of agent to use ('openai' | 'ollama' | 'mock') */
    type: types.enumeration(['openai', 'ollama', 'mock']),
    
    /** Maximum concurrent agent requests */
    concurrency: types.optional(types.number, 4)
  });

/**
 * MST model for game configuration
 * 
 * This model replaces the frozen GameConfig and provides:
 * - Reactive configuration updates
 * - Validation of configuration values
 * - Type safety for all game settings
 * - Support for runtime configuration changes
 * 
 * @see daijo-bu_architecture.md Stage 6.1 for model specification
 * @see src/config.ts for default values
 */
export const GameConfigModel = types
  .model('GameConfig', {
    /** Victory target score (for legacy compatibility - will be removed in Stage 6.5) */
    victoryTarget: types.optional(types.number, 100),
    
    /** Points awarded to proposer when proposal is adopted */
    proposerPoints: types.optional(types.number, 10),
    
    /** Points awarded to each FOR voter when proposal is adopted */
    forVoterPoints: types.optional(types.number, 5),
    
    /** Points deducted from each AGAINST voter when proposal is adopted */
    againstVoterPenalty: types.optional(types.number, -5),
    
    /** Delay between turns in milliseconds (configurable for dev purposes) */
    turnDelayMs: types.optional(types.number, 200),
    
    /** HTTP request timeout for MCP servers in milliseconds */
    timeoutMs: types.optional(types.number, 15000),
    
    /** Number of turns to use full snapshots before switching to diff mode */
    warmupTurns: types.optional(types.number, 5),
    
    /** Snapshot mode: 'full' for complete snapshots, 'diff' for incremental */
    snapshotMode: types.optional(types.enumeration(['full', 'diff']), 'full'),
    
    /** Override to always use full snapshots for debugging */
    debugSnapshots: types.optional(types.boolean, false),
    
    /** Whether to enable snapshot logging to console */
    enableSnapshotLogging: types.optional(types.boolean, true),
    
    /** Agent configuration */
    agent: types.optional(AgentConfigModel, () => ({
      type: 'mock',
      concurrency: 4
    })),
    
    /** Prompt P - instructions for LLM players */
    promptP: types.optional(types.string, ''),
    
    /** Maximum number of players allowed in the game */
    maxPlayers: types.optional(types.number, 6),
    
    /** Agent timeout for individual requests (may differ from HTTP timeout) */
    agentTimeoutMs: types.optional(types.number, 15000)
  })
  .views(self => ({
    /**
     * Check if the configuration is valid for starting a game
     */
    get isValid(): boolean {
      return (
        self.turnDelayMs >= 0 &&
        self.timeoutMs > 0 &&
        self.agentTimeoutMs > 0 &&
        self.warmupTurns >= 0 &&
        self.maxPlayers > 0 &&
        self.victoryTarget > 0
      );
    },

    /**
     * Get validation errors for the configuration
     */
    get validationErrors(): string[] {
      const errors: string[] = [];

      if (self.turnDelayMs < 0) {
        errors.push('Turn delay must be non-negative');
      }

      if (self.timeoutMs <= 0) {
        errors.push('Timeout must be positive');
      }

      if (self.agentTimeoutMs <= 0) {
        errors.push('Agent timeout must be positive');
      }

      if (self.warmupTurns < 0) {
        errors.push('Warmup turns must be non-negative');
      }

      if (self.maxPlayers <= 0) {
        errors.push('Max players must be positive');
      }

      if (self.victoryTarget <= 0) {
        errors.push('Victory target must be positive');
      }

      return errors;
    },

    /**
     * Check if snapshots should be full (not diff) mode
     */
    get shouldUseFullSnapshots(): boolean {
      return self.debugSnapshots || self.snapshotMode === 'full';
    },

    /**
     * Get configuration as plain object (for backward compatibility)
     */
    get asPlainObject() {
      return {
        victoryTarget: self.victoryTarget,
        proposerPoints: self.proposerPoints,
        forVoterPoints: self.forVoterPoints,
        againstVoterPenalty: self.againstVoterPenalty,
        turnDelayMs: self.turnDelayMs,
        timeoutMs: self.timeoutMs,
        warmupTurns: self.warmupTurns,
        snapshotMode: self.snapshotMode,
        debugSnapshots: self.debugSnapshots,
        enableSnapshotLogging: self.enableSnapshotLogging,
        agent: {
          type: self.agent.type,
          concurrency: self.agent.concurrency
        },
        promptP: self.promptP,
        maxPlayers: self.maxPlayers,
        agentTimeoutMs: self.agentTimeoutMs
      };
    }
  }))
  .actions(self => ({
    /**
     * Update turn delay
     * @param delayMs - New delay in milliseconds
     */
    setTurnDelay(delayMs: number) {
      if (delayMs < 0) {
        throw new Error('Turn delay must be non-negative');
      }
      self.turnDelayMs = delayMs;
    },

    /**
     * Update HTTP timeout
     * @param timeoutMs - New timeout in milliseconds
     */
    setTimeout(timeoutMs: number) {
      if (timeoutMs <= 0) {
        throw new Error('Timeout must be positive');
      }
      self.timeoutMs = timeoutMs;
    },

    /**
     * Update agent timeout
     * @param timeoutMs - New agent timeout in milliseconds
     */
    setAgentTimeout(timeoutMs: number) {
      if (timeoutMs <= 0) {
        throw new Error('Agent timeout must be positive');
      }
      self.agentTimeoutMs = timeoutMs;
    },

    /**
     * Update maximum players
     * @param maxPlayers - New maximum number of players
     */
    setMaxPlayers(maxPlayers: number) {
      if (maxPlayers <= 0) {
        throw new Error('Max players must be positive');
      }
      self.maxPlayers = maxPlayers;
    },

    /**
     * Update snapshot mode
     * @param mode - New snapshot mode
     */
    setSnapshotMode(mode: 'full' | 'diff') {
      self.snapshotMode = mode;
    },

    /**
     * Toggle debug snapshots
     * @param enabled - Whether debug snapshots should be enabled
     */
    setDebugSnapshots(enabled: boolean) {
      self.debugSnapshots = enabled;
    },

    /**
     * Update agent type
     * @param type - New agent type
     */
    setAgentType(type: 'openai' | 'ollama' | 'mock') {
      self.agent.type = type;
    },

    /**
     * Update agent concurrency
     * @param concurrency - New concurrency limit
     */
    setAgentConcurrency(concurrency: number) {
      if (concurrency <= 0) {
        throw new Error('Agent concurrency must be positive');
      }
      self.agent.concurrency = concurrency;
    },

    /**
     * Update Prompt P
     * @param promptP - New Prompt P text
     */
    setPromptP(promptP: string) {
      self.promptP = promptP;
    },

    /**
     * Validate configuration and throw if invalid
     * @throws Error if validation fails
     */
    validateAndThrow() {
      const errors = self.validationErrors;
      if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
      }
    },

    /**
     * Reset configuration to defaults
     */
    resetToDefaults() {
      self.victoryTarget = 100;
      self.proposerPoints = 10;
      self.forVoterPoints = 5;
      self.againstVoterPenalty = -5;
      self.turnDelayMs = 200;
      self.timeoutMs = 15000;
      self.warmupTurns = 5;
      self.snapshotMode = 'full';
      self.debugSnapshots = false;
      self.enableSnapshotLogging = true;
      self.agent.type = 'mock';
      self.agent.concurrency = 4;
      self.promptP = '';
      self.maxPlayers = 6;
      self.agentTimeoutMs = 15000;
    },

    /**
     * Update multiple configuration values at once
     * @param updates - Partial configuration updates
     */
    updateConfig(updates: Partial<{
      victoryTarget: number;
      proposerPoints: number;
      forVoterPoints: number;
      againstVoterPenalty: number;
      turnDelayMs: number;
      timeoutMs: number;
      warmupTurns: number;
      snapshotMode: 'full' | 'diff';
      debugSnapshots: boolean;
      enableSnapshotLogging: boolean;
      promptP: string;
      maxPlayers: number;
      agentTimeoutMs: number;
      agentType: 'openai' | 'ollama' | 'mock';
      agentConcurrency: number;
    }>) {
      if (updates.victoryTarget !== undefined) {
        self.victoryTarget = updates.victoryTarget;
      }
      if (updates.proposerPoints !== undefined) {
        self.proposerPoints = updates.proposerPoints;
      }
      if (updates.forVoterPoints !== undefined) {
        self.forVoterPoints = updates.forVoterPoints;
      }
      if (updates.againstVoterPenalty !== undefined) {
        self.againstVoterPenalty = updates.againstVoterPenalty;
      }
      if (updates.turnDelayMs !== undefined) {
        this.setTurnDelay(updates.turnDelayMs);
      }
      if (updates.timeoutMs !== undefined) {
        this.setTimeout(updates.timeoutMs);
      }
      if (updates.agentTimeoutMs !== undefined) {
        this.setAgentTimeout(updates.agentTimeoutMs);
      }
      if (updates.maxPlayers !== undefined) {
        this.setMaxPlayers(updates.maxPlayers);
      }
      if (updates.snapshotMode !== undefined) {
        this.setSnapshotMode(updates.snapshotMode);
      }
      if (updates.debugSnapshots !== undefined) {
        this.setDebugSnapshots(updates.debugSnapshots);
      }
      if (updates.enableSnapshotLogging !== undefined) {
        self.enableSnapshotLogging = updates.enableSnapshotLogging;
      }
      if (updates.promptP !== undefined) {
        this.setPromptP(updates.promptP);
      }
      if (updates.agentType !== undefined) {
        this.setAgentType(updates.agentType);
      }
      if (updates.agentConcurrency !== undefined) {
        this.setAgentConcurrency(updates.agentConcurrency);
      }
      if (updates.warmupTurns !== undefined) {
        self.warmupTurns = updates.warmupTurns;
      }
    }
  }));

export interface IGameConfig extends Instance<typeof GameConfigModel> {}
export type GameConfigSnapshot = SnapshotOut<typeof GameConfigModel>;
export type GameConfigSnapshotIn = SnapshotIn<typeof GameConfigModel>;

/**
 * Factory function to create a game configuration with defaults
 * @param overrides - Optional configuration overrides
 * @returns New game configuration instance
 */
export function createGameConfig(overrides: Partial<GameConfigSnapshotIn> = {}): IGameConfig {
  const config = GameConfigModel.create({
    victoryTarget: 100,
    proposerPoints: 10,
    forVoterPoints: 5,
    againstVoterPenalty: -5,
    turnDelayMs: 200,
    timeoutMs: 15000,
    warmupTurns: 5,
    snapshotMode: 'full',
    debugSnapshots: false,
    enableSnapshotLogging: true,
    agent: {
      type: 'mock',
      concurrency: 4
    },
    promptP: '',
    maxPlayers: 6,
    agentTimeoutMs: 15000,
    ...overrides
  });

  // Validate the configuration
  config.validateAndThrow();

  return config;
} 