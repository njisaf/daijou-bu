import { DexiePersistence } from './DexiePersistence';
import { NoOpPersistence } from './NoOpPersistence';
import type { IGamePersistence } from './IGamePersistence';

/**
 * Factory function to create the appropriate persistence adapter
 * 
 * This function attempts to create a DexiePersistence adapter first.
 * If IndexedDB is unavailable or initialization fails, it falls back
 * to NoOpPersistence to ensure the game can still run.
 * 
 * @returns Promise that resolves to a configured persistence adapter
 */
export async function createPersistence(): Promise<IGamePersistence> {
  // Try to create and initialize Dexie persistence
  const dexiePersistence = new DexiePersistence();
  
  try {
    await dexiePersistence.initialize();
    
    if (dexiePersistence.isAvailable()) {
      console.log('[Persistence] Using IndexedDB persistence');
      return dexiePersistence;
    }
  } catch (error) {
    console.warn('[Persistence] IndexedDB initialization failed:', error);
  }

  // Clean up failed Dexie instance
  dexiePersistence.close();
  
  // Fall back to NoOp persistence
  console.log('[Persistence] Falling back to NoOp persistence');
  const noOpPersistence = new NoOpPersistence();
  await noOpPersistence.initialize();
  
  return noOpPersistence;
}

// Re-export types and classes for convenience
export type { IGamePersistence, PersistedSnapshot } from './IGamePersistence';
export { DexiePersistence } from './DexiePersistence';
export { NoOpPersistence } from './NoOpPersistence'; 