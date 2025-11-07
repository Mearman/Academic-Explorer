#!/usr/bin/env node

/**
 * Comprehensive Bookmarking Test Script
 *
 * This script creates representative test URLs from each category identified
 * in the URL pattern analysis and generates test cases for bookmark coverage.
 */

const fs = require('fs');
const path = require('path');

// Load URL analysis data
const analysisData = JSON.parse(fs.readFileSync('url-pattern-analysis-2025-11-07.json', 'utf-8'));
const openalexUrls = JSON.parse(fs.readFileSync('openalex-urls.json', 'utf-8'));

// Representative URL selection based on analysis
const representativeUrls = {
  // Single entity URLs (should be 100% supported)
  'single-entity': [
    'https://api.openalex.org/works/W2741809807',
    'https://api.openalex.org/authors/A5023888391',
    'https://api.openalex.org/institutions/I27837315',
    'https://api.openalex.org/sources/S137773608',
    'https://api.openalex.org/concepts/C71924100',
    'https://api.openalex.org/publishers/P4310319965',
    'https://api.openalex.org/funders/F4320332161',
    'https://api.openalex.org/topics/T11636'
  ],

  // External ID URLs (should be supported with special routing)
  'external-id': [
    'https://api.openalex.org/authors/https://orcid.org/0000-0002-1298-3089',
    'https://api.openalex.org/authors/orcid:0000-0002-1298-3089',
    'https://api.openalex.org/institutions/https://ror.org/02y3ad647',
    'https://api.openalex.org/institutions/ror:02y3ad647',
    'https://api.openalex.org/sources/issn:2041-1723',
    'https://api.openalex.org/works/https://doi.org/10.7717/peerj.4375',
    'https://api.openalex.org/works/pmid:14907713',
    'https://api.openalex.org/concepts/wikidata:Q11190',
    'https://api.openalex.org/funders/wikidata:Q390551',
    'https://api.openalex.org/publishers/wikidata:Q1479654'
  ],

  // Entity list URLs (basic lists should be supported)
  'entity-list-simple': [
    'https://api.openalex.org/authors',
    'https://api.openalex.org/works',
    'https://api.openalex.org/institutions',
    'https://api.openalex.org/concepts',
    'https://api.openalex.org/sources',
    'https://api.openalex.org/publishers',
    'https://api.openalex.org/funders',
    'https://api.openalex.org/topics'
  ],

  // Entity list with simple filters (likely supported)
  'entity-list-simple-filters': [
    'https://api.openalex.org/authors?filter=display_name.search:einstein',
    'https://api.openalex.org/works?filter=publication_year:2023',
    'https://api.openalex.org/institutions?filter=country_code:ca',
    'https://api.openalex.org/sources?search=Nature',
    'https://api.openalex.org/concepts?search=artificial%20intelligence',
    'https://api.openalex.org/authors?sort=cited_by_count:desc',
    'https://api.openalex.org/works?per-page=50',
    'https://api.openalex.org/institutions?page=2'
  ],

  // Entity list with complex filters (may have issues)
  'entity-list-complex-filters': [
    'https://api.openalex.org/authors?filter=display_name.search:einstein&group-by=last_known_institution.country_code',
    'https://api.openalex.org/works?filter=institutions.country_code:fr|gb&sort=cited_by_count:desc',
    'https://api.openalex.org/works?filter=cited_by_count:%3E1,is_oa:true',
    'https://api.openalex.org/works?filter=institutions.id:I27837315,repository:!S4306400393',
    'https://api.openalex.org/works?filter=publication_year:2023&per-page=200&page=2',
    'https://api.openalex.org/works?group_by=authorships.countries&filter=institutions.is_global_south:true'
  ],

  // Autocomplete endpoints (supported)
  'autocomplete': [
    'https://api.openalex.org/autocomplete/authors?q=einst',
    'https://api.openalex.org/autocomplete/institutions?q=stanford',
    'https://api.openalex.org/autocomplete/works?q=neural+networks',
    'https://api.openalex.org/autocomplete/concepts?q=comp',
    'https://api.openalex.org/autocomplete/sources?q=neuro',
    'https://api.openalex.org/autocomplete/funders?q=national+sci',
    'https://api.openalex.org/autocomplete/publishers?q=els'
  ],

  // Text endpoints (may not have UI equivalents)
  'text-endpoint': [
    'https://api.openalex.org/text/concepts?title=type%201%20diabetes%20research%20for%20children',
    'https://api.openalex.org/text/keywords?title=type%201%20diabetes%20research%20for%20children',
    'https://api.openalex.org/text/topics?title=type%201%20diabetes%20research%20for%20children'
  ],

  // URLs with potential issues
  'problematic-urls': [
    'https://api.openalex.org/works?api_key=424242', // API key
    'https://api.openalex.org/works?filter=publication_year:2020&per-page=100&cursor=IlsxNjA5MzcyODAwMDAwLCAnaHR0cHM6Ly9vcGVuYWxleC5vcmcvVzI0ODg0OTk3NjQnXSI=', // Cursor pagination
    'https://api.openalex.org/works?filter=doi:https://doi.org/10.1371/journal.pone.0266781|https://doi.org/10.1371/journal.pone.0267149', // Multiple DOIs
    'https://api.openalex.org/works?search=%22fierce%20creatures%22', // Complex search with quotes
    'https://api.openalex.org/works?search=%28elmo%20AND%20%22sesame%20street%22%29%20NOT%20%28cookie%20OR%20monster%29', // Boolean search
    'https://api.openalex.org/works?mailto=you@example.com', // Email parameter
    'https://api.openalex.org/concepts/random', // Random entity
    'https://api.openalex.org/institutions/random' // Random entity
  ],

  // Special cases
  'special-cases': [
    'https://api.openalex.org/W2741809807', // Work ID without explicit path
    'https://api.openalex.org/keywords', // Keywords endpoint
    'https://api.openalex.org/keywords/cardiac-imaging', // Single keyword
    'https://api.openalex.org/autocomplete?q=https://orcid.org/0000-0002-7436-3176' // Autocomplete with external ID
  ]
};

// E2E test cases generation
function generateE2ETestCases() {
  const testCases = [];

  Object.entries(representativeUrls).forEach(([category, urls]) => {
    urls.forEach((url, index) => {
      const testName = `${category.replace(/-/g, ' ')} - ${index + 1}`;
      const cleanUrl = url.replace(/[\/:?&|=<>%]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      testCases.push({
        category,
        testName,
        url,
        expectedSupport: getExpectedSupport(category),
        testId: `${category}-${index + 1}-${cleanUrl}`.substring(0, 50)
      });
    });
  });

  return testCases;
}

function getExpectedSupport(category) {
  const supportLevels = {
    'single-entity': 'full',
    'external-id': 'full',
    'entity-list-simple': 'full',
    'entity-list-simple-filters': 'full',
    'entity-list-complex-filters': 'partial',
    'autocomplete': 'full',
    'text-endpoint': 'none',
    'problematic-urls': 'partial',
    'special-cases': 'mixed'
  };

  return supportLevels[category] || 'unknown';
}

// Generate E2E test file content
function generateE2ETestFile() {
  const testCases = generateE2ETestCases();

  return `/**
 * Comprehensive URL Pattern Bookmarking E2E Tests
 *
 * Generated: ${new Date().toISOString()}
 * Total test cases: ${testCases.length}
 *
 * Categories tested: ${Object.keys(representativeUrls).join(', ')}
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  // Standard test entity
  BASE_URL: 'http://localhost:5173',
  STANDARD_ENTITY: 'http://localhost:5173/#/authors/A5017898742',
  TIMEOUT: 30000,
  BOOKMARK_TIMEOUT: 10000
};

// Test data
const TEST_CASES = ${JSON.stringify(testCases, null, 2)};

test.describe('URL Pattern Bookmarking Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_CONFIG.BASE_URL);
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: TEST_CONFIG.TIMEOUT });
  });

  test.beforeEach(async ({ page }) => {
    // Clear any existing bookmarks for clean testing
    // This would need to be implemented based on your bookmark storage mechanism
    await page.evaluate(() => {
      if (window.localStorage) {
        // Clear relevant localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('bookmark')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    });
  });

${testCases.map((testCase, index) => `
  test('${testCase.testName}', async ({ page }) => {
    console.log('Testing URL pattern:', '${testCase.url}');
    console.log('Expected support level:', '${testCase.expectedSupport}');

    try {
      // Navigate to the URL via openalex-url redirect
      const redirectUrl = \`\${TEST_CONFIG.BASE_URL}/#/openalex-url/\${encodeURIComponent('${testCase.url}')}\`;
      await page.goto(redirectUrl);

      // Wait for redirect to complete and page to load
      await page.waitForLoadState('networkidle');

      // Check if we successfully navigated (not stuck on error page)
      const currentUrl = page.url();
      const isOnErrorPage = currentUrl.includes('/error') || currentUrl.includes('invalid');

      expect(isOnErrorPage).toBe(false);

      // Check for bookmark button/component
      const bookmarkButton = await page.locator('[data-testid*="bookmark"]').first();
      const hasBookmarkButton = await bookmarkButton.count() > 0;

      if (hasBookmarkButton) {
        console.log('Bookmark button found, attempting to bookmark');

        // Try to bookmark
        await bookmarkButton.click();

        // Wait for bookmark to be processed
        await page.waitForTimeout(1000);

        // Navigate to bookmarks page
        await page.goto(\`\${TEST_CONFIG.BASE_URL}/#/bookmarks\`);
        await page.waitForLoadState('networkidle');

        // Check if bookmark was created
        const bookmarkCards = await page.locator('[data-testid="bookmark-card"]').count();

        if (testCase.expectedSupport === 'full') {
          expect(bookmarkCards).toBeGreaterThan(0);
          console.log('✅ Bookmark successfully created for supported URL pattern');
        } else if (testCase.expectedSupport === 'partial') {
          // Partial support - may or may not work
          console.log(\`⚠️ Partial support pattern, bookmark count: \${bookmarkCards}\`);
        } else if (testCase.expectedSupport === 'none') {
          // Not expected to work
          console.log(\`ℹ️ Unsupported pattern, bookmark count: \${bookmarkCards}\`);
        }

        // Try to navigate back from bookmark
        if (bookmarkCards > 0) {
          const firstBookmark = page.locator('[data-testid="bookmark-card"]').first();
          const openButton = firstBookmark.locator('[data-testid="bookmark-open-button"]');

          if (await openButton.count() > 0) {
            await openButton.click();
            await page.waitForLoadState('networkidle');

            // Should return to a valid page
            const finalUrl = page.url();
            const isBackOnValidPage = !finalUrl.includes('/error') && !finalUrl.includes('invalid');
            expect(isBackOnValidPage).toBe(true);

            console.log('✅ Successfully navigated back from bookmark');
          }
        }
      } else {
        console.log('❌ No bookmark button found on page');
        if (testCase.expectedSupport === 'full') {
          throw new Error('Expected bookmark button for fully supported URL pattern');
        }
      }

    } catch (error) {
      console.error(\`❌ Test failed for \${testCase.url}:\`, error);

      if (testCase.expectedSupport === 'full') {
        throw error; // Fail the test for expected support
      } else {
        console.log(\`ℹ️ Expected failure for unsupported pattern: \${testCase.expectedSupport}\`);
      }
    }
  });`).join('\n')}

  test.afterEach(async ({ page }) => {
    // Clean up test bookmarks
    const bookmarkCards = await page.locator('[data-testid="bookmark-card"]').all();
    for (const card of bookmarkCards) {
      try {
        const deleteButton = card.locator('[data-testid*="delete"], [data-testid*="remove"]');
        if (await deleteButton.count() > 0) {
          await deleteButton.click();
          await page.waitForTimeout(500);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});

// Summary test to report overall coverage
test('URL Pattern Coverage Summary', async ({ page }) => {
  console.log('\\n📊 URL PATTERN COVERAGE SUMMARY');
  console.log('='.repeat(50));

  const summary = TEST_CASES.reduce((acc, testCase) => {
    acc[testCase.category] = (acc[testCase.category] || 0) + 1;
    return acc;
  }, {});

  console.log('Test Categories:');
  Object.entries(summary).forEach(([category, count]) => {
    const support = getExpectedSupport(category);
    const icon = support === 'full' ? '✅' : support === 'partial' ? '⚠️' : '❌';
    console.log(\`  \${icon} \${category}: \${count} test cases\`);
  });

  console.log(\`\\nTotal test cases: \${TEST_CASES.length}\`);

  const fullySupported = TEST_CASES.filter(tc => tc.expectedSupport === 'full').length;
  const partiallySupported = TEST_CASES.filter(tc => tc.expectedSupport === 'partial').length;
  const notSupported = TEST_CASES.filter(tc => tc.expectedSupport === 'none').length;

  console.log(\`Fully supported: \${fullySupported} (\${Math.round(fullySupported / TEST_CASES.length * 100)}%)\`);
  console.log(\`Partially supported: \${partiallySupported} (\${Math.round(partiallySupported / TEST_CASES.length * 100)}%)\`);
  console.log(\`Not supported: \${notSupported} (\${Math.round(notSupported / TEST_CASES.length * 100)}%)\`);

  expect(TEST_CASES.length).toBeGreaterThan(0);
});
`;
}

// Main execution
function main() {
  try {
    console.log('🧪 Generating Comprehensive Bookmarking Test Suite...\n');

    const testCases = generateE2ETestCases();
    console.log(`📋 Generated ${testCases.length} test cases from ${Object.keys(representativeUrls).length} categories\n`);

    // Write E2E test file
    const e2eTestContent = generateE2ETestFile();
    const testFileName = `comprehensive-bookmarking-patterns.e2e.test.ts`;
    const testFilePath = path.join('apps/web/src/test/e2e', testFileName);

    fs.writeFileSync(testFilePath, e2eTestContent);
    console.log(`✅ E2E test file created: ${testFilePath}`);

    // Generate summary report
    const summary = {
      totalUrls: openalexUrls.length,
      testCases: testCases.length,
      categories: Object.keys(representativeUrls),
      coverageByCategory: {},
      generatedAt: new Date().toISOString()
    };

    Object.entries(representativeUrls).forEach(([category, urls]) => {
      summary.coverageByCategory[category] = {
        count: urls.length,
        expectedSupport: getExpectedSupport(category)
      };
    });

    const summaryFileName = `bookmarking-test-summary-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(summaryFileName, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary report created: ${summaryFileName}`);

    // Display console summary
    console.log('\n📊 SUMMARY REPORT');
    console.log('='.repeat(30));
    console.log(`Total OpenAlex URLs analyzed: ${openalexUrls.length}`);
    console.log(`Test cases generated: ${testCases.length}`);
    console.log(`Categories covered: ${Object.keys(representativeUrls).length}`);

    console.log('\nCategories by support level:');
    Object.entries(summary.coverageByCategory).forEach(([category, info]) => {
      const icon = info.expectedSupport === 'full' ? '✅' :
                   info.expectedSupport === 'partial' ? '⚠️' :
                   info.expectedSupport === 'none' ? '❌' : '❓';
      console.log(`  ${icon} ${category}: ${info.count} URLs (${info.expectedSupport})`);
    });

    console.log('\n🎯 Next steps:');
    console.log('1. Run E2E tests: pnpm test:e2e --testNamePattern="URL Pattern Bookmarking Coverage"');
    console.log('2. Review results and fix any issues with fully supported patterns');
    console.log('3. Consider implementing support for partially supported patterns if needed');

  } catch (error) {
    console.error('❌ Error generating test suite:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateE2ETestCases, generateE2ETestFile };