#!/usr/bin/env node

/**
 * Manual Edge Case Testing Script
 * Tests specific edge cases with detailed analysis
 */

const http = require('http');
const fs = require('fs');

const TEST_CASES = [
  {
    name: "Invalid Author ID - Too Short",
    url: "http://localhost:5173/#/authors/A123",
    expected: "Should show error state or loading state"
  },
  {
    name: "Invalid Author ID - Non-existent",
    url: "http://localhost:5173/#/authors/A9999999999",
    expected: "Should show error state for non-existent entity"
  },
  {
    name: "Invalid Author ID - Invalid Format",
    url: "http://localhost:5173/#/authors/INVALID_ID",
    expected: "Should handle gracefully without crashing"
  },
  {
    name: "Malformed Work ID",
    url: "http://localhost:5173/#/works/W_TOO_SHORT",
    expected: "Should show error state"
  },
  {
    name: "Invalid Entity Type",
    url: "http://localhost:5173/#/unknown/W1234567890",
    expected: "Should fall back to 404 or show not found"
  },
  {
    name: "Empty Search Query",
    url: "http://localhost:5173/#/search?q=",
    expected: "Should handle empty search gracefully"
  },
  {
    name: "Long Search Query",
    url: "http://localhost:5173/#/search?q=" + "x".repeat(200),
    expected: "Should handle very long queries"
  },
  {
    name: "Special Characters in Search",
    url: "http://localhost:5173/#/search?q=" + encodeURIComponent("<script>alert('xss')</script>"),
    expected: "Should sanitize or safely handle script tags"
  },
  {
    name: "SQL Injection Attempt",
    url: "http://localhost:5173/#/search?q=" + encodeURIComponent("' OR '1'='1"),
    expected: "Should safely handle SQL injection attempts"
  },
  {
    name: "URL Encoding Edge Cases",
    url: "http://localhost:5173/#/search?q=" + encodeURIComponent("%00%01%02"),
    expected: "Should handle binary/null characters safely"
  },
  {
    name: "Valid Author (Control Test)",
    url: "http://localhost:5173/#/authors/A5017898742",
    expected: "Should load successfully"
  },
  {
    name: "Valid Search (Control Test)",
    url: "http://localhost:5173/#/search?q=machine learning",
    expected: "Should load successfully"
  }
];

function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`📍 Testing: ${url}`);

    const startTime = Date.now();
    const request = http.get(url, (response) => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        const responseTime = Date.now() - startTime;
        const contentPreview = data.substring(0, 1000).replace(/\s+/g, ' ').trim();

        resolve({
          url,
          status: response.statusCode,
          responseTime,
          contentLength: data.length,
          contentPreview,
          success: response.statusCode >= 200 && response.statusCode < 400,
          hasErrorContent: data.toLowerCase().includes('error') ||
                           data.toLowerCase().includes('not found') ||
                           data.toLowerCase().includes('failed'),
          hasReactContent: data.includes('react') || data.includes('__NEXT_DATA__') || data.includes('data-testid'),
          isHtmlPage: data.includes('<html') && data.includes('</html>')
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

    request.setTimeout(15000, () => {
      request.destroy();
      resolve({
        url,
        error: 'Timeout after 15 seconds',
        responseTime: 15000,
        success: false
      });
    });
  });
}

async function runTests() {
  console.log('🧪 Manual Edge Case Testing\n');
  console.log('This test will examine responses to identify error handling patterns\n');

  const results = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`🔗 URL: ${testCase.url}`);
    console.log(`💡 Expected: ${testCase.expected}`);

    const result = await testUrl(testCase.url);
    result.testCase = testCase.name;
    result.expected = testCase.expected;
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.status} - ${result.responseTime}ms - ${result.contentLength} bytes`);
      console.log(`📄 Content type: HTML${result.isHtmlPage ? ' page' : ' content'}`);
      console.log(`🚨 Error indicators: ${result.hasErrorContent ? 'YES' : 'NO'}`);
      console.log(`⚛️  React content: ${result.hasReactContent ? 'YES' : 'NO'}`);
      if (result.contentPreview) {
        console.log(`📝 Content preview: ${result.contentPreview.substring(0, 200)}...`);
      }
    } else {
      console.log(`❌ Failed: ${result.error} (${result.responseTime}ms)`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

function analyzeResults(results) {
  console.log('\n📊 ANALYSIS RESULTS');
  console.log('='.repeat(50));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const withErrorContent = results.filter(r => r.hasErrorContent);
  const controlTests = results.filter(r => r.testCase.includes('Control Test'));
  const edgeCases = results.filter(r => !r.testCase.includes('Control Test'));

  console.log(`\n📈 SUMMARY:`);
  console.log(`  Total tests: ${results.length}`);
  console.log(`  Successful HTTP responses: ${successful.length}`);
  console.log(`  Failed HTTP responses: ${failed.length}`);
  console.log(`  Responses with error indicators: ${withErrorContent.length}`);
  console.log(`  Control tests (should pass): ${controlTests.length}`);
  console.log(`  Edge cases (testing error handling): ${edgeCases.length}`);

  console.log(`\n🎯 CONTROL TEST RESULTS:`);
  controlTests.forEach(result => {
    console.log(`  ${result.testCase}: ${result.success ? '✅ PASS' : '❌ FAIL'} (${result.status})`);
  });

  console.log(`\n🚨 EDGE CASE ANALYSIS:`);
  edgeCases.forEach(result => {
    const status = result.success ?
      (result.hasErrorContent ? '⚠️  SUCCESS_WITH_ERROR_HANDLING' : '✅ SUCCESS_NO_ERROR') :
      '❌ FAILED';
    console.log(`  ${result.testCase}: ${status} (${result.status || 'ERROR'})`);
  });

  // Identify issues
  const issues = [];

  if (failed.length > 0) {
    issues.push(`${failed.length} tests failed at HTTP level`);
  }

  if (controlTests.some(t => !t.success)) {
    issues.push('Control tests failed - basic functionality broken');
  }

  if (edgeCases.every(t => t.success && !t.hasErrorContent)) {
    issues.push('No error indicators found in edge cases - may lack error handling');
  }

  if (issues.length > 0) {
    console.log(`\n❌ ISSUES IDENTIFIED:`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log(`\n✅ NO CRITICAL ISSUES IDENTIFIED`);
  }

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);

  if (edgeCases.some(t => !t.hasErrorContent && t.success)) {
    console.log(`  - Consider adding more explicit error handling for malformed URLs`);
  }

  if (withErrorContent.length > 0) {
    console.log(`  - Error content is being displayed appropriately`);
  } else {
    console.log(`  - Consider adding user-friendly error messages for invalid requests`);
  }

  console.log(`  - Ensure all edge cases return meaningful responses`);
  console.log(`  - Consider adding rate limiting for rapid requests`);
  console.log(`  - Monitor for potential infinite loading scenarios`);

  return {
    summary: {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      withErrorContent: withErrorContent.length
    },
    issues,
    recommendations: [
      'Add timeout handling for requests that might hang',
      'Implement better error boundaries for client-side errors',
      'Add validation for malformed entity IDs',
      'Consider adding loading indicators for all async operations',
      'Test with network throttling to ensure timeout handling works'
    ]
  };
}

async function main() {
  try {
    console.log('🏥 Checking application health...\n');

    // Basic health check
    const healthCheck = await testUrl('http://localhost:5173/');
    if (!healthCheck.success) {
      console.error('❌ Application is not responding');
      process.exit(1);
    }

    console.log('✅ Application is healthy\n');

    const results = await runTests();
    const analysis = analyzeResults(results);

    // Save detailed results
    const reportPath = `manual-edge-test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const reportData = {
      timestamp: new Date().toISOString(),
      results,
      analysis
    };

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);

    // Exit with appropriate code
    if (analysis.issues.length > 0) {
      console.log('\n⚠️  Issues found - review recommendations');
      process.exit(1);
    } else {
      console.log('\n✅ Manual edge case testing completed successfully');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Manual edge case testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runTests, analyzeResults };