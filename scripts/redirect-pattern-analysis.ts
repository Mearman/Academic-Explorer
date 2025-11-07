#!/usr/bin/env tsx

import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

interface RedirectPattern {
  pattern: RegExp
  replacement: string
  description: string
}

interface URLAnalysis {
  originalUrl: string
  path: string
  category: string
  entityType?: string
  hasQueryParams: boolean
  queryParams: Record<string, string>
  redirects: {
    webApp: string[]
    api: string[]
  }
  canonicalRoutes: {
    webApp: string
    api: string
  }
  supported: boolean
  edgeCases: string[]
}

interface AnalysisSummary {
  timestamp: string
  totalUrls: number
  supportedUrls: number
  unsupportedUrls: number
  coverage: {
    entityTypes: Record<string, number>
    urlCategories: Record<string, number>
    redirectPatterns: Record<string, number>
  }
  edgeCases: string[]
  recommendations: string[]
}

// Define redirect patterns from the application
const REDIRECT_PATTERNS: RedirectPattern[] = [
  // API redirect patterns
  {
    pattern: /^\/api\/https:\/\/api\.openalex\.org\/(.*)/,
    replacement: "/api/openalex/$1",
    description: "API: Full OpenAlex HTTPS URL"
  },
  {
    pattern: /^\/api\/https:\/\/openalex\.org\/(.*)/,
    replacement: "/api/openalex/$1",
    description: "API: OpenAlex HTTPS URL"
  },
  {
    pattern: /^\/api\/api\.openalex\.org\/(.*)/,
    replacement: "/api/openalex/$1",
    description: "API: api.openalex.org without protocol"
  },
  {
    pattern: /^\/api\/openalex\.org\/(.*)/,
    replacement: "/api/openalex/$1",
    description: "API: openalex.org without protocol"
  },
  {
    pattern: /^\/api\/([A-Z]\d+.*)/,
    replacement: "/api/openalex/$1",
    description: "API: Direct OpenAlex entity ID"
  },
  {
    pattern: /^\/api\/(works|authors|sources|institutions|topics|publishers|funders|keywords|concepts|autocomplete|text)/,
    replacement: "/api/openalex/$1",
    description: "API: Entity endpoints"
  }
]

// Entity detection patterns
const ENTITY_PATTERNS = [
  { pattern: /^[W]\d+$/, entityType: 'works', description: 'OpenAlex Work ID' },
  { pattern: /^[A]\d+$/, entityType: 'authors', description: 'OpenAlex Author ID' },
  { pattern: /^[S]\d+$/, entityType: 'sources', description: 'OpenAlex Source ID' },
  { pattern: /^[I]\d+$/, entityType: 'institutions', description: 'OpenAlex Institution ID' },
  { pattern: /^[T]\d+$/, entityType: 'topics', description: 'OpenAlex Topic ID' },
  { pattern: /^[P]\d+$/, entityType: 'publishers', description: 'OpenAlex Publisher ID' },
  { pattern: /^[F]\d+$/, entityType: 'funders', description: 'OpenAlex Funder ID' },
  { pattern: /^[C]\d+$/, entityType: 'concepts', description: 'OpenAlex Concept ID' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/works\/[W]\d+/, entityType: 'works', description: 'OpenAlex Work URL' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/authors\/[A]\d+/, entityType: 'authors', description: 'OpenAlex Author URL' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/sources\/[S]\d+/, entityType: 'sources', description: 'OpenAlex Source URL' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/institutions\/[I]\d+/, entityType: 'institutions', description: 'OpenAlex Institution URL' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/topics\/[T]\d+/, entityType: 'topics', description: 'OpenAlex Topic URL' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/publishers\/[P]\d+/, entityType: 'publishers', description: 'OpenAlex Publisher URL' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/funders\/[F]\d+/, entityType: 'funders', description: 'OpenAlex Funder URL' },
  { pattern: /^https?:\/\/(api\.)?openalex\.org\/concepts\/[C]\d+/, entityType: 'concepts', description: 'OpenAlex Concept URL' },
  { pattern: /^https?:\/\/orcid\.org\//, entityType: 'authors', description: 'ORCID URL' },
  { pattern: /^orcid:/, entityType: 'authors', description: 'ORCID ID with prefix' },
  { pattern: /^https?:\/\/ror\.org\//, entityType: 'institutions', description: 'ROR URL' },
  { pattern: /^ror:/, entityType: 'institutions', description: 'ROR ID with prefix' },
  { pattern: /^https?:\/\/doi\.org\//, entityType: 'works', description: 'DOI URL' },
  { pattern: /^doi:/, entityType: 'works', description: 'DOI with prefix' },
  { pattern: /^https?:\/\/(dx\.)?doi\.org\/10\//, entityType: 'works', description: 'DOI URL (alternative)' },
  { pattern: /^pmid:/, entityType: 'works', description: 'PubMed ID with prefix' },
  { pattern: /^https?:\/\/(www\.)?wikidata\.org\/entity\/[Q]\d+/, entityType: 'concepts', description: 'Wikidata URL' },
  { pattern: /^[Q]\d+$/, entityType: 'concepts', description: 'Wikidata ID' },
  { pattern: /^issn:/, entityType: 'sources', description: 'ISSN with prefix' },
]

function parseQueryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return {}

  const queryString = url.substring(queryIndex + 1)
  const params = new URLSearchParams(queryString)
  const result: Record<string, string> = {}

  params.forEach((value, key) => {
    result[key] = value
  })

  return result
}

function detectEntityType(urlOrId: string): { entityType?: string; method?: string; description?: string } {
  for (const { pattern, entityType, description } of ENTITY_PATTERNS) {
    if (pattern.test(urlOrId)) {
      return { entityType, method: description, description: `Detected as ${description}` }
    }
  }
  return {}
}

function categorizeUrl(url: string): string {
  const path = url.replace('https://api.openalex.org/', '')

  if (path.startsWith('autocomplete/')) return 'autocomplete'
  if (path.startsWith('text/')) return 'text-search'
  if (path.includes('/') && !path.includes('?')) return 'entity-detail'
  if (path.includes('?')) return 'collection-query'
  if (path === 'random' || path.endsWith('/random')) return 'random'
  if (path === 'works' || path === 'authors' || path === 'sources' || path === 'institutions' || path === 'topics' || path === 'publishers' || path === 'funders' || path === 'concepts' || path === 'keywords') return 'entity-list'

  return 'other'
}

function generateRedirectVariations(originalUrl: string): { webApp: string[]; api: string[] } {
  const path = originalUrl.replace('https://api.openalex.org/', '')

  const webAppVariations = [
    `#/https://api.openalex.org/${path}`,
    `#/https://openalex.org/${path}`,
    `#/api.openalex.org/${path}`,
    `#/openalex.org/${path}`,
    `#/${path}`,
  ]

  const apiVariations = [
    `/api/https://api.openalex.org/${path}`,
    `/api/https://openalex.org/${path}`,
    `/api/api.openalex.org/${path}`,
    `/api/openalex.org/${path}`,
    `/api/${path}`,
  ]

  return { webApp: webAppVariations, api: apiVariations }
}

function determineCanonicalRoutes(path: string, entityType?: string): { webApp: string; api: string } {
  // Extract entity type and ID from path
  const pathSegments = path.split("/")
  if (pathSegments.length >= 2 && !path.includes('?')) {
    const detectedEntityType = pathSegments[0]
    const entityId = pathSegments[1]
    return {
      webApp: `#/${detectedEntityType}/${entityId}`,
      api: `/api/openalex/${path}`
    }
  }

  // For collection routes (e.g., "works?filter=...")
  if (pathSegments.length === 1 && path.includes('?')) {
    const [entityType] = pathSegments[0].split('?')
    return {
      webApp: `#/${entityType}`,
      api: `/api/openalex/${path}`
    }
  }

  return {
    webApp: `#/${path}`,
    api: `/api/openalex/${path}`
  }
}

function testRedirectPatterns(url: string, variations: string[]): { successful: string[]; failed: string[] } {
  const successful: string[] = []
  const failed: string[] = []

  for (const variation of variations) {
    let redirected = false
    for (const { pattern, replacement } of REDIRECT_PATTERNS) {
      if (pattern.test(variation)) {
        const redirectTarget = variation.replace(pattern, replacement)
        if (redirectTarget.match(/^\/api\/openalex\//)) {
          successful.push(`${variation} -> ${redirectTarget}`)
          redirected = true
          break
        }
      }
    }

    if (!redirected) {
      // If no redirect pattern matches, check if it's already canonical
      if (variation.match(/^\/api\/openalex\//)) {
        successful.push(`${variation} (already canonical)`)
      } else {
        failed.push(variation)
      }
    }
  }

  return { successful, failed }
}

function identifyEdgeCases(url: string, path: string): string[] {
  const edgeCases: string[] = []

  // Check for special characters
  if (url.includes('%') && !url.includes('%20') && !url.includes('%3E') && !url.includes('%7C')) {
    edgeCases.push('URL encoding complexity')
  }

  if (url.includes('|')) edgeCases.push('pipe character in filter')
  if (url.includes('>')) edgeCases.push('greater-than operator in filter')
  if (url.includes('&')) edgeCases.push('multiple query parameters')

  if (url.includes('cursor=')) edgeCases.push('pagination cursor')
  if (url.includes('mailto=')) edgeCases.push('mailto parameter')
  if (url.includes('api_key=')) edgeCases.push('API key parameter')
  if (url.includes('group-by=')) edgeCases.push('group-by parameter')
  if (url.includes('sample=')) edgeCases.push('sample parameter')
  if (url.includes('per-page=')) edgeCases.push('per-page parameter')

  if (url.includes('random')) edgeCases.push('random endpoint')
  if (url.includes('text/')) edgeCases.push('text search endpoint')
  if (url.includes('autocomplete/')) edgeCases.push('autocomplete endpoint')

  // External IDs
  if (url.includes('orcid:')) edgeCases.push('ORCID external ID')
  if (url.includes('ror:')) edgeCases.push('ROR external ID')
  if (url.includes('doi:')) edgeCases.push('DOI external ID')
  if (url.includes('pmid:')) edgeCases.push('PubMed ID external ID')
  if (url.includes('issn:')) edgeCases.push('ISSN external ID')
  if (url.includes('wikidata:')) edgeCases.push('Wikidata external ID')

  return edgeCases
}

async function analyzeURLCompatibility(): Promise<AnalysisSummary> {
  console.log('🔍 Starting Redirect Pattern Analysis...')

  // Read all URLs
  const allUrls: string[] = JSON.parse(fs.readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../openalex-urls.json'), 'utf8'))
  console.log(`✅ Loaded ${allUrls.length} URLs from openalex-urls.json`)

  const analyses: URLAnalysis[] = []
  const coverage = {
    entityTypes: {} as Record<string, number>,
    urlCategories: {} as Record<string, number>,
    redirectPatterns: {} as Record<string, number>
  }
  const allEdgeCases = new Set<string>()

  // Analyze each URL
  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i]
    const path = url.replace('https://api.openalex.org/', '')
    const category = categorizeUrl(url)
    const queryParams = parseQueryParams(url)
    const hasQueryParams = Object.keys(queryParams).length > 0

    // Detect entity type
    const entityDetection = detectEntityType(path)
    const entityType = entityDetection.entityType

    // Track coverage
    if (entityType) {
      coverage.entityTypes[entityType] = (coverage.entityTypes[entityType] || 0) + 1
    }
    coverage.urlCategories[category] = (coverage.urlCategories[category] || 0) + 1

    // Generate redirect variations
    const redirects = generateRedirectVariations(url)
    const canonicalRoutes = determineCanonicalRoutes(path, entityType)

    // Test redirect patterns
    const apiRedirectTest = testRedirectPatterns(url, redirects.api)

    // Identify edge cases
    const edgeCases = identifyEdgeCases(url, path)
    edgeCases.forEach(edgeCase => allEdgeCases.add(edgeCase))

    const analysis: URLAnalysis = {
      originalUrl: url,
      path,
      category,
      entityType,
      hasQueryParams,
      queryParams,
      redirects,
      canonicalRoutes,
      supported: apiRedirectTest.failed.length === 0,
      edgeCases
    }

    analyses.push(analysis)

    // Track redirect pattern usage
    redirects.api.forEach(apiVariation => {
      for (const { description } of REDIRECT_PATTERNS) {
        if (apiVariation.match(REDIRECT_PATTERNS.find(p => p.description === description)?.pattern || /./)) {
          coverage.redirectPatterns[description] = (coverage.redirectPatterns[description] || 0) + 1
        }
      }
    })

    if ((i + 1) % 50 === 0) {
      console.log(`📊 Analyzed ${i + 1}/${allUrls.length} URLs...`)
    }
  }

  // Generate recommendations
  const recommendations: string[] = []
  const unsupportedUrls = analyses.filter(a => !a.supported)

  if (unsupportedUrls.length > 0) {
    recommendations.push(`❌ ${unsupportedUrls.length} URLs (${((unsupportedUrls.length / analyses.length) * 100).toFixed(1)}%) are not fully supported by current redirect patterns`)

    // Find common patterns in unsupported URLs
    const unsupportedPatterns = new Map<string, number>()
    unsupportedUrls.forEach(url => {
      const pattern = url.path.split('?')[0].split('/')[0]
      unsupportedPatterns.set(pattern, (unsupportedPatterns.get(pattern) || 0) + 1)
    })

    recommendations.push('\n🔧 Recommended fixes for unsupported patterns:')
    for (const [pattern, count] of Array.from(unsupportedPatterns.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      recommendations.push(`  - Add support for "${pattern}" pattern (${count} URLs affected)`)
    }
  }

  // Edge case recommendations
  if (allEdgeCases.size > 0) {
    recommendations.push(`\n⚠️  Identified ${allEdgeCases.size} unique edge cases to test:`)
    Array.from(allEdgeCases).sort().forEach(edgeCase => {
      recommendations.push(`  - ${edgeCase}`)
    })
  }

  const supportedUrls = analyses.filter(a => a.supported).length

  const summary: AnalysisSummary = {
    timestamp: new Date().toISOString(),
    totalUrls: analyses.length,
    supportedUrls,
    unsupportedUrls: unsupportedUrls.length,
    coverage,
    edgeCases: Array.from(allEdgeCases),
    recommendations
  }

  // Save detailed analysis
  const reportFile = join(dirname(fileURLToPath(import.meta.url)), '../redirect-pattern-analysis.json')
  fs.writeFileSync(reportFile, JSON.stringify({ summary, analyses }, null, 2))

  // Print summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 REDIRECT PATTERN ANALYSIS SUMMARY')
  console.log('='.repeat(80))
  console.log(`Timestamp: ${summary.timestamp}`)
  console.log(`Total URLs Analyzed: ${summary.totalUrls}`)
  console.log(`Supported URLs: ${summary.supportedUrls} (${((summary.supportedUrls / summary.totalUrls) * 100).toFixed(1)}%)`)
  console.log(`Unsupported URLs: ${summary.unsupportedUrls} (${((summary.unsupportedUrls / summary.totalUrls) * 100).toFixed(1)}%)`)

  console.log('\n📈 Coverage by Entity Type:')
  for (const [entityType, count] of Object.entries(summary.coverage.entityTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${entityType}: ${count} URLs`)
  }

  console.log('\n📂 Coverage by URL Category:')
  for (const [category, count] of Object.entries(summary.coverage.urlCategories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count} URLs`)
  }

  console.log('\n🔄 Redirect Pattern Usage:')
  for (const [pattern, count] of Object.entries(summary.coverage.redirectPatterns).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pattern}: ${count} URLs`)
  }

  if (summary.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    summary.recommendations.forEach(rec => console.log(rec))
  }

  console.log(`\n📄 Detailed analysis saved to: ${reportFile}`)

  return summary
}

// Run the analysis
if (import.meta.url) {
  analyzeURLCompatibility().catch(console.error)
}