#!/usr/bin/env tsx

/**
 * Comprehensive URL Pattern Analysis for OpenAlex Bookmarking
 *
 * This script analyzes all 277+ URLs from openalex-urls.json to:
 * 1. Categorize by entity types and URL patterns
 * 2. Identify potential bookmarking issues
 * 3. Select representative URLs for testing
 */

import fs from 'fs';
import path from 'path';

interface URLCategory {
  entityType: string;
  pattern: string;
  complexity: 'simple' | 'moderate' | 'complex';
  examples: string[];
  potentialIssues: string[];
}

interface URLAnalysis {
  totalUrls: number;
  categories: URLCategory[];
  unsupportedPatterns: string[];
  recommendedTests: string[];
  coveragePercentage: number;
}

const URL_PATTERNS = {
  // Entity endpoints
  SINGLE_ENTITY: /^https:\/\/api\.openalex\.org\/(works|authors|institutions|sources|concepts|publishers|funders|topics)\/[A-Z]\d+$/,
  EXTERNAL_ID: /^https:\/\/api\.openalex\.org\/(works|authors|institutions|sources|concepts|publishers|funders|topics)\/(https?:\/\/|orcid:|pmid:|doi:|wikidata:|ror:|issn:)/,
  RANDOM_ENTITY: /^https:\/\/api\.openalex\.org\/(works|authors|institutions|concepts)\/random$/,

  // List endpoints
  ENTITY_LIST: /^https:\/\/api\.openalex\.org\/(works|authors|institutions|sources|concepts|publishers|funders|topics|keywords)(\?.*)?$/,

  // Autocomplete endpoints
  AUTOCOMPLETE: /^https:\/\/api\.openalex\.org\/autocomplete\//,

  // Text endpoints
  TEXT_ENDPOINT: /^https:\/\/api\.openalex\.org\/text\//,

  // Special characters and encoding
  SPECIAL_CHARS: /[+\s%&|:()[\]]/,
  COMPLEX_FILTER: /filter=.*(&filter=|group_by=|sort=)/,
  MULTI_PARAM: /[?&].*[?&]/,

  // API-specific parameters
  API_KEY: /api_key=/,
  CURSOR_PAGINATION: /cursor=/,
  SAMPLE_WITH_SEED: /sample=.*&seed=/,
};

function categorizeUrl(url: string): URLCategory {
  const urlLower = url.toLowerCase();

  // Determine entity type
  let entityType = 'unknown';
  if (urlLower.includes('/works/')) entityType = 'works';
  else if (urlLower.includes('/authors/')) entityType = 'authors';
  else if (urlLower.includes('/institutions/')) entityType = 'institutions';
  else if (urlLower.includes('/sources/')) entityType = 'sources';
  else if (urlLower.includes('/concepts/')) entityType = 'concepts';
  else if (urlLower.includes('/publishers/')) entityType = 'publishers';
  else if (urlLower.includes('/funders/')) entityType = 'funders';
  else if (urlLower.includes('/topics/')) entityType = 'topics';
  else if (urlLower.includes('/keywords/')) entityType = 'keywords';
  else if (urlLower.includes('/autocomplete/')) entityType = 'autocomplete';
  else if (urlLower.includes('/text/')) entityType = 'text';

  // Determine pattern
  let pattern = 'unknown';
  if (URL_PATTERNS.SINGLE_ENTITY.test(url)) pattern = 'single-entity';
  else if (URL_PATTERNS.EXTERNAL_ID.test(url)) pattern = 'external-id';
  else if (URL_PATTERNS.RANDOM_ENTITY.test(url)) pattern = 'random-entity';
  else if (URL_PATTERNS.AUTOCOMPLETE.test(url)) pattern = 'autocomplete';
  else if (URL_PATTERNS.TEXT_ENDPOINT.test(url)) pattern = 'text-endpoint';
  else if (URL_PATTERNS.ENTITY_LIST.test(url)) pattern = 'entity-list';

  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  const potentialIssues: string[] = [];

  if (URL_PATTERNS.COMPLEX_FILTER.test(url)) {
    complexity = 'complex';
    potentialIssues.push('Complex filters may not be supported');
  }

  if (URL_PATTERNS.MULTI_PARAM.test(url) && url.split(/[?&]/).length > 5) {
    complexity = 'complex';
    potentialIssues.push('Multiple parameters may cause parsing issues');
  }

  if (URL_PATTERNS.API_KEY.test(url)) {
    potentialIssues.push('API key parameter may need sanitization');
  }

  if (URL_PATTERNS.CURSOR_PAGINATION.test(url)) {
    potentialIssues.push('Cursor pagination may not be bookmarkable');
  }

  if (URL_PATTERNS.SPECIAL_CHARS.test(url) && url.includes('%')) {
    potentialIssues.push('URL encoding issues possible');
  }

  if (url.includes('|') || url.includes('+')) {
    potentialIssues.push('Special characters in filters may need encoding');
  }

  // Check for text search endpoints that may not have UI equivalents
  if (entityType === 'text') {
    potentialIssues.push('Text endpoints may not have UI equivalents');
  }

  return {
    entityType,
    pattern,
    complexity,
    examples: [url],
    potentialIssues
  };
}

function analyzeUrls(urls: string[]): URLAnalysis {
  const categories = new Map<string, URLCategory>();
  const allPotentialIssues = new Set<string>();

  urls.forEach(url => {
    const category = categorizeUrl(url);
    const key = `${category.entityType}-${category.pattern}-${category.complexity}`;

    if (categories.has(key)) {
      const existing = categories.get(key)!;
      existing.examples.push(url);
      // Merge potential issues
      category.potentialIssues.forEach(issue => {
        if (!existing.potentialIssues.includes(issue)) {
          existing.potentialIssues.push(issue);
        }
      });
    } else {
      categories.set(key, category);
    }

    category.potentialIssues.forEach(issue => allPotentialIssues.add(issue));
  });

  // Select representative URLs for testing
  const recommendedTests: string[] = [];

  // Add examples from each category and complexity level
  categories.forEach(category => {
    // Simple URLs
    const simpleExample = category.examples.find(url =>
      !URL_PATTERNS.MULTI_PARAM.test(url) || url.split(/[?&]/).length <= 3
    );
    if (simpleExample && !recommendedTests.includes(simpleExample)) {
      recommendedTests.push(simpleExample);
    }

    // Complex URLs
    if (category.complexity === 'complex') {
      const complexExample = category.examples.find(url =>
        URL_PATTERNS.MULTI_PARAM.test(url) && url.split(/[?&]/).length > 5
      );
      if (complexExample && !recommendedTests.includes(complexExample)) {
        recommendedTests.push(complexExample);
      }
    }

    // External IDs
    const externalIdExample = category.examples.find(url =>
      URL_PATTERNS.EXTERNAL_ID.test(url)
    );
    if (externalIdExample && !recommendedTests.includes(externalIdExample)) {
      recommendedTests.push(externalIdExample);
    }
  });

  // Limit to reasonable test set (max 50 URLs)
  const limitedTests = recommendedTests.slice(0, 50);

  // Identify potentially unsupported patterns
  const unsupportedPatterns = Array.from(allPotentialIssues).filter(issue =>
    issue.includes('may not be') || issue.includes('may cause')
  );

  // Calculate coverage percentage (estimate based on patterns that seem supportable)
  const supportedPatterns = Array.from(categories.values()).filter(cat =>
    cat.potentialIssues.length === 0 ||
    !cat.potentialIssues.some(issue => issue.includes('may not be'))
  );

  const supportedUrlCount = supportedPatterns.reduce((sum, cat) => sum + cat.examples.length, 0);
  const coveragePercentage = Math.round((supportedUrlCount / urls.length) * 100);

  return {
    totalUrls: urls.length,
    categories: Array.from(categories.values()),
    unsupportedPatterns,
    recommendedTests: limitedTests,
    coveragePercentage
  };
}

function main() {
  try {
    console.log('🔍 Analyzing OpenAlex URL patterns for bookmarking coverage...\n');

    // Read URLs from JSON file
    const jsonPath = path.join(process.cwd(), 'openalex-urls.json');
    const urls = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log(`📊 Total URLs to analyze: ${urls.length}\n`);

    // Analyze URLs
    const analysis = analyzeUrls(urls);

    // Generate report
    console.log('📋 URL PATTERN ANALYSIS REPORT\n');
    console.log('='.repeat(50));
    console.log(`Total URLs analyzed: ${analysis.totalUrls}`);
    console.log(`Estimated bookmarking coverage: ${analysis.coveragePercentage}%`);
    console.log(`Unique patterns identified: ${analysis.categories.length}`);
    console.log(`Recommended test URLs: ${analysis.recommendedTests.length}\n`);

    // Categories by entity type
    console.log('🏷️  URL PATTERNS BY ENTITY TYPE:');
    console.log('-'.repeat(30));

    const entityTypes = new Map<string, URLCategory[]>();
    analysis.categories.forEach(cat => {
      if (!entityTypes.has(cat.entityType)) {
        entityTypes.set(cat.entityType, []);
      }
      entityTypes.get(cat.entityType)!.push(cat);
    });

    entityTypes.forEach((categories, entityType) => {
      console.log(`\n${entityType.toUpperCase()} (${categories.length} patterns):`);

      categories.forEach(cat => {
        const totalExamples = cat.examples.length;
        const hasIssues = cat.potentialIssues.length > 0;
        const statusIcon = hasIssues ? '⚠️' : '✅';

        console.log(`  ${statusIcon} ${cat.pattern} (${cat.complexity}): ${totalExamples} URLs`);

        if (cat.potentialIssues.length > 0) {
          cat.potentialIssues.forEach(issue => {
            console.log(`    ⚠️  ${issue}`);
          });
        }
      });
    });

    // Potential issues
    if (analysis.unsupportedPatterns.length > 0) {
      console.log('\n⚠️  POTENTIAL SUPPORT ISSUES:');
      console.log('-'.repeat(30));
      analysis.unsupportedPatterns.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }

    // Recommended tests
    console.log('\n🧪 RECOMMENDED TEST URLS:');
    console.log('-'.repeat(30));
    console.log(`Selected ${analysis.recommendedTests.length} representative URLs:\n`);

    analysis.recommendedTests.forEach((url, index) => {
      const category = categorizeUrl(url);
      console.log(`${index + 1}. ${url}`);
      console.log(`   Category: ${category.entityType}/${category.pattern} (${category.complexity})`);
      if (category.potentialIssues.length > 0) {
        console.log(`   Issues: ${category.potentialIssues.join(', ')}`);
      }
      console.log('');
    });

    // Summary
    console.log('📊 SUMMARY:');
    console.log('-'.repeat(15));
    console.log(`• Total URL patterns: ${analysis.totalUrls}`);
    console.log(`• Estimated coverage: ${analysis.coveragePercentage}%`);
    console.log(`• Potential issues: ${analysis.unsupportedPatterns.length}`);
    console.log(`• Tests recommended: ${analysis.recommendedTests.length}`);

    // Save detailed analysis to file
    const reportPath = path.join(process.cwd(), `url-pattern-analysis-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      analysis,
      generatedAt: new Date().toISOString()
    }, null, 2));

    console.log(`\n💾 Detailed analysis saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error analyzing URLs:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}