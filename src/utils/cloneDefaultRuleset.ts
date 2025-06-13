import { loadInitialRules } from './loadInitialRules';
import type { IRuleSet } from '../models/RuleSetModel';
import { createRuleSet } from '../models/RuleSetModel';

/**
 * Clone the default ruleset with optional Prompt P injection
 * 
 * This utility provides a clean way to obtain a fresh copy of the
 * initial game rules for new game sessions or testing scenarios.
 * 
 * @param promptP - Optional Prompt P text to inject as Rule 100
 * @returns New RuleSetModel instance with default rules loaded
 * 
 * @example
 * ```typescript
 * // Basic usage - clone default rules
 * const ruleset = cloneDefaultRuleset();
 * 
 * // With custom Prompt P
 * const ruleset = cloneDefaultRuleset("Custom AI behavioral guidance");
 * 
 * // For testing - clone and modify
 * const testRules = cloneDefaultRuleset();
 * testRules.addRule({ id: 999, text: "Test rule", mutable: true });
 * ```
 */
export function cloneDefaultRuleset(promptP: string = ''): IRuleSet {
  // Load the initial rules with Prompt P injection
  const initialRules = loadInitialRules(promptP);
  
  // Create and return a new RuleSetModel instance
  return createRuleSet(initialRules);
} 