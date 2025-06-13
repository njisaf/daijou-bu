import { type IRule, createRule } from '../models/RuleModel';
import { type IProposal } from '../models/ProposalModel';

/**
 * Result of conflict resolution
 */
export interface ConflictResolution {
  effectiveRule: IRule;
  conflictingRules: IRule[];
  reason: string;
}

/**
 * A conflict between two or more rules
 */
export interface RuleConflict {
  conflictingRules: IRule[];
  description: string;
}

/**
 * Pure functional RuleEngine for enforcing Nomic rule precedence and transmutation
 * 
 * This engine implements the core rule precedence logic from Peter Suber's Nomic:
 * - Rule 109: Immutable rules take precedence over Mutable rules
 * - Rule 113: Lower-numbered rules have higher precedence
 * - Rule 111: Immutable rules must be transmuted before amendment/repeal
 * 
 * The engine is stateless and operates on rule arrays, making it easy to test
 * and reason about.
 * 
 * @see daijo-bu_architecture.md Section 2.1 for RuleEngine specifications
 * @see initialRules.md for the canonical rule precedence rules
 */
export class RuleEngine {
  /**
   * Determines if rule A has higher precedence than rule B
   * 
   * Precedence rules (in order):
   * 1. Immutable rules always take precedence over mutable rules (Rule 109)
   * 2. Among rules of the same mutability, lower numbers have higher precedence (Rule 113)
   * 
   * @param ruleA - First rule to compare
   * @param ruleB - Second rule to compare
   * @returns true if ruleA has higher precedence than ruleB
   */
  hasHigherPrecedence(ruleA: IRule, ruleB: IRule): boolean {
    // Rule 109: Immutable rules take precedence over mutable rules
    if (ruleA.isImmutable && ruleB.isMutable) {
      return true;
    }
    if (ruleA.isMutable && ruleB.isImmutable) {
      return false;
    }

    // Among rules of same mutability, Rule 113: lower numbers have higher precedence
    if (ruleA.id === ruleB.id) {
      return false; // Equal precedence
    }
    
    return ruleA.id < ruleB.id;
  }

  /**
   * Validates whether a proposal is legal under the current rules
   * 
   * Enhanced validation rules:
   * - Add: Rule number must not already exist
   * - Amend: Rule must exist and be mutable (Rule 111)
   * - Repeal: Rule must exist and be mutable (Rule 111), or be transmuted in same proposal
   * - Transmute: Rule must exist (can transmute any rule)
   * 
   * @param proposal - The proposal to validate
   * @param currentRules - Current rule set
   * @param priorProposals - Previously applied proposals in the same turn (for multi-part proposals)
   * @throws Error if proposal is invalid
   */
  validateProposal(proposal: IProposal, currentRules: IRule[], priorProposals: IProposal[] = []): void {
    const targetRule = currentRules.find(rule => rule.id === proposal.ruleNumber);

    switch (proposal.type) {
      case 'Add':
        if (targetRule) {
          throw new Error(`Cannot add rule ${proposal.ruleNumber}: rule already exists`);
        }
        break;

      case 'Amend':
        if (!targetRule) {
          throw new Error(`Cannot amend rule ${proposal.ruleNumber}: rule does not exist`);
        }
        // Check if rule was transmuted to mutable in a prior proposal this turn
        const wasTransmutedToMutable = this.wasRuleTransmutedToMutable(proposal.ruleNumber, priorProposals);
        if (targetRule.isImmutable && !wasTransmutedToMutable) {
          throw new Error(`Cannot amend immutable rule ${proposal.ruleNumber}. Must transmute to mutable first (Rule 111)`);
        }
        break;

      case 'Repeal':
        if (!targetRule) {
          throw new Error(`Cannot repeal rule ${proposal.ruleNumber}: rule does not exist`);
        }
        // Enhanced validation: Allow repeal if transmuted to mutable in same proposal set
        const wasTransmuted = this.wasRuleTransmutedToMutable(proposal.ruleNumber, priorProposals);
        if (targetRule.isImmutable && !wasTransmuted) {
          throw new Error(`Cannot repeal immutable rule ${proposal.ruleNumber}. Must transmute to mutable first (Rule 111)`);
        }
        break;

      case 'Transmute':
        if (!targetRule) {
          throw new Error(`Cannot transmute rule ${proposal.ruleNumber}: rule does not exist`);
        }
        // Transmutation is always allowed on existing rules
        break;

      default:
        throw new Error(`Unknown proposal type: ${proposal.type}`);
    }
  }

  /**
   * Applies a passed proposal to the current rule set and returns the new rule set
   * 
   * This method assumes the proposal has already been validated and passed voting.
   * It creates a new rule array with the proposal applied.
   * 
   * @param proposal - The passed proposal to apply
   * @param currentRules - Current rule set
   * @returns New rule set with proposal applied
   */
  applyProposal(proposal: IProposal, currentRules: IRule[]): IRule[] {
    // Validate first
    this.validateProposal(proposal, currentRules);

    const newRules = [...currentRules];

    switch (proposal.type) {
      case 'Add': {
        // Add new rule (mutable by default unless in 100-series)
        const isMutable = proposal.ruleNumber < 100 || proposal.ruleNumber >= 200;
        const newRule = createRule({
          id: proposal.ruleNumber,
          text: proposal.ruleText,
          mutable: isMutable
        });
        newRules.push(newRule);
        break;
      }

      case 'Amend': {
        // Update existing rule text
        const ruleIndex = newRules.findIndex(rule => rule.id === proposal.ruleNumber);
        if (ruleIndex === -1) {
          throw new Error(`Rule ${proposal.ruleNumber} not found for amendment`);
        }
        
        const existingRule = newRules[ruleIndex];
        const amendedRule = createRule({
          id: existingRule.id,
          text: proposal.ruleText,
          mutable: existingRule.mutable
        });
        
        newRules[ruleIndex] = amendedRule;
        break;
      }

      case 'Repeal': {
        // Remove the rule
        const ruleIndex = newRules.findIndex(rule => rule.id === proposal.ruleNumber);
        if (ruleIndex === -1) {
          throw new Error(`Rule ${proposal.ruleNumber} not found for repeal`);
        }
        
        newRules.splice(ruleIndex, 1);
        break;
      }

      case 'Transmute': {
        // Change rule mutability
        const ruleIndex = newRules.findIndex(rule => rule.id === proposal.ruleNumber);
        if (ruleIndex === -1) {
          throw new Error(`Rule ${proposal.ruleNumber} not found for transmutation`);
        }
        
        const existingRule = newRules[ruleIndex];
        const transmutedRule = createRule({
          id: existingRule.id,
          text: existingRule.text,
          mutable: !existingRule.mutable // Flip mutability
        });
        
        newRules[ruleIndex] = transmutedRule;
        break;
      }
    }

    return newRules;
  }

  /**
   * Detects potential conflicts between rules
   * 
   * This is a simplified implementation. In practice, conflict detection
   * would involve more sophisticated text analysis and semantic understanding.
   * 
   * @param rules - Rule set to analyze
   * @returns Array of detected conflicts
   */
  detectConflicts(rules: IRule[]): RuleConflict[] {
    const conflicts: RuleConflict[] = [];

    // Simple keyword-based conflict detection
    // In practice, this would be much more sophisticated
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const ruleA = rules[i];
        const ruleB = rules[j];

        // Look for potentially conflicting keywords
        const conflictKeywords = ['must', 'shall', 'may not', 'cannot', 'forbidden'];
        const hasConflictingKeywords = conflictKeywords.some(keyword => 
          ruleA.text.toLowerCase().includes(keyword) && 
          ruleB.text.toLowerCase().includes(keyword)
        );

        if (hasConflictingKeywords) {
          conflicts.push({
            conflictingRules: [ruleA, ruleB],
            description: `Potential conflict between rules ${ruleA.id} and ${ruleB.id}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Checks if a rule was transmuted to mutable in prior proposals
   * 
   * @param ruleNumber - The rule number to check
   * @param priorProposals - Array of prior proposals to check
   * @returns true if the rule was transmuted from immutable to mutable
   * @private
   */
  private wasRuleTransmutedToMutable(ruleNumber: number, priorProposals: IProposal[]): boolean {
    // Look for a transmutation proposal that would make this rule mutable
    return priorProposals.some(proposal => 
      proposal.type === 'Transmute' && 
      proposal.ruleNumber === ruleNumber &&
      proposal.status === 'passed'
    );
  }

  /**
   * Resolves conflicts between rules using precedence
   * 
   * @param conflictingRules - Rules that are in conflict
   * @returns Resolution with the effective rule
   */
  resolveConflicts(conflictingRules: IRule[]): ConflictResolution {
    if (conflictingRules.length === 0) {
      throw new Error('No rules provided for conflict resolution');
    }

    if (conflictingRules.length === 1) {
      return {
        effectiveRule: conflictingRules[0],
        conflictingRules,
        reason: 'No conflict - single rule'
      };
    }

    // Sort by precedence (highest first)
    const sortedRules = [...conflictingRules].sort((a, b) => {
      if (this.hasHigherPrecedence(a, b)) return -1;
      if (this.hasHigherPrecedence(b, a)) return 1;
      return 0;
    });

    const effectiveRule = sortedRules[0];
    const reason = effectiveRule.isImmutable 
      ? `Rule ${effectiveRule.id} takes precedence (immutable)`
      : `Rule ${effectiveRule.id} takes precedence (lower number)`;

    return {
      effectiveRule,
      conflictingRules,
      reason
    };
  }

  /**
   * Rule 115: Consistency Check
   * 
   * Performs a post-mutation audit to ensure rule set integrity.
   * The following conditions invalidate a mutation:
   * - Duplicate rule numbers
   * - Empty rule text
   * - Immutable rules being directly repealed
   * 
   * @param rules - The rule set to check for consistency
   * @param recentProposal - The proposal that was just applied (optional, for better error messages)
   * @throws Error if consistency check fails, voiding the mutation
   */
  checkConsistency(rules: IRule[], recentProposal?: IProposal): void {
    // Check for duplicate rule numbers
    const ruleNumbers = rules.map(rule => rule.id);
    const duplicates = ruleNumbers.filter((number, index) => ruleNumbers.indexOf(number) !== index);
    
    if (duplicates.length > 0) {
      const duplicateList = [...new Set(duplicates)].join(', ');
      throw new Error(`Rule 115 violation: Duplicate rule numbers detected: ${duplicateList}. Mutation voided.`);
    }

    // Check for empty rule text
    const emptyRules = rules.filter(rule => !rule.text.trim());
    if (emptyRules.length > 0) {
      const emptyRuleNumbers = emptyRules.map(rule => rule.id).join(', ');
      throw new Error(`Rule 115 violation: Rules with empty text detected: ${emptyRuleNumbers}. Mutation voided.`);
    }

    // If we have a recent proposal, check for invalid immutable rule operations
    if (recentProposal) {
      const targetRule = rules.find(rule => rule.id === recentProposal.ruleNumber);
      
      // This should not happen if validation worked correctly, but check anyway
      if (recentProposal.type === 'Repeal' && targetRule && targetRule.isImmutable) {
        throw new Error(`Rule 115 violation: Attempted to repeal immutable rule ${recentProposal.ruleNumber}. Mutation voided.`);
      }
    }

    // Check for core immutable rules being inappropriately removed
    // Only check for rules that should exist based on the current rule set
    const currentImmutableRuleIds = rules.filter(rule => rule.isImmutable).map(rule => rule.id);
    const expectedCoreRules = [101, 102, 103]; // Basic core rules that should always exist
    
    const missingCoreRules = expectedCoreRules.filter(id => 
      !rules.some(rule => rule.id === id)
    );

    if (missingCoreRules.length > 0) {
      const missingList = missingCoreRules.join(', ');
      throw new Error(`Rule 115 violation: Core immutable rules missing: ${missingList}. Mutation voided.`);
    }
  }

  /**
   * Applies a proposal with consistency checking (Rule 115)
   * 
   * This is the safe version of applyProposal that includes post-mutation
   * consistency checks. If consistency check fails, the mutation is voided.
   * 
   * @param proposal - The passed proposal to apply
   * @param currentRules - Current rule set
   * @returns New rule set with proposal applied and consistency verified
   * @throws Error if proposal is invalid or consistency check fails
   */
  applyProposalSafely(proposal: IProposal, currentRules: IRule[]): IRule[] {
    // Apply the proposal
    const newRules = this.applyProposal(proposal, currentRules);
    
    // Perform Rule 115 consistency check
    this.checkConsistency(newRules, proposal);
    
    return newRules;
  }
} 