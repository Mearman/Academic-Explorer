/**
 * Autocomplete E2E Tests
 *
 * Tests autocomplete functionality across all entity types and the general autocomplete endpoint.
 * Verifies that the OpenAlex autocomplete API integration works correctly without invalid parameters.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Test queries for each entity type
const TEST_QUERIES = {
  general: 'machine learning',
  authors: 'Mearman',
  works: 'neural networks',
  institutions: 'MIT',
  sources: 'Nature',
  topics: 'artificial intelligence',
  publishers: 'Springer',
  funders: 'NSF',
  concepts: 'deep learning',
};

// Entity types to test
const ENTITY_TYPES = [
  'authors',
  'works',
  'institutions',
  'sources',
  'topics',
  'publishers',
  'funders',
  'concepts',
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

test.describe('Autocomplete API Integration', () => {
  test.setTimeout(120000); // 2 minutes total

  test.beforeEach(async ({ page }) => {
    // Set up console error listener
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Set up network error listener
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });
  });

  test.describe('General Autocomplete (/autocomplete)', () => {
    test('should load autocomplete page', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/autocomplete`);

      // Wait for page to load
      await page.waitForSelector('main', { timeout: 10000 });

      // Check for page title
      await expect(page.locator('h1')).toContainText('Universal Search');
    });

    test('should search and display results from all entity types', async ({ page }) => {
      const query = TEST_QUERIES.general;
      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent(query)}`);

      // Wait for search to complete
      await page.waitForSelector('main', { timeout: 10000 });

      // Wait for either results table or error message
      const hasResults = await page.locator('table').isVisible().catch(() => false);
      const hasError = await page.locator('[role="alert"]').isVisible().catch(() => false);

      if (hasResults) {
        // Verify table has results
        const rows = await page.locator('tbody tr').count();
        expect(rows).toBeGreaterThan(0);

        // Verify we have entity type badges (showing mixed entity types)
        const badges = await page.locator('[data-badge]').count();
        expect(badges).toBeGreaterThan(0);
      } else if (hasError) {
        // If there's an error, it should not be a 403 Forbidden
        const errorText = await page.locator('[role="alert"]').textContent();
        expect(errorText).not.toContain('403');
        expect(errorText).not.toContain('Forbidden');
        expect(errorText).not.toContain('per_page');
        expect(errorText).not.toContain('format');
      } else {
        throw new Error('Neither results nor error message found');
      }
    });

    test('should not send invalid per_page or format parameters', async ({ page }) => {
      const query = TEST_QUERIES.general;

      // Set up network request listener
      const requests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('openalex') && url.includes('autocomplete')) {
          requests.push(url);
        }
      });

      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent(query)}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Check that no autocomplete requests include per_page or format parameters
      const invalidRequests = requests.filter(url =>
        url.includes('/autocomplete') && (url.includes('per_page') || url.includes('format='))
      );

      expect(invalidRequests).toHaveLength(0);
    });

    test('should handle empty search query gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/autocomplete`);
      await page.waitForSelector('main', { timeout: 10000 });

      // Should show empty state message
      const emptyState = await page.locator('text=/Enter a search term/i').isVisible();
      expect(emptyState).toBeTruthy();
    });

    test('should update URL when typing in search input', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/autocomplete`);
      await page.waitForSelector('main', { timeout: 10000 });

      // Find and type in search input
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('test query');

      // Wait for debounce and URL update
      await page.waitForTimeout(600);

      // Check URL was updated
      const url = page.url();
      expect(url).toContain('q=test%20query');
    });
  });

  test.describe('Entity-Specific Autocomplete', () => {
    ENTITY_TYPES.forEach((entityType) => {
      test.describe(`/${entityType} autocomplete`, () => {
        test(`should search ${entityType} without invalid parameters`, async ({ page }) => {
          const query = TEST_QUERIES[entityType] || TEST_QUERIES.general;

          // Set up network request listener
          const autocompleteRequests: string[] = [];
          page.on('request', (request) => {
            const url = request.url();
            if (url.includes('openalex') && url.includes(`autocomplete/${entityType}`)) {
              autocompleteRequests.push(url);
            }
          });

          // Navigate to search page with entity type filter
          await page.goto(`${BASE_URL}/#/search?q=${encodeURIComponent(query)}&filter=${entityType}`);
          await page.waitForLoadState('networkidle', { timeout: 15000 });

          // Check that no autocomplete requests include per_page or format parameters
          const invalidRequests = autocompleteRequests.filter(url =>
            url.includes('per_page') || url.includes('format=')
          );

          expect(invalidRequests).toHaveLength(0);
        });

        test(`should return results for ${entityType}`, async ({ page }) => {
          const query = TEST_QUERIES[entityType] || TEST_QUERIES.general;

          await page.goto(`${BASE_URL}/#/search?q=${encodeURIComponent(query)}&filter=${entityType}`);
          await page.waitForSelector('main', { timeout: 10000 });

          // Wait for either results or error
          const hasContent = await Promise.race([
            page.locator('table').isVisible().catch(() => false),
            page.locator('[role="alert"]').isVisible().catch(() => false),
            page.waitForTimeout(10000).then(() => false),
          ]);

          expect(hasContent).toBeTruthy();
        });
      });
    });
  });

  test.describe('Header Search Input', () => {
    test('should navigate to autocomplete page when searching from header', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/`);
      await page.waitForSelector('main', { timeout: 10000 });

      // Find header search input
      const headerSearch = page.locator('input[aria-label="Global search input"]');
      await headerSearch.fill('test search');

      // Wait for debounce and navigation
      await page.waitForTimeout(600);

      // Should navigate to autocomplete page
      const url = page.url();
      expect(url).toContain('autocomplete');
      expect(url).toContain('q=test%20search');
    });

    test('should sync header search with autocomplete page query', async ({ page }) => {
      const query = 'machine learning';
      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent(query)}`);
      await page.waitForSelector('main', { timeout: 10000 });

      // Header search should be populated with the query
      const headerSearch = page.locator('input[aria-label="Global search input"]');
      const value = await headerSearch.inputValue();

      expect(value).toBe(query);
    });

    test('should clear header search when navigating away from autocomplete', async ({ page }) => {
      // First, search for something
      await page.goto(`${BASE_URL}/#/autocomplete?q=test`);
      await page.waitForSelector('main', { timeout: 10000 });

      const headerSearch = page.locator('input[aria-label="Global search input"]');
      let value = await headerSearch.inputValue();
      expect(value).toBe('test');

      // Navigate to home page
      await page.goto(`${BASE_URL}/#/`);
      await page.waitForSelector('main', { timeout: 10000 });

      // Header search should be cleared
      value = await headerSearch.inputValue();
      expect(value).toBe('');
    });
  });

  test.describe('Error Handling', () => {
    test('should not show 403 Forbidden errors', async ({ page }) => {
      const query = TEST_QUERIES.general;

      // Set up response listener to check for 403 errors
      const responses: number[] = [];
      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('openalex') && url.includes('autocomplete')) {
          responses.push(response.status());
        }
      });

      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent(query)}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Should not have any 403 responses
      const forbidden = responses.filter(status => status === 403);
      expect(forbidden).toHaveLength(0);
    });

    test('should display user-friendly error message on API failure', async ({ page }) => {
      // Use an invalid query that might cause an error
      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent('💩💩💩')}`);
      await page.waitForSelector('main', { timeout: 10000 });

      // Should either show results or a user-friendly error (not a 403 about parameters)
      const pageContent = await page.content();
      expect(pageContent).not.toContain('per_page is not a valid parameter');
      expect(pageContent).not.toContain('format is not a valid parameter');
    });
  });

  test.describe('Search Results Display', () => {
    test('should display entity type badges for mixed results', async ({ page }) => {
      const query = TEST_QUERIES.general;
      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent(query)}`);

      // Wait for page load
      await page.waitForSelector('main', { timeout: 10000 });

      // If results are present, check for entity type badges
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      if (hasTable) {
        const badges = page.locator('[data-badge], .mantine-Badge-root, text=/work|author|institution|source|topic/i');
        const count = await badges.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should make entity names clickable links', async ({ page }) => {
      const query = TEST_QUERIES.authors;
      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent(query)}`);
      await page.waitForSelector('main', { timeout: 10000 });

      // If results are present, check for clickable entity links
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      if (hasTable) {
        const links = page.locator('tbody a[href*="/"]');
        const count = await links.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should display citation counts when available', async ({ page }) => {
      const query = TEST_QUERIES.works;
      await page.goto(`${BASE_URL}/#/autocomplete?q=${encodeURIComponent(query)}`);
      await page.waitForSelector('main', { timeout: 10000 });

      // If results are present, check for citation data
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      if (hasTable) {
        // Look for either actual citation counts or the "—" placeholder
        const hasCitationColumn = await page.locator('th:has-text("Citations")').isVisible().catch(() => false);
        expect(hasCitationColumn).toBeTruthy();
      }
    });
  });
});
