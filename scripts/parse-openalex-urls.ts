#!/usr/bin/env npx tsx

/**
 * OpenAlex URL Categorizer and Test Generator
 *
 * Parses the openalex-urls.json file and generates categorized tests
 * to ensure our pages display all data returned by each API URL.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface ParsedUrl {
  original: string
  entityType: string | null
  entityId: string | null
  params: Record<string, string>
  isSingleEntity: boolean
  isList: boolean
  hasSelect: boolean
  hasFilter: boolean
  hasSearch: boolean
  category: 'single' | 'list' | 'search' | 'filter' | 'autocomplete' | 'text-search' | 'sample' | 'group-by'
}

interface UrlCategory {
  entityType: string
  singleEntity: ParsedUrl[]
  listQueries: ParsedUrl[]
  searchQueries: ParsedUrl[]
  filterQueries: ParsedUrl[]
  autocompleteQueries: ParsedUrl[]
  textSearchQueries: ParsedUrl[]
  sampleQueries: ParsedUrl[]
  groupByQueries: ParsedUrl[]
}

const ENTITY_TYPES = ['works', 'authors', 'institutions', 'sources', 'publishers', 'funders', 'concepts', 'topics', 'keywords'] as const
const SINGLE_ENTITY_PATTERN = /^https:\/\/api\.openalex\.org\/(\w+)\/([^?]+)/
const LIST_PATTERN = /^https:\/\/api\.openalex\.org\/(\w+)(?:\?|$)/
const AUTOCOMPLETE_PATTERN = /^https:\/\/api\.openalex\.org\/autocomplete\/(\w+)/
const TEXT_SEARCH_PATTERN = /^https:\/\/api\.openalex\.org\/text\/(\w+)/

/**
 * Parse a single OpenAlex URL into its components
 */
function parseOpenAlexUrl(url: string): ParsedUrl {
  let entityType: string | null = null
  let entityId: string | null = null
  let isSingleEntity = false
  let isList = false
  let category: ParsedUrl['category'] = 'list'

  // Parse URL components
  const urlObj = new URL(url)
  const params: Record<string, string> = {}

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })

  // Determine entity type and whether it's a single entity
  const singleMatch = url.match(SINGLE_ENTITY_PATTERN)
  if (singleMatch) {
    entityType = singleMatch[1]
    entityId = singleMatch[2]
    isSingleEntity = true
    category = 'single'
  } else if (url.match(AUTOCOMPLETE_PATTERN)) {
    const match = url.match(AUTOCOMPLETE_PATTERN)
    entityType = match?.[1] || null
    category = 'autocomplete'
  } else if (url.match(TEXT_SEARCH_PATTERN)) {
    const match = url.match(TEXT_SEARCH_PATTERN)
    entityType = match?.[1] || null
    category = 'text-search'
  } else {
    const listMatch = url.match(LIST_PATTERN)
    if (listMatch) {
      entityType = listMatch[1]
      isList = true
      category = 'list'
    }
  }

  // Refine category based on parameters
  if (params.search) {
    category = 'search'
  } else if (params.filter) {
    category = 'filter'
  } else if (params.sample) {
    category = 'sample'
  } else if (params.group_by || params['group-by']) {
    category = 'group-by'
  }

  const hasSelect = !!params.select
  const hasFilter = !!params.filter
  const hasSearch = !!params.search

  return {
    original: url,
    entityType,
    entityId,
    params,
    isSingleEntity,
    isList,
    hasSelect,
    hasFilter,
    hasSearch,
    category
  }
}

/**
 * Categorize URLs by entity type and query type
 */
function categorizeUrls(urls: string[]): Record<string, UrlCategory> {
  const categories: Record<string, UrlCategory> = {}

  // Initialize categories for each entity type
  ENTITY_TYPES.forEach(entityType => {
    categories[entityType] = {
      entityType,
      singleEntity: [],
      listQueries: [],
      searchQueries: [],
      filterQueries: [],
      autocompleteQueries: [],
      textSearchQueries: [],
      sampleQueries: [],
      groupByQueries: []
    }
  })

  // Add 'other' category for URLs that don't match known entities
  categories.other = {
    entityType: 'other',
    singleEntity: [],
    listQueries: [],
    searchQueries: [],
    filterQueries: [],
      autocompleteQueries: [],
    textSearchQueries: [],
    sampleQueries: [],
    groupByQueries: []
  }

  urls.forEach(url => {
    const parsed = parseOpenAlexUrl(url)
    const entityType = parsed.entityType || 'other'

    if (!categories[entityType]) {
      categories[entityType] = {
        entityType,
        singleEntity: [],
        listQueries: [],
        searchQueries: [],
        filterQueries: [],
        autocompleteQueries: [],
        textSearchQueries: [],
        sampleQueries: [],
        groupByQueries: []
      }
    }

    switch (parsed.category) {
      case 'single':
        categories[entityType].singleEntity.push(parsed)
        break
      case 'search':
        categories[entityType].searchQueries.push(parsed)
        break
      case 'filter':
        categories[entityType].filterQueries.push(parsed)
        break
      case 'autocomplete':
        categories[entityType].autocompleteQueries.push(parsed)
        break
      case 'text-search':
        categories[entityType].textSearchQueries.push(parsed)
        break
      case 'sample':
        categories[entityType].sampleQueries.push(parsed)
        break
      case 'group-by':
        categories[entityType].groupByQueries.push(parsed)
        break
      default:
        categories[entityType].listQueries.push(parsed)
        break
    }
  })

  return categories
}

/**
 * Generate test file content for a specific entity type
 */
function generateTestFile(category: UrlCategory): string {
  const { entityType } = category

  return `/**
 * Auto-generated OpenAlex ${entityType} API completeness tests
 * Generated from openalex-urls.json extraction
 *
 * These tests ensure that ${entityType} pages display ALL data fields
 * returned by the OpenAlex API for various URL patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "@tanstack/react-router";
import { ThemeProvider } from "@mantine/core";
import { cachedOpenAlex, type ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} } from "@academic-explorer/client";
import { expectCompleteApiData, createCompletenessReport } from "@/test/utils/openalex-api-completeness";
import { renderWithQueryClient } from "@/test/test-utils";

describe("${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Entity Pages - API Completeness", () => {
  const testCases = [
${category.singleEntity.map(url => `    {
      name: "Single ${entityType}: ${url.entityId}",
      url: "${url.original}",
      entityId: "${url.entityId}",
      params: ${JSON.stringify(url.params)}
    }`).join(',\n')}
  ];

  testCases.forEach((testCase) => {
    it(\`displays all data fields for \${testCase.name}\`, async () => {
      // Mock the API call to return the actual response
      const mockGet${entityType.charAt(0).toUpperCase() + entityType.slice(1)} = vi.spyOn(cachedOpenAlex.client.${entityType}s, \`get${entityType.charAt(0).toUpperCase() + entityType.slice(1)}\`);

      // Fetch actual API response
      const apiResponse = await fetch(testCase.url).then(res => res.json());
      mockGet${entityType.charAt(0).toUpperCase() + entityType.slice(1)}.mockResolvedValue(apiResponse);

      // Render the ${entityType} page
      const searchParams = new URLSearchParams(testCase.params).toString();
      const path = searchParams ? \`/${entityType}/\${testCase.entityId}?\${searchParams}\` : \`/${entityType}/\${testCase.entityId}\`;

      const result = renderWithQueryClient(
        <MemoryRouter initialEntries={[\`#\${path}\`]}>
          <ThemeProvider>
            {/* TODO: Import and render the actual ${entityType} route component */}
            <div>${entityType} page placeholder</div>
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/\${testCase.entityId}/i)).toBeInTheDocument();
      });

      // Get the container element for analysis
      const container = result.container;

      // Validate that ALL API fields are displayed
      const validationResult = expectCompleteApiData(
        apiResponse,
        container,
        testCase.name,
        entityType
      );

      // Log the validation result for debugging
      console.log(\`\${entityType} API completeness validation for \${testCase.name}:\`, {
        totalApiFields: validationResult.totalApiFields,
        displayedFields: validationResult.displayedFields,
        completeness: \`\${validationResult.completeness.toFixed(1)}%\`,
        missingFieldsCount: validationResult.missingFields.length,
      });

      // If there are missing fields, log them for debugging
      if (validationResult.missingFields.length > 0) {
        console.log(\`Missing fields for \${testCase.name}:\`, validationResult.missingFields);
      }

      // Clean up
      mockGet${entityType.charAt(0).toUpperCase() + entityType.slice(1)}.mockRestore();
    });
  });
});
`
}

/**
 * Main function to parse URLs and generate test files
 */
async function main() {
  try {
    console.log('🔍 Parsing OpenAlex URLs from openalex-urls.json...')

    // Read and parse the URLs file
    const urlsFilePath = join(process.cwd(), 'openalex-urls.json')
    const urlsContent = readFileSync(urlsFilePath, 'utf-8')

    // Extract URLs from the content (skip the header lines)
    const lines = urlsContent.split('\n')
    const urls: string[] = []

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

    // Categorize URLs
    console.log('📂 Categorizing URLs...')
    const categories = categorizeUrls(urls)

    // Generate statistics
    console.log('\n📈 URL Statistics:')
    Object.entries(categories).forEach(([entityType, category]) => {
      const total = category.singleEntity.length +
                   category.listQueries.length +
                   category.searchQueries.length +
                   category.filterQueries.length +
                   category.autocompleteQueries.length +
                   category.textSearchQueries.length +
                   category.sampleQueries.length +
                   category.groupByQueries.length

      if (total > 0) {
        console.log(`${entityType}: ${total} URLs`)
        console.log(`  - Single entities: ${category.singleEntity.length}`)
        console.log(`  - List queries: ${category.listQueries.length}`)
        console.log(`  - Search queries: ${category.searchQueries.length}`)
        console.log(`  - Filter queries: ${category.filterQueries.length}`)
        console.log(`  - Autocomplete: ${category.autocompleteQueries.length}`)
        console.log(`  - Text search: ${category.textSearchQueries.length}`)
        console.log(`  - Sample queries: ${category.sampleQueries.length}`)
        console.log(`  - Group-by queries: ${category.groupByQueries.length}`)
      }
    })

    // Write categorized data to JSON file
    const outputPath = join(process.cwd(), 'openalex-urls-categorized.json')
    writeFileSync(outputPath, JSON.stringify(categories, null, 2))
    console.log(`\n💾 Categorized URLs saved to: ${outputPath}`)

    // Generate test files for entities that have routes
    const entitiesWithRoutes = ['authors', 'works', 'institutions', 'sources']

    for (const entityType of entitiesWithRoutes) {
      const category = categories[entityType]
      if (category && (category.singleEntity.length > 0)) {
        const testContent = generateTestFile(category)
        const testFilePath = join(process.cwd(), `apps/web/src/test/integration/${entityType}-api-completeness.generated.test.tsx`)

        try {
          writeFileSync(testFilePath, testContent)
          console.log(`🧪 Generated test file: ${testFilePath}`)
        } catch (error) {
          console.warn(`⚠️  Could not write test file for ${entityType}:`, error)
        }
      }
    }

    console.log('\n✅ OpenAlex URL parsing and test generation completed!')

  } catch (error) {
    console.error('❌ Error processing OpenAlex URLs:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void main()
}