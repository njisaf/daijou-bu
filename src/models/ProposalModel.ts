import { types, type Instance } from 'mobx-state-tree';
import { VoteModel, type IVote } from './VoteModel';

/**
 * Proposal status enumeration
 */
export const ProposalStatus = types.enumeration('ProposalStatus', ['pending', 'passed', 'failed', 'void']);

/**
 * Proposal type enumeration (Add, Amend, Repeal, Transmute)
 */
export const ProposalType = types.enumeration('ProposalType', ['Add', 'Amend', 'Repeal', 'Transmute']);

/**
 * Judge verdict enumeration for proof evaluation
 */
export const JudgeVerdict = types.enumeration('JudgeVerdict', ['sound', 'unsound', 'pending']);

/**
 * MST model representing a proposal in the Nomic game
 * 
 * A proposal contains a rule change and collects votes from players.
 * Once all votes are collected, it is resolved as passed or failed
 * based on majority rule (Rule 105).
 * 
 * Per Rule 121: Every Proposal must include a Proof Section showing that its 
 * adoption (a) does not render the ruleset inconsistent, and (b) maintains 
 * or improves the likelihood that an LLM following the Development Rulebook 
 * can satisfy Prompt P. If the Proof Section is missing or the Judge finds 
 * it unsound, the Proposal is automatically VOID.
 * 
 * @see daijo-bu_architecture.md Section 2 for MST model specifications
 * @see initialRules.md Rule 103, 105 for proposal mechanics
 * @see initialRules.json Rule 121 (Proof Requirement), Rule 122 (Judging Proofs)
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
    
    /** Proof section text (required per Rule 121) */
    proof: types.string,
    
    /** Judge verdict on proof soundness (set during judging phase) */
    judgeVerdict: types.optional(JudgeVerdict, 'pending'),
    
    /** Judge's written justification (set during judging phase) */
    judgeJustification: types.optional(types.string, ''),
    
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
     * @param vote - The vote to add
     */
    addVote(vote: IVote) {
      // Check if proposal is already resolved
      if (self.status !== 'pending') {
        throw new Error('Cannot add vote to resolved proposal');
      }

      // Check if this voter has already voted
      const existingVote = self.votes.find(v => v.voterId === vote.voterId);
      if (existingVote) {
        throw new Error(`Player ${vote.voterId} has already voted on this proposal`);
      }
      
      self.votes.push(vote);
    },

    /**
     * Sets the judge verdict and justification
     * @param verdict - The judge's verdict (sound/unsound)
     * @param justification - Written justification for the verdict
     */
    setJudgeVerdict(verdict: 'sound' | 'unsound', justification: string) {
      if (!justification || justification.trim().length === 0) {
        throw new Error('Judge justification cannot be empty per Rule 122');
      }
      
      self.judgeVerdict = verdict;
      self.judgeJustification = justification.trim();
      
      // If proof is unsound, proposal is automatically VOID per Rule 121
      if (verdict === 'unsound') {
        self.status = 'void';
        console.log(`⚖️ [Proposal] Proposal ${self.id} marked as VOID due to unsound proof`);
      }
    },

    /**
     * Resolves the proposal based on vote count and judge verdict
     * Per Rule 105: majority (more than half) of FOR votes required to pass
     * Per Rule 121: If Judge finds proof unsound, proposal is VOID
     */
    resolve() {
      if (self.status !== 'pending') {
        throw new Error('Proposal is already resolved');
      }

      // First check judge verdict - if unsound proof, proposal is VOID
      if (self.judgeVerdict === 'unsound') {
        self.status = 'void';
        console.log(`⚖️ [Proposal] Proposal ${self.id} is VOID due to unsound proof`);
        return;
      }

      // If proof is still pending judgment, cannot resolve yet
      if (self.judgeVerdict === 'pending') {
        throw new Error('Cannot resolve proposal while judge verdict is pending');
      }

      // Judge verdict is sound, proceed with normal voting resolution
      const forVotes = self.votes.filter(vote => vote.choice === 'FOR').length;
      const totalVotes = self.votes.length;

      // Majority required (more than half)
      if (forVotes > totalVotes / 2) {
        self.status = 'passed';
      } else {
        self.status = 'failed';
      }
    },

    /**
     * Test-only method to bypass judge verdict requirement
     * This should only be used in test environments
     */
    resolveForTesting() {
      if (self.status !== 'pending') {
        throw new Error('Proposal is already resolved');
      }

      // Skip judge verdict check for testing - directly resolve based on votes
      const forVotes = self.votes.filter(vote => vote.choice === 'FOR').length;
      const totalVotes = self.votes.length;

      // Majority required (more than half)
      if (forVotes > totalVotes / 2) {
        self.status = 'passed';
      } else {
        self.status = 'failed';
      }
    },

    /**
     * Forces proposal to void status (used when proof section is missing)
     */
    markAsVoid() {
      self.status = 'void';
      console.log(`⚖️ [Proposal] Proposal ${self.id} marked as VOID (missing or invalid proof)`);
    },

    /**
     * Gets a vote by voter ID (used by tests)
     */
    getVoteFor(voterId: string) {
      return self.votes.find(vote => vote.voterId === voterId);
    },

    /**
     * Changes an existing vote (used by tests)
     */
    changeVote(voterId: string, newChoice: 'FOR' | 'AGAINST' | 'ABSTAIN') {
      if (self.status !== 'pending') {
        throw new Error('Cannot change vote on resolved proposal');
      }

      const existingVote = self.votes.find(vote => vote.voterId === voterId);
      if (!existingVote) {
        throw new Error(`No vote found for voter ${voterId}`);
      }

      existingVote.choice = newChoice;
    }
  }))
  .views(self => ({
    /**
     * Returns true if proposal has passed
     */
    get isPassed(): boolean {
      return self.status === 'passed';
    },

    /**
     * Returns true if proposal has failed
     */
    get isFailed(): boolean {
      return self.status === 'failed';
    },

    /**
     * Returns true if proposal is void
     */
    get isVoid(): boolean {
      return self.status === 'void';
    },

    /**
     * Returns true if proposal is still pending
     */
    get isPending(): boolean {
      return self.status === 'pending';
    },

    /**
     * Returns true if all required votes have been cast
     * (This would be determined by the game model based on player count)
     */
    get isVotingComplete(): boolean {
      // This is a simplified check - actual implementation would depend on game state
      return self.votes.length > 0;
    },

    /**
     * Returns true if judge verdict is still pending
     */
    get isJudgmentPending(): boolean {
      return self.judgeVerdict === 'pending';
    },

    /**
     * Returns true if proof was deemed sound by judge
     */
    get hasSoundProof(): boolean {
      return self.judgeVerdict === 'sound';
    },

    /**
     * Returns true if proof was deemed unsound by judge
     */
    get hasUnsoundProof(): boolean {
      return self.judgeVerdict === 'unsound';
    },

    /**
     * Vote tally breakdown
     */
    get voteTally(): { for: number; against: number; abstain: number } {
      const tally = { for: 0, against: 0, abstain: 0 };
      
      self.votes.forEach(vote => {
        switch (vote.choice) {
          case 'FOR':
            tally.for++;
            break;
          case 'AGAINST':
            tally.against++;
            break;
          case 'ABSTAIN':
            tally.abstain++;
            break;
        }
      });
      
      return tally;
    },

    /**
     * Returns a human-readable summary of the proposal
     */
    get summary(): string {
      const statusText = self.status === 'pending' ? 'pending' : self.status.toUpperCase();
      const judgeStatus = self.judgeVerdict === 'pending' 
        ? 'Awaiting judge verdict'
        : `Judge: ${self.judgeVerdict}`;
      
      return `Proposal ${self.id} (${self.type} Rule ${self.ruleNumber}) by ${self.proposerId}: ${statusText} - ${judgeStatus}`;
    },

    /**
     * Returns full proposal text with proof section
     */
    get fullText(): string {
      return `**Rule ${self.ruleNumber}**: ${self.ruleText}\n\n**Proof**: ${self.proof}`;
    },

    /**
     * Number of FOR votes (used by tests)
     */
    get forVotes(): number {
      return self.votes.filter(vote => vote.choice === 'FOR').length;
    },

    /**
     * Number of AGAINST votes (used by tests)
     */
    get againstVotes(): number {
      return self.votes.filter(vote => vote.choice === 'AGAINST').length;
    },

    /**
     * Number of ABSTAIN votes (used by tests)
     */
    get abstainVotes(): number {
      return self.votes.filter(vote => vote.choice === 'ABSTAIN').length;
    },

    /**
     * Total number of votes (used by tests)
     */
    get totalVotes(): number {
      return self.votes.length;
    }
  }));

/**
 * Type definition for external use
 */
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
  proof: string;
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

  if (!props.proof || props.proof.trim().length === 0) {
    throw new Error('Proof section cannot be empty per Rule 121');
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
    proof: props.proof.trim(),
    judgeVerdict: 'pending',
    judgeJustification: '',
    status: 'pending',
    votes: [],
    timestamp: props.timestamp
  });
} 