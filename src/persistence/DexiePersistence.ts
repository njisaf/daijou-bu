import Dexie, { type Table } from 'dexie';
import type { SnapshotOut } from 'mobx-state-tree';
import type { GameModel } from '../models/GameModel';
import type { IGamePersistence, PersistedSnapshot } from './IGamePersistence';

/**
 * Database schema for game snapshots
 */
interface SnapshotRecord {
  id?: number;
  timestamp: number;
  snapshot: any; // SnapshotOut serialized as JSON
  turn: number;
  phase: string;
  playerCount: number;
}

/**
 * Dexie database for game persistence
 */
class GameDatabase extends Dexie {
  snapshots!: Table<SnapshotRecord>;

  constructor() {
    super('DaijoBuGame');
    
    this.version(1).stores({
      snapshots: '++id, timestamp, turn, phase'
    });
  }
}

/**
 * IndexedDB persistence adapter using Dexie
 * 
 * This adapter provides persistent storage for game snapshots using
 * IndexedDB through the Dexie library. It handles browser compatibility
 * and gracefully falls back to no-op behavior if IndexedDB is unavailable.
 * 
 * @see daijo-bu_architecture.md Section 2.2 for persistence specification
 */
export class DexiePersistence implements IGamePersistence {
  private db: GameDatabase;
  private _isAvailable = false;

  constructor() {
    this.db = new GameDatabase();
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    try {
      await this.db.open();
      this._isAvailable = true;
      console.log('[DexiePersistence] IndexedDB initialized successfully');
    } catch (error) {
      console.warn('[DexiePersistence] Failed to initialize IndexedDB:', error);
      this._isAvailable = false;
    }
  }

  /**
   * Check if IndexedDB is available and working
   */
  isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Save a game snapshot to IndexedDB
   */
  async saveSnapshot(snapshot: SnapshotOut<typeof GameModel>): Promise<void> {
    if (!this._isAvailable) {
      return;
    }

    try {
      const record: SnapshotRecord = {
        timestamp: Date.now(),
        snapshot: JSON.parse(JSON.stringify(snapshot)), // Deep clone
        turn: snapshot.turn,
        phase: snapshot.phase,
        playerCount: snapshot.players.length
      };

      await this.db.snapshots.add(record);
      
      // Keep only last 50 snapshots for performance
      const count = await this.db.snapshots.count();
      if (count > 50) {
        const oldestRecords = await this.db.snapshots
          .orderBy('timestamp')
          .limit(count - 50)
          .toArray();
        
        const idsToDelete = oldestRecords.map(r => r.id!);
        await this.db.snapshots.bulkDelete(idsToDelete);
      }

    } catch (error) {
      console.error('[DexiePersistence] Failed to save snapshot:', error);
    }
  }

  /**
   * Load the most recent game snapshot
   */
  async loadSnapshot(): Promise<SnapshotOut<typeof GameModel> | null> {
    if (!this._isAvailable) {
      return null;
    }

    try {
      const latestRecord = await this.db.snapshots
        .orderBy('timestamp')
        .reverse()
        .first();

      if (!latestRecord) {
        return null;
      }

      return latestRecord.snapshot as SnapshotOut<typeof GameModel>;
    } catch (error) {
      console.error('[DexiePersistence] Failed to load snapshot:', error);
      return null;
    }
  }

  /**
   * Get snapshot history with optional limit
   */
  async getSnapshotHistory(limit = 20): Promise<PersistedSnapshot[]> {
    if (!this._isAvailable) {
      return [];
    }

    try {
      const records = await this.db.snapshots
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();

      return records.map(record => ({
        id: record.id,
        timestamp: record.timestamp,
        snapshot: record.snapshot as SnapshotOut<typeof GameModel>,
        metadata: {
          turn: record.turn,
          phase: record.phase,
          playerCount: record.playerCount
        }
      }));
    } catch (error) {
      console.error('[DexiePersistence] Failed to get snapshot history:', error);
      return [];
    }
  }

  /**
   * Clear all saved snapshots
   */
  async clear(): Promise<void> {
    if (!this._isAvailable) {
      return;
    }

    try {
      await this.db.snapshots.clear();
      console.log('[DexiePersistence] All snapshots cleared');
    } catch (error) {
      console.error('[DexiePersistence] Failed to clear snapshots:', error);
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    this._isAvailable = false;
  }

  /**
   * Get database statistics for debugging
   */
  async getStats(): Promise<{ count: number; size: number }> {
    if (!this._isAvailable) {
      return { count: 0, size: 0 };
    }

    try {
      const count = await this.db.snapshots.count();
      const records = await this.db.snapshots.toArray();
      const size = records.reduce((total, record) => {
        return total + JSON.stringify(record.snapshot).length;
      }, 0);

      return { count, size };
    } catch (error) {
      console.error('[DexiePersistence] Failed to get stats:', error);
      return { count: 0, size: 0 };
    }
  }
} 