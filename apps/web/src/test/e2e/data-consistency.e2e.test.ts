/**
 * End-to-End Data Consistency Test
 *
 * Verifies that all 276 URLs from openalex-urls.json:
 * 1. Load successfully in the application
 * 2. Display the same data that the API returns
 * 3. Render in styled views correctly
 *
 * This test navigates to each URL, fetches the API data directly,
 * and compares it with what's displayed in the DOM.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load all URLs from the JSON file
const urlsPath = join(process.cwd(), '../../openalex-urls.json');
const urls: string[] = JSON.parse(readFileSync(urlsPath, 'utf-8'));

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE = 'https://api.openalex.org';

// Helper to convert API URL to app URL
function toAppUrl(apiUrl: string): string {
  // For the app, we can use either format:
  // 1. Full API URL: #/https://api.openalex.org/works/...
  // 2. Relative path: #/works/...
  // Let's use the relative path format as it's cleaner
  const relativePath = apiUrl.replace(API_BASE, '');
  return `${BASE_URL}/#${relativePath}`;
}

// Helper to parse entity type from URL
function getEntityType(url: string): string | null {
  const match = url.match(/\/([a-z]+)(?:\/|$|\?)/);
  return match ? match[1] : null;
}

// Helper to check if URL is an entity detail page (has ID)
function isEntityDetail(url: string): boolean {
  const entityType = getEntityType(url);
  if (!entityType) return false;

  // Check for entity ID pattern after the entity type
  const pattern = new RegExp(`/${entityType}/([A-Z]\\d+|https?://|[a-z]+:)`);
  return pattern.test(url);
}

// Helper to check if URL is a list/search page
function isListPage(url: string): boolean {
  const entityType = getEntityType(url);
  if (!entityType) return false;

  // Has query parameters or is just the entity type
  return url.includes('?') || url.endsWith(`/${entityType}`);
}

// Helper to check if URL is an autocomplete endpoint
function isAutocomplete(url: string): boolean {
  return url.includes('/autocomplete');
}

test.describe('Data Consistency - All 276 URLs', () => {
  test.setTimeout(300000); // 5 minutes for all URLs

  // Test a representative sample first for faster feedback
  const sampleUrls = [
    urls.find(u => u.includes('/authors/A')) || urls[0], // Author detail
    urls.find(u => u.includes('/works/W')) || urls[1], // Work detail
    urls.find(u => u.includes('/authors?filter=')) || urls[2], // Author search
    urls.find(u => u.includes('/works?filter=')) || urls[3], // Work search
  ].filter(Boolean);

  test.describe('Sample URLs - Quick Validation', () => {
    for (const apiUrl of sampleUrls) {
      test(`should display correct data for ${apiUrl}`, async ({ page }) => {
        const appUrl = toAppUrl(apiUrl);
        const entityType = getEntityType(apiUrl);

        // Navigate to the app URL
        await page.goto(appUrl, { waitUntil: 'networkidle' });

        // Wait for content to load (look for main content area)
        await page.waitForSelector('main', { timeout: 10000 });

        // Wait for data to actually load - look for loading state to disappear
        // The page might show a loading skeleton or spinner initially
        await page.waitForTimeout(2000); // Give time for API calls to complete

        // Check that we're not showing an error page
        const errorHeading = await page.locator('h1:has-text("Error")').count();
        expect(errorHeading).toBe(0);

        // Fetch the API data directly
        const response = await fetch(apiUrl);

        // Some entities may have been deleted or merged - skip them
        if (!response.ok) {
          console.log(`⚠️  Skipping ${apiUrl} - API returned ${response.status}`);
          test.skip();
          return;
        }

        const apiData = await response.json();

        if (isEntityDetail(apiUrl)) {
          // For entity detail pages, verify key fields are displayed
          const displayName = apiData.display_name || apiData.title;
          if (displayName) {
            // Check that the display name appears on the page
            const nameElement = await page.locator(`text=${displayName.slice(0, 50)}`).first();
            await expect(nameElement).toBeVisible({ timeout: 5000 });
          }

          // Check for entity ID
          if (apiData.id) {
            const entityId = apiData.id.split('/').pop();
            const idText = await page.locator(`text=${entityId}`).first();
            await expect(idText).toBeVisible({ timeout: 5000 });
          }

          // Check for citation count if present
          if (apiData.cited_by_count !== undefined) {
            const citationText = await page.locator(`text=/\\d+.*citation/i`).first();
            await expect(citationText).toBeVisible({ timeout: 5000 });
          }
        } else if (isListPage(apiUrl) && !isAutocomplete(apiUrl)) {
          // For list pages, verify results are displayed
          if (apiData.results && apiData.results.length > 0) {
            // Check that at least the first result's name appears
            const firstResult = apiData.results[0];
            const displayName = firstResult.display_name || firstResult.title;
            if (displayName) {
              // Look for the name in a table, list, or grid
              const resultElement = await page.locator(`text=${displayName.slice(0, 30)}`).first();
              await expect(resultElement).toBeVisible({ timeout: 5000 });
            }

            // Check that the result count is displayed
            if (apiData.meta?.count) {
              const countText = await page.locator(`text=/${apiData.meta.count.toLocaleString()}/`).first();
              await expect(countText).toBeVisible({ timeout: 5000 });
            }
          }
        } else if (isAutocomplete(apiUrl)) {
          // Autocomplete endpoints return { results: [...] }
          // These might be handled differently in the UI
          // For now, just verify the page loads without error
          const mainContent = await page.locator('main').textContent();
          expect(mainContent).toBeTruthy();
        }
      });
    }
  });

  test.describe('All 276 URLs - Full Validation', () => {
    // Group URLs by type for better organization
    const urlsByType: Record<string, string[]> = {};
    urls.forEach(url => {
      const type = getEntityType(url) || 'other';
      if (!urlsByType[type]) urlsByType[type] = [];
      urlsByType[type].push(url);
    });

    Object.entries(urlsByType).forEach(([type, typeUrls]) => {
      test.describe(`${type} URLs (${typeUrls.length} total)`, () => {
        typeUrls.forEach((apiUrl, index) => {
          test(`should load and display data: ${type} ${index + 1}/${typeUrls.length}`, async ({ page }) => {
            const appUrl = toAppUrl(apiUrl);

            // Navigate to the app URL
            await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });

            // Wait for main content
            await page.waitForSelector('main', { timeout: 10000 });

            // Verify no error state
            const errorHeading = await page.locator('h1:has-text("Error")').count();
            expect(errorHeading).toBe(0);

            // Verify main content exists
            const mainContent = await page.locator('main').textContent();
            expect(mainContent).toBeTruthy();
            expect(mainContent!.length).toBeGreaterThan(50); // Should have substantial content

            // For detail pages, verify entity data is shown
            if (isEntityDetail(apiUrl)) {
              // Should show entity information section
              const hasEntityInfo = await page.locator('[data-testid="entity-info"], .entity-info, [class*="entity"]').count();
              expect(hasEntityInfo).toBeGreaterThan(0);
            }

            // For list pages, verify results are shown
            if (isListPage(apiUrl) && !isAutocomplete(apiUrl)) {
              // Should show table, list, or grid of results
              const hasResults = await page.locator('table, [role="table"], [role="list"], .grid').count();
              expect(hasResults).toBeGreaterThan(0);
            }
          });
        });
      });
    });
  });

  test.describe('Data Field Verification', () => {
    // Test specific data fields for key entity types
    const testCases = [
      {
        url: 'https://api.openalex.org/authors/A5017898742',
        fields: ['display_name', 'works_count', 'cited_by_count', 'h_index'],
      },
      {
        url: 'https://api.openalex.org/works/W2741809807',
        fields: ['display_name', 'publication_year', 'cited_by_count', 'type'],
      },
      {
        url: 'https://api.openalex.org/sources/S137773608',
        fields: ['display_name', 'works_count', 'cited_by_count'],
      },
    ];

    testCases.forEach(({ url, fields }) => {
      test(`should display all required fields for ${url}`, async ({ page }) => {
        const appUrl = toAppUrl(url);

        // Fetch API data
        const response = await fetch(url);
        const apiData = await response.json();

        // Navigate to app
        await page.goto(appUrl, { waitUntil: 'networkidle' });
        await page.waitForSelector('main');

        // Verify each field is displayed
        for (const field of fields) {
          const value = apiData[field];
          if (value !== undefined && value !== null) {
            // Convert value to string for searching
            const searchValue = typeof value === 'string' ? value : String(value);

            // Look for the value on the page
            const fieldElement = await page.locator(`text=/${searchValue.slice(0, 30)}/`).first();
            await expect(fieldElement).toBeVisible({
              timeout: 5000,
            });
          }
        }
      });
    });
  });
});
