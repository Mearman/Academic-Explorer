#!/usr/bin/env node

/**
 * OpenAlex URL Categorizer and Test Generator
 *
 * Parses the openalex-urls.json file and generates categorized tests
 * to ensure our pages display all data returned by each API URL.
 */

const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

const ENTITY_TYPES = ['works', 'authors', 'institutions', 'sources', 'publishers', 'funders', 'concepts', 'topics', 'keywords']

try {
  console.log('🔍 Parsing OpenAlex URLs from openalex-urls.json...')

  // Read and parse the URLs file
  const urlsFilePath = join(process.cwd(), 'openalex-urls.json')
  const urlsContent = readFileSync(urlsFilePath, 'utf-8')

  // Extract URLs from the content (skip the header lines)
  const lines = urlsContent.split('\n')
  const urls = []

  let inFullUrlsSection = false
  for (const line of lines) {
    if (line === '=== FULL URLs ===') {
      inFullUrlsSection = true
      continue
    }

    if (inFullUrlsSection && line.startsWith('https://api.openalex.org/')) {
      urls.push(line.trim())
    }
  }

  console.log(`📊 Found ${urls.length} URLs`)

  // Categorize URLs by entity type
  const categories = {}
  ENTITY_TYPES.forEach(entityType => {
    categories[entityType] = []
  })
  categories.other = []

  urls.forEach(url => {
    let entityType = null

    // Determine entity type
    if (url.includes('/works/')) {
      entityType = 'works'
    } else if (url.includes('/authors/')) {
      entityType = 'authors'
    } else if (url.includes('/institutions/')) {
      entityType = 'institutions'
    } else if (url.includes('/sources/')) {
      entityType = 'sources'
    } else if (url.includes('/publishers/')) {
      entityType = 'publishers'
    } else if (url.includes('/funders/')) {
      entityType = 'funders'
    } else if (url.includes('/concepts/')) {
      entityType = 'concepts'
    } else if (url.includes('/topics/')) {
      entityType = 'topics'
    } else if (url.includes('/keywords/')) {
      entityType = 'keywords'
    } else if (url.includes('/autocomplete/')) {
      // Extract entity type from autocomplete
      const match = url.match(/autocomplete\/(\w+)/)
      entityType = match ? match[1] : 'other'
    } else if (url.includes('/text/')) {
      // Extract entity type from text search
      const match = url.match(/text\/(\w+)/)
      entityType = match ? match[1] : 'other'
    } else {
      entityType = 'other'
    }

    if (!categories[entityType]) {
      categories[entityType] = []
    }

    categories[entityType].push({
      original: url,
      entityType,
      isSingleEntity: url.match(/\/(\w+)\/([^?]+)/) !== null,
      hasSelect: url.includes('select='),
      hasFilter: url.includes('filter='),
      hasSearch: url.includes('search=')
    })
  })

  // Generate statistics
  console.log('\n📈 URL Statistics:')
  Object.entries(categories).forEach(([entityType, urls]) => {
    if (urls.length > 0) {
      const singleEntities = urls.filter(u => u.isSingleEntity).length
      const hasSelect = urls.filter(u => u.hasSelect).length
      const hasFilter = urls.filter(u => u.hasFilter).length
      const hasSearch = urls.filter(u => u.hasSearch).length

      console.log(`${entityType}: ${urls.length} URLs`)
      console.log(`  - Single entities: ${singleEntities}`)
      console.log(`  - With select: ${hasSelect}`)
      console.log(`  - With filter: ${hasFilter}`)
      console.log(`  - With search: ${hasSearch}`)
    }
  })

  // Write categorized data to JSON file
  const outputPath = join(process.cwd(), 'openalex-urls-categorized.json')
  writeFileSync(outputPath, JSON.stringify(categories, null, 2))
  console.log(`\n💾 Categorized URLs saved to: ${outputPath}`)

  // Create a summary for entities with routes
  const entitiesWithRoutes = ['authors', 'works', 'institutions', 'sources']
  const testSummary = {}

  entitiesWithRoutes.forEach(entityType => {
    const entityUrls = categories[entityType] || []
    const singleEntities = entityUrls.filter(u => u.isSingleEntity)

    testSummary[entityType] = {
      total: entityUrls.length,
      singleEntity: singleEntities.length,
      sampleUrls: singleEntities.slice(0, 5).map(u => u.original)
    }
  })

  // Write test summary
  const summaryPath = join(process.cwd(), 'openalex-test-summary.json')
  writeFileSync(summaryPath, JSON.stringify(testSummary, null, 2))
  console.log(`📋 Test summary saved to: ${summaryPath}`)

  console.log('\n✅ OpenAlex URL parsing completed!')

} catch (error) {
  console.error('❌ Error processing OpenAlex URLs:', error)
  process.exit(1)
}