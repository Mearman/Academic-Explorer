import { test, expect } from '@playwright/test';

const DEPLOYED_URL = 'https://mearman.github.io/Academic-Explorer';

/**
 * ISSN Fix Verification
 *
 * Verifies that issn:2041-1723 (Nature Communications) loads correctly
 * after fixing the ISSN normalization to include the issn: prefix.
 */

test.describe('ISSN Fix Verification', () => {
  test.setTimeout(60000);

  test('should load ISSN 2041-1723 successfully', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to ISSN route
    await page.goto(`${DEPLOYED_URL}/#/sources/issn/2041-1723`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for content to load
    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();

    // Should not show error messages
    expect(mainText).not.toContain('Not Found');
    expect(mainText).not.toContain('Error');
    expect(mainText).not.toContain('Invalid');

    // Should show some source content
    const hasSourceContent =
      mainText!.includes('Nature') ||
      mainText!.includes('Communications') ||
      mainText!.includes('works') ||
      mainText!.includes('citations');

    expect(hasSourceContent).toBeTruthy();

    // Check for the specific error we were fixing
    const hasEntityDetectionError = consoleErrors.some((err) =>
      err.includes('Unable to detect entity type for: issn'),
    );

    // Log errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }

    // This error should NOT appear anymore
    expect(hasEntityDetectionError).toBe(false);
  });

  test('should handle ISSN via openalex-url route', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Test the openalex-url route format
    await page.goto(
      `${DEPLOYED_URL}/#/openalex-url/sources/issn:2041-1723`,
      {
        waitUntil: 'networkidle',
        timeout: 30000,
      },
    );

    await page.waitForSelector('main', { timeout: 15000 });

    const mainText = await page.locator('main').textContent();
    expect(mainText).toBeTruthy();
    expect(mainText).not.toContain('Not Found');
    expect(mainText).not.toContain('Error');

    // Check for the entity detection error
    const hasEntityDetectionError = consoleErrors.some((err) =>
      err.includes('Unable to detect entity type for: issn'),
    );

    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }

    expect(hasEntityDetectionError).toBe(false);
  });

  test('should make correct API request for ISSN', async ({ page }) => {
    const apiRequests: { url: string; status: number }[] = [];

    // Capture network requests
    page.on('response', (response) => {
      if (response.url().includes('openalex.org')) {
        apiRequests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto(`${DEPLOYED_URL}/#/sources/issn/2041-1723`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('main', { timeout: 15000 });

    // Log API requests for debugging
    console.log('OpenAlex API Requests:');
    apiRequests.forEach((req) => {
      console.log(`  ${req.status} - ${req.url}`);
    });

    // Should make a successful request with issn: prefix
    const successfulIssnRequest = apiRequests.some(
      (req) =>
        req.url.includes('issn%3A2041-1723') ||
        req.url.includes('issn:2041-1723'),
    );

    expect(successfulIssnRequest).toBe(true);

    // Should not make a request with bare ISSN (the old buggy behavior)
    const bareIssnRequest = apiRequests.some(
      (req) =>
        req.url.includes('/sources/2041-1723') &&
        !req.url.includes('issn'),
    );

    expect(bareIssnRequest).toBe(false);
  });
});
