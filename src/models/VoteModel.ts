import { types, type Instance } from 'mobx-state-tree';

/**
 * Valid vote choices as per Rule 202
 */
export const VoteChoice = types.enumeration('VoteChoice', ['FOR', 'AGAINST', 'ABSTAIN']);

/**
 * MST model representing a single vote on a proposal
 * 
 * Each vote is cast by a player and can be FOR, AGAINST, or ABSTAIN.
 * Votes are used to determine if a proposal passes (Rule 105).
 * 
 * @see daijo-bu_architecture.md Section 2 for MST model specifications
 * @see initialRules.md Rule 202 for voting options
 */
export const VoteModel = types
  .model('Vote', {
    /** ID of the player who cast this vote */
    voterId: types.string,
    
    /** The vote choice: FOR, AGAINST, or ABSTAIN */
    choice: VoteChoice
  })
  .views(self => ({
    /**
     * Returns true if this is a FOR vote
     */
    get isFor(): boolean {
      return self.choice === 'FOR';
    },

    /**
     * Returns true if this is an AGAINST vote
     */
    get isAgainst(): boolean {
      return self.choice === 'AGAINST';
    },

    /**
     * Returns true if this is an ABSTAIN vote
     */
    get isAbstain(): boolean {
      return self.choice === 'ABSTAIN';
    },

    /**
     * Returns a human-readable summary of the vote
     */
    get summary(): string {
      return `${self.voterId}: ${self.choice}`;
    }
  }));

export interface IVote extends Instance<typeof VoteModel> {}

/**
 * Factory function to create a new vote with validation
 * @param props - Vote properties
 * @returns New vote instance
 */
export function createVote(props: {
  voterId: string;
  choice: 'FOR' | 'AGAINST' | 'ABSTAIN';
}): IVote {
  // Validate input
  if (!props.voterId || props.voterId.trim().length === 0) {
    throw new Error('Voter ID cannot be empty');
  }

  const validChoices = ['FOR', 'AGAINST', 'ABSTAIN'];
  if (!validChoices.includes(props.choice)) {
    throw new Error(`Invalid vote choice: ${props.choice}. Must be one of: ${validChoices.join(', ')}`);
  }

  return VoteModel.create({
    voterId: props.voterId.trim(),
    choice: props.choice
  });
} 