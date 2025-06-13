import type { SnapshotOut } from 'mobx-state-tree';
import type { GameModel } from '../models/GameModel';
import type { IGamePersistence, PersistedSnapshot } from './IGamePersistence';

/**
 * No-operation persistence adapter
 * 
 * This adapter provides a fallback when IndexedDB or other persistence
 * mechanisms are unavailable. It implements the IGamePersistence interface
 * but doesn't actually save or load any data.
 * 
 * This ensures the game can still run without persistence, though state
 * will be lost on page refresh.
 * 
 * @see daijo-bu_architecture.md Section 2.2 for persistence specification
 */
export class NoOpPersistence implements IGamePersistence {
  /**
   * Initialize (no-op)
   */
  async initialize(): Promise<void> {
    // Nothing to initialize
  }

  /**
   * Always returns false indicating persistence is not available
   */
  isAvailable(): boolean {
    return false;
  }

  /**
   * Save snapshot (no-op)
   */
  async saveSnapshot(snapshot: SnapshotOut<typeof GameModel>): Promise<void> {
    // Nothing to save
    console.warn('[NoOpPersistence] Snapshot save attempted but persistence is not available');
  }

  /**
   * Load snapshot (always returns null)
   */
  async loadSnapshot(): Promise<SnapshotOut<typeof GameModel> | null> {
    return null;
  }

  /**
   * Get snapshot history (always returns empty array)
   */
  async getSnapshotHistory(limit?: number): Promise<PersistedSnapshot[]> {
    return [];
  }

  /**
   * Clear snapshots (no-op)
   */
  async clear(): Promise<void> {
    // Nothing to clear
  }

  /**
   * Close (no-op)
   */
  close(): void {
    // Nothing to close
  }
} 