import { onSnapshot, getSnapshot, onAction, type SnapshotOut } from 'mobx-state-tree';
import { GameModel } from '../models/GameModel';

/**
 * Snapshot entry for history tracking
 */
interface SnapshotEntry {
  timestamp: number;
  snapshot: SnapshotOut<typeof GameModel>;
  turn?: number;
  action?: string;
}

/**
 * Download data structure for snapshots
 */
export interface SnapshotDownload {
  snapshot: SnapshotOut<typeof GameModel>;
  timestamp: number;
  filename: string;
  metadata: {
    turn: number;
    phase: string;
    playerCount: number;
    ruleCount: number;
    proposalCount: number;
  };
}

/**
 * Snapshot Logger for time-travel debugging and game state tracking
 * 
 * This logger implements the snapshot logic specified in the architecture:
 * - Full snapshots during warmup period or when debugSnapshots is enabled
 * - Diff snapshots for performance after warmup
 * - Console logging for development
 * - History tracking for time-travel debugging
 * - Download utilities for DevPanel
 * 
 * @see daijo-bu_architecture.md Section 6 for snapshot logging specification
 */
export class SnapshotLogger {
  private _history: SnapshotEntry[] = [];
  private _lastSnapshot: SnapshotOut<typeof GameModel> | null = null;
  private _snapshotCount = 0;
  private _isAutoLoggingEnabled = false;
  private _onSnapshotDisposer?: () => void;
  private _onActionDisposer?: () => void;

  constructor(public readonly gameModel: typeof GameModel.Type) {
    // Initialize with current snapshot
    this._lastSnapshot = getSnapshot(this.gameModel);
  }

  /**
   * Log a snapshot to console and history
   */
  logSnapshot(): void {
    if (!this.gameModel.config.enableSnapshotLogging) {
      return;
    }

    const currentSnapshot = getSnapshot(this.gameModel);
    const shouldUseFullSnapshot = this._shouldUseFullSnapshot();

    if (shouldUseFullSnapshot) {
      // Log full snapshot
      console.log('[SNAPSHOT]', JSON.stringify(currentSnapshot, null, 2));
    } else {
      // Log diff snapshot
      const diff = this._calculateDiff(this._lastSnapshot, currentSnapshot);
      console.log('[SNAPSHOT-DIFF]', JSON.stringify(diff, null, 2));
    }

    // Add to history
    this._addToHistory(currentSnapshot);
    
    // Update tracking
    this._lastSnapshot = currentSnapshot;
    this._snapshotCount++;
  }

  /**
   * Enable automatic logging on model changes
   */
  enableAutoLogging(): void {
    if (this._isAutoLoggingEnabled) {
      return;
    }

    this._isAutoLoggingEnabled = true;

    // Listen for snapshots (state changes)
    this._onSnapshotDisposer = onSnapshot(this.gameModel, () => {
      this.logSnapshot();
    });

    // Listen for actions (for debug info)
    this._onActionDisposer = onAction(this.gameModel, (action) => {
      if (this.gameModel.config.debugSnapshots) {
        console.log('[ACTION]', action.name, action.args);
      }
    });
  }

  /**
   * Disable automatic logging
   */
  disableAutoLogging(): void {
    if (!this._isAutoLoggingEnabled) {
      return;
    }

    this._isAutoLoggingEnabled = false;

    if (this._onSnapshotDisposer) {
      this._onSnapshotDisposer();
      this._onSnapshotDisposer = undefined;
    }

    if (this._onActionDisposer) {
      this._onActionDisposer();
      this._onActionDisposer = undefined;
    }
  }

  /**
   * Get snapshot history for debugging
   */
  getSnapshotHistory(): SnapshotEntry[] {
    return [...this._history];
  }

  /**
   * Create snapshot download data for DevPanel
   */
  downloadSnapshot(): SnapshotDownload {
    const snapshot = getSnapshot(this.gameModel);
    const timestamp = Date.now();

    return {
      snapshot,
      timestamp,
      filename: `snapshot-${timestamp}.json`,
      metadata: {
        turn: this.gameModel.turn,
        phase: this.gameModel.phase,
        playerCount: this.gameModel.players.length,
        ruleCount: this.gameModel.rules.length,
        proposalCount: this.gameModel.proposals.length
      }
    };
  }

  /**
   * Clear snapshot history
   */
  clearHistory(): void {
    this._history = [];
  }

  /**
   * Determine if full snapshot should be used
   */
  private _shouldUseFullSnapshot(): boolean {
    // Always use full snapshots if debug mode is enabled
    if (this.gameModel.config.debugSnapshots) {
      return true;
    }

    // Use full snapshots if explicitly configured
    if (this.gameModel.config.snapshotMode === 'full') {
      return true;
    }

    // Use full snapshots during warmup period
    if (this._snapshotCount < this.gameModel.config.warmupTurns) {
      return true;
    }

    // Use full snapshot if this is the first one
    if (!this._lastSnapshot) {
      return true;
    }

    return false;
  }

  /**
   * Calculate diff between two snapshots
   */
  private _calculateDiff(
    oldSnapshot: SnapshotOut<typeof GameModel> | null,
    newSnapshot: SnapshotOut<typeof GameModel>
  ): any {
    if (!oldSnapshot) {
      return { type: 'full', data: newSnapshot };
    }

    const diff: any = { type: 'diff', changes: {} };

    // Compare basic fields
    if (oldSnapshot.turn !== newSnapshot.turn) {
      diff.changes.turn = { from: oldSnapshot.turn, to: newSnapshot.turn };
    }

    if (oldSnapshot.phase !== newSnapshot.phase) {
      diff.changes.phase = { from: oldSnapshot.phase, to: newSnapshot.phase };
    }

    // Compare arrays (simplified diff)
    if (oldSnapshot.players.length !== newSnapshot.players.length) {
      diff.changes.players = {
        from: oldSnapshot.players.length,
        to: newSnapshot.players.length,
        added: newSnapshot.players.slice(oldSnapshot.players.length)
      };
    }

    if (oldSnapshot.rules.length !== newSnapshot.rules.length) {
      diff.changes.rules = {
        from: oldSnapshot.rules.length,
        to: newSnapshot.rules.length,
        added: newSnapshot.rules.slice(oldSnapshot.rules.length)
      };
    }

    if (oldSnapshot.proposals.length !== newSnapshot.proposals.length) {
      diff.changes.proposals = {
        from: oldSnapshot.proposals.length,
        to: newSnapshot.proposals.length,
        added: newSnapshot.proposals.slice(oldSnapshot.proposals.length)
      };
    }

    // Check for player score changes
    const playerChanges: any = {};
    newSnapshot.players.forEach((newPlayer, index) => {
      const oldPlayer = oldSnapshot.players[index];
      if (oldPlayer && oldPlayer.points !== newPlayer.points) {
        playerChanges[newPlayer.id] = {
          points: { from: oldPlayer.points, to: newPlayer.points }
        };
      }
      if (oldPlayer && oldPlayer.isActive !== newPlayer.isActive) {
        if (!playerChanges[newPlayer.id]) playerChanges[newPlayer.id] = {};
        playerChanges[newPlayer.id].isActive = {
          from: oldPlayer.isActive,
          to: newPlayer.isActive
        };
      }
    });

    if (Object.keys(playerChanges).length > 0) {
      diff.changes.playerChanges = playerChanges;
    }

    return diff;
  }

  /**
   * Add snapshot to history with size limit
   */
  private _addToHistory(snapshot: SnapshotOut<typeof GameModel>): void {
    const entry: SnapshotEntry = {
      timestamp: Date.now(),
      snapshot,
      turn: snapshot.turn
    };

    this._history.push(entry);

    // Limit history size (keep last 100 entries)
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.disableAutoLogging();
    this.clearHistory();
  }
} 