#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function analyzeUrls() {
  try {
    console.log('🔍 Analyzing OpenAlex URL patterns for bookmarking coverage...\n');

    // Read URLs from JSON file
    const jsonPath = path.join(process.cwd(), 'openalex-urls.json');
    const urls = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log(`📊 Total URLs to analyze: ${urls.length}\n`);

    // Categorize URLs
    const categories = {
      'single-entity': [],
      'external-id': [],
      'entity-list': [],
      'autocomplete': [],
      'text-endpoint': [],
      'unknown': []
    };

    const entityTypes = new Map();
    const potentialIssues = new Set();

    urls.forEach(url => {
      let category = 'unknown';
      let entityType = 'unknown';

      // Entity type detection
      if (url.includes('/works/')) entityType = 'works';
      else if (url.includes('/authors/')) entityType = 'authors';
      else if (url.includes('/institutions/')) entityType = 'institutions';
      else if (url.includes('/sources/')) entityType = 'sources';
      else if (url.includes('/concepts/')) entityType = 'concepts';
      else if (url.includes('/publishers/')) entityType = 'publishers';
      else if (url.includes('/funders/')) entityType = 'funders';
      else if (url.includes('/topics/')) entityType = 'topics';
      else if (url.includes('/keywords/')) entityType = 'keywords';
      else if (url.includes('/autocomplete/')) entityType = 'autocomplete';
      else if (url.includes('/text/')) entityType = 'text';

      // Pattern detection
      if (url.includes('/autocomplete/')) {
        category = 'autocomplete';
      } else if (url.includes('/text/')) {
        category = 'text-endpoint';
        potentialIssues.add('Text endpoints may not have UI equivalents');
      } else if (url.match(/\/(works|authors|institutions|sources|concepts|publishers|funders|topics)\/[A-Z]\d+$/)) {
        category = 'single-entity';
      } else if (url.match(/\/(works|authors|institutions|sources|concepts|publishers|funders|topics)\/(https?:\/\/|orcid:|pmid:|doi:|wikidata:|ror:|issn:)/)) {
        category = 'external-id';
      } else if (url.match(/\/(works|authors|institutions|sources|concepts|publishers|funders|topics|keywords)(\?.*)?$/)) {
        category = 'entity-list';
      }

      categories[category].push({ url, entityType });

      if (!entityTypes.has(entityType)) {
        entityTypes.set(entityType, []);
      }
      entityTypes.get(entityType).push(url);

      // Check for potential issues
      if (url.includes('api_key=')) {
        potentialIssues.add('API key parameter may need sanitization');
      }
      if (url.includes('cursor=')) {
        potentialIssues.add('Cursor pagination may not be bookmarkable');
      }
      if (url.includes('%') && url.includes(' ')) {
        potentialIssues.add('URL encoding issues possible');
      }
      if (url.includes('|') || url.includes('+')) {
        potentialIssues.add('Special characters in filters may need encoding');
      }
      if (url.split(/[?&]/).length > 10) {
        potentialIssues.add('Complex parameter combinations may cause issues');
      }
    });

    // Generate report
    console.log('📋 URL PATTERN ANALYSIS REPORT\n');
    console.log('='.repeat(50));
    console.log(`Total URLs analyzed: ${urls.length}`);
    console.log(`Entity types identified: ${entityTypes.size}`);
    console.log(`Pattern categories: ${Object.keys(categories).length}\n`);

    // Display categories
    console.log('🏷️  URL PATTERNS BY CATEGORY:');
    console.log('-'.repeat(30));

    Object.entries(categories).forEach(([catName, catUrls]) => {
      if (catUrls.length > 0) {
        console.log(`\n${catName.toUpperCase()} (${catUrls.length} URLs):`);

        // Show entity breakdown
        const entityBreakdown = {};
        catUrls.forEach(({ entityType }) => {
          entityBreakdown[entityType] = (entityBreakdown[entityType] || 0) + 1;
        });

        Object.entries(entityBreakdown).forEach(([entity, count]) => {
          console.log(`  ${entity}: ${count} URLs`);
        });

        // Show examples
        console.log('  Examples:');
        catUrls.slice(0, 3).forEach(({ url }) => {
          console.log(`    ${url}`);
        });
        if (catUrls.length > 3) {
          console.log(`    ... and ${catUrls.length - 3} more`);
        }
      }
    });

    // Potential issues
    if (potentialIssues.size > 0) {
      console.log('\n⚠️  POTENTIAL SUPPORT ISSUES:');
      console.log('-'.repeat(30));
      potentialIssues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }

    // Generate test recommendations
    const recommendedTests = [];

    // Add examples from each category
    Object.entries(categories).forEach(([catName, catUrls]) => {
      if (catUrls.length > 0) {
        // Simple example
        const simple = catUrls.find(({ url }) => url.split(/[?&]/).length <= 3);
        if (simple) recommendedTests.push(simple.url);

        // Complex example (if available)
        const complex = catUrls.find(({ url }) => url.split(/[?&]/).length > 5);
        if (complex) recommendedTests.push(complex.url);

        // External ID example
        const externalId = catUrls.find(({ url }) => url.match(/(https?:\/\/|orcid:|pmid:|doi:|wikidata:|ror:|issn:)/));
        if (externalId) recommendedTests.push(externalId.url);
      }
    });

    // Remove duplicates and limit
    const uniqueTests = [...new Set(recommendedTests)].slice(0, 50);

    console.log('\n🧪 RECOMMENDED TEST URLS:');
    console.log('-'.repeat(30));
    console.log(`Selected ${uniqueTests.length} representative URLs:\n`);

    uniqueTests.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });

    // Calculate coverage estimate
    const supportedCategories = ['single-entity', 'external-id', 'entity-list'];
    const supportedUrls = supportedCategories.reduce((sum, cat) => sum + categories[cat].length, 0);
    const coveragePercentage = Math.round((supportedUrls / urls.length) * 100);

    console.log('\n📊 SUMMARY:');
    console.log('-'.repeat(15));
    console.log(`• Total URLs: ${urls.length}`);
    console.log(`• Estimated bookmarkable: ${supportedUrls} (${coveragePercentage}%)`);
    console.log(`• Potentially unsupported: ${urls.length - supportedUrls}`);
    console.log(`• Potential issues: ${potentialIssues.size}`);
    console.log(`• Tests recommended: ${uniqueTests.length}`);

    // Save analysis
    const analysis = {
      totalUrls: urls.length,
      categories,
      entityTypes: Object.fromEntries(entityTypes),
      potentialIssues: Array.from(potentialIssues),
      recommendedTests: uniqueTests,
      coveragePercentage,
      generatedAt: new Date().toISOString()
    };

    const reportPath = path.join(process.cwd(), `url-pattern-analysis-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

    console.log(`\n💾 Detailed analysis saved to: ${reportPath}`);

    return analysis;

  } catch (error) {
    console.error('❌ Error analyzing URLs:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeUrls();
}

module.exports = { analyzeUrls };