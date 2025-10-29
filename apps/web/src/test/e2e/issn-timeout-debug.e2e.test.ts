import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://mearman.github.io/Academic-Explorer';

/**
 * ISSN Timeout Debug Test
 *
 * Investigates why issn:2041-1723 times out despite being valid in OpenAlex API.
 * Captures console logs, network activity, and page state to diagnose the issue.
 */

test.describe('ISSN Timeout Investigation', () => {
  test.setTimeout(60000);

  test('should debug ISSN timeout with full diagnostics', async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = [];
    const errors: string[] = [];
    const networkRequests: { url: string; status: number | null }[] = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Capture network requests
    page.on('response', (response) => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
      });
    });

    // Navigate to ISSN route
    const targetUrl = `${DEPLOYED_URL}/#/sources/issn/2041-1723`;
    console.log('Navigating to:', targetUrl);

    try {
      await page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      console.log('Page loaded successfully');
      console.log('Final URL:', page.url());

      // Try to find main content
      try {
        await page.waitForSelector('main', { timeout: 10000 });
        const mainText = await page.locator('main').textContent();
        console.log('Main content found:', mainText?.substring(0, 200));
      } catch (mainError) {
        console.log('Main selector not found:', mainError);
      }

      // Check for loading indicators
      const loadingIndicators = await page
        .locator('[data-loading], .loading, .skeleton')
        .count();
      console.log('Loading indicators found:', loadingIndicators);

      // Check for error messages
      const errorMessages = await page
        .locator('[data-error], .error, .error-message')
        .count();
      console.log('Error messages found:', errorMessages);
    } catch (navigationError) {
      console.log('Navigation failed:', navigationError);
    }

    // Output diagnostics
    console.log('\n=== DIAGNOSTICS ===');
    console.log('Console Errors:', errors.length);
    errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));

    console.log('\nNetwork Requests:', networkRequests.length);
    const openalexRequests = networkRequests.filter((req) =>
      req.url.includes('openalex.org'),
    );
    console.log('OpenAlex API Requests:', openalexRequests.length);
    openalexRequests.forEach((req) =>
      console.log(`  ${req.status} - ${req.url}`),
    );

    console.log('\nConsole Messages (last 10):');
    consoleMessages.slice(-10).forEach((msg) => {
      console.log(`  [${msg.type}] ${msg.text}`);
    });

    // This test is for diagnostics - always pass so we can see the output
    expect(true).toBe(true);
  });

  test('should test ISSN route with extended timeout', async ({ page }) => {
    const targetUrl = `${DEPLOYED_URL}/#/sources/issn/2041-1723`;

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait longer for potential async loading
    await page.waitForTimeout(15000);

    const finalUrl = page.url();
    console.log('Final URL after extended wait:', finalUrl);

    const mainText = await page.locator('body').textContent();
    console.log('Page content (first 500 chars):', mainText?.substring(0, 500));

    // Check if we got redirected to search
    const isSearchPage = finalUrl.includes('/search');
    console.log('Redirected to search?', isSearchPage);

    // Check if page shows any content
    const hasContent = mainText && mainText.length > 100;
    console.log('Has content?', hasContent);

    expect(hasContent).toBe(true);
  });

  test('should compare working ROR vs failing ISSN', async ({ page }) => {
    console.log('\n=== Testing Working ROR ===');

    // First test a working ROR
    await page.goto(`${DEPLOYED_URL}/#/institutions/ror/02y3ad647`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('main', { timeout: 10000 });
    const rorUrl = page.url();
    const rorMain = await page.locator('main').textContent();

    console.log('ROR URL:', rorUrl);
    console.log('ROR loaded successfully');
    console.log('ROR content length:', rorMain?.length);

    console.log('\n=== Testing Failing ISSN ===');

    // Now test the failing ISSN
    await page.goto(`${DEPLOYED_URL}/#/sources/issn/2041-1723`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(15000);

    const issnUrl = page.url();
    const issnMain = await page.locator('body').textContent();

    console.log('ISSN URL:', issnUrl);
    console.log('ISSN content length:', issnMain?.length);
    console.log('ISSN content (first 500 chars):', issnMain?.substring(0, 500));

    // Compare behaviors
    console.log('\n=== COMPARISON ===');
    console.log('ROR stayed on entity page:', rorUrl.includes('/institutions/'));
    console.log('ISSN stayed on entity page:', issnUrl.includes('/sources/'));
    console.log(
      'ISSN redirected to search:',
      issnUrl.includes('/search') || issnUrl.includes('?q='),
    );

    expect(true).toBe(true);
  });
});
