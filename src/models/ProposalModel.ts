import { types, type Instance } from 'mobx-state-tree';
import { VoteModel, type IVote } from './VoteModel';

/**
 * Proposal status enumeration
 */
export const ProposalStatus = types.enumeration('ProposalStatus', ['pending', 'passed', 'failed']);

/**
 * Proposal type enumeration (matches the Zod schema)
 */
export const ProposalType = types.enumeration('ProposalType', ['Add', 'Amend', 'Repeal', 'Transmute']);

/**
 * MST model representing a proposal in the Nomic game
 * 
 * A proposal contains a rule change and collects votes from players.
 * Once all votes are collected, it is resolved as passed or failed
 * based on majority rule (Rule 105).
 * 
 * @see daijo-bu_architecture.md Section 2 for MST model specifications
 * @see initialRules.md Rule 103, 105 for proposal mechanics
 */
export const ProposalModel = types
  .model('Proposal', {
    /** Unique identifier for the proposal */
    id: types.identifierNumber,
    
    /** ID of the player who proposed this */
    proposerId: types.string,
    
    /** Type of rule change */
    type: ProposalType,
    
    /** Rule number being targeted or created */
    ruleNumber: types.integer,
    
    /** Text of the rule */
    ruleText: types.string,
    
    /** Current status of the proposal */
    status: types.optional(ProposalStatus, 'pending'),
    
    /** Votes cast on this proposal */
    votes: types.array(VoteModel),
    
    /** Timestamp when proposal was created */
    timestamp: types.number
  })
  .actions(self => ({
    /**
     * Adds a vote to this proposal
     * @param voterId - ID of the player voting
     * @param choice - Vote choice: FOR, AGAINST, or ABSTAIN
     */
    addVote(voterId: string, choice: 'FOR' | 'AGAINST' | 'ABSTAIN') {
      if (self.status !== 'pending') {
        throw new Error('Cannot add votes to a resolved proposal');
      }

      // Check if player has already voted
      const existingVote = self.votes.find(vote => vote.voterId === voterId);
      if (existingVote) {
        throw new Error(`Player ${voterId} has already voted on this proposal`);
      }

      self.votes.push(VoteModel.create({
        voterId,
        choice
      }));
    },

    /**
     * Changes an existing vote
     * @param voterId - ID of the player changing their vote
     * @param newChoice - New vote choice
     */
    changeVote(voterId: string, newChoice: 'FOR' | 'AGAINST' | 'ABSTAIN') {
      if (self.status !== 'pending') {
        throw new Error('Cannot change votes on a resolved proposal');
      }

      const existingVote = self.votes.find(vote => vote.voterId === voterId);
      if (!existingVote) {
        throw new Error(`Player ${voterId} has not voted on this proposal yet`);
      }

      // Remove old vote and add new one
      const voteIndex = self.votes.indexOf(existingVote);
      self.votes.splice(voteIndex, 1);
      
      self.votes.push(VoteModel.create({
        voterId,
        choice: newChoice
      }));
    },

    /**
     * Resolves the proposal based on vote count
     * Per Rule 105: majority (more than half) of FOR votes required to pass
     */
    resolve() {
      if (self.status !== 'pending') {
        throw new Error('Proposal is already resolved');
      }

      const forVotes = self.votes.filter(vote => vote.choice === 'FOR').length;
      const totalVotes = self.votes.length;

      // Majority required (more than half)
      if (forVotes > totalVotes / 2) {
        self.status = 'passed';
      } else {
        self.status = 'failed';
      }
    }
  }))
  .views(self => ({
    /**
     * Returns true if proposal is pending
     */
    get isPending(): boolean {
      return self.status === 'pending';
    },

    /**
     * Returns true if proposal passed
     */
    get isPassed(): boolean {
      return self.status === 'passed';
    },

    /**
     * Returns true if proposal failed
     */
    get isFailed(): boolean {
      return self.status === 'failed';
    },

    /**
     * Gets the vote for a specific player
     */
    getVoteFor(voterId: string): IVote | undefined {
      return self.votes.find(vote => vote.voterId === voterId);
    },

    /**
     * Number of FOR votes
     */
    get forVotes(): number {
      return self.votes.filter(vote => vote.choice === 'FOR').length;
    },

    /**
     * Number of AGAINST votes
     */
    get againstVotes(): number {
      return self.votes.filter(vote => vote.choice === 'AGAINST').length;
    },

    /**
     * Number of ABSTAIN votes
     */
    get abstainVotes(): number {
      return self.votes.filter(vote => vote.choice === 'ABSTAIN').length;
    },

    /**
     * Total number of votes cast
     */
    get totalVotes(): number {
      return self.votes.length;
    },

    /**
     * Human-readable summary of the proposal
     */
    get summary(): string {
      return `Proposal ${self.id} (${self.type}): ${self.proposerId} - ${self.status}`;
    }
  }));

export interface IProposal extends Instance<typeof ProposalModel> {}

/**
 * Factory function to create a new proposal with validation
 * @param props - Proposal properties
 * @returns New proposal instance
 */
export function createProposal(props: {
  id: number;
  proposerId: string;
  type: 'Add' | 'Amend' | 'Repeal' | 'Transmute';
  ruleNumber: number;
  ruleText: string;
  timestamp: number;
}): IProposal {
  // Validate input
  if (!props.id || props.id <= 0) {
    throw new Error('Proposal ID must be a positive number');
  }
  
  if (!props.proposerId || props.proposerId.trim().length === 0) {
    throw new Error('Proposer ID cannot be empty');
  }
  
  if (!props.ruleNumber || props.ruleNumber <= 0) {
    throw new Error('Rule number must be a positive number');
  }
  
  if (!props.ruleText || props.ruleText.trim().length === 0) {
    throw new Error('Rule text cannot be empty');
  }

  const validTypes = ['Add', 'Amend', 'Repeal', 'Transmute'];
  if (!validTypes.includes(props.type)) {
    throw new Error(`Invalid proposal type: ${props.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  return ProposalModel.create({
    id: props.id,
    proposerId: props.proposerId.trim(),
    type: props.type,
    ruleNumber: props.ruleNumber,
    ruleText: props.ruleText.trim(),
    status: 'pending',
    votes: [],
    timestamp: props.timestamp
  });
} 