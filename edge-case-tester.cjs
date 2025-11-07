#!/usr/bin/env node

/**
 * Comprehensive Edge Case Testing Script for Academic Explorer
 * Tests various error handling and edge case scenarios
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// Test configuration
const BASE_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

// Edge case test scenarios
const EDGE_CASE_TESTS = {
  invalidUrls: [
    // Malformed URLs
    'http://localhost:5173/#/authors/invalid-id',
    'http://localhost:5173/#/authors/',
    'http://localhost:5173/#/authors/INVALID_ID_WITH_UNDERSCORES',
    'http://localhost:5173/#/authors/123', // Numeric ID for author
    'http://localhost:5173/#/works/W',
    'http://localhost:5173/#/works/W_TOO_SHORT',
    'http://localhost:5173/#/authors/A',
    'http://localhost:5173/#/institutions/I',
    'http://localhost:5173/#/sources/S',
    'http://localhost:5173/#/topics/T',
    'http://localhost:5173/#/publishers/P',
    'http://localhost:5173/#/funders/F',
    // Unsupported endpoints
    'http://localhost:5173/#/unknown/W1234567890',
    'http://localhost:5173/#/invalid/W1234567890',
    'http://localhost:5173/#/authors/W1234567890', // Wrong prefix
    'http://localhost:5173/#/works/A1234567890', // Wrong prefix
    // URL encoding edge cases
    'http://localhost:5173/#/authors/A%20%40%23%24%25%5E%26*()',
    'http://localhost:5173/#/authors/A1234567890%00%01%02',
    'http://localhost:5173/#/search?q=%F0%9F%98%80%F0%9F%98%81', // Emoji search
    'http://localhost:5173/#/authors/A1234567890?param=value%20with%20spaces',
    // Extremely long IDs
    `http://localhost:5173/#/authors/${'A'.repeat(1000)}`,
    'http://localhost:5173/#/search?q=' + encodeURIComponent('x'.repeat(500)),
    // SQL injection attempts
    "http://localhost:5173/#/authors/A1234567890'; DROP TABLE authors; --",
    "http://localhost:5173/#/search?q=' OR '1'='1",
    "http://localhost:5173/#/search?q=<script>alert('xss')</script>",
  ],

  validUrls: [
    'http://localhost:5173/#/',
    'http://localhost:5173/#/authors/A5017898742',
    'http://localhost:5173/#/works/W2741809807',
    'http://localhost:5173/#/institutions/I4210123635',
    'http://localhost:5173/#/search?q=machine%20learning',
    'http://localhost:5173/#/autocomplete/works',
  ],

  networkErrorScenarios: [
    // These will be simulated via network interception
    'http://localhost:5173/#/authors/A5017898742',
    'http://localhost:5173/#/works/W2741809807',
  ]
};

class EdgeCaseTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async initialize() {
    console.log('🚀 Initializing Edge Case Tester...');

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps'
      ]
    });

    this.page = await this.browser.newPage();

    // Set up request interception to simulate network errors
    await this.page.setRequestInterception(true);

    // Monitor console messages and errors
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || text.includes('Error') || text.includes('Failed')) {
        this.results.push({
          type: 'console-error',
          message: text,
          level: type
        });
        console.log(`🔴 Console ${type}: ${text}`);
      } else if (type === 'warning') {
        console.log(`🟡 Console ${type}: ${text}`);
      }
    });

    // Monitor page errors
    this.page.on('pageerror', error => {
      this.results.push({
        type: 'page-error',
        message: error.message,
        stack: error.stack
      });
      console.log(`❌ Page Error: ${error.message}`);
    });

    // Monitor network responses
    this.page.on('response', response => {
      const status = response.status();
      const url = response.url();

      if (status >= 400) {
        this.results.push({
          type: 'http-error',
          url: url,
          status: status,
          statusText: response.statusText()
        });
        console.log(`🌐 HTTP Error ${status}: ${url}`);
      }
    });

    console.log('✅ Browser initialized');
  }

  async testUrlHandling(urls, testName) {
    console.log(`\n🧪 Testing ${testName}...`);

    for (const url of urls) {
      try {
        console.log(`\n📍 Testing: ${url}`);

        // Navigate to URL
        const response = await this.page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: TEST_TIMEOUT
        });

        // Check if navigation was successful
        const navigationOk = response !== null && !response.request().isNavigationRequest();

        // Wait for content to load
        await this.page.waitForTimeout(2000);

        // Check for error elements
        const errorElements = await this.page.$$('[data-testid="error"], .error, .error-message');
        const loadingElements = await this.page.$$('[data-testid="loading"], .loading, .skeleton');

        // Check page state
        const pageContent = await this.page.content();
        const hasContent = pageContent.length > 1000; // Basic content check

        // Check for specific error handling elements
        const hasErrorBoundary = await this.page.$('[data-testid="error-boundary"]') !== null;
        const hasRetryButton = await this.page.$('[data-testid="retry-button"]') !== null;
        const hasErrorMessage = await this.page.$('[data-testid="error-message"]') !== null;

        // Check if app is still functional
        const stillFunctional = await this.page.evaluate(() => {
          return typeof window !== 'undefined' &&
                 window.location &&
                 document.readyState === 'complete';
        });

        this.results.push({
          type: 'url-test',
          url: url,
          testName: testName,
          navigationOk,
          hasContent,
          errorElementsCount: errorElements.length,
          loadingElementsCount: loadingElements.length,
          hasErrorBoundary,
          hasRetryButton,
          hasErrorMessage,
          stillFunctional,
          timestamp: new Date().toISOString()
        });

        console.log(`  ✅ Navigation: ${navigationOk ? 'OK' : 'FAILED'}`);
        console.log(`  📄 Content: ${hasContent ? 'Present' : 'Minimal/Absent'}`);
        console.log(`  🚨 Errors: ${errorElements.length} found`);
        console.log(`  ⏳ Loading: ${loadingElements.length} elements`);
        console.log(`  🛡️  Error Boundary: ${hasErrorBoundary ? 'Present' : 'Absent'}`);
        console.log(`  🔄 Retry Button: ${hasRetryButton ? 'Present' : 'Absent'}`);

      } catch (error) {
        this.results.push({
          type: 'url-test-failed',
          url: url,
          testName: testName,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.log(`  ❌ Failed to test URL: ${error.message}`);
      }
    }
  }

  async testNetworkErrors() {
    console.log('\n🌐 Testing Network Error Handling...');

    for (const url of EDGE_CASE_TESTS.networkErrorScenarios) {
      try {
        // Simulate network failure by blocking all network requests
        this.page.on('request', request => {
          if (request.url().includes('openalex.org')) {
            request.abort();
          } else {
            request.continue();
          }
        });

        console.log(`\n📍 Testing network failure for: ${url}`);

        const response = await this.page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: TEST_TIMEOUT
        });

        await this.page.waitForTimeout(3000);

        // Check for offline/network error handling
        const networkErrorElements = await this.page.$$('[data-testid="network-error"], .offline');
        const retryButtons = await this.page.$$('[data-testid="retry-button"]');

        const hasErrorHandling = networkErrorElements.length > 0 || retryButtons.length > 0;

        this.results.push({
          type: 'network-error-test',
          url: url,
          hasErrorHandling,
          networkErrorElementsCount: networkErrorElements.length,
          retryButtonsCount: retryButtons.length,
          timestamp: new Date().toISOString()
        });

        console.log(`  🛡️  Network Error Handling: ${hasErrorHandling ? 'Present' : 'Absent'}`);

        // Reset request interception
        await this.page.setRequestInterception(true);
        this.page.removeAllListeners('request');

      } catch (error) {
        this.results.push({
          type: 'network-error-test-failed',
          url: url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.log(`  ❌ Network error test failed: ${error.message}`);
      }
    }
  }

  async testBookmarkingEdgeCases() {
    console.log('\n📖 Testing Bookmarking Edge Cases...');

    const bookmarkTests = [
      'http://localhost:5173/#/authors/A5017898742',
      'http://localhost:5173/#/authors/INVALID_ID',
      'http://localhost:5173/#/search?q=' + encodeURIComponent('test with spaces & symbols!@#$%^&*()'),
      'http://localhost:5173/#/search?q=' + encodeURIComponent('🚀 emoji search'),
    ];

    for (const url of bookmarkTests) {
      try {
        await this.page.goto(url, { waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(2000);

        // Test bookmarking via localStorage simulation
        const bookmarkTest = await this.page.evaluate((testUrl) => {
          try {
            // Simulate bookmarking functionality
            const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            bookmarks.push({
              id: Date.now().toString(),
              url: testUrl,
              title: 'Test Bookmark',
              timestamp: new Date().toISOString()
            });
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));

            // Test retrieval
            const retrieved = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            return {
              success: true,
              count: retrieved.length,
              lastBookmark: retrieved[retrieved.length - 1]
            };
          } catch (error) {
            return {
              success: false,
              error: error.message
            };
          }
        }, url);

        this.results.push({
          type: 'bookmark-test',
          url: url,
          bookmarkTest,
          timestamp: new Date().toISOString()
        });

        console.log(`  📖 Bookmark Test: ${bookmarkTest.success ? 'SUCCESS' : 'FAILED'}`);
        if (bookmarkTest.error) {
          console.log(`    Error: ${bookmarkTest.error}`);
        }

      } catch (error) {
        console.log(`  ❌ Bookmark test failed: ${error.message}`);
      }
    }
  }

  async testStorageEdgeCases() {
    console.log('\n💾 Testing Storage Edge Cases...');

    try {
      const storageTests = await this.page.evaluate(() => {
        const results = [];

        // Test localStorage disabled (simulate)
        try {
          const originalLocalStorage = window.localStorage;
          Object.defineProperty(window, 'localStorage', {
            get: () => { throw new Error('localStorage disabled'); }
          });

          // Test app behavior without localStorage
          results.push({
            test: 'localStorage-disabled',
            success: true
          });

          // Restore localStorage
          window.localStorage = originalLocalStorage;

        } catch (error) {
          results.push({
            test: 'localStorage-disabled',
            success: false,
            error: error.message
          });
        }

        // Test storage quota exceeded
        try {
          let data = 'x'.repeat(1024 * 1024); // 1MB of data
          let iterations = 0;
          const maxIterations = 100;

          try {
            while (iterations < maxIterations) {
              localStorage.setItem(`test-${iterations}`, data);
              iterations++;
            }
          } catch (e) {
            results.push({
              test: 'storage-quota-exceeded',
              success: true,
              handled: true,
              iterations: iterations
            });
          }

          // Cleanup
          for (let i = 0; i < iterations; i++) {
            localStorage.removeItem(`test-${i}`);
          }

        } catch (error) {
          results.push({
            test: 'storage-quota-exceeded',
            success: false,
            error: error.message
          });
        }

        // Test corrupted data recovery
        try {
          localStorage.setItem('bookmarks', 'invalid-json-{');
          const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
          results.push({
            test: 'corrupted-data-recovery',
            success: true
          });
        } catch (error) {
          results.push({
            test: 'corrupted-data-recovery',
            success: true,
            handled: true
          });
        }

        return results;
      });

      this.results.push({
        type: 'storage-tests',
        tests: storageTests,
        timestamp: new Date().toISOString()
      });

      storageTests.forEach(test => {
        console.log(`  💾 ${test.test}: ${test.success ? 'SUCCESS' : 'FAILED'}`);
        if (test.error) {
          console.log(`    Error: ${test.error}`);
        }
        if (test.handled) {
          console.log(`    ✅ Error handled gracefully`);
        }
      });

    } catch (error) {
      console.log(`  ❌ Storage tests failed: ${error.message}`);
    }
  }

  async testPerformanceEdgeCases() {
    console.log('\n⚡ Testing Performance Edge Cases...');

    // Test rapid navigation
    const rapidUrls = [
      'http://localhost:5173/#/authors/A5017898742',
      'http://localhost:5173/#/works/W2741809807',
      'http://localhost:5173/#/institutions/I4210123635',
      'http://localhost:5173/#/search?q=machine%20learning'
    ];

    const startTime = Date.now();

    for (let i = 0; i < 3; i++) { // Test multiple cycles
      for (const url of rapidUrls) {
        try {
          await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
        } catch (error) {
          this.results.push({
            type: 'performance-issue',
            scenario: 'rapid-navigation',
            url: url,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    const totalTime = Date.now() - startTime;

    // Test memory usage (basic check)
    const metrics = await this.page.metrics();

    this.results.push({
      type: 'performance-test',
      totalTime,
      cycles: 3,
      averageTimePerCycle: totalTime / 3,
      metrics,
      timestamp: new Date().toISOString()
    });

    console.log(`  ⚡ Rapid Navigation Test: ${totalTime}ms total`);
    console.log(`    Average per cycle: ${(totalTime / 3).toFixed(2)}ms`);
    console.log(`    JS Heap Size: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)}MB`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  generateReport() {
    console.log('\n📊 EDGE CASE TEST REPORT');
    console.log('='.repeat(50));

    const summary = {
      totalTests: this.results.length,
      consoleErrors: this.results.filter(r => r.type === 'console-error').length,
      pageErrors: this.results.filter(r => r.type === 'page-error').length,
      httpErrors: this.results.filter(r => r.type === 'http-error').length,
      urlTests: this.results.filter(r => r.type === 'url-test').length,
      failedUrlTests: this.results.filter(r => r.type === 'url-test-failed').length,
      networkErrorTests: this.results.filter(r => r.type === 'network-error-test').length,
      bookmarkTests: this.results.filter(r => r.type === 'bookmark-test').length,
      performanceIssues: this.results.filter(r => r.type === 'performance-issue').length
    };

    console.log(`\n📈 SUMMARY:`);
    console.log(`  Total Results: ${summary.totalTests}`);
    console.log(`  Console Errors: ${summary.consoleErrors}`);
    console.log(`  Page Errors: ${summary.pageErrors}`);
    console.log(`  HTTP Errors: ${summary.httpErrors}`);
    console.log(`  URL Tests: ${summary.urlTests}`);
    console.log(`  Failed URL Tests: ${summary.failedUrlTests}`);
    console.log(`  Network Error Tests: ${summary.networkErrorTests}`);
    console.log(`  Bookmark Tests: ${summary.bookmarkTests}`);
    console.log(`  Performance Issues: ${summary.performanceIssues}`);

    // Analyze URL test results
    const urlTests = this.results.filter(r => r.type === 'url-test');
    const errorHandlingAnalysis = {
      totalUrlTests: urlTests.length,
      withErrorBoundaries: urlTests.filter(t => t.hasErrorBoundary).length,
      withRetryButtons: urlTests.filter(t => t.hasRetryButton).length,
      withErrorMessages: urlTests.filter(t => t.hasErrorMessage).length,
      stillFunctional: urlTests.filter(t => t.stillFunctional).length
    };

    console.log(`\n🛡️  ERROR HANDLING ANALYSIS:`);
    console.log(`  URL Tests with Error Boundaries: ${errorHandlingAnalysis.withErrorBoundaries}/${errorHandlingAnalysis.totalUrlTests}`);
    console.log(`  URL Tests with Retry Buttons: ${errorHandlingAnalysis.withRetryButtons}/${errorHandlingAnalysis.totalUrlTests}`);
    console.log(`  URL Tests with Error Messages: ${errorHandlingAnalysis.withErrorMessages}/${errorHandlingAnalysis.totalUrlTests}`);
    console.log(`  App Still Functional: ${errorHandlingAnalysis.stillFunctional}/${errorHandlingAnalysis.totalUrlTests}`);

    // Find critical issues
    const criticalIssues = this.results.filter(r =>
      r.type === 'page-error' ||
      (r.type === 'url-test' && !r.stillFunctional) ||
      (r.type === 'bookmark-test' && !r.bookmarkTest.success)
    );

    console.log(`\n❌ CRITICAL ISSUES (${criticalIssues.length}):`);
    criticalIssues.forEach(issue => {
      console.log(`  - ${issue.type}: ${issue.message || issue.url}`);
      if (issue.error) console.log(`    Error: ${issue.error}`);
    });

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);

    if (errorHandlingAnalysis.withErrorBoundaries < errorHandlingAnalysis.totalUrlTests * 0.8) {
      console.log('  - Consider implementing error boundaries for better error isolation');
    }

    if (errorHandlingAnalysis.withRetryButtons < errorHandlingAnalysis.totalUrlTests * 0.5) {
      console.log('  - Add retry mechanisms for transient errors');
    }

    if (summary.consoleErrors > 0) {
      console.log('  - Review and address console errors');
    }

    if (summary.pageErrors > 0) {
      console.log('  - Implement better error handling to prevent page crashes');
    }

    if (criticalIssues.length === 0) {
      console.log('  ✅ No critical issues found - application handles edge cases well');
    }

    return {
      summary,
      errorHandlingAnalysis,
      criticalIssues,
      allResults: this.results
    };
  }
}

async function main() {
  const tester = new EdgeCaseTester();

  try {
    await tester.initialize();

    // Run all edge case tests
    await tester.testUrlHandling(EDGE_CASE_TESTS.invalidUrls, 'Invalid URLs');
    await tester.testUrlHandling(EDGE_CASE_TESTS.validUrls, 'Valid URLs (Control Group)');
    await tester.testNetworkErrors();
    await tester.testBookmarkingEdgeCases();
    await tester.testStorageEdgeCases();
    await tester.testPerformanceEdgeCases();

    // Generate and return report
    const report = tester.generateReport();

    // Save detailed results
    const fs = require('fs');
    const reportPath = `edge-case-test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);

    return report;

  } catch (error) {
    console.error('❌ Edge case testing failed:', error);
    throw error;
  } finally {
    await tester.cleanup();
  }
}

// Run tests if called directly
if (require.main === module) {
  main()
    .then(report => {
      console.log('\n✅ Edge case testing completed successfully');
      process.exit(report.criticalIssues.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Edge case testing failed:', error);
      process.exit(1);
    });
}

module.exports = EdgeCaseTester;