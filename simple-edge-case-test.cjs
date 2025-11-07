#!/usr/bin/env node

/**
 * Simple edge case testing using curl and direct API calls
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';

// Test URLs that might cause issues
const TEST_URLS = [
  // Invalid entity IDs
  'http://localhost:5173/#/authors/invalid',
  'http://localhost:5173/#/authors/A123',
  'http://localhost:5173/#/authors/A',
  'http://localhost:5173/#/works/W',
  'http://localhost:5173/#/works/W123',

  // Invalid entity types
  'http://localhost:5173/#/invalid/W1234567890',
  'http://localhost:5173/#/unknown/W1234567890',

  // Special characters
  'http://localhost:5173/#/search?q=%F0%9F%98%80', // Emoji
  'http://localhost:5173/#/search?q=%3Cscript%3E', // Script tag
  'http://localhost:5173/#/search?q=' + encodeURIComponent("' OR '1'='1"),

  // Valid URLs for comparison
  'http://localhost:5173/#/',
  'http://localhost:5173/#/authors/A5017898742',
  'http://localhost:5173/#/search?q=machine%20learning',
];

async function testUrlResponse(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const request = http.get(url, (response) => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        resolve({
          url,
          status: response.statusCode,
          statusText: response.statusMessage,
          responseTime: Date.now() - startTime,
          contentLength: data.length,
          success: response.statusCode >= 200 && response.statusCode < 400
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        url,
        error: error.message,
        responseTime: Date.now() - startTime,
        success: false
      });
    });

    request.setTimeout(10000, () => {
      request.destroy();
      resolve({
        url,
        error: 'Timeout after 10 seconds',
        responseTime: 10000,
        success: false
      });
    });
  });
}

async function runEdgeCaseTests() {
  console.log('🧪 Running Simple Edge Case Tests...\n');

  const results = [];

  for (const url of TEST_URLS) {
    console.log(`📍 Testing: ${url}`);
    const result = await testUrlResponse(url);
    results.push(result);

    if (result.success) {
      console.log(`  ✅ ${result.status} ${result.statusText} (${result.responseTime}ms)`);
    } else {
      console.log(`  ❌ ${result.error || `${result.status} ${result.statusText}`} (${result.responseTime}ms)`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 EDGE CASE TEST RESULTS');
  console.log('='.repeat(50));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const averageResponseTime = results.filter(r => r.responseTime).reduce((sum, r) => sum + r.responseTime, 0) / results.length;

  console.log(`\n📈 SUMMARY:`);
  console.log(`  Total Tests: ${results.length}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Average Response Time: ${averageResponseTime.toFixed(2)}ms`);

  console.log(`\n❌ FAILED TESTS:`);
  results.filter(r => !r.success).forEach(result => {
    console.log(`  - ${result.url}`);
    console.log(`    ${result.error || `${result.status} ${result.statusText}`}`);
  });

  console.log(`\n✅ SUCCESSFUL TESTS:`);
  results.filter(r => r.success).forEach(result => {
    console.log(`  - ${result.url} (${result.status})`);
  });

  // Save results
  const reportPath = `simple-edge-case-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to: ${reportPath}`);

  return results;
}

// Check if application is running first
async function checkAppHealth() {
  try {
    const result = await testUrlResponse('http://localhost:5173/');
    return result.success;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🏥 Checking application health...');

  const isHealthy = await checkAppHealth();
  if (!isHealthy) {
    console.error('❌ Application is not responding at http://localhost:5173');
    console.error('Please make sure the development server is running with: pnpm dev');
    process.exit(1);
  }

  console.log('✅ Application is healthy\n');

  try {
    const results = await runEdgeCaseTests();

    const failureRate = results.filter(r => !r.success).length / results.length;

    if (failureRate > 0.5) {
      console.log('\n⚠️  HIGH FAILURE RATE - Significant edge case handling issues detected');
      process.exit(1);
    } else if (failureRate > 0) {
      console.log('\n⚠️  SOME FAILURES - Edge case handling needs improvement');
      process.exit(1);
    } else {
      console.log('\n✅ ALL TESTS PASSED - Edge cases handled well');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Edge case testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runEdgeCaseTests, checkAppHealth };