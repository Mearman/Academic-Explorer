#!/usr/bin/env node

/**
 * OpenAlex API URL Testing Script
 *
 * Tests that our application can handle the various URL patterns
 * extracted from the OpenAlex documentation.
 */

const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

// Sample URLs from each entity type to test
const SAMPLE_URLS = {
  authors: [
    'https://api.openalex.org/authors/A5023888391',
    'https://api.openalex.org/authors/A5023888391?select=id,display_name,orcid',
    'https://api.openalex.org/authors/https://orcid.org/0000-0002-1298-3089'
  ],
  works: [
    'https://api.openalex.org/works/W2741809807',
    'https://api.openalex.org/works/W2741809807?select=id,display_name',
    'https://api.openalex.org/works/https://doi.org/10.7717/peerj.4375'
  ],
  institutions: [
    'https://api.openalex.org/institutions/I27837315',
    'https://api.openalex.org/institutions/I27837315?select=id,display_name',
    'https://api.openalex.org/institutions/ror:https://ror.org/02y3ad647'
  ],
  sources: [
    'https://api.openalex.org/sources/S137773608',
    'https://api.openalex.org/sources/S137773608?select=id,display_name',
    'https://api.openalex.org/sources/issn:2041-1723'
  ]
}

/**
 * Fetch data from an OpenAlex API URL and analyze the response
 */
async function testOpenAlexUrl(url) {
  try {
    console.log(`🔍 Testing: ${url}`)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Analyze the response
    const analysis = {
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      dataSize: JSON.stringify(data).length,
      fieldCount: typeof data === 'object' ? Object.keys(data).length : 0,
      isArray: Array.isArray(data),
      id: data.id || data.id || null,
      display_name: data.display_name || null,
      hasSelect: url.includes('select='),
      selectFields: url.includes('select=') ? new URL(url).searchParams.get('select').split(',') : []
    }

    console.log(`✅ Success: ${analysis.fieldCount} fields, ${analysis.dataSize} bytes`)

    return analysis

  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return {
      url,
      error: error.message,
      status: 'error'
    }
  }
}

/**
 * Generate a test comparison for our UI vs API response
 */
function generateUiComparisonTest(entityType, urlAnalysis) {
  const entityId = urlAnalysis.id ? urlAnalysis.id.split('/').pop() : 'unknown'
  const searchParams = new URL(urlAnalysis.url).searchParams

  return {
    entityType,
    entityId,
    apiUrl: urlAnalysis.url,
    uiUrl: `http://localhost:5173/#/${entityType}/${entityId}${searchParams.toString() ? '?' + searchParams.toString() : ''}`,
    apiFieldCount: urlAnalysis.fieldCount,
    hasSelectParam: !!searchParams.get('select'),
    selectFields: searchParams.get('select')?.split(',') || [],
    testInstructions: [
      `1. Navigate to: ${entityType}/${entityId}`,
      `2. Compare UI display with API response from: ${urlAnalysis.url}`,
      `3. Verify all ${urlAnalysis.fieldCount} API fields are displayed in the UI`,
      `4. Check select parameter handling: ${searchParams.get('select') || 'none'}`,
      `5. Test toggle between raw and rich view modes`
    ]
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 Testing OpenAlex URL patterns extracted from documentation...\n')

  const results = {}
  const testComparisons = []

  for (const [entityType, urls] of Object.entries(SAMPLE_URLS)) {
    console.log(`\n📂 Testing ${entityType} URLs:`)
    console.log('='.repeat(50))

    results[entityType] = []

    for (const url of urls) {
      const analysis = await testOpenAlexUrl(url)
      results[entityType].push(analysis)

      if (analysis.status !== 'error') {
        const comparison = generateUiComparisonTest(entityType, analysis)
        testComparisons.push(comparison)
      }
    }
  }

  // Save results
  const resultsPath = join(process.cwd(), 'openalex-url-test-results.json')
  writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Test results saved to: ${resultsPath}`)

  // Save UI comparison tests
  const comparisonsPath = join(process.cwd(), 'ui-comparison-tests.json')
  writeFileSync(comparisonsPath, JSON.stringify(testComparisons, null, 2))
  console.log(`📋 UI comparison tests saved to: ${comparisonsPath}`)

  // Generate summary
  const totalUrls = Object.values(SAMPLE_URLS).flat().length
  const successfulUrls = Object.values(results).flat().filter(r => r.status !== 'error').length
  const failedUrls = totalUrls - successfulUrls

  console.log('\n📊 Test Summary:')
  console.log(`Total URLs tested: ${totalUrls}`)
  console.log(`Successful: ${successfulUrls}`)
  console.log(`Failed: ${failedUrls}`)
  console.log(`Success rate: ${((successfulUrls / totalUrls) * 100).toFixed(1)}%`)

  if (failedUrls > 0) {
    console.log('\n❌ Failed URLs:')
    Object.entries(results).forEach(([entityType, tests]) => {
      tests.filter(test => test.status === 'error').forEach(test => {
        console.log(`  ${entityType}: ${test.url} - ${test.error}`)
      })
    })
  }

  console.log('\n🎯 Next Steps:')
  console.log('1. Check the UI comparison tests file for manual testing instructions')
  console.log('2. Navigate to each URL in your browser')
  console.log('3. Compare the UI display with the API response fields')
  console.log('4. Verify that all select parameters work correctly')

  console.log('\n✅ OpenAlex URL testing completed!')
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}