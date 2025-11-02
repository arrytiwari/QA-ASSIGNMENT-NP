import { test, expect } from '@playwright/test';

/**
 * TC-003: Core Web Vitals Validation
 * TC-004: JavaScript Bundle Size Analysis
 * Tests for loading speed and performance optimization
 */

test.describe('Page Load Performance', () => {

  test('TC-003: Measure Core Web Vitals on landing page', async ({ page }) => {
    // Navigate to the page
    await page.goto('/', { waitUntil: 'networkidle' });

    // Collect Web Vitals metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};

        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID) - needs user interaction
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            vitals.fid = entry.processingStart - entry.startTime;
          });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsScore = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
          vitals.cls = clsScore;
        }).observe({ entryTypes: ['layout-shift'] });

        // First Contentful Paint (FCP)
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        vitals.fcp = fcpEntry ? fcpEntry.startTime : null;

        // Time to Interactive (TTI) approximation
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        vitals.tti = navTiming.domInteractive;
        vitals.loadTime = navTiming.loadEventEnd - navTiming.fetchStart;

        // Wait a bit for metrics to be collected
        setTimeout(() => resolve(vitals), 3000);
      });
    });

    console.log('Core Web Vitals:', metrics);

    // Define thresholds (Google's recommendations)
    const thresholds = {
      lcp: 2500,  // Good: < 2.5s
      fid: 100,   // Good: < 100ms
      cls: 0.1,   // Good: < 0.1
      fcp: 1800,  // Good: < 1.8s
      tti: 3800   // Good: < 3.8s
    };

    // Validate metrics
    if (metrics.lcp) {
      console.log(`✓ LCP: ${metrics.lcp.toFixed(2)}ms (threshold: ${thresholds.lcp}ms)`);
      if (metrics.lcp > thresholds.lcp) {
        console.warn(`⚠️  LCP exceeds threshold by ${(metrics.lcp - thresholds.lcp).toFixed(2)}ms`);
      }
    }

    if (metrics.fcp) {
      console.log(`✓ FCP: ${metrics.fcp.toFixed(2)}ms (threshold: ${thresholds.fcp}ms)`);
      if (metrics.fcp > thresholds.fcp) {
        console.warn(`⚠️  FCP exceeds threshold by ${(metrics.fcp - thresholds.fcp).toFixed(2)}ms`);
      }
    }

    if (metrics.cls !== undefined) {
      console.log(`✓ CLS: ${metrics.cls.toFixed(3)} (threshold: ${thresholds.cls})`);
      if (metrics.cls > thresholds.cls) {
        console.warn(`⚠️  CLS exceeds threshold by ${(metrics.cls - thresholds.cls).toFixed(3)}`);
      }
    }

    if (metrics.tti) {
      console.log(`✓ TTI: ${metrics.tti.toFixed(2)}ms (threshold: ${thresholds.tti}ms)`);
    }

    console.log(`✓ Total Load Time: ${metrics.loadTime.toFixed(2)}ms`);

    // Assertions (can be made stricter or looser based on requirements)
    expect(metrics.loadTime).toBeLessThan(10000); // Page should load in < 10s
  });

  test('TC-003.1: Performance on slow 3G network', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Add 500ms latency
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    console.log(`Load time on slow 3G: ${loadTime}ms`);

    // On slow network, page should still be usable within 15 seconds
    expect(loadTime).toBeLessThan(15000);
  });

  test('TC-004: Analyze JavaScript bundle size', async ({ page }) => {
    // Track all JavaScript files loaded
    const jsResources: Array<{ url: string; size: number; duration: number }> = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('javascript') || url.endsWith('.js')) {
        const buffer = await response.body().catch(() => null);

        jsResources.push({
          url: url,
          size: buffer ? buffer.length : 0,
          duration: 0 // Duration tracking would require performance API
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Calculate total JS size
    const totalJsSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
    const totalJsSizeKB = (totalJsSize / 1024).toFixed(2);
    const totalJsSizeMB = (totalJsSize / (1024 * 1024)).toFixed(2);

    console.log(`\n📦 JavaScript Bundle Analysis:`);
    console.log(`Total JS files loaded: ${jsResources.length}`);
    console.log(`Total JS size: ${totalJsSizeKB} KB (${totalJsSizeMB} MB)`);

    // List largest bundles
    const sortedResources = jsResources.sort((a, b) => b.size - a.size);
    console.log(`\n🔍 Largest JavaScript files:`);

    sortedResources.slice(0, 10).forEach((resource, index) => {
      const sizeKB = (resource.size / 1024).toFixed(2);
      const filename = resource.url.split('/').pop() || resource.url;
      console.log(`${index + 1}. ${filename} - ${sizeKB} KB`);
    });

    // Check for potential issues
    const largeFiles = sortedResources.filter(r => r.size > 200 * 1024); // > 200KB

    if (largeFiles.length > 0) {
      console.warn(`\n⚠️  Found ${largeFiles.length} JavaScript files larger than 200KB:`);
      largeFiles.forEach(file => {
        const sizeKB = (file.size / 1024).toFixed(2);
        const filename = file.url.split('/').pop() || file.url;
        console.warn(`   - ${filename}: ${sizeKB} KB`);
      });
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (totalJsSize > 500 * 1024) {
      console.log(`   - Total JS size (${totalJsSizeKB} KB) is large. Consider code splitting.`);
    }
    if (jsResources.length > 20) {
      console.log(`   - ${jsResources.length} JS files loaded. Consider bundling or HTTP/2 optimization.`);
    }

    // Assert reasonable limits
    expect(totalJsSize).toBeLessThan(2 * 1024 * 1024); // Total JS < 2MB
  });

  test('TC-005: Image optimization check', async ({ page }) => {
    // Track all image resources
    const imageResources: Array<{ url: string; size: number; type: string }> = [];

    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.startsWith('image/')) {
        const buffer = await response.body().catch(() => null);

        imageResources.push({
          url: url,
          size: buffer ? buffer.length : 0,
          type: contentType
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    const totalImageSize = imageResources.reduce((sum, img) => sum + img.size, 0);
    const totalImageSizeKB = (totalImageSize / 1024).toFixed(2);

    console.log(`\n🖼️  Image Analysis:`);
    console.log(`Total images loaded: ${imageResources.length}`);
    console.log(`Total image size: ${totalImageSizeKB} KB`);

    // Check for modern image formats
    const webpImages = imageResources.filter(img => img.type.includes('webp'));
    const avifImages = imageResources.filter(img => img.type.includes('avif'));
    const jpegPngImages = imageResources.filter(img =>
      img.type.includes('jpeg') || img.type.includes('png')
    );

    console.log(`WebP images: ${webpImages.length}`);
    console.log(`AVIF images: ${avifImages.length}`);
    console.log(`JPEG/PNG images: ${jpegPngImages.length}`);

    // List large images
    const largeImages = imageResources.filter(img => img.size > 100 * 1024);
    if (largeImages.length > 0) {
      console.warn(`\n⚠️  Found ${largeImages.length} images larger than 100KB:`);
      largeImages.forEach(img => {
        const sizeKB = (img.size / 1024).toFixed(2);
        const filename = img.url.split('/').pop() || img.url;
        console.warn(`   - ${filename}: ${sizeKB} KB (${img.type})`);
      });
    }

    // Recommendations
    if (jpegPngImages.length > 0 && webpImages.length === 0) {
      console.log(`\n💡 Consider using WebP format for better compression`);
    }
  });

  test('TC-003.2: Measure time to interactive with user simulation', async ({ page }) => {
    await page.goto('/');

    // Measure when the page becomes interactive
    const interactivityMetrics = await page.evaluate(() => {
      return {
        domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
        domComplete: performance.timing.domComplete - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
      };
    });

    console.log('Interactivity Metrics:', interactivityMetrics);

    // Test actual interactivity by clicking a button
    const signUpButton = page.locator('text=Sign Up').first();
    if (await signUpButton.isVisible()) {
      const clickStartTime = Date.now();
      await signUpButton.click();
      const responseTime = Date.now() - clickStartTime;

      console.log(`Button response time: ${responseTime}ms`);

      // Log performance warning if slow
      if (responseTime > 500) {
        console.warn(`⚠️  Button response time (${responseTime}ms) exceeds recommended 500ms threshold`);
      } else {
        console.log(`✅ Button response time is good (<500ms)`);
      }

      // Soft assertion - don't fail the test, but verify it's responsive
      expect(responseTime).toBeLessThan(2000); // 2 second max
    }
  });
});
