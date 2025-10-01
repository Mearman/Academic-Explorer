import { test, expect } from '@playwright/test';

test.describe('OpenAlex URL Routing E2E Tests', () => {
  test.beforeEach(async ({ browser }) => {
    // Assume app is built and running at localhost:5173
    // In CI, this would be handled by project.json e2e setup
  });

  const testScenarios = [
    // 1. Single entity redirect
    {
      url: 'https://api.openalex.org/W2741809807',
      expectedUrl: '/works/W2741809807',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Work');
      },
    },
    // 2. List query with filter
    {
      url: 'https://api.openalex.org/works?filter=publication_year:2020',
      expectedUrl: '/works?filter=publication_year:2020',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Works');
        // Assert table renders (stub)
        await expect(page.locator('[data-testid="table"]')).toBeVisible();
      },
    },
    // 3. Autocomplete
    {
      url: 'https://api.openalex.org/autocomplete/authors?q=ronald',
      expectedUrl: '/autocomplete/authors?q=ronald',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Autocomplete Authors');
      },
    },
    // 4. With sort param
    {
      url: 'https://api.openalex.org/authors?sort=cited_by_count:desc',
      expectedUrl: '/authors?sort=cited_by_count:desc',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Authors');
      },
    },
    // 5. Paging params
    {
      url: 'https://api.openalex.org/works?per_page=50&page=2',
      expectedUrl: '/works?per_page=50&page=2',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Works');
      },
    },
    // 6. Sample param
    {
      url: 'https://api.openalex.org/institutions?sample=10',
      expectedUrl: '/institutions?sample=10',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Institutions');
      },
    },
    // 7. Group by
    {
      url: 'https://api.openalex.org/authors?group_by=last_known_institutions.continent',
      expectedUrl: '/authors?group_by=last_known_institutions.continent',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Authors');
      },
    },
    // 8. Search param
    {
      url: 'https://api.openalex.org/works?search=dna',
      expectedUrl: '/works?search=dna',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Works');
      },
    },
    // 9. Fallback to search
    {
      url: 'https://api.openalex.org/keywords',
      expectedUrl: '/search?q=https%3A%2F%2Fapi.openalex.org%2Fkeywords',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Search');
      },
    },
    // 10. Encoded params and invalid detection
    {
      url: 'https://api.openalex.org/invalid/id?filter=display_name.search:john%20smith',
      expectedUrl: '/search?q=https%3A%2F%2Fapi.openalex.org%2Finvalid%2Fid%3Ffilter%3Ddisplay_name.search%3Ajohn%2520smith',
      assertUI: async (page) => {
        await expect(page.locator('h1')).toContainText('Search');
      },
    },
  ];

  test.each(testScenarios)('should handle $url and redirect to $expectedUrl', async ({ url, expectedUrl, assertUI }) => {
    const page = await test.browser.newPage();
    const testUrl = `http://localhost:5173/#${encodeURIComponent(`/openalex-url/${url}`)}`;

    await page.goto(testUrl);

    await expect(page).toHaveURL(new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    await assertUI(page);

    await page.close();
  });
});