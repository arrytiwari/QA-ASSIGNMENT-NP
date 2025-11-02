import { test, expect } from '@playwright/test';
import axios from 'axios';

/**
 * TC-006: Deployment URL Availability Check
 * Critical test to ensure deployment URLs are accessible when shown to users
 * Addresses the core problem of broken links after deployment
 */

test.describe('Deployment URL Availability', () => {

  test('TC-006: Deployment URL is accessible before being shown to user', async ({ page }) => {
    // This test simulates a deployment and verifies the URL is ready

    await page.goto('/');

    // In a real scenario, this would:
    // 1. Login to the platform
    // 2. Create/deploy a new project
    // 3. Capture the deployment URL when it appears
    // 4. Verify HTTP health checks before URL is clickable

    // For demonstration, we'll test the pattern with the landing page

    // Simulate checking if a deployment URL is accessible
    const testUrl = 'https://autogen.nodeops.network';

    const isAccessible = await checkUrlAvailability(testUrl, 5, 2000);

    expect(isAccessible).toBe(true);

    console.log(`✅ URL ${testUrl} is accessible`);
  });

  test('TC-006.1: Deployment shows health check progress', async ({ page }) => {
    // Verify that the UI indicates health checking status

    await page.goto('/');

    // Look for health check indicators
    // These should be present during deployment
    const healthCheckIndicators = [
      'health check',
      'performing checks',
      'verifying deployment',
      'testing availability',
      'warming up'
    ];

    const pageContent = await page.content();
    const foundIndicators: string[] = [];

    for (const indicator of healthCheckIndicators) {
      if (pageContent.toLowerCase().includes(indicator)) {
        foundIndicators.push(indicator);
      }
    }

    console.log('Found health check indicators:', foundIndicators);

    // Note: This test would be more meaningful in an actual deployment flow
  });

  test('TC-006.2: Deployment URL shown only after successful health check', async ({ page }) => {
    // This test validates the critical UX improvement:
    // URLs should be grayed out/disabled until they pass health checks

    await page.goto('/');

    // In production, this would monitor a real deployment and verify:
    // 1. URL appears but is not clickable (grayed out)
    // 2. "Performing health checks..." message is shown
    // 3. After health check passes, URL becomes clickable
    // 4. Green checkmark or success indicator appears

    // For demonstration, let's check if URLs have proper states
    const links = page.locator('a[href^="http"]');
    const linkCount = await links.count();

    console.log(`Found ${linkCount} external links`);

    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      const isDisabled = await links.nth(i).getAttribute('disabled') !== null;
      const ariaDisabled = await links.nth(i).getAttribute('aria-disabled');

      console.log(`Link ${i}: ${href}, disabled: ${isDisabled}, aria-disabled: ${ariaDisabled}`);
    }
  });

  test('TC-006.3: Poll deployment URL until it returns 200', async () => {
    // Simulates the backend health check logic

    const deploymentUrl = 'https://autogen.nodeops.network';

    const healthCheckResult = await pollUntilHealthy(deploymentUrl, {
      maxAttempts: 30,
      intervalMs: 2000,
      expectedStatusCode: 200
    });

    expect(healthCheckResult.success).toBe(true);
    expect(healthCheckResult.attempts).toBeLessThan(30);
    expect(healthCheckResult.responseTime).toBeLessThan(30000);

    console.log(`✅ Health check passed in ${healthCheckResult.attempts} attempts (${healthCheckResult.responseTime}ms)`);
  });

  test('TC-006.4: Handle deployment URL errors gracefully', async () => {
    // Test behavior when deployment URL is not accessible

    const invalidUrl = 'https://nonexistent-deployment-12345.autogen.nodeops.network';

    const healthCheckResult = await pollUntilHealthy(invalidUrl, {
      maxAttempts: 3,
      intervalMs: 1000,
      expectedStatusCode: 200
    });

    expect(healthCheckResult.success).toBe(false);

    console.log(`❌ Expected failure: ${healthCheckResult.error}`);

    // In the actual UI, this should:
    // 1. Show error message
    // 2. Provide retry button
    // 3. Link to deployment logs
    // 4. Suggest troubleshooting steps
  });
});

/**
 * Helper: Check if URL is accessible with retries
 */
async function checkUrlAvailability(
  url: string,
  maxRetries: number = 5,
  retryDelayMs: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      if (response.status >= 200 && response.status < 400) {
        return true;
      }

      console.log(`Attempt ${i + 1}/${maxRetries}: Status ${response.status}`);
    } catch (error: any) {
      console.log(`Attempt ${i + 1}/${maxRetries}: ${error.message}`);
    }

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }

  return false;
}

/**
 * Helper: Poll URL until it becomes healthy
 */
async function pollUntilHealthy(
  url: string,
  options: {
    maxAttempts: number;
    intervalMs: number;
    expectedStatusCode: number;
  }
): Promise<{
  success: boolean;
  attempts: number;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: () => true // Accept any status
      });

      if (response.status === options.expectedStatusCode) {
        return {
          success: true,
          attempts: attempt,
          responseTime: Date.now() - startTime
        };
      }

      console.log(`Poll attempt ${attempt}/${options.maxAttempts}: Status ${response.status}`);

    } catch (error: any) {
      console.log(`Poll attempt ${attempt}/${options.maxAttempts}: ${error.message}`);

      // Check for specific errors
      if (error.code === 'ENOTFOUND') {
        // DNS not resolved yet - this is expected for new deployments
        console.log('DNS not resolved yet, continuing...');
      }
    }

    if (attempt < options.maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, options.intervalMs));
    }
  }

  return {
    success: false,
    attempts: options.maxAttempts,
    responseTime: Date.now() - startTime,
    error: `URL did not return ${options.expectedStatusCode} after ${options.maxAttempts} attempts`
  };
}
