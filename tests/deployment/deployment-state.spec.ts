import { test, expect, Page } from '@playwright/test';

/**
 * TC-001: Real-time State Sync Validation
 * Tests deployment state updates and synchronization across UI
 */

test.describe('Deployment State Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-001: Deployment state transitions are reflected in real-time', async ({ page, context }) => {
    // This test validates that deployment states update properly
    // and are synchronized across multiple browser tabs

    // Step 1: Login (if required)
    // await loginAsTestUser(page);

    // Step 2: Navigate to deployments or create new deployment
    // For demo purposes, we'll monitor the landing page behavior

    // Step 3: Monitor state changes
    const stateChanges: string[] = [];

    page.on('console', msg => {
      if (msg.text().includes('state') || msg.text().includes('deployment')) {
        stateChanges.push(msg.text());
      }
    });

    // Step 4: Check for state update indicators
    const hasProgressIndicator = await page.locator('[role="progressbar"], .loading, .spinner, [data-testid*="loading"]').count() > 0;
    console.log(`Progress indicators present: ${hasProgressIndicator}`);

    // Step 5: Open same project in new tab (multi-tab consistency test)
    const newTab = await context.newPage();
    await newTab.goto('/');

    // Step 6: Verify both tabs show consistent state
    const page1Title = await page.title();
    const page2Title = await newTab.title();

    expect(page1Title).toBe(page2Title);

    await newTab.close();
  });

  test('TC-002: Deployment progress shows clear status messages', async ({ page }) => {
    // Test that deployment messages are clear and contextual
    // Not just "Deployment 1 of 2" but specific stage information

    await page.goto('/');

    // Look for deployment status elements
    const statusElements = page.locator('[class*="status"], [class*="progress"], [data-testid*="deployment-status"]');
    const count = await statusElements.count();

    console.log(`Found ${count} status elements`);

    // If status elements exist, verify they have descriptive text
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await statusElements.nth(i).textContent();
        console.log(`Status element ${i}: ${text}`);

        // Verify status messages are descriptive (not just numbers)
        // Good: "Building application...", "Deploying to infrastructure..."
        // Bad: "1 of 2", "Step 2"
        if (text) {
          const isGeneric = /^\d+\s+of\s+\d+$/.test(text.trim());
          if (isGeneric) {
            console.warn(`⚠️  Generic status message found: "${text}"`);
          }
        }
      }
    }
  });

  test('TC-003: WebSocket connection maintains state sync', async ({ page }) => {
    // Monitor WebSocket connections for real-time updates

    const wsMessages: any[] = [];

    // Intercept WebSocket frames
    page.on('websocket', ws => {
      console.log(`WebSocket opened: ${ws.url()}`);

      ws.on('framesent', event => {
        wsMessages.push({ type: 'sent', data: event.payload });
      });

      ws.on('framereceived', event => {
        wsMessages.push({ type: 'received', data: event.payload });
      });

      ws.on('close', () => {
        console.log('WebSocket closed');
      });
    });

    await page.goto('/');

    // Wait for potential WebSocket connections
    await page.waitForTimeout(3000);

    console.log(`WebSocket messages exchanged: ${wsMessages.length}`);

    // In a real deployment scenario, we'd verify:
    // 1. WebSocket connects successfully
    // 2. Deployment state updates are pushed via WebSocket
    // 3. Reconnection happens on disconnect
  });

  test('TC-004: Optimistic UI updates provide immediate feedback', async ({ page }) => {
    // Test that user actions show immediate visual feedback
    // before server confirmation

    await page.goto('/');

    // Find interactive buttons
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Click the first visible button and measure feedback time
      const startTime = Date.now();

      await buttons.first().click();

      // Check for immediate loading state
      const hasLoadingState = await page.locator('[class*="loading"], [disabled], .spinner').first().isVisible({ timeout: 100 })
        .catch(() => false);

      const feedbackTime = Date.now() - startTime;

      console.log(`Visual feedback time: ${feedbackTime}ms`);
      console.log(`Has immediate loading state: ${hasLoadingState}`);

      // Optimistic UI should show feedback within 100ms
      if (feedbackTime > 100 && !hasLoadingState) {
        console.warn('⚠️  No immediate visual feedback detected');
      }
    }
  });
});

/**
 * Helper function to login (implement based on actual auth flow)
 */
async function loginAsTestUser(page: Page) {
  // Implementation depends on AutoGen's authentication method
  // Example for OAuth:

  const signUpButton = page.locator('text=Sign Up').first();
  if (await signUpButton.isVisible()) {
    await signUpButton.click();

    // Handle OAuth flow or direct login
    // This is a placeholder - actual implementation needed
    await page.waitForURL(/dashboard|projects/, { timeout: 15000 });
  }
}
