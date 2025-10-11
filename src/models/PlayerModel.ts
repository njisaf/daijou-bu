import { types, type Instance } from 'mobx-state-tree';
import { getGameConfig } from '../config';

/**
 * MST model representing a player in the Nomic game
 * 
 * Each player is an autonomous LLM agent with an HTTP endpoint.
 * Players accumulate points through successful proposals and voting.
 * Victory is achieved when a player reaches the victory target (default 100 points).
 * 
 * Per Rules 301-303: Players now have performance tracking counters:
 * - Proposals Passed: Counter of successful proposals (+1 for adopted, -1 for rejected, min 0)
 * - Accurate Votes: Count of votes matching final proposal outcome 
 * - Inaccurate Votes: Count of votes not matching final proposal outcome
 * 
 * @see daijo-bu_architecture.md Section 2 for MST model specifications
 * @see initialRules.md Rule 102 for victory conditions
 * @see initialRules.json Rules 301-303 for performance tracking
 */
export const PlayerModel = types
  .model('Player', {
    /** Unique identifier for the player */
    id: types.identifier,
    
    /** Display name of the player */
    name: types.string,
    
    /** Emoji icon representing the player */
    icon: types.string,
    
    /** HTTP endpoint URL for the LLM MCP server */
    llmEndpoint: types.string,
    
    /** Current point total (starts at 0 per Rule 102) */
    points: types.optional(types.number, 0),
    
    /** Whether this player is currently taking their turn */
    isActive: types.optional(types.boolean, false),
    
    /** Counter of successful proposals per Rule 301 */
    proposalsPassed: types.optional(types.number, 0),
    
    /** Counter of votes matching final outcome per Rule 302 */
    accurateVotes: types.optional(types.number, 0),
    
    /** Counter of votes not matching final outcome per Rule 302 */
    inaccurateVotes: types.optional(types.number, 0),
    
    /** Agent type identifier for LLM integration */
    agentType: types.optional(types.string, 'mock')
  })
  .actions(self => ({
    /**
     * Awards points to the player
     * @param amount - Points to award (can be negative for penalties)
     */
    awardPoints(amount: number) {
      self.points += amount;
      
      // Rule 208: If player's score becomes negative, reset to zero
      if (self.points < 0) {
        console.log(`📊 [Player] ${self.name}'s score reset to 0 (was ${self.points})`);
        self.points = 0;
      }
    },

    /**
     * Updates the proposals passed counter per Rule 301
     * @param delta - Change in counter (+1 for adopted, -1 for rejected)
     */
    incrementProposalCounter(delta: number) {
      const previousCount = self.proposalsPassed;
      self.proposalsPassed = Math.max(0, self.proposalsPassed + delta);
      
      console.log(`📊 [Player] ${self.name} proposals passed: ${previousCount} → ${self.proposalsPassed} (${delta > 0 ? '+' : ''}${delta})`);
    },

    /**
     * Records vote accuracy per Rule 302
     * @param matchesOutcome - true if vote matched final proposal outcome
     */
    recordVoteAccuracy(matchesOutcome: boolean) {
      if (matchesOutcome) {
        self.accurateVotes += 1;
        console.log(`📊 [Player] ${self.name} accurate votes: ${self.accurateVotes}`);
      } else {
        self.inaccurateVotes += 1;
        console.log(`📊 [Player] ${self.name} inaccurate votes: ${self.inaccurateVotes}`);
      }
    },

    /**
     * Applies penalty for missing vote per Rule 206
     */
    applyMissedVotePenalty() {
      const penalty = -10;
      this.awardPoints(penalty);
      console.log(`⚠️ [Player] ${self.name} penalized ${penalty} points for missed vote`);
    },

    /**
     * Deducts points from the player
     * Points cannot go below zero (per Rule 208 - bankruptcy protection)
     * @param amount - Number of points to deduct (must be positive)
     */
    deductPoints(amount: number) {
      if (amount < 0) {
        throw new Error('Cannot deduct negative points');
      }
      self.points = Math.max(0, self.points - amount);
    },

    /**
     * Resets player points to zero
     * Used during game reset (Rule 212)
     */
    resetPoints() {
      self.points = 0;
    },

    /**
     * Sets the active status of the player
     * @param active - Whether the player should be active
     */
    setActive(active: boolean) {
      self.isActive = active;
    },

    /**
     * Adds points to the player (convenience method)
     * @param amount - Number of points to add (can be negative)
     */
    addPoints(amount: number) {
      if (amount >= 0) {
        this.awardPoints(amount);
      } else {
        this.deductPoints(-amount);
      }
    }
  }))
  .views(self => ({
    /**
     * Returns true if the player has achieved victory
     * Victory is achieved at the configured victory target (default 100 points)
     */
    get hasWon(): boolean {
      const config = getGameConfig();
      return self.points >= config.victoryTarget;
    },

    /**
     * Returns a human-readable summary of the player
     */
    get summary(): string {
      return `${self.icon} ${self.name}: ${self.points} points`;
    },

    /**
     * Calculates total vote count (accurate + inaccurate)
     * @returns Total votes cast by this player
     */
    get totalVotes(): number {
      return self.accurateVotes + self.inaccurateVotes;
    },

    /**
     * Calculates vote accuracy percentage
     * @returns Percentage of accurate votes (0-100)
     */
    get voteAccuracyPercentage(): number {
      const total = this.totalVotes;
      if (total === 0) return 0;
      return Math.round((self.accurateVotes / total) * 100);
    },

    /**
     * Returns player performance summary for Rule 303 score reporting
     * @returns Formatted string with key stats
     */
    get performanceSummary(): string {
      return `${self.name} ⭐${self.points}pts (${self.proposalsPassed} passed) | ${self.accurateVotes}/${this.totalVotes} accurate votes`;
    },

    /**
     * Returns player score report data for SCORE_REPORT.md generation
     * @returns Object with all scoring metrics
     */
    get scoreReportData(): {
      name: string;
      points: number;
      proposalsPassed: number;
      accurateVotes: number;
      inaccurateVotes: number;
      totalVotes: number;
      voteAccuracy: number;
    } {
      return {
        name: self.name,
        points: self.points,
        proposalsPassed: self.proposalsPassed,
        accurateVotes: self.accurateVotes,
        inaccurateVotes: self.inaccurateVotes,
        totalVotes: this.totalVotes,
        voteAccuracy: this.voteAccuracyPercentage
      };
    }
  }));

export interface IPlayer extends Instance<typeof PlayerModel> {}

/**
 * Validates that a URL is a valid HTTP or HTTPS endpoint
 * @param url - The URL to validate
 * @returns true if valid, false otherwise
 */
function isValidHttpUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Factory function to create a new player with validation
 * @param props - Player properties
 * @returns New player instance
 */
export function createPlayer(props: {
  id: string;
  name: string;
  icon: string;
  llmEndpoint: string;
  agentType?: string;
}): IPlayer {
  // Validate input
  if (!props.id || props.id.trim().length === 0) {
    throw new Error('Player ID cannot be empty');
  }
  
  if (!props.name || props.name.trim().length === 0) {
    throw new Error('Player name cannot be empty');
  }
  
  if (!props.icon || props.icon.trim().length === 0) {
    throw new Error('Player icon cannot be empty');
  }
  
  if (!props.llmEndpoint || props.llmEndpoint.trim().length === 0) {
    throw new Error('Player LLM endpoint cannot be empty');
  }

  if (!isValidHttpUrl(props.llmEndpoint)) {
    throw new Error('Player LLM endpoint must be a valid HTTP or HTTPS URL');
  }

  return PlayerModel.create({
    id: props.id.trim(),
    name: props.name.trim(),
    icon: props.icon.trim(),
    llmEndpoint: props.llmEndpoint.trim(),
    points: 0,
    proposalsPassed: 0,
    accurateVotes: 0,
    inaccurateVotes: 0,
    agentType: props.agentType || 'mock'
  });
} 