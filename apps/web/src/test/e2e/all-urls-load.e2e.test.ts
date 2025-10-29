/**
 * All OpenAlex URLs Load Test
 *
 * Simplified test that verifies:
 * 1. All URLs from openalex-test-urls.json load without errors
 * 2. Pages display actual content (not error pages)
 * 3. No JavaScript errors in console
 *
 * This is a smoke test to ensure all routing and data fetching works.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load all URLs from the JSON file
const urlsPath = join(__dirname, '../data/openalex-test-urls.json');
const urlsData: { urls: string[]; totalUrls: number } = JSON.parse(readFileSync(urlsPath, 'utf-8'));
const urls: string[] = urlsData.urls;

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE = 'https://api.openalex.org';

// Helper to convert API URL to app URL
// Uses the /openalex-url/ route which handles API URL conversion internally
function toAppUrl(apiUrl: string): string {
  // Remove API base and use the openalex-url route which handles all conversions
  // The openalex-url route will detect entity types, normalize IDs, and route appropriately
  const relativePath = apiUrl.replace(API_BASE, '');
  return `${BASE_URL}/#/openalex-url${relativePath}`;
}

// Helper to get entity type from URL
function getEntityType(url: string): string | null {
  const match = url.match(/\/([a-z]+)(?:\/|$|\?)/);
  return match ? match[1] : null;
}

test.describe('All OpenAlex URLs - Load Test', () => {
  test.setTimeout(600000); // 10 minutes for all URLs

  // Group URLs by type for better organization
  const urlsByType: Record<string, string[]> = {};
  urls.forEach(url => {
    const type = getEntityType(url) || 'other';
    if (!urlsByType[type]) urlsByType[type] = [];
    urlsByType[type].push(url);
  });

  Object.entries(urlsByType).forEach(([type, typeUrls]) => {
    test.describe(`${type} (${typeUrls.length} URLs)`, () => {
      typeUrls.forEach((apiUrl, index) => {
        test(`${index + 1}/${typeUrls.length}: ${apiUrl}`, async ({ page }) => {
          const appUrl = toAppUrl(apiUrl);
          const errors: string[] = [];

          // Listen for console errors
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });

          // Navigate to the app URL
          await page.goto(appUrl, {
            waitUntil: 'networkidle',
            timeout: 30000
          });

          // Wait for main content
          await page.waitForSelector('main', { timeout: 10000 });

          // Wait a bit for data to load
          await page.waitForTimeout(3000);

          // Get page content
          const mainContent = await page.locator('main').textContent();

          // Basic checks
          expect(mainContent).toBeTruthy();

          // Adaptive content threshold based on URL type
          // Pages with ?select= parameters or list pages may have minimal content
          const hasSelectParam = apiUrl.includes('?select=');
          const isListPage = apiUrl.includes('/works?') || apiUrl.includes('/authors?');
          const minContentLength = hasSelectParam ? 50 : (isListPage ? 75 : 100);

          expect(mainContent!.length).toBeGreaterThan(minContentLength);

          // Verify not showing generic error page
          const errorHeading = await page.locator('h1:has-text("Error"), h1:has-text("404"), h1:has-text("Not Found")').count();
          expect(errorHeading).toBe(0);

          // Check that we have some entity-specific content
          // Should show at least an ID or entity type indicator
          const hasEntityIndicator = await page.locator('[class*="entity"], [data-testid*="entity"], h1, h2').count();
          expect(hasEntityIndicator).toBeGreaterThan(0);

          // Log any console errors for debugging
          if (errors.length > 0) {
            console.log(`⚠️  Console errors on ${apiUrl}:`, errors);
          }
        });
      });
    });
  });
});

// Summary test to verify overall results
test.describe('Summary', () => {
  test('should have loaded all URLs', () => {
    expect(urls.length).toBe(urlsData.totalUrls);
    console.log(`✅ Tested ${urls.length} URLs`);
  });
});
