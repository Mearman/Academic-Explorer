#!/usr/bin/env node

/**
 * Quick verification of bookmark routing functionality
 * Tests a few representative URLs to verify the analysis
 */

const testUrls = [
  // Single entity (should work)
  'https://api.openalex.org/authors/A5023888391',
  // External ID (should work)
  'https://api.openalex.org/authors/https://orcid.org/0000-0002-1298-3089',
  // Entity list (should work)
  'https://api.openalex.org/authors?filter=display_name.search:einstein',
  // Complex filter (may have issues)
  'https://api.openalex.org/works?filter=institutions.country_code:fr|gb',
  // Autocomplete (should work)
  'https://api.openalex.org/autocomplete/authors?q=einst',
  // Text endpoint (likely not supported)
  'https://api.openalex.org/text/concepts?title=test'
];

console.log('🔍 Quick URL Routing Verification\n');

testUrls.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);

  // Analyze URL pattern
  let category = 'unknown';
  let expectedRouting = 'unknown';

  if (url.match(/\/(works|authors|institutions|sources|concepts|publishers|funders|topics)\/[A-Z]\d+$/)) {
    category = 'single-entity';
    expectedRouting = `/${url.split('/')[3]}/${url.split('/')[4]}`;
  } else if (url.includes('/orcid.org/') || url.includes('orcid:')) {
    category = 'external-id-orcid';
    expectedRouting = '/authors/orcid/[ID]';
  } else if (url.includes('ror.org') || url.includes('ror:')) {
    category = 'external-id-ror';
    expectedRouting = '/institutions/ror/[ID]';
  } else if (url.includes('issn:')) {
    category = 'external-id-issn';
    expectedRouting = '/sources/issn/[ISSN]';
  } else if (url.includes('/autocomplete/')) {
    category = 'autocomplete';
    expectedRouting = '/autocomplete/[path]';
  } else if (url.includes('/text/')) {
    category = 'text-endpoint';
    expectedRouting = 'Not supported (no UI equivalent)';
  } else if (url.match(/\/(works|authors|institutions|sources|concepts|publishers|funders|topics)(\?.*)?$/)) {
    category = 'entity-list';
    const entityType = url.split('/')[3];
    expectedRouting = `/${entityType}`;
  }

  console.log(`   Category: ${category}`);
  console.log(`   Expected routing: ${expectedRouting}`);

  // Check for potential issues
  const issues = [];
  if (url.includes('cursor=')) issues.push('Cursor pagination not bookmarkable');
  if (url.includes('api_key=')) issues.push('API key parameter may need sanitization');
  if (url.includes('|')) issues.push('Pipe separators in filters may cause issues');
  if (url.includes('%22%20AND%20')) issues.push('Complex boolean search may have issues');
  if (url.includes('mailto=')) issues.push('Email parameter not supported');

  if (issues.length > 0) {
    console.log(`   ⚠️  Potential issues: ${issues.join(', ')}`);
  } else {
    console.log(`   ✅ Should be supported`);
  }

  console.log('');
});

console.log('📊 Expected Bookmarking Support:');
console.log('✅ Full support: single-entity, external-ids, simple entity lists, autocomplete');
console.log('⚠️  Partial support: complex filters, multi-parameter URLs');
console.log('❌ No support: text endpoints, API-specific parameters');