/**
 * Tests for game configuration with Prompt P support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGameConfig, DEFAULT_CONFIG, type GameConfig } from './config';

describe('GameConfig with Prompt P', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('GameConfig interface', () => {
    it('should include promptP field', () => {
      const config: GameConfig = DEFAULT_CONFIG;
      expect(config).toHaveProperty('promptP');
      expect(typeof config.promptP).toBe('string');
    });

    it('should have empty string as default promptP', () => {
      expect(DEFAULT_CONFIG.promptP).toBe('');
    });

    it('should support PROMPT_P environment variable', () => {
      const testPrompt = 'Test prompt for LLM agents';
      process.env.PROMPT_P = testPrompt;
      
      // Test that getGameConfig picks up the environment variable
      const config = getGameConfig();
      expect(config.promptP).toBe(testPrompt);
    });
  });

  describe('getGameConfig function', () => {
    it('should return config with promptP field', () => {
      const config = getGameConfig();
      expect(config).toHaveProperty('promptP');
    });

    it('should merge environment promptP', () => {
      const testPrompt = 'Environment test prompt';
      process.env.PROMPT_P = testPrompt;
      
      const config = getGameConfig();
      expect(config.promptP).toBe(testPrompt);
    });

    it('should preserve other config properties', () => {
      const config = getGameConfig();
      expect(config.victoryTarget).toBe(100);
      expect(config.proposerPoints).toBe(10);
      expect(config.forVoterPoints).toBe(5);
      expect(config.againstVoterPenalty).toBe(-5);
      expect(config.agent.type).toMatch(/^(openai|ollama|mock)$/);
    });

    it('should fall back to default promptP when env var not set', () => {
      delete process.env.PROMPT_P;
      
      const config = getGameConfig();
      expect(config.promptP).toBe(DEFAULT_CONFIG.promptP);
    });
  });
}); 