import { types, type Instance } from 'mobx-state-tree';
import { getGameConfig } from '../config';

/**
 * MST model representing a player in the Nomic game
 * 
 * Each player is an autonomous LLM agent with an HTTP endpoint.
 * Players accumulate points through successful proposals and voting.
 * Victory is achieved when a player reaches the victory target (default 100 points).
 * 
 * @see daijo-bu_architecture.md Section 2 for MST model specifications
 * @see initialRules.md Rule 102 for victory conditions
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
    isActive: types.optional(types.boolean, false)
  })
  .actions(self => ({
    /**
     * Awards points to the player
     * @param amount - Number of points to award (must be positive)
     */
    awardPoints(amount: number) {
      if (amount < 0) {
        throw new Error('Cannot award negative points');
      }
      self.points += amount;
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
    points: 0
  });
} 