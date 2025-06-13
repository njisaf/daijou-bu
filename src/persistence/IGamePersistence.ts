import type { SnapshotOut } from 'mobx-state-tree';
import type { GameModel } from '../models/GameModel';

/**
 * Snapshot entry for persistence history
 */
export interface PersistedSnapshot {
  id?: number;
  timestamp: number;
  snapshot: SnapshotOut<typeof GameModel>;
  metadata?: {
    turn: number;
    phase: string;
    playerCount: number;
  };
}

/**
 * Interface for game persistence adapters
 * 
 * This interface allows different persistence implementations to be used
 * interchangeably. The game can use IndexedDB (Dexie), SQLite (sql.js),
 * or other storage mechanisms without changing the game logic.
 * 
 * @see daijo-bu_architecture.md Section 2.2 for persistence specification
 */
export interface IGamePersistence {
  /**
   * Initialize the persistence layer
   * This may involve opening database connections, creating tables, etc.
   */
  initialize(): Promise<void>;

  /**
   * Check if persistence is available and working
   */
  isAvailable(): boolean;

  /**
   * Save a game snapshot
   */
  saveSnapshot(snapshot: SnapshotOut<typeof GameModel>): Promise<void>;

  /**
   * Load the most recent game snapshot
   * Returns null if no snapshot exists
   */
  loadSnapshot(): Promise<SnapshotOut<typeof GameModel> | null>;

  /**
   * Get snapshot history with optional limit
   */
  getSnapshotHistory(limit?: number): Promise<PersistedSnapshot[]>;

  /**
   * Clear all saved snapshots
   */
  clear(): Promise<void>;

  /**
   * Close/cleanup the persistence layer
   */
  close(): void;
} 