import { test, expect } from '@playwright/test';

/**
 * SAMPLE TESTS FOR AUTHENTICATED PAGES
 *
 * These tests demonstrate how to test authenticated routes like:
 * - /projects (projects listing)
 * - /dashboard (user dashboard)
 * - /projects/{id} (individual project pages)
 *
 * NOTE: Currently written for demonstration purposes
 * These pages require valid authentication credentials to access
 *
 * To use these tests in production:
 * 1. Set up authentication in beforeEach hook
 * 2. Add TEST_USER_EMAIL and TEST_USER_PASSWORD to .env
 * 3. Uncomment the authentication code below
 */

test.describe('Authenticated Pages - Sample Tests', () => {

  test.beforeEach(async ({ page }) => {
    // AUTHENTICATION REQUIRED
    // Uncomment and implement one of these methods:

    // Method 1: If you have an auth token
    // await page.goto('/');
    // await page.evaluate((token) => {
    //   localStorage.setItem('auth_token', token);
    // }, process.env.TEST_AUTH_TOKEN);

    // Method 2: Manual login
    // await page.goto('/login');
    // await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL);
    // await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
    // await page.click('button[type="submit"]');
    // await page.waitForURL(/dashboard|projects/);
  });

  test('SAMPLE: Test /projects page for deployment status', async ({ page }) => {
    // Navigate to projects listing page
    const response = await page.goto('https://autogen.nodeops.network/projects');

    // Check if redirected to login (expected without auth)
    const currentUrl = page.url();

    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('⚠️  Redirected to login - Authentication required');
      console.log('   This is expected behavior without credentials');
      test.skip();
      return;
    }

    // If authenticated, test the page
    console.log(`✓ Projects page loaded: ${currentUrl}`);

    // Look for project cards
    const projectCards = page.locator('[data-testid*="project"], [class*="project-card"], article, [role="article"]');
    const count = await projectCards.count();
    console.log(`Found ${count} potential project elements`);

    // Check for deployment status indicators
    const statusElements = await page.locator('text=Active, text=Deploying, text=Failed, text=Building').count();
    console.log(`Found ${statusElements} status indicators`);

    // Look for the problematic "Deployment X of Y" messages
    const pageContent = await page.content();
    const hasProblematicPattern = /deployment\s+\d+\s+of\s+\d+/i.test(pageContent);

    if (hasProblematicPattern) {
      console.warn('❌ Found "Deployment X of Y" pattern - should be replaced with contextual messages');
    } else {
      console.log('✓ No problematic deployment messages found');
    }
  });

  test('SAMPLE: Test /dashboard for performance and loading', async ({ page }) => {
    const response = await page.goto('https://autogen.nodeops.network/dashboard');

    const currentUrl = page.url();

    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('⚠️  Redirected to login - Authentication required');
      test.skip();
      return;
    }

    console.log(`✓ Dashboard loaded: ${currentUrl}`);

    // Measure dashboard load time
    const loadTime = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return timing.loadEventEnd - timing.fetchStart;
    });

    console.log(`Dashboard load time: ${loadTime}ms`);

    if (loadTime > 3000) {
      console.warn(`⚠️  Dashboard load time (${loadTime}ms) exceeds 3 second target`);
    } else {
      console.log('✓ Dashboard loads within acceptable time');
    }

    // Check for loading states
    const hasLoadingIndicator = await page.locator('[role="progressbar"], .loading, .spinner, [data-loading]').count() > 0;
    console.log(`Loading indicators present: ${hasLoadingIndicator}`);
  });

  test('SAMPLE: Test individual project page /projects/{id}', async ({ page }) => {
    // Example project ID (replace with actual ID when authenticated)
    const projectId = '8f53943f-312e-4af2-bb14-5863ca5ce89f';

    const response = await page.goto(`https://autogen.nodeops.network/projects/${projectId}`);

    const currentUrl = page.url();

    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('⚠️  Redirected to login - Authentication required');
      test.skip();
      return;
    }

    if (response?.status() === 404) {
      console.log('⚠️  Project not found (404) - Expected without valid project access');
      test.skip();
      return;
    }

    console.log(`✓ Project page loaded: ${currentUrl}`);

    // Check for deployment status messages
    const statusMessages = [
      'Deploying',
      'Building',
      'Active',
      'Failed',
      'deployment 1 of 2',
      'deployment 2 of 2'
    ];

    for (const message of statusMessages) {
      const exists = await page.locator(`text=${message}`).count() > 0;
      if (exists) {
        console.log(`Found status message: "${message}"`);

        // Flag problematic messages
        if (message.includes('of')) {
          console.warn(`❌ ISSUE: "${message}" is not user-friendly`);
          console.warn(`   Recommendation: Replace with "Building Application" or "Deploying to Infrastructure"`);
        }
      }
    }
  });

  test('SAMPLE: Check for deployment URL accessibility on project page', async ({ page }) => {
    const projectId = '8f53943f-312e-4af2-bb14-5863ca5ce89f';

    await page.goto(`https://autogen.nodeops.network/projects/${projectId}`);

    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('404')) {
      console.log('⚠️  Cannot access project page - Authentication or permission required');
      test.skip();
      return;
    }

    // Find all deployment URLs
    const links = await page.locator('a[href*="autogen.network"], a[href*="nodeops.network"]').all();

    console.log(`Found ${links.length} potential deployment URLs`);

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (!href) continue;

      console.log(`\nChecking deployment URL: ${href}`);

      // Check if link is disabled/grayed out
      const isDisabled = await link.getAttribute('aria-disabled') === 'true';
      const classes = await link.getAttribute('class') || '';
      const isGrayedOut = classes.includes('disabled') || classes.includes('inactive');

      console.log(`  - Is disabled: ${isDisabled}`);
      console.log(`  - Appears grayed out: ${isGrayedOut}`);

      // Try to access the URL
      try {
        const response = await page.request.get(href, { timeout: 5000 });
        const status = response.status();

        console.log(`  - HTTP Status: ${status}`);

        if (status === 404 || status === 502 || status === 503) {
          if (!isDisabled && !isGrayedOut) {
            console.warn(`  ❌ ISSUE: URL returns ${status} but link is clickable!`);
            console.warn(`     Recommendation: Gray out URL until health check passes`);
          } else {
            console.log(`  ✓ URL properly disabled while not ready`);
          }
        } else if (status >= 200 && status < 300) {
          console.log(`  ✓ Deployment URL is accessible`);
        }
      } catch (error) {
        console.log(`  - URL not accessible (DNS/network error)`);
      }
    }
  });

  test('SAMPLE: Check for real-time build logs', async ({ page }) => {
    const projectId = '8f53943f-312e-4af2-bb14-5863ca5ce89f';

    await page.goto(`https://autogen.nodeops.network/projects/${projectId}`);

    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('⚠️  Authentication required');
      test.skip();
      return;
    }

    // Look for log viewer
    const logElements = [
      'text=View Logs',
      'text=Build Logs',
      'text=Deployment Logs',
      '[data-testid*="logs"]',
      'pre',
      'code'
    ];

    let foundLogs = false;
    for (const selector of logElements) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✓ Found log element: ${selector} (${count})`);
        foundLogs = true;
      }
    }

    if (!foundLogs) {
      console.warn('❌ ISSUE: No build logs found');
      console.warn('   Recommendation: Add real-time build log streaming');
    } else {
      console.log('✓ Build logs are accessible');

      // Check if logs are streaming (WebSocket connection)
      page.on('websocket', ws => {
        console.log('✓ WebSocket connection detected - logs may be streaming');
      });

      await page.waitForTimeout(2000);
    }
  });

  test('SAMPLE: Check for deployment history and rollback', async ({ page }) => {
    const projectId = '8f53943f-312e-4af2-bb14-5863ca5ce89f';

    await page.goto(`https://autogen.nodeops.network/projects/${projectId}`);

    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('⚠️  Authentication required');
      test.skip();
      return;
    }

    // Look for deployment history
    const historyElements = [
      'text=History',
      'text=Deployment History',
      'text=Previous Deployments',
      'text=Rollback',
      '[data-testid*="history"]'
    ];

    let foundHistory = false;
    for (const selector of historyElements) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✓ Found history element: ${selector}`);
        foundHistory = true;
      }
    }

    if (!foundHistory) {
      console.warn('❌ ISSUE: No deployment history found');
      console.warn('   Recommendation: Add deployment history with rollback capability');
    } else {
      console.log('✓ Deployment history available');
    }
  });

  test('SAMPLE: Performance test - Check for frontend state delays', async ({ page }) => {
    const projectId = '8f53943f-312e-4af2-bb14-5863ca5ce89f';

    await page.goto(`https://autogen.nodeops.network/projects/${projectId}`);

    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('⚠️  Authentication required');
      test.skip();
      return;
    }

    // Monitor state changes by tracking DOM mutations
    const stateChanges: string[] = [];

    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.target instanceof Element) {
            const text = mutation.target.textContent?.substring(0, 50);
            if (text?.includes('deploy') || text?.includes('status')) {
              console.log('State change detected:', text);
            }
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });

    // Wait for potential state changes
    await page.waitForTimeout(5000);

    console.log('✓ Monitoring for state change delays');
    console.log('   In production, this would track deployment status updates');
  });
});
