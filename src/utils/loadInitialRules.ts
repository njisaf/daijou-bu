/**
 * Utility for loading initial rules from JSON with Prompt P injection
 * 
 * This utility:
 * - Loads the canonical ruleset from initialRules.json
 * - Automatically injects rule 100 with the Prompt P statement
 * - Ensures proper rule precedence (100 has highest precedence)
 * - Returns MST-compatible rule snapshots
 */

import type { SnapshotIn } from 'mobx-state-tree';
import type { RuleModel } from '../models/RuleModel';
import initialRulesJson from '../assets/initialRules.json';

export type RuleSnapshotIn = SnapshotIn<typeof RuleModel>;

/**
 * Load the initial ruleset with automatic Prompt P injection as rule 100
 * 
 * This function loads the 28 rules from initialRules.json and injects
 * an additional immutable rule 100 containing the Prompt P statement.
 * Rule 100 has the highest precedence according to rule precedence (Rule 113).
 * 
 * @param promptP - The Prompt P statement to inject as rule 100
 * @returns Array of rule snapshots ready for MST model creation
 */
export function loadInitialRules(promptP: string): RuleSnapshotIn[] {
  // Load rules from JSON file
  const jsonRules = initialRulesJson as Array<{
    id: number;
    text: string;
    mutable: boolean;
  }>;

  // Create rule 100 with Prompt P (highest precedence)
  const rule100: RuleSnapshotIn = {
    id: 100,
    text: promptP || 'This is the fundamental proof statement P for this game.',
    mutable: false // Immutable for highest precedence
  };

  // Convert JSON rules to MST snapshots
  const rules: RuleSnapshotIn[] = jsonRules.map(rule => ({
    id: rule.id,
    text: rule.text,
    mutable: rule.mutable
  }));

  // Add rule 100 and sort by ID (100 first, then 101, 102, etc.)
  const allRules = [rule100, ...rules];
  allRules.sort((a, b) => a.id - b.id);

  return allRules;
}

/**
 * Get the total number of rules that will be loaded
 * Useful for validation and testing
 */
export function getExpectedRuleCount(): number {
  return initialRulesJson.length + 1; // JSON rules + injected rule 100
}

/**
 * Validate that the loaded rules have the expected structure
 * 
 * @param rules - Rules to validate
 * @throws Error if validation fails
 */
export function validateRules(rules: RuleSnapshotIn[]): void {
  if (!Array.isArray(rules)) {
    throw new Error('Rules must be an array');
  }

  if (rules.length === 0) {
    throw new Error('Rules array cannot be empty');
  }

  // Check that rule 100 exists
  const rule100 = rules.find(r => r.id === 100);
  if (!rule100) {
    throw new Error('Rule 100 (Prompt P) must be present');
  }

  if (rule100.mutable !== false) {
    throw new Error('Rule 100 must be immutable for highest precedence');
  }

  // Validate each rule has required properties
  for (const rule of rules) {
    if (typeof rule.id !== 'number') {
      throw new Error(`Rule ID must be a number, got ${typeof rule.id}`);
    }

    if (typeof rule.text !== 'string') {
      throw new Error(`Rule text must be a string, got ${typeof rule.text}`);
    }

    if (typeof rule.mutable !== 'boolean') {
      throw new Error(`Rule mutable must be a boolean, got ${typeof rule.mutable}`);
    }

    if (rule.text.trim().length === 0) {
      throw new Error(`Rule ${rule.id} cannot have empty text`);
    }
  }

  // Check for duplicate IDs
  const ids = rules.map(r => r.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    throw new Error('Duplicate rule IDs found');
  }
} 