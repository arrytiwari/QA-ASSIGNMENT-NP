/**
 * K6 Load Testing Script for AutoGen
 * Tests deployment API performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const deploymentSuccessRate = new Rate('deployment_success');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Spike to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.01'],     // Error rate should be less than 1%
    errors: ['rate<0.05'],              // Custom error rate < 5%
    deployment_success: ['rate>0.95'],  // Deployment success rate > 95%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://autogen.nodeops.network';
const API_URL = __ENV.API_BASE_URL || 'https://api.autogen.nodeops.network';

export default function () {
  // Test 1: Landing page load
  testLandingPage();

  sleep(1);

  // Test 2: Authentication endpoint
  testAuthentication();

  sleep(2);

  // Test 3: Deployment status check
  testDeploymentStatus();

  sleep(1);
}

function testLandingPage() {
  const response = http.get(BASE_URL);

  const success = check(response, {
    'landing page status is 200': (r) => r.status === 200,
    'landing page loads in < 2s': (r) => r.timings.duration < 2000,
    'landing page has content': (r) => r.body.length > 0,
  });

  errorRate.add(!success);
}

function testAuthentication() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Note: This is a placeholder - actual auth endpoint may differ
  const response = http.get(`${BASE_URL}/api/auth/session`, params);

  const success = check(response, {
    'auth endpoint responds': (r) => r.status === 200 || r.status === 401,
    'auth response time < 1s': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
}

function testDeploymentStatus() {
  // Simulate checking deployment status
  // In a real scenario, this would check an actual deployment

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Add auth token here if needed
      // 'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  // Note: Replace with actual API endpoint
  const response = http.get(`${BASE_URL}/api/deployments`, params);

  const success = check(response, {
    'deployment API responds': (r) => r.status === 200 || r.status === 401 || r.status === 404,
    'deployment response time < 3s': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);

  if (response.status === 200) {
    deploymentSuccessRate.add(true);
  } else {
    deploymentSuccessRate.add(false);
  }
}

// Setup function - runs once at the beginning
export function setup() {
  console.log('🚀 Starting load test for AutoGen');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  console.log('');
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('');
  console.log('✅ Load test completed');
}
