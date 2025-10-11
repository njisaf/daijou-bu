import { describe, it, expect, beforeEach } from 'vitest';
import { GameConfigModel, createGameConfig, type IGameConfig } from './GameConfigModel';

describe('GameConfigModel', () => {
  let config: IGameConfig;

  beforeEach(() => {
    config = createGameConfig();
  });

  describe('creation and defaults', () => {
    it('should create with default values', () => {
      expect(config.victoryTarget).toBe(100);
      expect(config.proposerPoints).toBe(10);
      expect(config.forVoterPoints).toBe(5);
      expect(config.againstVoterPenalty).toBe(-5);
      expect(config.turnDelayMs).toBe(200);
      expect(config.timeoutMs).toBe(15000);
      expect(config.agentTimeoutMs).toBe(15000);
      expect(config.maxPlayers).toBe(6);
      expect(config.warmupTurns).toBe(5);
      expect(config.snapshotMode).toBe('full');
      expect(config.debugSnapshots).toBe(false);
      expect(config.enableSnapshotLogging).toBe(true);
      expect(config.promptP).toBe('');
      expect(config.agent.type).toBe('mock');
      expect(config.agent.concurrency).toBe(4);
    });

    it('should create with factory function overrides', () => {
      const customConfig = createGameConfig({
        turnDelayMs: 500,
        promptP: 'Custom prompt',
        agent: {
          type: 'openai',
          concurrency: 2
        }
      });

      expect(customConfig.turnDelayMs).toBe(500);
      expect(customConfig.promptP).toBe('Custom prompt');
      expect(customConfig.agent.type).toBe('openai');
      expect(customConfig.agent.concurrency).toBe(2);
      // Other values should remain default
      expect(customConfig.victoryTarget).toBe(100);
    });

    it('should be valid by default', () => {
      expect(config.isValid).toBe(true);
      expect(config.validationErrors).toEqual([]);
    });
  });

  describe('validation', () => {
    it('should validate turn delay', () => {
      expect(() => {
        config.setTurnDelay(-1);
      }).toThrow('Turn delay must be non-negative');

      // Should accept 0
      config.setTurnDelay(0);
      expect(config.turnDelayMs).toBe(0);
    });

    it('should validate timeout values', () => {
      expect(() => {
        config.setTimeout(0);
      }).toThrow('Timeout must be positive');

      expect(() => {
        config.setTimeout(-1);
      }).toThrow('Timeout must be positive');

      expect(() => {
        config.setAgentTimeout(0);
      }).toThrow('Agent timeout must be positive');
    });

    it('should validate max players', () => {
      expect(() => {
        config.setMaxPlayers(0);
      }).toThrow('Max players must be positive');

      expect(() => {
        config.setMaxPlayers(-1);
      }).toThrow('Max players must be positive');
    });

    it('should validate agent concurrency', () => {
      expect(() => {
        config.setAgentConcurrency(0);
      }).toThrow('Agent concurrency must be positive');

      expect(() => {
        config.setAgentConcurrency(-1);
      }).toThrow('Agent concurrency must be positive');
    });

    it('should collect validation errors', () => {
      // Create an invalid config by directly manipulating values
      const invalidConfig = GameConfigModel.create({
        turnDelayMs: -1,
        timeoutMs: 0,
        agentTimeoutMs: -5,
        maxPlayers: 0,
        victoryTarget: -10
      });

      const errors = invalidConfig.validationErrors;
      expect(errors).toContain('Turn delay must be non-negative');
      expect(errors).toContain('Timeout must be positive');
      expect(errors).toContain('Agent timeout must be positive');
      expect(errors).toContain('Max players must be positive');
      expect(errors).toContain('Victory target must be positive');
      expect(invalidConfig.isValid).toBe(false);
    });

    it('should validate and throw on factory function', () => {
      expect(() => {
        createGameConfig({
          timeoutMs: -1000
        });
      }).toThrow('Configuration validation failed');
    });
  });

  describe('configuration updates', () => {
    it('should update turn delay', () => {
      config.setTurnDelay(1000);
      expect(config.turnDelayMs).toBe(1000);
    });

    it('should update timeout values', () => {
      config.setTimeout(30000);
      expect(config.timeoutMs).toBe(30000);

      config.setAgentTimeout(25000);
      expect(config.agentTimeoutMs).toBe(25000);
    });

    it('should update max players', () => {
      config.setMaxPlayers(10);
      expect(config.maxPlayers).toBe(10);
    });

    it('should update snapshot mode', () => {
      config.setSnapshotMode('diff');
      expect(config.snapshotMode).toBe('diff');

      config.setSnapshotMode('full');
      expect(config.snapshotMode).toBe('full');
    });

    it('should update debug snapshots', () => {
      config.setDebugSnapshots(true);
      expect(config.debugSnapshots).toBe(true);

      config.setDebugSnapshots(false);
      expect(config.debugSnapshots).toBe(false);
    });

    it('should update agent configuration', () => {
      config.setAgentType('openai');
      expect(config.agent.type).toBe('openai');

      config.setAgentType('ollama');
      expect(config.agent.type).toBe('ollama');

      config.setAgentConcurrency(8);
      expect(config.agent.concurrency).toBe(8);
    });

    it('should update Prompt P', () => {
      const prompt = 'You are a strategic AI player';
      config.setPromptP(prompt);
      expect(config.promptP).toBe(prompt);
    });

    it('should reset to defaults', () => {
      // Change some values
      config.setTurnDelay(1000);
      config.setPromptP('Custom prompt');
      config.setAgentType('openai');
      config.setMaxPlayers(10);

      // Reset
      config.resetToDefaults();

      // Should be back to defaults
      expect(config.turnDelayMs).toBe(200);
      expect(config.promptP).toBe('');
      expect(config.agent.type).toBe('mock');
      expect(config.maxPlayers).toBe(6);
    });
  });

  describe('bulk updates', () => {
    it('should update multiple values at once', () => {
      config.updateConfig({
        turnDelayMs: 500,
        maxPlayers: 8,
        promptP: 'Bulk update prompt',
        agentType: 'openai',
        snapshotMode: 'diff'
      });

      expect(config.turnDelayMs).toBe(500);
      expect(config.maxPlayers).toBe(8);
      expect(config.promptP).toBe('Bulk update prompt');
      expect(config.agent.type).toBe('openai');
      expect(config.snapshotMode).toBe('diff');
    });

    it('should validate during bulk updates', () => {
      expect(() => {
        config.updateConfig({
          turnDelayMs: -1,
          maxPlayers: 0
        });
      }).toThrow('Turn delay must be non-negative');
    });

    it('should only update provided values', () => {
      const originalTimeout = config.timeoutMs;
      const originalPrompt = config.promptP;

      config.updateConfig({
        turnDelayMs: 1000
      });

      expect(config.turnDelayMs).toBe(1000);
      expect(config.timeoutMs).toBe(originalTimeout);
      expect(config.promptP).toBe(originalPrompt);
    });
  });

  describe('computed views', () => {
    it('should determine if full snapshots should be used', () => {
      // Default mode is 'full'
      expect(config.shouldUseFullSnapshots).toBe(true);

      // Switch to diff mode
      config.setSnapshotMode('diff');
      expect(config.shouldUseFullSnapshots).toBe(false);

      // Debug snapshots override mode
      config.setDebugSnapshots(true);
      expect(config.shouldUseFullSnapshots).toBe(true);
    });

    it('should export as plain object', () => {
      config.setTurnDelay(1000);
      config.setPromptP('Test prompt');
      config.setAgentType('openai');

      const plain = config.asPlainObject;

      expect(plain).toEqual({
        victoryTarget: 100,
        proposerPoints: 10,
        forVoterPoints: 5,
        againstVoterPenalty: -5,
        turnDelayMs: 1000,
        timeoutMs: 15000,
        warmupTurns: 5,
        snapshotMode: 'full',
        debugSnapshots: false,
        enableSnapshotLogging: true,
        agent: {
          type: 'openai',
          concurrency: 4
        },
        promptP: 'Test prompt',
        maxPlayers: 6,
        agentTimeoutMs: 15000
      });
    });
  });

  describe('compatibility with existing config', () => {
    it('should match structure of DEFAULT_CONFIG from config.ts', () => {
      const plain = config.asPlainObject;

      // Should have all the fields from DEFAULT_CONFIG
      expect(plain).toHaveProperty('victoryTarget');
      expect(plain).toHaveProperty('proposerPoints');
      expect(plain).toHaveProperty('forVoterPoints');
      expect(plain).toHaveProperty('againstVoterPenalty');
      expect(plain).toHaveProperty('turnDelayMs');
      expect(plain).toHaveProperty('timeoutMs');
      expect(plain).toHaveProperty('warmupTurns');
      expect(plain).toHaveProperty('snapshotMode');
      expect(plain).toHaveProperty('debugSnapshots');
      expect(plain).toHaveProperty('enableSnapshotLogging');
      expect(plain).toHaveProperty('agent');
      expect(plain).toHaveProperty('promptP');

      // Agent should have correct structure
      expect(plain.agent).toHaveProperty('type');
      expect(plain.agent).toHaveProperty('concurrency');
    });

    it('should work with MST snapshots', () => {
      config.setTurnDelay(2000);
      config.setPromptP('Snapshot test');

      // Take snapshot
      const snapshot = config.asPlainObject;

      // Create new config from snapshot
      const newConfig = createGameConfig(snapshot);

      expect(newConfig.turnDelayMs).toBe(2000);
      expect(newConfig.promptP).toBe('Snapshot test');
    });
  });

  describe('edge cases', () => {
    it('should handle empty prompt P', () => {
      config.setPromptP('');
      expect(config.promptP).toBe('');
      expect(config.isValid).toBe(true);
    });

    it('should handle very long prompt P', () => {
      const longPrompt = 'A'.repeat(10000);
      config.setPromptP(longPrompt);
      expect(config.promptP).toBe(longPrompt);
      expect(config.isValid).toBe(true);
    });

    it('should handle zero warmup turns', () => {
      config.updateConfig({ warmupTurns: 0 });
      expect(config.warmupTurns).toBe(0);
      expect(config.isValid).toBe(true);
    });

    it('should handle large timeout values', () => {
      config.setTimeout(60000);
      config.setAgentTimeout(120000);
      
      expect(config.timeoutMs).toBe(60000);
      expect(config.agentTimeoutMs).toBe(120000);
      expect(config.isValid).toBe(true);
    });
  });

  describe('Stage 6.1 specific features', () => {
    it('should include maxPlayers for future player management', () => {
      expect(config.maxPlayers).toBe(6);
      config.setMaxPlayers(12);
      expect(config.maxPlayers).toBe(12);
    });

    it('should include agentTimeoutMs separate from HTTP timeout', () => {
      expect(config.agentTimeoutMs).toBe(15000);
      
      // Should be able to set different values
      config.setTimeout(10000);
      config.setAgentTimeout(20000);
      
      expect(config.timeoutMs).toBe(10000);
      expect(config.agentTimeoutMs).toBe(20000);
    });

    it('should support all three agent types', () => {
      config.setAgentType('mock');
      expect(config.agent.type).toBe('mock');

      config.setAgentType('openai');
      expect(config.agent.type).toBe('openai');

      config.setAgentType('ollama');
      expect(config.agent.type).toBe('ollama');
    });

    it('should maintain backward compatibility for legacy victory logic', () => {
      // Victory target should still be available for Stage 6.1
      expect(config.victoryTarget).toBe(100);
      config.updateConfig({ victoryTarget: 150 });
      expect(config.victoryTarget).toBe(150);
    });
  });
}); 