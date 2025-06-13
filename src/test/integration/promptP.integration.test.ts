import { describe, it, expect, beforeEach } from 'vitest';
import { GameModel } from '../../models/GameModel';
import { loadInitialRules } from '../../utils/loadInitialRules';
import { getGameConfig } from '../../config';
import { GamePackager } from '../../packaging/GamePackager';

/**
 * Integration test verifying Prompt P flows correctly through the entire system
 * 
 * Tests the complete flow:
 * Home → config → GameModel → agents → UI → archives
 */
describe('Prompt P Integration', () => {
  const testPromptP = 'You are a strategic AI player in Nomic. Make fair but competitive proposals.';
  let gameModel: typeof GameModel.Type;

  beforeEach(() => {
    // Simulate the flow from Home component
    const config = {
      ...getGameConfig(),
      promptP: testPromptP
    };
    
    const initialRules = loadInitialRules(testPromptP);
    
    // Create game model with Prompt P (simulating GameProvider)
    gameModel = GameModel.create({
      config,
      rules: [],
      players: [],
      proposals: [],
      turn: 0,
      phase: 'setup'
    });

    // Load initial rules (30 rules including rule 100 with Prompt P)
    gameModel.loadFromRules(initialRules);

    // Add test players
    gameModel.addPlayer({
      id: 'alice',
      name: 'Alice',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3001',
      points: 50,
      isActive: true
    });

    gameModel.addPlayer({
      id: 'bob',
      name: 'Bob',
      icon: '🦾',
      llmEndpoint: 'http://localhost:3002',
      points: 30,
      isActive: false
    });

    // Set game to completed phase for packaging tests
    gameModel.setPhase('completed');
  });

  describe('Config Integration', () => {
    it('should load Prompt P from environment and config', () => {
      const config = getGameConfig();
      
      // Verify default config structure supports Prompt P
      expect(config).toHaveProperty('promptP');
      expect(typeof config.promptP).toBe('string');
    });

    it('should inject Prompt P into rule 100', () => {
      const rules = loadInitialRules();
      const rule100 = rules.find(rule => rule.id === 100);
      
      expect(rule100).toBeDefined();
      expect(rule100?.text).toContain(testPromptP);
      expect(rule100?.mutable).toBe(false); // Should be immutable
    });
  });

  describe('GameModel Integration', () => {
    it('should store Prompt P in config and expose via gameSnapshot', () => {
      expect(gameModel.config.promptP).toBe(testPromptP);
      
      const snapshot = gameModel.gameSnapshot;
      expect(snapshot.proofStatement).toBe(testPromptP);
    });

    it('should include rule 100 with Prompt P in initial rules', () => {
      const rule100 = gameModel.rules.find(rule => rule.id === 100);
      
      expect(rule100).toBeDefined();
      expect(rule100?.text).toContain(testPromptP);
      expect(rule100?.mutable).toBe(false);
    });

    it('should load 30 rules total (29 original + 1 injected rule 100)', () => {
      expect(gameModel.rules.length).toBe(30);
      
      // Should have all original rules plus rule 100
      const ruleIds = gameModel.rules.map(rule => rule.id).sort((a, b) => a - b);
      expect(ruleIds[0]).toBe(100); // Rule 100 should be first (highest precedence)
      expect(ruleIds[1]).toBe(101); // Original rule 101 should be second
    });
  });

  describe('Agent Integration', () => {
    it('should expose Prompt P via gameSnapshot.proofStatement for agents', () => {
      const snapshot = gameModel.gameSnapshot;
      
      // This is what agents will receive
      expect(snapshot).toHaveProperty('proofStatement');
      expect(snapshot.proofStatement).toBe(testPromptP);
      expect(snapshot.proofStatement).toContain('strategic AI player');
    });

    it('should include Prompt P in system prompts (verified via agent tests)', () => {
      // Note: Actual agent prompt building is tested in agent-specific tests
      // This verifies the data flow is correct
      const snapshot = gameModel.gameSnapshot;
      
      expect(snapshot.proofStatement).toBeTruthy();
      expect(snapshot.proofStatement.length).toBeGreaterThan(0);
    });
  });

  describe('Packaging Integration', () => {
    it('should include Prompt P in RULEBOOK.md banner', () => {
      const packager = new GamePackager();
      const rulebook = packager.generateRulebook(gameModel);
      
      expect(rulebook).toContain('## 🎯 Prompt P (AI Instructions)');
      expect(rulebook).toContain(testPromptP);
      expect(rulebook).toContain('```');
      expect(rulebook).toContain('*The following instructions guided AI player behavior throughout this game:*');
    });

    it('should generate PROMPT_P.txt file with correct content', () => {
      const packager = new GamePackager();
      const promptPFile = packager.generatePromptPFile(gameModel);
      
      expect(promptPFile).toContain('PROMPT P - AI PLAYER INSTRUCTIONS');
      expect(promptPFile).toContain(testPromptP);
      expect(promptPFile).toContain('Total Players: 2');
      expect(promptPFile).toContain('automatically injected into every AI agent request');
    });

    it('should include PROMPT_P.txt in package contents', async () => {
      const packager = new GamePackager();
      const packageData = await packager.createGamePackage(gameModel);
      
      expect(packageData.contents).toContain('PROMPT_P.txt');
      expect(packageData.contents).toContain('RULEBOOK.md');
      expect(packageData.contents).toContain('SCORE_REPORT.md');
      expect(packageData.contents).toHaveLength(3);
    });
  });

  describe('Complete Flow Integration', () => {
    it('should maintain Prompt P consistency across all components', () => {
      // 1. Config level
      expect(gameModel.config.promptP).toBe(testPromptP);
      
      // 2. Rule level (auto-injected rule 100)
      const rule100 = gameModel.rules.find(rule => rule.id === 100);
      expect(rule100?.text).toContain(testPromptP);
      
      // 3. Snapshot level (for agents)
      expect(gameModel.gameSnapshot.proofStatement).toBe(testPromptP);
      
      // 4. Archive level
      const packager = new GamePackager();
      const rulebook = packager.generateRulebook(gameModel);
      const promptPFile = packager.generatePromptPFile(gameModel);
      
      expect(rulebook).toContain(testPromptP);
      expect(promptPFile).toContain(testPromptP);
    });

    it('should handle empty Prompt P gracefully across all components', () => {
      // Create game model without Prompt P
      const configWithoutPromptP = {
        ...getGameConfig(),
        promptP: ''
      };
      
      const gameModelWithoutPromptP = GameModel.create({
        config: configWithoutPromptP,
        rules: [],
        players: [],
        proposals: [],
        turn: 0,
        phase: 'completed'
      });

      // Load rules without Prompt P
      const rulesWithoutPromptP = loadInitialRules();
      gameModelWithoutPromptP.loadFromRules(rulesWithoutPromptP);
      
      // Should still have 30 rules, but rule 100 should have empty text
      expect(gameModelWithoutPromptP.rules.length).toBe(30);
      
      const rule100 = gameModelWithoutPromptP.rules.find(rule => rule.id === 100);
      expect(rule100?.text).toBe(''); // Empty Prompt P
      
      // Snapshot should have empty proof statement
      expect(gameModelWithoutPromptP.gameSnapshot.proofStatement).toBe('');
      
      // Archive should handle empty gracefully
      const packager = new GamePackager();
      const rulebook = packager.generateRulebook(gameModelWithoutPromptP);
      
      expect(rulebook).not.toContain('## 🎯 Prompt P (AI Instructions)');
    });
  });

  describe('UI Integration Readiness', () => {
    it('should expose Prompt P data for TurnBanner component', () => {
      // TurnBanner can access via gameModel.config.promptP
      expect(gameModel.config.promptP).toBe(testPromptP);
      expect(gameModel.config.promptP).toBeTruthy();
    });

    it('should provide proper typing for UI components', () => {
      // Verify the data types are correct for UI consumption
      const promptP = gameModel.config.promptP;
      
      expect(typeof promptP).toBe('string');
      expect(promptP.length).toBeGreaterThan(0);
    });
  });
}); 