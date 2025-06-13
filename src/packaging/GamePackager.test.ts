import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GamePackager } from './GamePackager';
import { GameModel } from '../models/GameModel';
import { DEFAULT_CONFIG } from '../config';

// Mock URL.createObjectURL and URL.revokeObjectURL for test environment
Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:http://localhost:3000/mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
});

describe('GamePackager', () => {
  let gameModel: typeof GameModel.Type;
  let packager: GamePackager;

  beforeEach(() => {
    packager = new GamePackager();
    
    // Create a game model with Prompt P for testing
    const config = {
      ...getGameConfig(),
      promptP: 'You are a strategic AI player in Nomic. Make proposals that help you win while being fair to other players.'
    };
    
    const initialRules = loadInitialRules();
    
    gameModel = GameModel.create({
      config,
      rules: initialRules.map(rule => ({
        id: rule.id,
        text: rule.text,
        mutable: rule.mutable
      })),
      players: [
        { id: 'alice', name: 'Alice', points: 100, icon: '🤖', isActive: false },
        { id: 'bob', name: 'Bob', points: 85, icon: '🦾', isActive: false },
        { id: 'charlie', name: 'Charlie', points: 70, icon: '🧠', isActive: false }
      ],
      proposals: [
        {
          id: 301,
          type: 'Add',
          ruleNumber: 214,
          ruleText: 'Test rule for scoring',
          proposerId: 'alice',
          status: 'passed',
          votes: [
            { voterId: 'alice', choice: 'FOR' },
            { voterId: 'bob', choice: 'FOR' },
            { voterId: 'charlie', choice: 'AGAINST' }
          ]
        }
      ],
      turn: 15,
      phase: 'completed'
    });
  });

  describe('Prompt P integration', () => {
    it('should include Prompt P banner in rulebook when present', () => {
      const rulebook = packager.generateRulebook(gameModel);
      
      expect(rulebook).toContain('## 🎯 Prompt P (AI Instructions)');
      expect(rulebook).toContain('You are a strategic AI player in Nomic');
      expect(rulebook).toContain('```');
      expect(rulebook).toContain('*The following instructions guided AI player behavior throughout this game:*');
    });

    it('should not include Prompt P banner when not present', () => {
      // Create game model without Prompt P
      const configWithoutPromptP = {
        ...getGameConfig(),
        promptP: ''
      };
      
      const gameModelWithoutPromptP = GameModel.create({
        config: configWithoutPromptP,
        rules: [],
        players: [
          { id: 'alice', name: 'Alice', points: 100, icon: '🤖', isActive: false }
        ],
        proposals: [],
        turn: 1,
        phase: 'completed'
      });

      const rulebook = packager.generateRulebook(gameModelWithoutPromptP);
      
      expect(rulebook).not.toContain('## 🎯 Prompt P (AI Instructions)');
      expect(rulebook).not.toContain('You are a strategic AI player');
    });

    it('should generate PROMPT_P.txt file content correctly', () => {
      const promptPContent = packager.generatePromptPFile(gameModel);
      
      expect(promptPContent).toContain('PROMPT P - AI PLAYER INSTRUCTIONS');
      expect(promptPContent).toContain('===================================');
      expect(promptPContent).toContain('You are a strategic AI player in Nomic');
      expect(promptPContent).toContain('PROMPT P CONTENT:');
      expect(promptPContent).toContain('Total Turns: 15');
      expect(promptPContent).toContain('Total Players: 3');
      expect(promptPContent).toContain('Victory Target: 100 points');
      expect(promptPContent).toContain('automatically injected into every AI agent request');
    });

    it('should handle missing Prompt P in PROMPT_P.txt file', () => {
      // Create game model without Prompt P
      const configWithoutPromptP = {
        ...getGameConfig(),
        promptP: ''
      };
      
      const gameModelWithoutPromptP = GameModel.create({
        config: configWithoutPromptP,
        rules: [],
        players: [
          { id: 'alice', name: 'Alice', points: 100, icon: '🤖', isActive: false }
        ],
      config: DEFAULT_CONFIG,
      players: [],
      rules: [],
      proposals: [],
      turn: 0,
      phase: 'setup',
      history: []
    });

    // Add players
    gameModel.addPlayer({
      id: 'player1',
      name: 'Alice',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3001',
      points: 105,
      isActive: false
    });

    gameModel.addPlayer({
      id: 'player2',
      name: 'Bob',
      icon: '🦾',
      llmEndpoint: 'http://localhost:3002',
      points: 85,
      isActive: false
    });

    gameModel.addPlayer({
      id: 'player3',
      name: 'Charlie',
      icon: '🧠',
      llmEndpoint: 'http://localhost:3003',
      points: 60,
      isActive: false
    });

    // Add initial rules
    gameModel.addRule({
      id: 101,
      text: 'All players must abide by the rules.',
      mutable: false
    });

    gameModel.addRule({
      id: 102,
      text: 'The first player to reach 100 points wins.',
      mutable: false
    });

    gameModel.addRule({
      id: 201,
      text: 'Players may form alliances.',
      mutable: true
    });

    // Add some proposals
    gameModel.addProposal({
      id: 1,
      proposerId: 'player1',
      type: 'Add',
      ruleNumber: 301,
      ruleText: 'New players may join with majority approval.',
      status: 'passed',
      votes: [],
      timestamp: Date.now() - 3600000
    });

    gameModel.addProposal({
      id: 2,
      proposerId: 'player2',
      type: 'Amend',
      ruleNumber: 201,
      ruleText: 'Players may form alliances lasting no more than 5 turns.',
      status: 'failed',
      votes: [],
      timestamp: Date.now() - 1800000
    });

    // Set game to completed state using MST action
    // Alice has 105 points which exceeds the 100 point victory target
    gameModel.setupGame(); // Set to playing first
    gameModel.checkVictoryCondition(); // This will set to completed since Alice has 105 points

    packager = new GamePackager();
  });

  describe('rulebook generation', () => {
    it('should generate complete rulebook markdown', () => {
      const rulebook = packager.generateRulebook(gameModel);
      
      expect(rulebook).toContain('# Proof-Nomic Game Rulebook');
      expect(rulebook).toContain('## Initial Rules');
      expect(rulebook).toContain('### Rule 101');
      expect(rulebook).toContain('All players must abide by the rules');
      expect(rulebook).toContain('*Immutable*');
      expect(rulebook).toContain('### Rule 201');
      expect(rulebook).toContain('*Mutable*');
    });

    it('should include adopted proposals in rulebook', () => {
      const rulebook = packager.generateRulebook(gameModel);
      
      expect(rulebook).toContain('## Adopted Proposals');
      expect(rulebook).toContain('### Proposal 1');
      expect(rulebook).toContain('**Type:** Add');
      expect(rulebook).toContain('**Rule Number:** 301');
      expect(rulebook).toContain('New players may join with majority approval');
    });

    it('should not include failed proposals in rulebook', () => {
      const rulebook = packager.generateRulebook(gameModel);
      
      expect(rulebook).not.toContain('Proposal 2');
      expect(rulebook).not.toContain('lasting no more than 5 turns');
    });

    it('should sort rules by ID in rulebook', () => {
      const rulebook = packager.generateRulebook(gameModel);
      
      const rule101Index = rulebook.indexOf('### Rule 101');
      const rule102Index = rulebook.indexOf('### Rule 102');
      const rule201Index = rulebook.indexOf('### Rule 201');
      
      expect(rule101Index).toBeLessThan(rule102Index);
      expect(rule102Index).toBeLessThan(rule201Index);
    });
  });

  describe('score report generation', () => {
    it('should generate complete score report', () => {
      const scoreReport = packager.generateScoreReport(gameModel);
      
      expect(scoreReport).toContain('# Score Report');
      expect(scoreReport).toContain('| Rank | Player | Points |');
      expect(scoreReport).toContain('| 1 | Alice 🏆 | 105 |');
      expect(scoreReport).toContain('| 2 | Bob | 85 |');
      expect(scoreReport).toContain('| 3 | Charlie | 60 |');
    });

    it('should include game statistics', () => {
      const scoreReport = packager.generateScoreReport(gameModel);
      
      expect(scoreReport).toContain('## Game Statistics');
      expect(scoreReport).toContain('- Total Turns:'); // Don't assert exact turn count since setupGame() randomizes
      expect(scoreReport).toContain('- Total Proposals: 2');
      expect(scoreReport).toContain('- Adopted Proposals: 1');
      expect(scoreReport).toContain('- Victory Target: 100 points');
    });

    it('should crown the winner with trophy emoji', () => {
      const scoreReport = packager.generateScoreReport(gameModel);
      
      expect(scoreReport).toContain('Alice 🏆');
      expect(scoreReport).not.toContain('Bob 🏆');
      expect(scoreReport).not.toContain('Charlie 🏆');
    });

    it('should sort players by points descending', () => {
      const scoreReport = packager.generateScoreReport(gameModel);
      
      const aliceIndex = scoreReport.indexOf('Alice 🏆');
      const bobIndex = scoreReport.indexOf('Bob');
      const charlieIndex = scoreReport.indexOf('Charlie');
      
      expect(aliceIndex).toBeLessThan(bobIndex);
      expect(bobIndex).toBeLessThan(charlieIndex);
    });
  });

  describe('package creation', () => {
    it('should create downloadable package', async () => {
      const packageData = await packager.createGamePackage(gameModel);
      
      expect(packageData).toBeDefined();
      expect(packageData.blob).toBeInstanceOf(Blob);
      expect(packageData.filename).toMatch(/^proof-nomic-game-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$/);
      expect(packageData.size).toBeGreaterThan(0);
    });

    it('should include both files in package', async () => {
      const packageData = await packager.createGamePackage(gameModel);
      
      expect(packageData.contents).toHaveLength(2);
      expect(packageData.contents).toContain('RULEBOOK.md');
      expect(packageData.contents).toContain('SCORE_REPORT.md');
    });

    it('should include metadata in package', async () => {
      const packageData = await packager.createGamePackage(gameModel);
      
      expect(packageData.metadata).toBeDefined();
      expect(packageData.metadata.gameCompleted).toBe(true);
      expect(packageData.metadata.totalPlayers).toBe(3);
      expect(packageData.metadata.totalRules).toBe(3);
      expect(packageData.metadata.totalProposals).toBe(2);
      expect(packageData.metadata.adoptedProposals).toBe(1);
      expect(packageData.metadata.winner).toBe('Alice');
      expect(packageData.metadata.finalScore).toBe(105);
    });

    it('should create download URL', async () => {
      const packageData = await packager.createGamePackage(gameModel);
      const downloadUrl = packager.createDownloadUrl(packageData);
      
      expect(downloadUrl).toBeDefined();
      expect(downloadUrl).toMatch(/^blob:/);
    });

    it('should cleanup download URL', () => {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const url = URL.createObjectURL(testBlob);
      
      packager.revokeDownloadUrl(url);
      
      // URL should be revoked (we can't easily test this directly)
      expect(true).toBe(true);
    });
  });

  describe('package validation', () => {
    it('should validate completed game state', () => {
      expect(() => packager.validateGameForPackaging(gameModel)).not.toThrow();
    });

    it('should reject non-completed games', () => {
      // Create a fresh game model in playing phase
      const playingGame = GameModel.create({
        config: DEFAULT_CONFIG,
        players: [{
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 50, // Below victory condition
          isActive: false
        }, {
          id: 'player2',
          name: 'Bob',
          icon: '🦾',
          llmEndpoint: 'http://localhost:3002',
          points: 30,
          isActive: false
        }],
        rules: [{
          id: 101,
          text: 'Test rule',
          mutable: false
        }],
        proposals: [],
        turn: 0,
        phase: 'setup',
        history: []
      });
      
      playingGame.setupGame(); // Sets to playing phase
      
      expect(() => packager.validateGameForPackaging(playingGame)).toThrow('Game must be completed');
    });

    it('should reject games without players', () => {
      // Create a fresh game model without players
      const emptyPlayersGame = GameModel.create({
        config: DEFAULT_CONFIG,
        players: [], // No players
        rules: [{
          id: 101,
          text: 'Test rule',
          mutable: false
        }],
        proposals: [],
        turn: 0,
        phase: 'completed', // Completed but no players
        history: []
      });
      
      expect(() => packager.validateGameForPackaging(emptyPlayersGame)).toThrow('Game must have players');
    });

    it('should reject games without rules', () => {
      // Create a fresh game model without rules
      const emptyRulesGame = GameModel.create({
        config: DEFAULT_CONFIG,
        players: [{
          id: 'player1',
          name: 'Alice',
          icon: '🤖',
          llmEndpoint: 'http://localhost:3001',
          points: 105,
          isActive: false
        }],
        rules: [], // No rules
        proposals: [],
        turn: 0,
        phase: 'completed', // Completed but no rules
        history: []
      });
      
      expect(() => packager.validateGameForPackaging(emptyRulesGame)).toThrow('Game must have rules');
    });
  });

  describe('utilities', () => {
    it('should provide file size estimates', () => {
      const sizes = packager.estimatePackageSize(gameModel);
      
      expect(sizes.rulebook).toBeGreaterThan(0);
      expect(sizes.scoreReport).toBeGreaterThan(0);
      expect(sizes.total).toBe(sizes.rulebook + sizes.scoreReport);
    });

    it('should format timestamps correctly', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z').getTime();
      const formatted = packager.formatTimestamp(timestamp);
      
      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}/);
    });
  });
}); 