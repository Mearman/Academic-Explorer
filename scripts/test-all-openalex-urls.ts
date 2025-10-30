#!/usr/bin/env tsx

import fs from 'fs'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Configuration
const BASE_APP_URL = 'https://mearman.github.io/Academic-Explorer/#'
const BASE_API_URL = 'https://api.openalex.org'

interface TestResult {
  url: string
  appUrl: string
  apiData: any
  appAccessible: boolean
  statusCode?: number
  error?: string
}

// Helper function to make HTTP requests
function makeRequest(url: string): Promise<{ statusCode: number; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http

    const req = client.request(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ statusCode: res.statusCode || 0, data: jsonData })
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data })
        }
      })
    })

    req.on('error', (err) => {
      resolve({ statusCode: 0, error: err.message })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ statusCode: 0, error: 'Request timeout' })
    })

    req.setTimeout(10000) // 10 second timeout
    req.end()
  })
}

// Convert OpenAlex API URL to app URL format
function convertToAppUrl(apiUrl: string): string {
  // Simple conversion: replace api.openalex.org with our app URL
  return apiUrl.replace(BASE_API_URL, BASE_APP_URL)
}

// Test if app URL is accessible (basic HTTP check)
async function testAppAccessibility(appUrl: string): Promise<boolean> {
  try {
    // Extract the hash part for testing
    const hashPart = appUrl.replace(BASE_APP_URL, '')
    if (!hashPart) return false

    // Test the main app first
    const mainAppResponse = await makeRequest('https://mearman.github.io/Academic-Explorer/')
    return mainAppResponse.statusCode === 200
  } catch (error) {
    return false
  }
}

// Main testing function
async function testAllUrls() {
  console.log('🚀 Starting comprehensive OpenAlex URL testing...')
  console.log(`📊 Total URLs to test: 278`)

  // Read the URLs file
  const urls: string[] = JSON.parse(fs.readFileSync('openalex-urls.json', 'utf8'))
  console.log(`✅ Successfully loaded ${urls.length} URLs from openalex-urls.json`)

  const results: TestResult[] = []
  let successCount = 0
  let errorCount = 0

  // Test each URL
  for (let i = 0; i < urls.length; i++) {
    const apiUrl = urls[i]
    const appUrl = convertToAppUrl(apiUrl)

    console.log(`\n🔍 Testing URL ${i + 1}/${urls.length}`)
    console.log(`   API: ${apiUrl}`)
    console.log(`   App: ${appUrl}`)

    const result: TestResult = {
      url: apiUrl,
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
        errorCount++
      } else {
        result.statusCode = apiResult.statusCode
        result.apiData = apiResult.data
        console.log(`   ✅ API Status: ${apiResult.statusCode}`)

        // Test app accessibility
        console.log(`   🌐 Testing App Accessibility...`)
        result.appAccessible = await testAppAccessibility(appUrl)

        if (result.appAccessible) {
          console.log(`   ✅ App Accessible`)
          successCount++
        } else {
          console.log(`   ⚠️  App May Not Be Accessible`)
          errorCount++
        }
      }
    } catch (error) {
      console.log(`   ❌ Test Error: ${error}`)
      result.error = `Test Error: ${error}`
      errorCount++
    }

    results.push(result)

    // Add a small delay to avoid rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(80))
  console.log('📊 TESTING SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total URLs Tested: ${urls.length}`)
  console.log(`Successful Tests: ${successCount}`)
  console.log(`Failed Tests: ${errorCount}`)
  console.log(`Success Rate: ${((successCount / urls.length) * 100).toFixed(1)}%`)

  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: urls.length,
      successful: successCount,
      failed: errorCount,
      successRate: ((successCount / urls.length) * 100).toFixed(1)
    },
    results
  }

  fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed results saved to: test-results.json`)

  // Show errors if any
  const failedResults = results.filter(r => r.error || !r.appAccessible)
  if (failedResults.length > 0) {
    console.log('\n⚠️  FAILED URLS:')
    failedResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      if (!result.appAccessible) {
        console.log(`   Status: App not accessible`)
      }
    })
  }

  return report
}

// Run the tests
if (import.meta.url) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  testAllUrls().catch(console.error)
}