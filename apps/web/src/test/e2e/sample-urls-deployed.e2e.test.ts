/**
 * Sample URLs from each entity type to verify deployment
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://mearman.github.io/Academic-Explorer';

// Sample URLs from each entity type
const testUrls = [
  { url: 'https://api.openalex.org/W2741809807', type: 'work', desc: 'Work W2741809807' },
  { url: 'https://api.openalex.org/authors/A5006060960', type: 'author', desc: 'Author A5006060960' },
  { url: 'https://api.openalex.org/concepts/C71924100', type: 'concept', desc: 'Concept C71924100' },
  { url: 'https://api.openalex.org/institutions/I4200000001', type: 'institution', desc: 'Institution' },
  { url: 'https://api.openalex.org/sources', type: 'sources-list', desc: 'Sources list' },
  { url: 'https://api.openalex.org/funders', type: 'funders-list', desc: 'Funders list' },
  { url: 'https://api.openalex.org/publishers', type: 'publishers-list', desc: 'Publishers list' },
  { url: 'https://api.openalex.org/topics', type: 'topics-list', desc: 'Topics list' },
];

function toAppUrl(apiUrl: string): string {
  const relativePath = apiUrl.replace('https://api.openalex.org', '');
  return `${BASE_URL}/#/openalex-url${relativePath}`;
}

test.describe('Sample URLs - All Entity Types', () => {
  test.setTimeout(30000);

  testUrls.forEach(({ url, type, desc }) => {
    test(`${desc} should load`, async ({ page }) => {
      const appUrl = toAppUrl(url);
      
      await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForSelector('main', { timeout: 10000 });
      
      const mainText = await page.locator('main').textContent();
      
      // Should NOT show unsupported entity type
      const hasError = mainText?.toLowerCase().includes('unsupported entity type');
      expect(hasError).toBe(false);
      
      // Should have content
      expect(mainText!.length).toBeGreaterThan(50);
      
      console.log(`✅ ${desc}: Loads successfully`);
    });
  });
});
