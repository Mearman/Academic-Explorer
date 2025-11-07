import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://mearman.github.io/Academic-Explorer';

/**
 * Deployed Site Verification
 *
 * Tests critical functionality on the live GitHub Pages deployment:
 * 1. Author A5017898742 (user-specified test URL)
 * 2. ROR external IDs (newly fixed)
 * 3. Bioplastics search (data completeness)
 * 4. All 8 entity types
 */

test.describe('Deployed Site - Critical Verification', () => {
  test.setTimeout(60000);

  test('should load author A5017898742 correctly', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/#/authors/A5017898742`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should show author content, not error
    expect(mainText).not.toContain('Not Found');
    expect(mainText).not.toContain('Error loading');

    // Should show some author data
    const hasAuthorData =
      mainText!.includes('works') ||
      mainText!.includes('citations') ||
      mainText!.includes('h-index');
    expect(hasAuthorData).toBeTruthy();
  });

  test('should handle ROR external ID - ror:02y3ad647', async ({ page }) => {
    const testUrl = `${DEPLOYED_URL}/#/openalex-url/institutions/ror:02y3ad647`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error
    expect(mainText).not.toContain('Not Found');
    expect(mainText).not.toContain('Error');
    expect(mainText).not.toContain('Invalid');
  });

  test('should handle ROR external ID - ror:00cvxb145', async ({ page }) => {
    const testUrl = `${DEPLOYED_URL}/#/openalex-url/institutions/ror:00cvxb145`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error
    expect(mainText).not.toContain('Not Found');
    expect(mainText).not.toContain('Error');
  });

  test('should display bioplastics search results with all data', async ({
    page,
  }) => {
    const testUrl = `${DEPLOYED_URL}/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should show bioplastics-related content
    expect(mainText!.toLowerCase()).toContain('bioplastic');

    // Should show pagination or results info
    const hasResults =
      mainText!.includes('results') ||
      mainText!.includes('entries') ||
      mainText!.includes('works');
    expect(hasResults).toBeTruthy();

    // Should not be empty or error
    expect(mainText).not.toContain('No results');
    expect(mainText).not.toContain('Error');
  });

  test.describe('All Entity Types', () => {
    const entityTypes = [
      { type: 'works', id: 'W2741809807' },
      { type: 'authors', id: 'A5017898742' },
      { type: 'sources', id: 'S137773608' },
      { type: 'institutions', id: 'I27837315' },
      { type: 'concepts', id: 'C71924100' },
      { type: 'publishers', id: 'P4310320006' },
      { type: 'funders', id: 'F4320332161' },
      { type: 'topics', id: 'T10002' },
    ];

    entityTypes.forEach(({ type, id }) => {
      test(`should load ${type} entity - ${id}`, async ({ page }) => {
        await page.goto(`${DEPLOYED_URL}/#/${type}/${id}`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        await page.waitForSelector('main', { timeout: 15000 });

        const mainText = await page.locator('main').textContent();
        expect(mainText).toBeTruthy();

        // Should not show error
        expect(mainText).not.toContain('Not Found');
        expect(mainText).not.toContain('Error loading');
      });
    });
  });

  test('should handle full API URL format', async ({ page }) => {
    const testUrl = `${DEPLOYED_URL}/#/https://api.openalex.org/works?filter=display_name.search:bioplastics`;

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for content to load - could be works results or loading state
    await page.waitForSelector('main', { timeout: 15000 });

    // Give additional time for async content loading
    await page.waitForTimeout(3000);

    const mainText = await page.locator('main').textContent();

    // Check that we have content (either results or loading state)
    expect(mainText).toBeTruthy();
    expect(mainText!.length).toBeGreaterThan(0);

    // Should not show error states
    expect(mainText).not.toContain('Error loading');
    expect(mainText).not.toContain('Failed to load');
    expect(mainText).not.toContain('An error occurred');

    // If we have loaded content, check for bioplastic or loading indicators
    const lowerMainText = mainText!.toLowerCase();
    const hasResults = lowerMainText.includes('bioplastic') ||
                     lowerMainText.includes('work') ||
                     lowerMainText.includes('result') ||
                     lowerMainText.includes('loading') ||
                     lowerMainText.includes('filter');

    expect(hasResults).toBeTruthy();
  });
});
