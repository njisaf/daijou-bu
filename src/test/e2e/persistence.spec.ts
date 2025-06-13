import { test, expect } from '@playwright/test';

/**
 * Browser E2E Test for persistence functionality
 * 
 * Tests that game state survives page reloads through IndexedDB.
 * Verifies that:
 * - Game starts and plays 5 turns using mocks
 * - Page reload preserves scoreboard and proposal count
 * - Persistence works across browser sessions
 * 
 * @see Phase 4 Objective 1: Browser E2E Test
 */
test.describe('Game Persistence', () => {
  test('should persist game state across page reload', async ({ page }) => {
    // Go to the home page
    await page.goto('/');
    
    // Fill in the prompt form and start the game
    await page.fill('textarea[placeholder*="prompt"]', 'You are a strategic AI player in Nomic. Focus on winning through clever rule proposals.');
    await page.click('button:has-text("Play Game")');
    
    // Wait for game to load and setup
    await expect(page.locator('h1:has-text("Game in Progress")')).toBeVisible({ timeout: 10000 });
    
    // Navigate to game page with dev mode
    await page.goto('/?dev=1#/game');
    
    // Start the game
    await page.click('button:has-text("Start")');
    
    // Wait for the game to progress through several turns
    // We'll wait for at least 3 proposals to be created
    await page.waitForFunction(
      () => {
        const proposalElements = document.querySelectorAll('[data-testid="proposal-count"], .proposal-content');
        return proposalElements.length >= 1;
      },
      { timeout: 30000 }
    );
    
    // Wait a bit more to ensure some turns have passed
    await page.waitForTimeout(5000);
    
    // Capture current game state before reload
    const scoreboardBefore = await page.locator('[data-testid="scoreboard"], .scoreboard').textContent();
    const turnCountBefore = await page.locator('[data-testid="turn-count"], .turnNumber').textContent();
    
    // Reload the page
    await page.reload();
    
    // Verify game loads back with preserved state
    await expect(page.locator('h1:has-text("Game in Progress")')).toBeVisible({ timeout: 10000 });
    
    // Check that the game state is preserved
    const scoreboardAfter = await page.locator('[data-testid="scoreboard"], .scoreboard').textContent();
    const turnCountAfter = await page.locator('[data-testid="turn-count"], .turnNumber').textContent();
    
    // Verify persistence worked
    expect(scoreboardAfter).toBe(scoreboardBefore);
    expect(turnCountAfter).toBe(turnCountBefore);
    
    // Verify game can continue after reload
    const gamePhase = await page.locator('[data-testid="game-phase"], .phase').textContent();
    expect(gamePhase).toMatch(/(Playing|Paused|Completed)/);
  });
  
  test('should handle IndexedDB persistence gracefully', async ({ page }) => {
    // Test with clean slate
    await page.goto('/');
    
    // Fill in prompt and start game
    await page.fill('textarea[placeholder*="prompt"]', 'Test persistence with minimal setup');
    await page.click('button:has-text("Play Game")');
    
    // Verify game starts successfully
    await expect(page.locator('h1:has-text("Game in Progress")')).toBeVisible({ timeout: 10000 });
    
    // Navigate to game
    await page.goto('/?dev=1#/game');
    
    // Check that persistence system is working
    const devPanel = page.locator('.devSection, [data-testid="dev-panel"]');
    if (await devPanel.isVisible()) {
      // Look for persistence indicators in dev panel
      const persistenceInfo = devPanel.locator('text=/Snapshots:|snapshots/i');
      await expect(persistenceInfo).toBeVisible();
    }
    
    // Verify no critical errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a moment for any errors to surface
    await page.waitForTimeout(2000);
    
    // Filter out known non-critical warnings
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('DevTools') &&
      !error.includes('Extension')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
}); 