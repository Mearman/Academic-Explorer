#!/usr/bin/env node

/**
 * Comprehensive bookmarking test script for Academic Explorer
 * Tests bookmarking functionality across all OpenAlex URL patterns
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5173';
const TIMEOUT = 30000;
const TEST_DATA_PATH = '/Users/joe/Documents/Research/PhD/Academic Explorer/apps/web/src/test/data/openalex-test-urls.json';

// Load test URLs
const testUrlsData = JSON.parse(fs.readFileSync(TEST_DATA_PATH, 'utf8'));
const allUrls = testUrlsData.urls;

// Representative URL samples for testing (categorized)
const representativeUrls = {
  // Basic entity URLs
  basicEntities: [
    'https://api.openalex.org/works/W2741809807',
    'https://api.openalex.org/authors/A5006060960',
    'https://api.openalex.org/institutions/I27837315',
    'https://api.openalex.org/sources/S137773608',
    'https://api.openalex.org/funders/F4320332161',
    'https://api.openalex.org/publishers/P4310319965',
    'https://api.openalex.org/concepts/C71924100',
    'https://api.openalex.org/topics/T11636',
    'https://api.openalex.org/keywords/cardiac-imaging'
  ],

  // External ID URLs
  externalIds: [
    'https://api.openalex.org/authors/orcid:0000-0002-1298-3089',
    'https://api.openalex.org/institutions/ror:02y3ad647',
    'https://api.openalex.org/works/https://doi.org/10.7717/peerj.4375',
    'https://api.openalex.org/works/pmid:14907713',
    'https://api.openalex.org/sources/issn:2041-1723',
    'https://api.openalex.org/concepts/wikidata:Q11190',
    'https://api.openalex.org/funders/wikidata:Q390551',
    'https://api.openalex.org/publishers/wikidata:Q1479654'
  ],

  // Search URLs with various filters
  searchUrls: [
    'https://api.openalex.org/authors?search=carl%20sagan',
    'https://api.openalex.org/works?search=machine+learning',
    'https://api.openalex.org/institutions?search=stanford',
    'https://api.openalex.org/sources?search=nature',
    'https://api.openalex.org/funders?search=health',
    'https://api.openalex.org/concepts?search=artificial%20intelligence',
    'https://api.openalex.org/topics?search=artificial%20intelligence',
    'https://api.openalex.org/keywords?search=artificial%20intelligence'
  ],

  // URLs with complex filters
  complexFilters: [
    'https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc',
    'https://api.openalex.org/authors?filter=has_orcid:true',
    'https://api.openalex.org/works?filter=is_oa:true',
    'https://api.openalex.org/institutions?filter=is_global_south:true',
    'https://api.openalex.org/works?filter=publication_year:2023',
    'https://api.openalex.org/works?filter=authors_count:>100',
    'https://api.openalex.org/concepts?filter=level:0',
    'https://api.openalex.org/sources?filter=has_issn:true'
  ],

  // Pagination and sorting
  paginationSorting: [
    'https://api.openalex.org/authors?per_page=50&page=2',
    'https://api.openalex.org/works?page=2&per-page=200',
    'https://api.openalex.org/authors?sort=cited_by_count:desc',
    'https://api.openalex.org/works?sort=cited_by_count:desc',
    'https://api.openalex.org/concepts?sort=cited_by_count:desc',
    'https://api.openalex.org/institutions?sort=cited_by_count:desc',
    'https://api.openalex.org/funders?sort=display_name:desc',
    'https://api.openalex.org/publishers?sort=display_name:desc'
  ],

  // Special endpoints
  specialEndpoints: [
    'https://api.openalex.org/concepts/random',
    'https://api.openalex.org/institutions/random',
    'https://api.openalex.org/autocomplete/authors?q=ronald%20sw',
    'https://api.openalex.org/autocomplete/concepts?q=comp',
    'https://api.openalex.org/autocomplete/works?q=neural+networks',
    'https://api.openalex.org/text?title=Machine+learning+for+drug+discovery'
  ],

  // Group-by and aggregate queries
  aggregateQueries: [
    'https://api.openalex.org/authors?group_by=last_known_institutions.continent',
    'https://api.openalex.org/works?group_by=authorships.countries',
    'https://api.openalex.org/works?group_by=oa_status',
    'https://api.openalex.org/concepts?group_by=level',
    'https://api.openalex.org/funders?group_by=country_code',
    'https://api.openalex.org/institutions?group_by=continent'
  ]
};

class BookmarkingTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      details: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing bookmark test suite...');
    this.browser = await chromium.launch({
      headless: false,
      timeout: TIMEOUT
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    this.page = await this.context.newPage();

    // Listen for console errors
    this.page.on('pageerror', (error) => {
      console.log('❌ Page error:', error.message);
    });
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async navigateAndTest(url, category) {
    const testResult = {
      url,
      category,
      redirected: false,
      redirectedUrl: '',
      bookmarkable: false,
      bookmarkCreated: false,
      bookmarkVerified: false,
      error: null,
      duration: 0
    };

    const startTime = Date.now();
    this.results.totalTests++;

    try {
      console.log(`🧪 Testing ${category}: ${url}`);

      // Clear storage and navigate via OpenAlex URL redirection
      await this.context.clearCookies();

      // Use hash-based routing for OpenAlex URL
      const redirectUrl = `${BASE_URL}/#/https://${url.replace('https://api.openalex.org/', '')}`;
      await this.page.goto(redirectUrl, {
        waitUntil: 'networkidle',
        timeout: TIMEOUT
      });

      // Wait for redirect to complete
      await this.page.waitForTimeout(2000);

      // Check if redirected
      const currentUrl = this.page.url();
      testResult.redirectedUrl = currentUrl;
      testResult.redirected = currentUrl !== redirectUrl;

      // Look for bookmark button
      const bookmarkButton = this.page.locator('button').filter({
        has: this.page.locator('svg')
      }).first();

      if (await bookmarkButton.isVisible({ timeout: 5000 })) {
        testResult.bookmarkable = true;

        // Click bookmark button
        await bookmarkButton.click();
        await this.page.waitForTimeout(1000);
        testResult.bookmarkCreated = true;

        // Verify bookmark by checking bookmarks page
        await this.page.goto(`${BASE_URL}/#/bookmarks`, {
          waitUntil: 'networkidle',
          timeout: TIMEOUT
        });

        await this.page.waitForTimeout(2000);

        // Look for bookmark content
        const bookmarkCards = this.page.locator('[data-testid="bookmark-card"], .mantine-Card-root');
        const hasBookmarks = await bookmarkCards.count() > 0;

        if (hasBookmarks) {
          testResult.bookmarkVerified = true;
        }

        console.log(`   ✅ Bookmarkable: ${testResult.bookmarkable ? 'YES' : 'NO'}`);
        console.log(`   📁 Bookmark created: ${testResult.bookmarkCreated ? 'YES' : 'NO'}`);
        console.log(`   ✔️ Bookmark verified: ${testResult.bookmarkVerified ? 'YES' : 'NO'}`);
      } else {
        console.log(`   ❌ Not bookmarkable - no bookmark button found`);
      }

    } catch (error) {
      testResult.error = error.message;
      console.log(`   💥 Error: ${error.message}`);
    }

    testResult.duration = Date.now() - startTime;

    if (testResult.error) {
      this.results.failedTests++;
    } else if (testResult.bookmarkVerified) {
      this.results.passedTests++;
    } else {
      this.results.failedTests++;
    }

    this.results.details.push(testResult);
    return testResult;
  }

  async runTests() {
    console.log('\n📊 Starting comprehensive bookmarking tests...\n');

    const allCategories = Object.entries(representativeUrls);

    for (const [category, urls] of allCategories) {
      console.log(`\n🔍 Testing category: ${category.toUpperCase()}`);
      console.log('='.repeat(50));

      for (const url of urls) {
        await this.navigateAndTest(url, category);
        await this.page.waitForTimeout(500); // Brief pause between tests
      }
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.totalTests,
        passed: this.results.passedTests,
        failed: this.results.failedTests,
        skipped: this.results.skippedTests,
        successRate: ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2) + '%'
      },
      categories: {},
      details: this.results.details,
      issues: []
    };

    // Analyze results by category
    Object.keys(representativeUrls).forEach(category => {
      const categoryResults = this.results.details.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.bookmarkVerified).length;
      const categoryTotal = categoryResults.length;

      report.categories[category] = {
        total: categoryTotal,
        passed: categoryPassed,
        failed: categoryTotal - categoryPassed,
        successRate: categoryTotal > 0 ? ((categoryPassed / categoryTotal) * 100).toFixed(2) + '%' : '0%'
      };
    });

    // Identify issues
    report.issues = this.results.details
      .filter(r => r.error || !r.bookmarkVerified)
      .map(r => ({
        url: r.url,
        category: r.category,
        error: r.error,
        bookmarkable: r.bookmarkable,
        bookmarkCreated: r.bookmarkCreated,
        bookmarkVerified: r.bookmarkVerified
      }));

    return report;
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/Users/joe/Documents/Research/PhD/Academic Explorer/bookmarking-comprehensive-test-report-${timestamp}.json`;

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Also create a readable markdown summary
    const markdownPath = `/Users/joe/Documents/Research/PhD/Academic Explorer/bookmarking-comprehensive-test-report-${timestamp}.md`;

    let markdown = `# Comprehensive Bookmarking Test Report\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${report.summary.total}\n`;
    markdown += `- **Passed:** ${report.summary.passed}\n`;
    markdown += `- **Failed:** ${report.summary.failed}\n`;
    markdown += `- **Success Rate:** ${report.summary.successRate}\n\n`;

    markdown += `## Results by Category\n\n`;
    Object.entries(report.categories).forEach(([category, results]) => {
      markdown += `### ${category}\n`;
      markdown += `- Total: ${results.total}\n`;
      markdown += `- Passed: ${results.passed}\n`;
      markdown += `- Failed: ${results.failed}\n`;
      markdown += `- Success Rate: ${results.successRate}\n\n`;
    });

    if (report.issues.length > 0) {
      markdown += `## Issues\n\n`;
      report.issues.forEach(issue => {
        markdown += `### ${issue.url}\n`;
        markdown += `- **Category:** ${issue.category}\n`;
        markdown += `- **Error:** ${issue.error || 'None'}\n`;
        markdown += `- **Bookmarkable:** ${issue.bookmarkable ? 'Yes' : 'No'}\n`;
        markdown += `- **Bookmark Created:** ${issue.bookmarkCreated ? 'Yes' : 'No'}\n`;
        markdown += `- **Bookmark Verified:** ${issue.bookmarkVerified ? 'Yes' : 'No'}\n\n`;
      });
    }

    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📄 Reports saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   MD:   ${markdownPath}`);

    return { reportPath, markdownPath };
  }
}

async function main() {
  const tester = new BookmarkingTester();

  try {
    await tester.initialize();
    await tester.runTests();

    const report = tester.generateReport();
    const { reportPath, markdownPath } = await tester.saveReport(report);

    console.log('\n🎉 Test suite completed!');
    console.log(`📊 Results: ${report.summary.passed}/${report.summary.total} passed (${report.summary.successRate})`);

    if (report.issues.length > 0) {
      console.log(`⚠️  Found ${report.issues.length} issues - see report for details`);
    }

  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BookmarkingTester };