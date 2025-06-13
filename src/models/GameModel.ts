import { types, getSnapshot, type Instance, type SnapshotIn, type SnapshotOut } from 'mobx-state-tree';
import type { GameConfig } from '../config';
import { PlayerModel } from './PlayerModel';
import { RuleModel } from './RuleModel';
import { ProposalModel } from './ProposalModel';

/**
 * Game phases representing the current state of the game
 */
export type GamePhase = 'setup' | 'playing' | 'paused' | 'completed';

/**
 * Snapshot history entry for time-travel debugging
 */
const SnapshotHistoryEntry = types.model('SnapshotHistoryEntry', {
  turn: types.number,
  timestamp: types.number,
  phase: types.enumeration<GamePhase>(['setup', 'playing', 'paused', 'completed']),
  snapshot: types.frozen<any>()
});

/**
 * Game finalization result containing generated reports
 */
export interface GameFinalizationResult {
  rulebook: string;
  scoreReport: string;
  finalSnapshot: SnapshotOut<typeof GameModel>;
}

/**
 * Root MST model that orchestrates the entire Proof-Nomic game
 * 
 * This model contains all game state and provides actions for:
 * - Setting up the game with players and initial rules
 * - Managing turn progression and player rotation
 * - Tracking proposals and votes
 * - Detecting victory conditions
 * - Generating final reports
 * 
 * @see daijo-bu_architecture.md for detailed design
 */
export const GameModel = types
  .model('GameModel', {
    /** Game configuration constants */
    config: types.frozen<GameConfig>(),
    
    /** All players in the game */
    players: types.array(PlayerModel),
    
    /** All rules in the game (initial + adopted proposals) */
    rules: types.array(RuleModel),
    
    /** All proposals made during the game */
    proposals: types.array(ProposalModel),
    
    /** Current turn number (0-based) */
    turn: types.optional(types.number, 0),
    
    /** Current game phase */
    phase: types.optional(types.enumeration<GamePhase>(['setup', 'playing', 'paused', 'completed']), 'setup'),
    
    /** Snapshot history for time-travel debugging */
    history: types.optional(types.array(SnapshotHistoryEntry), [])
  })
  .views(self => ({
    /**
     * Get the currently active player based on turn rotation
     */
    get currentPlayer() {
      if (self.players.length === 0) return undefined;
      return self.players.find(p => p.isActive) || undefined;
    },
    
    /**
     * Get the player who should be active for the current turn
     */
    get turnPlayer() {
      if (self.players.length === 0) return undefined;
      const playerIndex = self.turn % self.players.length;
      return self.players[playerIndex];
    },
    
    /**
     * Get the winning player (if any)
     */
    get winner() {
      return self.players.find(p => p.points >= self.config.victoryTarget) || undefined;
    },
    
    /**
     * Check if the game is currently running
     */
    get isRunning() {
      return self.phase === 'playing';
    },
    
    /**
     * Check if the game is completed
     */
    get isCompleted() {
      return self.phase === 'completed';
    },
    
    /**
     * Get the next unique proposal ID
     * Starts at 301 and increments from the highest existing proposal ID
     */
    get nextProposalId(): number {
      if (self.proposals.length === 0) {
        return 301; // Start proposal IDs at 301
      }
      
      // Find the highest existing proposal ID and add 1
      const maxId = Math.max(...self.proposals.map(p => p.id));
      return Math.max(maxId + 1, 301); // Ensure we never go below 301
    },
    
    /**
     * Get current game snapshot for MCP services
     */
    get gameSnapshot() {
      const snapshot = getSnapshot(self);
      return {
        ...snapshot,
        proofStatement: self.config.promptP || ''
      };
    }
  }))
  .actions(self => ({
    /**
     * Add a player to the game (only allowed in setup phase)
     */
    addPlayer(playerData: SnapshotIn<typeof PlayerModel>) {
      if (self.phase !== 'setup') {
        throw new Error('Cannot add players outside of setup phase');
      }
      
      // Ensure only one player is active at a time
      const player = PlayerModel.create({
        ...playerData,
        isActive: false
      });
      
      self.players.push(player);
    },
    
    /**
     * Add a rule to the game
     */
    addRule(ruleData: SnapshotIn<typeof RuleModel>) {
      const rule = RuleModel.create(ruleData);
      self.rules.push(rule);
    },
    
    /**
     * Add a proposal to the game
     */
    addProposal(proposalData: SnapshotIn<typeof ProposalModel>) {
      // Check for duplicate proposal IDs
      const existingProposal = self.proposals.find(p => p.id === proposalData.id);
      if (existingProposal) {
        throw new Error(`Proposal with ID ${proposalData.id} already exists`);
      }
      
      const proposal = ProposalModel.create(proposalData);
      self.proposals.push(proposal);
    },
    
    /**
     * Create a proposal with an automatically generated unique ID
     */
    createProposal(proposalData: Omit<SnapshotIn<typeof ProposalModel>, 'id'>) {
      const proposalWithId = {
        ...proposalData,
        id: self.nextProposalId
      };
      
      const proposal = ProposalModel.create(proposalWithId);
      self.proposals.push(proposal);
      
      return proposal;
    },
    
    /**
     * Set up the game and transition to playing phase
     * Sets the first active player (shuffling handled by random turn offset)
     */
    setupGame() {
      if (self.players.length < 2) {
        throw new Error('Need at least 2 players to start the game');
      }
      
      // Start from turn 0 for clear user experience
      // Fairness is maintained through the MCP service's random seed
      self.turn = 0;
      
      // Set the first player as active
      const startingPlayer = self.turnPlayer;
      if (startingPlayer) {
        startingPlayer.setActive(true);
      }
      
      self.phase = 'playing';
    },
    
    /**
     * Advance to the next turn and rotate active player
     */
    nextTurn() {
      if (self.phase !== 'playing') {
        throw new Error('Cannot advance turn when game is not playing');
      }
      
      // Deactivate current player
      const currentPlayer = self.currentPlayer;
      if (currentPlayer) {
        currentPlayer.setActive(false);
      }
      
      // Increment turn
      self.turn += 1;
      
      // Activate next player
      const nextPlayer = self.turnPlayer;
      if (nextPlayer) {
        nextPlayer.setActive(true);
      }
    },
    
    /**
     * Pause the game
     */
    pause() {
      if (self.phase === 'playing') {
        self.phase = 'paused';
      }
    },
    
    /**
     * Resume the game from paused state
     */
    resume() {
      if (self.phase === 'paused') {
        self.phase = 'playing';
      }
    },
    
    /**
     * Check victory condition and transition to completed if met
     */
    checkVictoryCondition() {
      const winner = self.winner;
      if (winner && self.phase === 'playing') {
        self.phase = 'completed';
      }
    },
    
    /**
     * Save a snapshot to history for time-travel debugging
     */
    saveSnapshot() {
      const entry = SnapshotHistoryEntry.create({
        turn: self.turn,
        timestamp: Date.now(),
        phase: self.phase,
        snapshot: self.gameSnapshot
      });
      
      self.history.push(entry);
      
      // Keep history size manageable (last 100 snapshots)
      if (self.history.length > 100) {
        self.history.splice(0, self.history.length - 100);
      }
    },
    
    /**
     * Finalize the game and generate reports
     */
    finalize(): GameFinalizationResult {
      if (self.phase !== 'completed') {
        throw new Error('Cannot finalize game that is not completed');
      }
      
      // Generate rulebook
      const rulebook = this.generateRulebook();
      
      // Generate score report  
      const scoreReport = this.generateScoreReport();
      
      return {
        rulebook,
        scoreReport,
        finalSnapshot: self.gameSnapshot
      };
    },
    
    /**
     * Generate the final rulebook containing all rules
     */
    generateRulebook(): string {
      let rulebook = '# Proof-Nomic Game Rulebook\n\n';
      rulebook += '## Initial Rules\n\n';
      
      // Add all rules sorted by ID
      const sortedRules = [...self.rules].sort((a, b) => a.id - b.id);
      
      for (const rule of sortedRules) {
        rulebook += `### Rule ${rule.id}\n`;
        rulebook += `${rule.text}\n\n`;
        rulebook += `*${rule.mutable ? 'Mutable' : 'Immutable'}*\n\n`;
      }
      
      // Add adopted proposals
      const adoptedProposals = self.proposals.filter(p => p.status === 'passed');
      
      if (adoptedProposals.length > 0) {
        rulebook += '## Adopted Proposals\n\n';
        
        for (const proposal of adoptedProposals) {
          rulebook += `### Proposal ${proposal.id}\n`;
          rulebook += `**Type:** ${proposal.type}\n`;
          rulebook += `**Rule Number:** ${proposal.ruleNumber}\n`;
          rulebook += `**Text:** ${proposal.ruleText}\n\n`;
        }
      }
      
      return rulebook;
    },
    
    /**
     * Generate the final score report
     */
    generateScoreReport(): string {
      let report = '# Score Report\n\n';
      
      // Sort players by points (descending)
      const sortedPlayers = [...self.players].sort((a, b) => b.points - a.points);
      
      report += '| Rank | Player | Points |\n';
      report += '|------|--------|---------|\n';
      
      sortedPlayers.forEach((player, index) => {
        const rank = index + 1;
        const winner = rank === 1 && player.points >= self.config.victoryTarget ? ' 🏆' : '';
        report += `| ${rank} | ${player.name}${winner} | ${player.points} |\n`;
      });
      
      report += '\n## Game Statistics\n\n';
      report += `- Total Turns: ${self.turn}\n`;
      report += `- Total Proposals: ${self.proposals.length}\n`;
      report += `- Adopted Proposals: ${self.proposals.filter(p => p.status === 'passed').length}\n`;
      report += `- Victory Target: ${self.config.victoryTarget} points\n`;
      
      return report;
    },

    /**
     * Load rules from the loadInitialRules utility
     * This replaces any existing rules with the canonical ruleset plus Prompt P
     */
    loadFromRules(ruleSnapshots: Array<{ id: number; text: string; mutable: boolean }>) {
      if (self.phase !== 'setup') {
        throw new Error('Can only load rules during setup phase');
      }

      // Clear existing rules
      self.rules.clear();

      // Add all provided rules
      for (const ruleSnapshot of ruleSnapshots) {
        this.addRule(ruleSnapshot);
      }

      console.log(`📋 [GameModel] Loaded ${ruleSnapshots.length} rules from loadInitialRules`);
      console.log(`📋 [GameModel] Prompt P: "${self.config.promptP}"`);
    }
  })); 