import type { SnapshotOut } from 'mobx-state-tree';
import { GameModel, type GamePhase } from '../models/GameModel';
import { type MCPService, type GameSnapshot } from '../mocks/MockMCPService';
import { parseProposalMarkdown, type Proposal } from '../schemas/proposal';
import { createProposal } from '../models/ProposalModel';
import { RuleEngine } from '../engine/RuleEngine';
import { SnapshotLogger } from '../logging/SnapshotLogger';

/**
 * Events emitted by the TurnOrchestrator
 */
interface TurnOrchestratorEvents {
  turnStart: (data: { turn: number; playerId: string }) => void;
  proposalPhaseStart: (data: { turn: number; playerId: string }) => void;
  votingPhaseStart: (data: { turn: number; proposalId: number }) => void;
  turnComplete: (data: { turn: number; proposal: any; votingResults: any }) => void;
  victory: (data: { winner: any; finalScore: number }) => void;
  error: (data: { type: string; playerId: string; phase: string; error: Error }) => void;
}

/**
 * Error types for orchestrator operations
 */
export class OrchestrationError extends Error {
  constructor(
    message: string,
    public readonly playerId: string,
    public readonly phase: 'proposal' | 'voting',
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'OrchestrationError';
  }
}

/**
 * Simple event listener type for browser compatibility
 */
type EventListener = (...args: any[]) => void;

/**
 * Turn-Cycle Orchestrator that drives the game flow
 * 
 * This orchestrator manages the complete turn cycle:
 * 1. Proposal Phase - Current player generates a proposal
 * 2. Voting Phase - All players vote on the proposal 
 * 3. Resolution - Proposal is resolved and scores updated
 * 4. Turn Advancement - Move to next player
 * 
 * The orchestrator uses Promise.race with timeouts for each MCP call
 * and emits events for UI updates.
 * 
 * @see daijo-bu_architecture.md Section 3 for turn cycle specification
 */
export class TurnOrchestrator {
  private _isRunning = false;
  private _shouldStop = false;
  private _eventListeners = new Map<string, EventListener[]>();

  constructor(
    public readonly gameModel: typeof GameModel.Type,
    private readonly mcpService: MCPService,
    private readonly logger: SnapshotLogger,
    private readonly onError?: (error: Error) => void
  ) {}

  /**
   * Add event listener
   */
  on(event: string, listener: EventListener): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: EventListener): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this._eventListeners.get(event)?.length || 0;
  }

  /**
   * Emit an event
   */
  private emit(event: string, data?: any): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * Whether the orchestrator is currently running
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Start continuous orchestration until stopped or game ends
   */
  async start(): Promise<void> {
    if (this._isRunning) {
      throw new Error('Orchestrator is already running');
    }

    if (this.gameModel.phase !== 'playing') {
      throw new Error('Game must be in playing phase to start orchestration');
    }

    this._isRunning = true;
    this._shouldStop = false;

    try {
      while (!this._shouldStop && this.gameModel.phase === 'playing') {
        await this.executeTurn();
        
        // Check for victory after each turn
        this.gameModel.checkVictoryCondition();
        
        if (this.gameModel.isCompleted) {
          this.emit('victory', {
            winner: this.gameModel.winner,
            finalScore: this.gameModel.winner?.points || 0
          });
          break;
        }

        // Wait for configured delay before next turn
        await this.delay(this.gameModel.config.turnDelayMs);
      }
    } finally {
      this._isRunning = false;
    }
  }

  /**
   * Stop the orchestration loop
   */
  stop(): void {
    this._shouldStop = true;
  }

  /**
   * Execute a single turn of the game
   */
  async executeTurn(): Promise<void> {
    if (this.gameModel.phase === 'completed') {
      this.stop();
      return;
    }

    try {
      // Log snapshot with mcpSeed at turn start
      const currentSeed = this.mcpService.getCurrentSeed?.() || 'default';
      this.logger.logSnapshot(currentSeed);

      this.emit('turnStart', {
        turn: this.gameModel.turn,
        playerId: this.gameModel.currentPlayer?.id || 'unknown'
      });

      // Execute proposal phase
      await this.executeProposalPhase();

      // Get the proposal that was just created
      const currentProposal = this.gameModel.proposals.find(p => p.status === 'pending');
      if (!currentProposal) {
        throw new Error('No pending proposal found after proposal phase');
      }

      // Execute voting phase
      await this.executeVotingPhase(currentProposal.id);

      // Resolve the proposal
      this.resolveProposal(currentProposal.id);

      // Log snapshot after turn completion with mcpSeed
      const endSeed = this.mcpService.getCurrentSeed?.() || 'default';
      this.logger.logSnapshot(endSeed);

      this.emit('turnComplete', {
        turn: this.gameModel.turn,
        proposal: {
          id: currentProposal.id,
          proposerId: currentProposal.proposerId,
          type: currentProposal.type,
          ruleNumber: currentProposal.ruleNumber,
          ruleText: currentProposal.ruleText,
          status: currentProposal.status
        },
        votingResults: currentProposal.votes.map(v => ({
          voterId: v.voterId,
          choice: v.choice
        }))
      });

      // Advance to next turn
      this.gameModel.nextTurn();

    } catch (error) {
      this.gameModel.pause();
      if (this.onError) {
        this.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Execute the proposal phase for the current player
   */
  async executeProposalPhase(): Promise<void> {
    try {
      const currentPlayer = this.gameModel.currentPlayer;
      if (!currentPlayer) {
        throw new Error('No current player for proposal phase');
      }

      this.emit('proposalPhaseStart', {
        turn: this.gameModel.turn,
        playerId: currentPlayer.id
      });

      // Generate game snapshot for MCP service
      const gameSnapshot: GameSnapshot = {
        players: this.gameModel.players.map(p => ({
          id: p.id,
          name: p.name,
          points: p.points,
          isActive: p.isActive
        })),
        rules: this.gameModel.rules.map(r => ({
          id: r.id,
          text: r.text,
          mutable: r.mutable
        })),
        proposals: this.gameModel.proposals.map(p => ({
          id: p.id,
          proposerId: p.proposerId,
          type: p.type,
          ruleNumber: p.ruleNumber,
          ruleText: p.ruleText,
          status: p.status
        })),
        turn: this.gameModel.turn,
        phase: this.gameModel.phase
      };

      // Call MCP service with timeout
      const proposalPromise = this.mcpService.propose('Generate a rule proposal', gameSnapshot);
      const proposalMarkdown = await this.withTimeout(
        Promise.resolve(proposalPromise),
        this.gameModel.config.timeoutMs,
        `Proposal timeout for player ${currentPlayer.id}`
      );

      // Parse and validate proposal
      let parsedProposal: Proposal;
      try {
        parsedProposal = parseProposalMarkdown(proposalMarkdown);
      } catch (parseError) {
        throw new OrchestrationError(
          `Invalid proposal format from player ${currentPlayer.id}`,
          currentPlayer.id,
          'proposal',
          parseError as Error
        );
      }

      // Create proposal in game model
      this.gameModel.addProposal({
        id: parsedProposal.id,
        proposerId: currentPlayer.id,
        type: parsedProposal.type,
        ruleNumber: parsedProposal.number,
        ruleText: parsedProposal.text,
        status: 'pending',
        votes: [],
        timestamp: Date.now()
      });

    } catch (error) {
      // Pause game on any error
      this.gameModel.pause();
      
      if (error instanceof OrchestrationError) {
        this.emit('error', {
          type: 'validation',
          playerId: error.playerId,
          phase: error.phase,
          error
        });
      } else {
        // For general errors (like no current player), emit with generic info
        this.emit('error', {
          type: 'orchestration',
          playerId: 'unknown',
          phase: 'proposal',
          error: error as Error
        });
      }
      throw error;
    }
  }

  /**
   * Execute the voting phase for all players on a proposal
   */
  async executeVotingPhase(proposalId: number): Promise<void> {
    const proposal = this.gameModel.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    this.emit('votingPhaseStart', {
      turn: this.gameModel.turn,
      proposalId
    });

    // Generate proposal markdown for voting
    const proposalMarkdown = this.formatProposalForVoting(proposal);

    // Collect votes from all players
    const votingPromises = this.gameModel.players.map(async (player) => {
      try {
        const gameSnapshot: GameSnapshot = {
          players: this.gameModel.players.map(p => ({
            id: p.id,
            name: p.name,
            points: p.points,
            isActive: p.isActive
          })),
          rules: this.gameModel.rules.map(r => ({
            id: r.id,
            text: r.text,
            mutable: r.mutable
          })),
          proposals: this.gameModel.proposals.map(p => ({
            id: p.id,
            proposerId: p.proposerId,
            type: p.type,
            ruleNumber: p.ruleNumber,
            ruleText: p.ruleText,
            status: p.status
          })),
          turn: this.gameModel.turn,
          phase: this.gameModel.phase
        };

        const voteChoice = await this.withTimeout(
          Promise.resolve(this.mcpService.vote(proposalMarkdown, gameSnapshot)),
          this.gameModel.config.timeoutMs,
          `Voting timeout for player ${player.id}`
        );

        // Validate vote choice
        if (!['FOR', 'AGAINST', 'ABSTAIN'].includes(voteChoice)) {
          throw new OrchestrationError(
            `Invalid vote choice '${voteChoice}' from player ${player.id}`,
            player.id,
            'voting'
          );
        }

        // Add vote to proposal
        proposal.addVote(player.id, voteChoice);

      } catch (error) {
        if (error instanceof OrchestrationError) {
          this.emit('error', {
            type: 'validation',
            playerId: error.playerId,
            phase: error.phase,
            error
          });
        } else {
          this.emit('error', {
            type: 'timeout',
            playerId: player.id,
            phase: 'voting',
            error: error as Error
          });
        }
        throw error;
      }
    });

    // Wait for all votes
    await Promise.all(votingPromises);
  }

  /**
   * Resolve a proposal and update player scores
   */
  private resolveProposal(proposalId: number): void {
    const proposal = this.gameModel.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    // Resolve proposal based on vote count
    proposal.resolve();

    // Update player scores if proposal passed
    if (proposal.isPassed) {
      // Award points to proposer
      const proposer = this.gameModel.players.find(p => p.id === proposal.proposerId);
      if (proposer) {
        proposer.addPoints(this.gameModel.config.proposerPoints);
      }

      // Award/deduct points based on votes
      proposal.votes.forEach(vote => {
        const voter = this.gameModel.players.find(p => p.id === vote.voterId);
        if (voter) {
          if (vote.choice === 'FOR') {
            voter.addPoints(this.gameModel.config.forVoterPoints);
          } else if (vote.choice === 'AGAINST') {
            voter.addPoints(this.gameModel.config.againstVoterPenalty); // This is negative
          }
          // ABSTAIN voters get no points change
        }
      });
    }

    // Check for victory condition after awarding points
    this.gameModel.checkVictoryCondition();
    
    // If game completed due to victory, emit victory event
    if (this.gameModel.phase === 'completed') {
      const winner = this.gameModel.winner;
      if (winner) {
        this.emit('victory', {
          winner,
          finalScore: winner.points
        });
      }
    }
  }

  /**
   * Format a proposal for voting display
   */
  private formatProposalForVoting(proposal: any): string {
    return `### Proposal ${proposal.id}
Type: ${proposal.type}
Number: ${proposal.ruleNumber}
Text: "${proposal.ruleText}"`;
  }

  /**
   * Promise wrapper with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      })
    ]);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 