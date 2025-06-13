import { types, getSnapshot, type Instance, type SnapshotIn, type SnapshotOut } from 'mobx-state-tree';
import { RuleModel, type IRule } from './RuleModel';

/**
 * MST model for managing a collection of game rules
 * 
 * This model provides:
 * - CRUD operations for rules (add, update, remove)
 * - Validation of rule uniqueness and consistency
 * - Support for both Immutable and Mutable rule series
 * - Enforcement of Nomic precedence rules (Rule 109, 113)
 * 
 * @see daijo-bu_architecture.md Stage 6.1 for model specification
 */
export const RuleSetModel = types
  .model('RuleSet', {
    /** Collection of all rules in the ruleset */
    rules: types.array(RuleModel)
  })
  .views(self => ({
    /**
     * Get all rules sorted by ID (ascending)
     */
    get sortedRules() {
      return [...self.rules].sort((a, b) => a.id - b.id);
    },

    /**
     * Get all immutable rules (100-series typically)
     */
    get immutableRules() {
      return self.rules.filter(rule => !rule.mutable);
    },

    /**
     * Get all mutable rules (200+ series typically)
     */
    get mutableRules() {
      return self.rules.filter(rule => rule.mutable);
    },

    /**
     * Find a rule by its ID
     * @param ruleId - The rule ID to search for
     */
    findRuleById(ruleId: number): IRule | undefined {
      return self.rules.find(rule => rule.id === ruleId);
    },

    /**
     * Check if a rule ID already exists
     * @param ruleId - The rule ID to check
     */
    hasRuleId(ruleId: number): boolean {
      return self.rules.some(rule => rule.id === ruleId);
    },

    /**
     * Get the next available rule ID for a given series
     * @param seriesStart - Starting number for the series (e.g., 100, 200, 300)
     */
    getNextRuleIdInSeries(seriesStart: number): number {
      const seriesEnd = seriesStart + 100;
      const rulesInSeries = self.rules
        .filter(rule => rule.id >= seriesStart && rule.id < seriesEnd)
        .map(rule => rule.id)
        .sort((a, b) => a - b);

      // If no rules in series, return series start
      if (rulesInSeries.length === 0) {
        return seriesStart;
      }

      // Check for gaps starting from the first rule ID
      let expectedId = rulesInSeries[0];
      for (let i = 0; i < rulesInSeries.length; i++) {
        if (rulesInSeries[i] !== expectedId) {
          // Found a gap, return the missing ID
          return expectedId;
        }
        expectedId++;
      }

      // No gaps found, return the next number after the highest
      return rulesInSeries[rulesInSeries.length - 1] + 1;
    },

    /**
     * Validate the entire ruleset for consistency
     * Returns array of validation errors (empty if valid)
     */
    validate(): string[] {
      const errors: string[] = [];
      const ruleIds = new Set<number>();

      // Check for duplicate IDs
      for (const rule of self.rules) {
        if (ruleIds.has(rule.id)) {
          errors.push(`Duplicate rule ID: ${rule.id}`);
        }
        ruleIds.add(rule.id);

        // Check for empty text
        if (!rule.text || rule.text.trim().length === 0) {
          errors.push(`Rule ${rule.id} has empty text`);
        }

        // Check for invalid ID
        if (rule.id <= 0) {
          errors.push(`Rule ${rule.id} has invalid ID (must be positive)`);
        }
      }

      return errors;
    },

    /**
     * Get a snapshot compatible with loadInitialRules format
     */
    get asRuleSnapshots() {
      return self.rules.map(rule => ({
        id: rule.id,
        text: rule.text,
        mutable: rule.mutable
      }));
    },

    /**
     * Find a rule by its ID (alias for findRuleById)
     * @param ruleId - The rule ID to search for
     */
    findRule(ruleId: number): IRule | undefined {
      return self.rules.find(rule => rule.id === ruleId);
    },

    /**
     * Get the next available rule ID (starting from lowest available ID)
     */
    getNextAvailableId(): number {
      const allIds = self.rules.map(rule => rule.id).sort((a, b) => a - b);
      
      // If no rules, start with 100 (standard immutable series)
      if (allIds.length === 0) {
        return 100;
      }
      
      // Check for gaps starting from 100
      let expectedId = 100;
      for (const id of allIds) {
        if (id === expectedId) {
          expectedId++;
        } else if (id > expectedId) {
          // Found a gap
          return expectedId;
        }
      }
      
      // No gaps, return the next number after the highest
      return allIds[allIds.length - 1] + 1;
    }
  }))
  .actions(self => ({
    /**
     * Add a new rule to the ruleset
     * @param ruleData - Rule data to add
     */
    addRule(ruleData: { id: number; text: string; mutable: boolean }) {
      // Validate the rule data
      if (self.hasRuleId(ruleData.id)) {
        throw new Error(`Rule with ID ${ruleData.id} already exists`);
      }

      if (!ruleData.text || ruleData.text.trim().length === 0) {
        throw new Error('Rule text cannot be empty');
      }

      if (ruleData.id <= 0) {
        throw new Error('Rule ID must be positive');
      }

      // Create and add the rule
      const rule = RuleModel.create({
        id: ruleData.id,
        text: ruleData.text.trim(),
        mutable: ruleData.mutable
      });

      self.rules.push(rule);
    },

    /**
     * Update an existing rule's text and mutability
     * @param ruleId - ID of the rule to update
     * @param newText - New text for the rule
     * @param newMutable - New mutability state (optional)
     */
    updateRule(ruleId: number, newText: string, newMutable?: boolean) {
      const rule = self.findRuleById(ruleId);
      if (!rule) {
        throw new Error(`Rule with ID ${ruleId} not found`);
      }

      if (!rule.mutable && newText !== rule.text) {
        throw new Error(`Cannot update immutable rule ${ruleId} (must transmute first)`);
      }

      rule.updateText(newText);
      
      // Update mutability if provided
      if (newMutable !== undefined && newMutable !== rule.mutable) {
        rule.transmute();
      }
    },

    /**
     * Remove a rule from the ruleset
     * @param ruleId - ID of the rule to remove
     */
    removeRule(ruleId: number) {
      const ruleIndex = self.rules.findIndex(rule => rule.id === ruleId);
      if (ruleIndex === -1) {
        throw new Error(`Rule with ID ${ruleId} not found`);
      }

      const rule = self.rules[ruleIndex];
      if (!rule.mutable) {
        throw new Error(`Cannot remove immutable rule ${ruleId} (must transmute first)`);
      }

      self.rules.splice(ruleIndex, 1);
    },

    /**
     * Transmute a rule between mutable and immutable
     * @param ruleId - ID of the rule to transmute
     */
    transmuteRule(ruleId: number) {
      const rule = self.findRuleById(ruleId);
      if (!rule) {
        throw new Error(`Rule with ID ${ruleId} not found`);
      }

      rule.transmute();
    },

    /**
     * Clear all rules
     */
    clear() {
      self.rules.splice(0, self.rules.length);
    },

    /**
     * Load rules from an array of rule snapshots
     * This replaces all existing rules
     * @param ruleSnapshots - Array of rule data to load
     */
    loadRules(ruleSnapshots: Array<{ id: number; text: string; mutable: boolean }>) {
      // Clear existing rules
      this.clear();

      // Add all provided rules
      for (const ruleSnapshot of ruleSnapshots) {
        this.addRule(ruleSnapshot);
      }
    },

    /**
     * Validate the ruleset and throw if invalid
     * @throws Error if validation fails
     */
    validateAndThrow() {
      const errors = self.validate();
      if (errors.length > 0) {
        throw new Error(`Ruleset validation failed:\n${errors.join('\n')}`);
      }
    },

    /**
     * Move a rule up in the display order (swap positions in array)
     * @param ruleId - ID of the rule to move up
     */
    moveRuleUp(ruleId: number) {
      const ruleIndex = self.rules.findIndex(rule => rule.id === ruleId);
      
      if (ruleIndex <= 0) {
        throw new Error(`Rule ${ruleId} cannot be moved up (already at top or not found)`);
      }
      
      // Swap positions in the array
      const rule = self.rules[ruleIndex];
      self.rules.splice(ruleIndex, 1);
      self.rules.splice(ruleIndex - 1, 0, rule);
    },

    /**
     * Move a rule down in the display order (swap positions in array)
     * @param ruleId - ID of the rule to move down
     */
    moveRuleDown(ruleId: number) {
      const ruleIndex = self.rules.findIndex(rule => rule.id === ruleId);
      
      if (ruleIndex < 0 || ruleIndex >= self.rules.length - 1) {
        throw new Error(`Rule ${ruleId} cannot be moved down (already at bottom or not found)`);
      }
      
      // Swap positions in the array
      const rule = self.rules[ruleIndex];
      self.rules.splice(ruleIndex, 1);
      self.rules.splice(ruleIndex + 1, 0, rule);
    },

    /**
     * Export ruleset as JSON
     */
    toJSON() {
      return {
        rules: self.rules.map(rule => ({
          id: rule.id,
          text: rule.text,
          mutable: rule.mutable
        }))
      };
    },

    /**
     * Export ruleset as Markdown
     */
    toMarkdown(): string {
      const header = `# Custom Ruleset\n\nGenerated on ${new Date().toISOString()}\n\n`;
      
      const immutableSection = `## Immutable Rules\n\n${
        self.immutableRules.length > 0 
          ? self.immutableRules.map(rule => `### Rule ${rule.id}\n${rule.text}\n`).join('\n')
          : '_No immutable rules defined._\n'
      }\n`;
      
      const mutableSection = `## Mutable Rules\n\n${
        self.mutableRules.length > 0 
          ? self.mutableRules.map(rule => `### Rule ${rule.id}\n${rule.text}\n`).join('\n')
          : '_No mutable rules defined._\n'
      }\n`;
      
      return header + immutableSection + mutableSection;
    }
  }));

export interface IRuleSet extends Instance<typeof RuleSetModel> {}
export type RuleSetSnapshot = SnapshotOut<typeof RuleSetModel>;
export type RuleSetSnapshotIn = SnapshotIn<typeof RuleSetModel>;

/**
 * Factory function to create a new ruleset with validation
 * @param rules - Optional initial rules
 * @returns New ruleset instance
 */
export function createRuleSet(rules: Array<{ id: number; text: string; mutable: boolean }> = []): IRuleSet {
  const ruleSet = RuleSetModel.create({ rules: [] });
  
  // Load the rules if provided
  if (rules.length > 0) {
    ruleSet.loadRules(rules);
  }
  
  // Validate the ruleset
  ruleSet.validateAndThrow();
  
  return ruleSet;
} 