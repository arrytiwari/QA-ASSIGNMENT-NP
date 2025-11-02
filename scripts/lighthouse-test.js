/**
 * Lighthouse Performance Testing Script
 * Runs automated Lighthouse audits and validates against thresholds
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  url: process.env.BASE_URL || 'https://autogen.nodeops.network',
  outputDir: path.join(__dirname, '../lighthouse-reports'),
  thresholds: {
    performance: 75,
    accessibility: 90,
    'best-practices': 80,
    seo: 80,
    lcp: 2500,      // Largest Contentful Paint (ms)
    fid: 100,       // First Input Delay (ms)
    cls: 0.1,       // Cumulative Layout Shift
    fcp: 1800,      // First Contentful Paint (ms)
    tti: 3800,      // Time to Interactive (ms)
  }
};

// Chrome flags for consistent testing
const chromeFlags = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage'
];

async function runLighthouse() {
  console.log('🚀 Starting Lighthouse audit...');
  console.log(`📍 URL: ${config.url}\n`);

  // Launch Chrome
  const chrome = await chromeLauncher.launch({ chromeFlags });

  // Lighthouse options
  const options = {
    logLevel: 'info',
    output: ['html', 'json'],
    port: chrome.port,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  };

  // Run Lighthouse
  const runnerResult = await lighthouse(config.url, options);

  // Extract results
  const { lhr } = runnerResult;

  // Create output directory
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  // Save reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlReport = runnerResult.report[0];
  const jsonReport = runnerResult.report[1];

  fs.writeFileSync(
    path.join(config.outputDir, `lighthouse-${timestamp}.html`),
    htmlReport
  );

  fs.writeFileSync(
    path.join(config.outputDir, `lighthouse-${timestamp}.json`),
    jsonReport
  );

  console.log(`📊 Reports saved to: ${config.outputDir}\n`);

  // Close Chrome
  await chrome.kill();

  // Analyze results
  analyzeResults(lhr);

  // Return exit code based on thresholds
  const passed = validateThresholds(lhr);
  return passed ? 0 : 1;
}

function analyzeResults(lhr) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📈 LIGHTHOUSE AUDIT RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Category scores
  console.log('📊 Category Scores:');
  console.log('─────────────────────────────────────────────────────\n');

  const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
  categories.forEach(category => {
    const score = lhr.categories[category].score * 100;
    const threshold = config.thresholds[category];
    const status = score >= threshold ? '✅' : '❌';
    const statusText = score >= threshold ? 'PASS' : 'FAIL';

    console.log(`${status} ${category.toUpperCase().padEnd(20)} ${score.toFixed(1)}% (threshold: ${threshold}%) [${statusText}]`);
  });

  // Core Web Vitals
  console.log('\n🌐 Core Web Vitals:');
  console.log('─────────────────────────────────────────────────────\n');

  const metrics = {
    'first-contentful-paint': 'FCP',
    'largest-contentful-paint': 'LCP',
    'total-blocking-time': 'TBT',
    'cumulative-layout-shift': 'CLS',
    'speed-index': 'Speed Index',
    'interactive': 'TTI'
  };

  Object.entries(metrics).forEach(([metricId, metricName]) => {
    const metric = lhr.audits[metricId];
    if (metric) {
      let value = metric.numericValue;
      let unit = metric.numericUnit;
      let displayValue = metric.displayValue;

      // Format value
      if (unit === 'millisecond') {
        value = Math.round(value);
        displayValue = `${value}ms`;
      } else {
        displayValue = value.toFixed(3);
      }

      // Check threshold
      let status = '✓';
      let thresholdText = '';

      if (metricId === 'largest-contentful-paint') {
        const threshold = config.thresholds.lcp;
        status = value <= threshold ? '✅' : '❌';
        thresholdText = `(threshold: ${threshold}ms)`;
      } else if (metricId === 'first-contentful-paint') {
        const threshold = config.thresholds.fcp;
        status = value <= threshold ? '✅' : '❌';
        thresholdText = `(threshold: ${threshold}ms)`;
      } else if (metricId === 'cumulative-layout-shift') {
        const threshold = config.thresholds.cls;
        status = value <= threshold ? '✅' : '❌';
        thresholdText = `(threshold: ${threshold})`;
      } else if (metricId === 'interactive') {
        const threshold = config.thresholds.tti;
        status = value <= threshold ? '✅' : '❌';
        thresholdText = `(threshold: ${threshold}ms)`;
      }

      console.log(`${status} ${metricName.padEnd(20)} ${displayValue} ${thresholdText}`);
    }
  });

  // Performance opportunities
  console.log('\n💡 Performance Opportunities:');
  console.log('─────────────────────────────────────────────────────\n');

  const opportunities = Object.values(lhr.audits).filter(
    audit => audit.details && audit.details.type === 'opportunity' && audit.score < 1
  );

  if (opportunities.length > 0) {
    opportunities
      .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
      .slice(0, 5)
      .forEach((opportunity, index) => {
        const savings = opportunity.displayValue || 'N/A';
        console.log(`${index + 1}. ${opportunity.title}`);
        console.log(`   Potential savings: ${savings}\n`);
      });
  } else {
    console.log('✨ No major performance opportunities found!\n');
  }

  // Diagnostics
  console.log('🔍 Diagnostics:');
  console.log('─────────────────────────────────────────────────────\n');

  const diagnostics = [
    'network-requests',
    'main-thread-tasks',
    'bootup-time',
    'uses-responsive-images',
    'unminified-javascript',
    'unused-javascript'
  ];

  diagnostics.forEach(diagId => {
    const diag = lhr.audits[diagId];
    if (diag && diag.score !== null && diag.score < 1) {
      const status = diag.score >= 0.9 ? '⚠️' : '❌';
      console.log(`${status} ${diag.title}`);
      if (diag.displayValue) {
        console.log(`   ${diag.displayValue}\n`);
      }
    }
  });

  console.log('═══════════════════════════════════════════════════════\n');
}

function validateThresholds(lhr) {
  let passed = true;

  // Check category scores
  const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
  categories.forEach(category => {
    const score = lhr.categories[category].score * 100;
    const threshold = config.thresholds[category];
    if (score < threshold) {
      console.error(`❌ FAILED: ${category} score (${score.toFixed(1)}%) below threshold (${threshold}%)`);
      passed = false;
    }
  });

  // Check Core Web Vitals
  const lcp = lhr.audits['largest-contentful-paint'].numericValue;
  const fcp = lhr.audits['first-contentful-paint'].numericValue;
  const cls = lhr.audits['cumulative-layout-shift'].numericValue;
  const tti = lhr.audits['interactive'].numericValue;

  if (lcp > config.thresholds.lcp) {
    console.error(`❌ FAILED: LCP (${Math.round(lcp)}ms) exceeds threshold (${config.thresholds.lcp}ms)`);
    passed = false;
  }

  if (fcp > config.thresholds.fcp) {
    console.error(`❌ FAILED: FCP (${Math.round(fcp)}ms) exceeds threshold (${config.thresholds.fcp}ms)`);
    passed = false;
  }

  if (cls > config.thresholds.cls) {
    console.error(`❌ FAILED: CLS (${cls.toFixed(3)}) exceeds threshold (${config.thresholds.cls})`);
    passed = false;
  }

  if (tti > config.thresholds.tti) {
    console.error(`❌ FAILED: TTI (${Math.round(tti)}ms) exceeds threshold (${config.thresholds.tti}ms)`);
    passed = false;
  }

  if (passed) {
    console.log('✅ All thresholds passed!\n');
  } else {
    console.log('\n❌ Some thresholds failed. See details above.\n');
  }

  return passed;
}

// Run the audit
runLighthouse()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(err => {
    console.error('Error running Lighthouse:', err);
    process.exit(1);
  });
