import { types, type Instance } from 'mobx-state-tree';

/**
 * Judge verdict enumeration for proof section evaluation
 */
export const JudgeVerdict = types.enumeration('JudgeVerdict', ['sound', 'unsound', 'pending']);

/**
 * MST model representing a judge verdict on a proposal's proof section
 * 
 * Per Rule 122: The Judge must state why each Proposal's Proof Section 
 * is sound or unsound. This written justification becomes part of the 
 * public record.
 * 
 * @see initialRules.json Rule 107 (Judge), Rule 122 (Judging Proofs)
 */
export const JudgeVerdictModel = types
  .model('JudgeVerdict', {
    /** ID of the proposal being judged */
    proposalId: types.identifierNumber,
    
    /** ID of the judge making the verdict */
    judgeId: types.string,
    
    /** The verdict on proof soundness */
    verdict: JudgeVerdict,
    
    /** Written justification for the verdict (required per Rule 122) */
    justification: types.string,
    
    /** Timestamp when verdict was rendered */
    timestamp: types.number
  })
  .views(self => ({
    /**
     * Returns true if the proof was deemed sound
     */
    get isSound(): boolean {
      return self.verdict === 'sound';
    },

    /**
     * Returns true if the proof was deemed unsound
     */
    get isUnsound(): boolean {
      return self.verdict === 'unsound';
    },

    /**
     * Returns true if the verdict is still pending
     */
    get isPending(): boolean {
      return self.verdict === 'pending';
    },

    /**
     * Returns a human-readable summary of the verdict
     */
    get summary(): string {
      return `Judge ${self.judgeId}: ${self.verdict.toUpperCase()} - ${self.justification}`;
    }
  }));

/**
 * MST model for managing judge state and assignments
 * 
 * Per Rule 107: The proposer of an adopted rule-change becomes the Judge 
 * for the next round. The Judge adjudicates any disagreements about the 
 * legality or interpretation of rule-changes.
 * 
 * @see initialRules.json Rule 107 (Judge), Rule 122 (Judging Proofs)
 */
export const JudgeModel = types
  .model('Judge', {
    /** Current judge player ID (from last adopted proposal) */
    currentJudgeId: types.optional(types.string, ''),
    
    /** All judge verdicts rendered in the game */
    verdicts: types.array(JudgeVerdictModel),
    
    /** Turn number when current judge was appointed */
    appointmentTurn: types.optional(types.number, 0)
  })
  .actions(self => ({
    /**
     * Assigns a new judge based on the proposer of the last adopted proposal
     * @param playerId - ID of the player who becomes the new judge
     * @param turn - Turn number when appointment occurs
     */
    assignJudge(playerId: string, turn: number) {
      if (!playerId || playerId.trim().length === 0) {
        throw new Error('Judge player ID cannot be empty');
      }
      
      self.currentJudgeId = playerId.trim();
      self.appointmentTurn = turn;
      
      console.log(`⚖️ [Judge] ${playerId} appointed as Judge for turn ${turn}`);
    },

    /**
     * Renders a verdict on a proposal's proof section
     * @param proposalId - ID of the proposal being judged
     * @param verdict - The judge's verdict (sound/unsound)
     * @param justification - Written justification for the verdict
     */
    renderVerdict(proposalId: number, verdict: 'sound' | 'unsound', justification: string) {
      if (!self.currentJudgeId) {
        throw new Error('No judge currently appointed');
      }
      
      if (!justification || justification.trim().length === 0) {
        throw new Error('Judge justification cannot be empty per Rule 122');
      }

      // Check if verdict already exists for this proposal
      const existingVerdict = self.verdicts.find(v => v.proposalId === proposalId);
      if (existingVerdict) {
        throw new Error(`Verdict already rendered for proposal ${proposalId}`);
      }

      // Create new verdict
      const newVerdict = JudgeVerdictModel.create({
        proposalId,
        judgeId: self.currentJudgeId,
        verdict,
        justification: justification.trim(),
        timestamp: Date.now()
      });

      self.verdicts.push(newVerdict);
      
      console.log(`⚖️ [Judge] Verdict rendered: Proposal ${proposalId} is ${verdict.toUpperCase()}`);
      console.log(`⚖️ [Judge] Justification: ${justification}`);
    },

    /**
     * Clears all judge state (used for game reset)
     */
    clearJudgeState() {
      self.currentJudgeId = '';
      self.verdicts.clear();
      self.appointmentTurn = 0;
      
      console.log('⚖️ [Judge] Judge state cleared');
    }
  }))
  .views(self => ({
    /**
     * Returns true if a judge is currently appointed
     */
    get hasJudge(): boolean {
      return self.currentJudgeId.length > 0;
    },

    /**
     * Gets the verdict for a specific proposal, if any
     * @param proposalId - ID of the proposal
     * @returns JudgeVerdict instance or undefined
     */
    getVerdictForProposal(proposalId: number): Instance<typeof JudgeVerdictModel> | undefined {
      return self.verdicts.find(v => v.proposalId === proposalId);
    },

    /**
     * Returns all verdicts by the current judge
     */
    get currentJudgeVerdicts(): Instance<typeof JudgeVerdictModel>[] {
      if (!self.currentJudgeId) return [];
      return self.verdicts.filter(v => v.judgeId === self.currentJudgeId);
    },

    /**
     * Returns verdicts grouped by judge
     */
    get verdictsByJudge(): Record<string, Instance<typeof JudgeVerdictModel>[]> {
      const grouped: Record<string, Instance<typeof JudgeVerdictModel>[]> = {};
      
      self.verdicts.forEach(verdict => {
        if (!grouped[verdict.judgeId]) {
          grouped[verdict.judgeId] = [];
        }
        grouped[verdict.judgeId].push(verdict);
      });
      
      return grouped;
    },

    /**
     * Returns summary statistics for judge performance
     */
    get judgeStats(): Record<string, { sound: number; unsound: number; total: number }> {
      const stats: Record<string, { sound: number; unsound: number; total: number }> = {};
      
      self.verdicts.forEach(verdict => {
        if (!stats[verdict.judgeId]) {
          stats[verdict.judgeId] = { sound: 0, unsound: 0, total: 0 };
        }
        
        stats[verdict.judgeId].total++;
        if (verdict.verdict === 'sound') {
          stats[verdict.judgeId].sound++;
        } else if (verdict.verdict === 'unsound') {
          stats[verdict.judgeId].unsound++;
        }
      });
      
      return stats;
    }
  }));

/**
 * Type definitions for external use
 */
export interface IJudgeVerdict extends Instance<typeof JudgeVerdictModel> {}
export interface IJudge extends Instance<typeof JudgeModel> {}

/**
 * Factory function to create a new judge verdict with validation
 * @param props - Verdict properties
 * @returns New judge verdict instance
 */
export function createJudgeVerdict(props: {
  proposalId: number;
  judgeId: string;
  verdict: 'sound' | 'unsound';
  justification: string;
  timestamp?: number;
}): IJudgeVerdict {
  // Validate input
  if (!props.proposalId || props.proposalId <= 0) {
    throw new Error('Proposal ID must be a positive number');
  }
  
  if (!props.judgeId || props.judgeId.trim().length === 0) {
    throw new Error('Judge ID cannot be empty');
  }
  
  if (!props.justification || props.justification.trim().length === 0) {
    throw new Error('Judge justification cannot be empty per Rule 122');
  }

  const validVerdicts = ['sound', 'unsound'];
  if (!validVerdicts.includes(props.verdict)) {
    throw new Error(`Invalid verdict: ${props.verdict}. Must be one of: ${validVerdicts.join(', ')}`);
  }

  return JudgeVerdictModel.create({
    proposalId: props.proposalId,
    judgeId: props.judgeId.trim(),
    verdict: props.verdict,
    justification: props.justification.trim(),
    timestamp: props.timestamp || Date.now()
  });
} 