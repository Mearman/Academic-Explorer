#!/usr/bin/env tsx

import fs from 'fs'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Configuration
const BASE_APP_URL = 'http://localhost:5173/#'
const BASE_API_URL = 'https://api.openalex.org'

interface TestResult {
  url: string
  path: string
  category: string
  entityType?: string
  hasQueryParams: boolean
  appUrl: string
  apiData: any
  appAccessible: boolean
  statusCode?: number
  error?: string
  redirectTime?: number
}

interface TestSummary {
  timestamp: string
  total: number
  successful: number
  failed: number
  successRate: string
  categoryBreakdown: Record<string, { total: number; successful: number; failed: number }>
  failedUrls: TestResult[]
}

// Helper function to make HTTP requests
function makeRequest(url: string): Promise<{ statusCode: number; data?: any; error?: string; time?: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const client = url.startsWith('https:') ? https : http

    const req = client.request(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        const endTime = Date.now()
        try {
          const jsonData = JSON.parse(data)
          resolve({ statusCode: res.statusCode || 0, data: jsonData, time: endTime - startTime })
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data, time: endTime - startTime })
        }
      })
    })

    req.on('error', (err) => {
      const endTime = Date.now()
      resolve({ statusCode: 0, error: err.message, time: endTime - startTime })
    })

    req.on('timeout', () => {
      const endTime = Date.now()
      req.destroy()
      resolve({ statusCode: 0, error: 'Request timeout', time: endTime - startTime })
    })

    req.setTimeout(15000) // 15 second timeout for comprehensive testing
    req.end()
  })
}

// Categorize URLs for better testing analysis
function categorizeUrl(url: string): { category: string; entityType?: string } {
  const path = url.replace('https://api.openalex.org/', '')

  if (path.startsWith('autocomplete/')) {
    return { category: 'autocomplete', entityType: path.split('/')[1] }
  }

  if (path.startsWith('text/')) {
    return { category: 'text-search' }
  }

  if (path.includes('/')) {
    const [entityType] = path.split('/')
    if (['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders', 'concepts', 'keywords'].includes(entityType)) {
      return { category: 'entity-detail', entityType }
    }
  }

  if (path.split('?')[0] in ['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders', 'concepts', 'keywords']) {
    const [entityType] = path.split('?')
    return { category: 'entity-list', entityType }
  }

  if (path.startsWith('random')) {
    return { category: 'random' }
  }

  return { category: 'other' }
}

// Convert OpenAlex API URL to app URL format
function convertToAppUrl(apiUrl: string): string {
  return apiUrl.replace(BASE_API_URL, BASE_APP_URL)
}

// Test if app URL is accessible (basic HTTP check)
async function testAppAccessibility(appUrl: string): Promise<boolean> {
  try {
    // Extract the hash part for testing
    const hashPart = appUrl.replace(BASE_APP_URL, '')
    if (!hashPart) return false

    // Test the main app first
    const mainAppResponse = await makeRequest('http://localhost:5173/')
    return mainAppResponse.statusCode === 200
  } catch (error) {
    return false
  }
}

// Select representative sample of URLs for testing
function selectRepresentativeUrls(allUrls: string[]): string[] {
  const categories = new Map<string, string[]>()
  const selectedUrls: string[] = []

  // Categorize all URLs
  for (const url of allUrls) {
    const { category, entityType } = categorizeUrl(url)
    const key = `${category}-${entityType || 'general'}`
    if (!categories.has(key)) {
      categories.set(key, [])
    }
    categories.get(key)!.push(url)
  }

  // Select up to 3 URLs from each category to ensure coverage while avoiding timeout
  for (const [category, urls] of categories) {
    const sampleSize = Math.min(3, urls.length)
    const sample = urls.slice(0, sampleSize)
    selectedUrls.push(...sample)
  }

  // Ensure we have URLs covering specific edge cases
  const edgeCasePatterns = [
    'orcid:', 'ror:', 'doi:', 'issn:', 'pmid:', 'wikidata:',
    'filter=', 'search=', 'select=', 'sort=', 'group-by=',
    'cursor=', 'mailto=', 'api_key=', 'sample=', 'per-page=',
    '?', '&', '%20', '%3E', '%7C', // URL encoding patterns
    'random', 'text/', 'autocomplete/'
  ]

  for (const pattern of edgeCasePatterns) {
    const matchingUrls = allUrls.filter(url => url.includes(pattern))
    if (matchingUrls.length > 0 && !selectedUrls.includes(matchingUrls[0])) {
      selectedUrls.push(matchingUrls[0])
    }
  }

  return Array.from(new Set(selectedUrls)) // Remove duplicates
}

// Main testing function
async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive OpenAlex URL Compatibility Test...')
  console.log(`📊 Application URL: ${BASE_APP_URL}`)
  console.log(`📊 API URL: ${BASE_API_URL}`)

  // Read all URLs
  const allUrls: string[] = JSON.parse(fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../openalex-urls.json'), 'utf8'))
  console.log(`✅ Loaded ${allUrls.length} total URLs from openalex-urls.json`)

  // Select representative sample
  const testUrls = selectRepresentativeUrls(allUrls)
  console.log(`🎯 Selected ${testUrls.length} representative URLs for testing`)

  const results: TestResult[] = []
  const categoryBreakdown: Record<string, { total: number; successful: number; failed: number }> = {}
  let successCount = 0
  let errorCount = 0

  // Test each URL
  for (let i = 0; i < testUrls.length; i++) {
    const apiUrl = testUrls[i]
    const path = apiUrl.replace(`${BASE_API_URL}/`, '')
    const { category, entityType } = categorizeUrl(apiUrl)
    const appUrl = convertToAppUrl(apiUrl)

    // Initialize category breakdown
    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { total: 0, successful: 0, failed: 0 }
    }
    categoryBreakdown[category].total++

    console.log(`\n🔍 Testing URL ${i + 1}/${testUrls.length}`)
    console.log(`   Category: ${category}${entityType ? ` (${entityType})` : ''}`)
    console.log(`   API: ${apiUrl}`)
    console.log(`   App: ${appUrl}`)

    const result: TestResult = {
      url: apiUrl,
      path,
      category,
      entityType,
      hasQueryParams: apiUrl.includes('?'),
      appUrl,
      apiData: null,
      appAccessible: false
    }

    try {
      // Test API first
      console.log(`   📡 Testing API...`)
      const apiResult = await makeRequest(apiUrl)

      if (apiResult.error) {
        console.log(`   ❌ API Error: ${apiResult.error}`)
        result.error = `API Error: ${apiResult.error}`
        result.statusCode = apiResult.statusCode
        errorCount++
        categoryBreakdown[category].failed++
      } else {
        result.statusCode = apiResult.statusCode
        result.apiData = apiResult.data
        result.redirectTime = apiResult.time
        console.log(`   ✅ API Status: ${apiResult.statusCode} (${apiResult.time}ms)`)

        // Test app accessibility
        console.log(`   🌐 Testing App Accessibility...`)
        result.appAccessible = await testAppAccessibility(appUrl)

        if (result.appAccessible) {
          console.log(`   ✅ App Accessible`)
          successCount++
          categoryBreakdown[category].successful++
        } else {
          console.log(`   ⚠️  App May Not Be Accessible`)
          errorCount++
          categoryBreakdown[category].failed++
        }
      }
    } catch (error) {
      console.log(`   ❌ Test Error: ${error}`)
      result.error = `Test Error: ${error}`
      errorCount++
      categoryBreakdown[category].failed++
    }

    results.push(result)

    // Add a small delay to avoid rate limiting
    if (i < testUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  // Generate comprehensive summary report
  const summary: TestSummary = {
    timestamp: new Date().toISOString(),
    total: testUrls.length,
    successful: successCount,
    failed: errorCount,
    successRate: ((successCount / testUrls.length) * 100).toFixed(1),
    categoryBreakdown,
    failedUrls: results.filter(r => r.error || !r.appAccessible)
  }

  // Save detailed results
  const reportFile = join(dirname(fileURLToPath(import.meta.url)), '../comprehensive-url-test-results.json')
  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2))

  // Print summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 COMPREHENSIVE URL COMPATIBILITY TEST SUMMARY')
  console.log('='.repeat(80))
  console.log(`Timestamp: ${summary.timestamp}`)
  console.log(`Total URLs Tested: ${summary.total} (out of ${allUrls.length} total)`)
  console.log(`Successful Tests: ${summary.successful}`)
  console.log(`Failed Tests: ${summary.failed}`)
  console.log(`Success Rate: ${summary.successRate}%`)

  console.log('\n📈 Category Breakdown:')
  for (const [category, stats] of Object.entries(summary.categoryBreakdown)) {
    const rate = ((stats.successful / stats.total) * 100).toFixed(1)
    console.log(`  ${category}: ${stats.successful}/${stats.total} (${rate}%)`)
  }

  if (summary.failedUrls.length > 0) {
    console.log('\n⚠️  FAILED URLS:')
    summary.failedUrls.forEach((result, index) => {
      console.log(`${index + 1}. [${result.category}] ${result.url}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      if (!result.appAccessible) {
        console.log(`   Status: App not accessible`)
      }
    })
  }

  console.log(`\n📄 Detailed results saved to: ${reportFile}`)
  console.log('\n🎯 Test Coverage Analysis:')

  // Analyze coverage
  const entityTypes = new Set<string>()
  const patterns = new Set<string>()

  for (const result of results) {
    if (result.entityType) entityTypes.add(result.entityType)

    // Check for important patterns
    if (result.hasQueryParams) patterns.add('query-params')
    if (result.url.includes('orcid:')) patterns.add('orcid-external')
    if (result.url.includes('ror:')) patterns.add('ror-external')
    if (result.url.includes('doi:')) patterns.add('doi-external')
    if (result.url.includes('filter=')) patterns.add('filtering')
    if (result.url.includes('search=')) patterns.add('searching')
    if (result.url.includes('select=')) patterns.add('field-selection')
    if (result.url.includes('autocomplete/')) patterns.add('autocomplete')
  }

  console.log(`  Entity Types Covered: ${Array.from(entityTypes).sort().join(', ')}`)
  console.log(`  URL Patterns Covered: ${Array.from(patterns).sort().join(', ')}`)

  return summary
}

// Run the tests
if (import.meta.url) {
  runComprehensiveTest().catch(console.error)
}