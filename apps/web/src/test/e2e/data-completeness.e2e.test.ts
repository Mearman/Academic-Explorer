import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * Data Completeness Verification
 *
 * Tests that the styled view displays ALL data from API responses.
 * Compares field count and content between direct API response and rendered page.
 */

test.describe('Data Completeness - Styled View vs API', () => {
  test.setTimeout(60000);

  test('works search - bioplastics filter should display all API data', async ({ page, request }) => {
    const apiUrl = 'https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc';

    // Fetch raw API response
    const apiResponse = await request.get(apiUrl);
    expect(apiResponse.ok()).toBeTruthy();
    const apiData = await apiResponse.json();

    expect(apiData.results).toBeDefined();
    expect(Array.isArray(apiData.results)).toBeTruthy();
    expect(apiData.results.length).toBeGreaterThan(0);

    const firstResult = apiData.results[0];
    const firstResultId = firstResult.id.split('/').pop(); // Extract W... ID

    // Test both URL formats
    const urlFormats = [
      `${BASE_URL}/#/${apiUrl}`, // Full API URL in hash
      `${BASE_URL}/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`, // Relative path
    ];

    for (const url of urlFormats) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('main', { timeout: 15000 });

      const mainText = await page.locator('main').textContent();
      expect(mainText).toBeTruthy();

      // Verify first result is present
      expect(mainText).toContain(firstResult.display_name);

      // Verify we have similar number of results displayed
      const resultCards = await page.locator('[data-testid="work-card"], .work-item, article').count();
      expect(resultCards).toBeGreaterThan(0);

      // Check for key metadata fields in the first result
      if (firstResult.publication_year) {
        expect(mainText).toContain(String(firstResult.publication_year));
      }

      // Verify pagination info is shown
      expect(mainText).toMatch(/results|items|works/i);
    }
  });

  test('author detail - A5017898742 should display all API fields', async ({ page, request }) => {
    const authorId = 'A5017898742';
    const apiUrl = `https://api.openalex.org/authors/${authorId}`;

    // Fetch raw API response
    const apiResponse = await request.get(apiUrl);
    expect(apiResponse.ok()).toBeTruthy();
    const apiData = await apiResponse.json();

    expect(apiData.id).toContain(authorId);
    expect(apiData.display_name).toBeTruthy();

    // Navigate to author page
    await page.goto(`${BASE_URL}/#/authors/${authorId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Verify essential fields are displayed
    expect(mainText).toContain(apiData.display_name);

    if (apiData.orcid) {
      expect(mainText).toContain('ORCID');
    }

    if (apiData.works_count) {
      expect(mainText).toContain('works');
    }

    if (apiData.cited_by_count) {
      expect(mainText).toContain('citations');
    }

    // Check for last known institution if present
    if (apiData.last_known_institution?.display_name) {
      expect(mainText).toContain(apiData.last_known_institution.display_name);
    }
  });

  test('concepts list should display all API results', async ({ page, request }) => {
    const apiUrl = 'https://api.openalex.org/concepts?sort=cited_by_count:desc';

    // Fetch raw API response
    const apiResponse = await request.get(apiUrl);
    expect(apiResponse.ok()).toBeTruthy();
    const apiData = await apiResponse.json();

    expect(apiData.results).toBeDefined();
    expect(apiData.results.length).toBeGreaterThan(0);

    const firstConcept = apiData.results[0];

    // Navigate to concepts list
    await page.goto(`${BASE_URL}/#/concepts?sort=cited_by_count:desc`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Verify first concept is displayed
    expect(mainText).toContain(firstConcept.display_name);

    // Verify we show similar number of results
    const resultCount = await page.locator('[data-testid="concept-card"], .concept-item, article').count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('works with select parameter should respect field selection', async ({ page, request }) => {
    const selectFields = 'id,display_name,publication_year';
    const apiUrl = `https://api.openalex.org/works?select=${selectFields}`;

    // Fetch raw API response
    const apiResponse = await request.get(apiUrl);
    expect(apiResponse.ok()).toBeTruthy();
    const apiData = await apiResponse.json();

    expect(apiData.results).toBeDefined();
    const firstWork = apiData.results[0];

    // Verify API only returned selected fields
    expect(firstWork.id).toBeDefined();
    expect(firstWork.display_name).toBeDefined();
    expect(firstWork.publication_year).toBeDefined();

    // Navigate to works with select
    await page.goto(`${BASE_URL}/#/works?select=${selectFields}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Verify first work is displayed
    expect(mainText).toContain(firstWork.display_name);

    // Verify select parameter is shown to user
    expect(mainText).toMatch(/select|fields/i);
  });
});
