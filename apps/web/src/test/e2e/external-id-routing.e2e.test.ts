import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * External ID Routing Fix Test
 *
 * Tests the fix for handling external IDs with colons in URLs.
 * These previously failed due to hash router limitations, but now
 * should be properly redirected to dedicated external ID routes.
 */

test.describe('External ID Routing with Colons', () => {
  test.setTimeout(30000);

  test('should handle ROR ID with colon - ror:02y3ad647', async ({ page }) => {
    const testUrl = `${BASE_URL}/#/api-openalex-org/institutions/ror:02y3ad647`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Should redirect to /institutions/ror/02y3ad647
    const currentUrl = page.url();
    expect(currentUrl).toContain('/institutions/ror/02y3ad647');

    // Wait for content to load
    await page.waitForSelector('main', { timeout: 10000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error page
    expect(mainText).not.toContain('Error');
    expect(mainText).not.toContain('Not Found');
  });

  test('should handle ROR ID with colon - ror:00cvxb145', async ({ page }) => {
    const testUrl = `${BASE_URL}/#/api-openalex-org/institutions/ror:00cvxb145`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Should redirect to /institutions/ror/00cvxb145
    const currentUrl = page.url();
    expect(currentUrl).toContain('/institutions/ror/00cvxb145');

    // Wait for content to load
    await page.waitForSelector('main', { timeout: 10000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error page
    expect(mainText).not.toContain('Error');
    expect(mainText).not.toContain('Not Found');
  });

  test('should handle ISSN with colon - issn:2041-1723', async ({ page }) => {
    const testUrl = `${BASE_URL}/#/api-openalex-org/sources/issn:2041-1723`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Should redirect to /sources/issn/2041-1723
    const currentUrl = page.url();
    expect(currentUrl).toContain('/sources/issn/2041-1723');

    // Wait for content to load
    await page.waitForSelector('main', { timeout: 10000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error page
    expect(mainText).not.toContain('Error');
    expect(mainText).not.toContain('Not Found');
  });

  test('should handle full API URL with ROR', async ({ page }) => {
    const testUrl = `${BASE_URL}/#/https://api.openalex.org/institutions/ror:02y3ad647`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Should redirect through api-openalex-org route
    await page.waitForSelector('main', { timeout: 10000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error page
    expect(mainText).not.toContain('Error');
    expect(mainText).not.toContain('Not Found');
  });

  test('should handle full API URL with ISSN', async ({ page }) => {
    const testUrl = `${BASE_URL}/#/https://api.openalex.org/sources/issn:2041-1723`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Should redirect through api-openalex-org route
    await page.waitForSelector('main', { timeout: 10000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error page
    expect(mainText).not.toContain('Error');
    expect(mainText).not.toContain('Not Found');
  });
});
