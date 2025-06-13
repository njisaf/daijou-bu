import { types, type Instance } from 'mobx-state-tree';

/**
 * MST model representing a single game rule
 * 
 * Rules can be either Immutable (100-series) or Mutable (200+ series).
 * This follows the original Nomic game design by Peter Suber.
 * 
 * @see initialRules.md for the canonical starting ruleset
 * @see daijo-bu_architecture.md Section 2 for MST model specifications
 */
export const RuleModel = types
  .model('Rule', {
    /** Unique identifier for the rule */
    id: types.identifierNumber,
    
    /** The full text of the rule */
    text: types.string,
    
    /** Whether the rule is mutable (can be changed) or immutable */
    mutable: types.boolean
  })
  .actions(self => ({
    /**
     * Updates the text of the rule
     * @param newText - The new rule text
     */
    updateText(newText: string) {
      if (!newText || newText.trim().length === 0) {
        throw new Error('Rule text cannot be empty');
      }
      self.text = newText.trim();
    },

    /**
     * Transmutes the rule between mutable and immutable
     * This is a key mechanic in Nomic - rules can change their mutability status
     */
    transmute() {
      self.mutable = !self.mutable;
    }
  }))
  .views(self => ({
    /**
     * Returns true if the rule is immutable
     */
    get isImmutable(): boolean {
      return !self.mutable;
    },

    /**
     * Returns true if the rule is mutable
     */
    get isMutable(): boolean {
      return self.mutable;
    },

    /**
     * Returns true if the rule is in the 100-series (typically immutable)
     */
    get isInHundredSeries(): boolean {
      return self.id >= 100 && self.id < 200;
    },

    /**
     * Returns true if the rule is in the 200-series (typically mutable)
     */
    get isInTwoHundredSeries(): boolean {
      return self.id >= 200 && self.id < 300;
    },

    /**
     * Returns a human-readable summary of the rule
     */
    get summary(): string {
      const mutabilityText = self.mutable ? 'Mutable' : 'Immutable';
      const truncatedText = self.text.length > 50 
        ? self.text.substring(0, 50) + '...'
        : self.text;
      
      return `Rule ${self.id} (${mutabilityText}): ${truncatedText}`;
    }
  }));

export interface IRule extends Instance<typeof RuleModel> {}

/**
 * Factory function to create a new rule with validation
 * @param props - Rule properties
 * @returns New rule instance
 */
export function createRule(props: {
  id: number;
  text: string;
  mutable: boolean;
}): IRule {
  // Validate input
  if (!props.id || props.id <= 0) {
    throw new Error('Rule ID must be a positive number');
  }
  
  if (!props.text || props.text.trim().length === 0) {
    throw new Error('Rule text cannot be empty');
  }

  return RuleModel.create({
    id: props.id,
    text: props.text.trim(),
    mutable: props.mutable
  });
} 