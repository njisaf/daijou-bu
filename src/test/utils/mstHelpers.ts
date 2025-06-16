/**
 * MST Helper Utilities for Stage 6.6 Test Modernization
 * 
 * Provides utilities to properly handle MST mutations in tests
 * without causing "modify outside action" errors.
 */

import { unprotect, protect } from 'mobx-state-tree';

/**
 * Safely modifies an MST model by temporarily unprotecting it
 */
export function safeModify<T>(model: T, modifier: () => void): void {
  const wasProtected = true; // Assume protected by default
  
  try {
    unprotect(model);
    modifier();
  } finally {
    if (wasProtected) {
      protect(model);
    }
  }
}

/**
 * Creates a test model with protection disabled
 */
export function createUnprotectedModel<T>(createFn: () => T): T {
  const model = createFn();
  unprotect(model);
  return model;
}

/**
 * Wrapper for test actions that ensures proper MST behavior
 */
export function testAction<T extends (...args: any[]) => any>(
  model: any,
  actionName: string,
  action: T
): T {
  return ((...args: any[]) => {
    // If the model has the action, use it
    if (model[actionName]) {
      return model[actionName](...args);
    }
    
    // Otherwise, perform the action safely
    let result: any;
    safeModify(model, () => {
      result = action(...args);
    });
    return result;
  }) as T;
}

/**
 * Helper to apply snapshots safely in tests
 */
export function applyTestSnapshot(model: any, snapshot: any): void {
  safeModify(model, () => {
    if (model.applySnapshot) {
      model.applySnapshot(snapshot);
    } else {
      // Manual property assignment for models without applySnapshot
      Object.keys(snapshot).forEach(key => {
        if (key in model) {
          model[key] = snapshot[key];
        }
      });
    }
  });
}

/**
 * Helper to add items to MST arrays safely
 */
export function safeArrayPush<T>(array: T[], item: T): void {
  safeModify(array, () => {
    (array as any).push(item);
  });
}

/**
 * Helper to modify MST properties safely
 */
export function safeSetProperty(model: any, property: string, value: any): void {
  safeModify(model, () => {
    model[property] = value;
  });
} 