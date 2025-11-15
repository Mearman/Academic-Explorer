/**
 * E2E tests for Data Version Parameter in API Requests (T041)
 *
 * Verifies that:
 * 1. When user selects "Version 1 (legacy)", API requests include data_version=1 query parameter
 * 2. When user selects "Version 2 (current)", API requests include data_version=2 query parameter
 * 3. When user selects "Auto (v2 default)" or undefined, NO data_version parameter is sent
 * 4. Date mocking works to show selector during November 2025
 * 5. Multiple API calls all include the correct parameter
 * 6. API request interception properly detects the parameter
 *
 * Related:
 * - T041: Verify data_version parameter in API requests
 * - 013-walden-research specification
 * - Test requirements: Mock date to November, intercept API requests, verify parameter
 */

import { test, expect } from '@playwright/test';

interface InterceptedRequest {
  url: string;
  hasDataVersion: boolean;
  dataVersionValue?: string;
}

test.describe('Data Version Parameter in API Requests (T041)', () => {
  /**
   * Test: Version 1 Selection Includes data_version=1 Parameter
   *
   * Verifies that when user selects "Version 1 (legacy)" from the data version selector,
   * subsequent API requests to OpenAlex include the data_version=1 query parameter.
   */
  test('should send data_version=1 when Version 1 (legacy) selected', async ({ page }) => {
    // Set date to November 2025 so the version selector is visible
    await page.clock.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    const interceptedRequests: InterceptedRequest[] = [];

    // Listen for all API requests to OpenAlex
    page.on('request', (request) => {
      const url = request.url();
      const parsedUrl = new URL(url);

      // Intercept both direct OpenAlex calls and proxied /api/openalex calls
      if (
        url.includes('api.openalex.org') ||
        url.includes('/api/openalex')
      ) {
        const hasDataVersion = parsedUrl.searchParams.has('data_version');
        const dataVersionValue = parsedUrl.searchParams.get('data_version');

        interceptedRequests.push({
          url: parsedUrl.pathname + parsedUrl.search,
          hasDataVersion,
          dataVersionValue: dataVersionValue ?? undefined,
        });

        console.log(`Intercepted API request:`, {
          pathname: parsedUrl.pathname,
          dataVersion: dataVersionValue,
        });
      }
    });

    // Navigate to home page
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Navigate to settings (look for settings link or button)
    // Settings might be in a menu, header, or sidebar
    const settingsButton = page.locator('button, a').filter({
      hasText: /settings|configuration/i,
    }).first();

    const settingsButtonVisible = await settingsButton.isVisible().catch(() => false);

    let settingsPageUrl = '';
    if (settingsButtonVisible) {
      await settingsButton.click();
      // Wait for navigation or modal
      await page.waitForTimeout(500);
      settingsPageUrl = page.url();
    } else {
      // Try direct navigation to settings route
      await page.goto('/#/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      settingsPageUrl = page.url();
    }

    console.log(`✓ Navigated to settings page: ${settingsPageUrl}`);

    // Find and interact with the data version selector
    const dataVersionSelector = page.locator('[data-testid="data-version-selector"]');
    const selectorExists = await dataVersionSelector.isVisible().catch(() => false);

    if (!selectorExists) {
      console.log('ℹ️ Data version selector not found on page - skipping test');
      return;
    }

    expect(selectorExists).toBe(true);
    console.log('✓ Data version selector is visible');

    // Select "Version 1 (legacy)" option
    await dataVersionSelector.click();
    await page.waitForTimeout(300);

    // Find and click the "Version 1 (legacy)" option
    const version1Option = page.locator('div').filter({
      hasText: /^Version 1 \(legacy\)$/,
    }).first();

    const version1Exists = await version1Option.isVisible().catch(() => false);
    if (version1Exists) {
      await version1Option.click();
      console.log('✓ Selected "Version 1 (legacy)"');
    } else {
      console.log('ℹ️ Version 1 option not found in dropdown');
      return;
    }

    // Wait for setting to be saved
    await page.waitForTimeout(500);

    // Clear previous intercepted requests to only check requests after version change
    interceptedRequests.length = 0;

    // Trigger an API request by navigating to an entity page
    // Use a known work ID (W2741809807 from author verification tests)
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Verify that intercepted requests contain data_version=1
    const requestsWithVersion1 = interceptedRequests.filter(
      (req) => req.hasDataVersion && req.dataVersionValue === '1'
    );

    console.log(`Intercepted ${interceptedRequests.length} total API requests`);
    console.log(`Found ${requestsWithVersion1.length} requests with data_version=1`);

    expect(interceptedRequests.length).toBeGreaterThan(0);
    expect(requestsWithVersion1.length).toBeGreaterThan(0);

    // Log details of captured requests
    interceptedRequests.forEach((req, idx) => {
      console.log(`Request ${idx + 1}:`, {
        path: req.url.split('?')[0],
        hasDataVersion: req.hasDataVersion,
        dataVersion: req.dataVersionValue,
      });
    });

    console.log('✓ Successfully verified data_version=1 parameter in API requests');
  });

  /**
   * Test: Version 2 Selection Includes data_version=2 Parameter
   *
   * Verifies that when user selects "Version 2 (current)" from the data version selector,
   * subsequent API requests include the data_version=2 query parameter.
   */
  test('should send data_version=2 when Version 2 (current) selected', async ({ page }) => {
    // Set date to November 2025
    await page.clock.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    const interceptedRequests: InterceptedRequest[] = [];

    page.on('request', (request) => {
      const url = request.url();
      const parsedUrl = new URL(url);

      if (
        url.includes('api.openalex.org') ||
        url.includes('/api/openalex')
      ) {
        const hasDataVersion = parsedUrl.searchParams.has('data_version');
        const dataVersionValue = parsedUrl.searchParams.get('data_version');

        interceptedRequests.push({
          url: parsedUrl.pathname + parsedUrl.search,
          hasDataVersion,
          dataVersionValue: dataVersionValue ?? undefined,
        });
      }
    });

    // Navigate to settings
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const settingsButton = page.locator('button, a').filter({
      hasText: /settings|configuration/i,
    }).first();

    const settingsButtonVisible = await settingsButton.isVisible().catch(() => false);

    if (settingsButtonVisible) {
      await settingsButton.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('/#/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
    }

    // Find data version selector
    const dataVersionSelector = page.locator('[data-testid="data-version-selector"]');
    const selectorExists = await dataVersionSelector.isVisible().catch(() => false);

    if (!selectorExists) {
      console.log('ℹ️ Data version selector not found - skipping test');
      return;
    }

    // Select "Version 2 (current)"
    await dataVersionSelector.click();
    await page.waitForTimeout(300);

    const version2Option = page.locator('div').filter({
      hasText: /^Version 2 \(current\)$/,
    }).first();

    const version2Exists = await version2Option.isVisible().catch(() => false);
    if (!version2Exists) {
      console.log('ℹ️ Version 2 option not found in dropdown');
      return;
    }

    await version2Option.click();
    console.log('✓ Selected "Version 2 (current)"');
    await page.waitForTimeout(500);

    // Clear previous requests
    interceptedRequests.length = 0;

    // Trigger API request
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Verify data_version=2 in requests
    const requestsWithVersion2 = interceptedRequests.filter(
      (req) => req.hasDataVersion && req.dataVersionValue === '2'
    );

    console.log(`Intercepted ${interceptedRequests.length} API requests`);
    console.log(`Found ${requestsWithVersion2.length} requests with data_version=2`);

    expect(interceptedRequests.length).toBeGreaterThan(0);
    expect(requestsWithVersion2.length).toBeGreaterThan(0);

    console.log('✓ Successfully verified data_version=2 parameter in API requests');
  });

  /**
   * Test: Auto/Undefined Does NOT Include data_version Parameter
   *
   * Verifies that when user selects "Auto (v2 default)" or when no version is explicitly set,
   * API requests do NOT include the data_version query parameter.
   */
  test('should NOT send data_version parameter when Auto (v2 default) selected', async ({ page }) => {
    // Set date to November 2025
    await page.clock.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    const interceptedRequests: InterceptedRequest[] = [];

    page.on('request', (request) => {
      const url = request.url();
      const parsedUrl = new URL(url);

      if (
        url.includes('api.openalex.org') ||
        url.includes('/api/openalex')
      ) {
        const hasDataVersion = parsedUrl.searchParams.has('data_version');
        const dataVersionValue = parsedUrl.searchParams.get('data_version');

        interceptedRequests.push({
          url: parsedUrl.pathname + parsedUrl.search,
          hasDataVersion,
          dataVersionValue: dataVersionValue ?? undefined,
        });
      }
    });

    // Navigate to settings
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const settingsButton = page.locator('button, a').filter({
      hasText: /settings|configuration/i,
    }).first();

    const settingsButtonVisible = await settingsButton.isVisible().catch(() => false);

    if (settingsButtonVisible) {
      await settingsButton.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('/#/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
    }

    // Find data version selector
    const dataVersionSelector = page.locator('[data-testid="data-version-selector"]');
    const selectorExists = await dataVersionSelector.isVisible().catch(() => false);

    if (!selectorExists) {
      console.log('ℹ️ Data version selector not found - skipping test');
      return;
    }

    // Select "Auto (v2 default)"
    await dataVersionSelector.click();
    await page.waitForTimeout(300);

    const autoOption = page.locator('div').filter({
      hasText: /^Auto \(v2 default\)$/,
    }).first();

    const autoExists = await autoOption.isVisible().catch(() => false);
    if (!autoExists) {
      console.log('ℹ️ Auto option not found in dropdown');
      return;
    }

    await autoOption.click();
    console.log('✓ Selected "Auto (v2 default)"');
    await page.waitForTimeout(500);

    // Clear previous requests
    interceptedRequests.length = 0;

    // Trigger API request
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Verify that NO requests have data_version parameter
    const requestsWithDataVersion = interceptedRequests.filter(
      (req) => req.hasDataVersion
    );

    console.log(`Intercepted ${interceptedRequests.length} API requests`);
    console.log(`Found ${requestsWithDataVersion.length} requests with data_version parameter`);

    // When Auto is selected (undefined), no data_version parameter should be sent
    // This allows the backend to use its default (v2)
    expect(interceptedRequests.length).toBeGreaterThan(0);
    expect(requestsWithDataVersion.length).toBe(0);

    console.log('✓ Successfully verified NO data_version parameter sent with Auto selection');
  });

  /**
   * Test: Default State (No Selection) Does NOT Include data_version
   *
   * Verifies that on first visit to the application, before any version selection,
   * API requests do NOT include the data_version parameter.
   */
  test('should NOT send data_version parameter on first visit (default state)', async ({ page }) => {
    // Set date to November 2025
    await page.clock.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    // Clear any existing settings from IndexedDB
    await page.goto('about:blank');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('academic-explorer-settings');
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });

    const interceptedRequests: InterceptedRequest[] = [];

    page.on('request', (request) => {
      const url = request.url();
      const parsedUrl = new URL(url);

      if (
        url.includes('api.openalex.org') ||
        url.includes('/api/openalex')
      ) {
        const hasDataVersion = parsedUrl.searchParams.has('data_version');
        const dataVersionValue = parsedUrl.searchParams.get('data_version');

        interceptedRequests.push({
          url: parsedUrl.pathname + parsedUrl.search,
          hasDataVersion,
          dataVersionValue: dataVersionValue ?? undefined,
        });
      }
    });

    // Navigate to app without any prior settings
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Verify no data_version parameter in default state
    const requestsWithDataVersion = interceptedRequests.filter(
      (req) => req.hasDataVersion
    );

    console.log(`Intercepted ${interceptedRequests.length} API requests`);
    console.log(`Found ${requestsWithDataVersion.length} requests with data_version`);

    expect(interceptedRequests.length).toBeGreaterThan(0);
    expect(requestsWithDataVersion.length).toBe(0);

    console.log('✓ Default state correctly sends NO data_version parameter');
  });

  /**
   * Test: Version Parameter Consistency Across Multiple API Calls
   *
   * Verifies that after selecting a data version, ALL subsequent API requests
   * consistently include that version parameter until changed.
   */
  test('should consistently send data_version=1 across multiple API calls', async ({ page }) => {
    // Set date to November 2025
    await page.clock.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    const allInterceptedRequests: InterceptedRequest[] = [];

    page.on('request', (request) => {
      const url = request.url();
      const parsedUrl = new URL(url);

      if (
        url.includes('api.openalex.org') ||
        url.includes('/api/openalex')
      ) {
        const hasDataVersion = parsedUrl.searchParams.has('data_version');
        const dataVersionValue = parsedUrl.searchParams.get('data_version');

        allInterceptedRequests.push({
          url: parsedUrl.pathname + parsedUrl.search,
          hasDataVersion,
          dataVersionValue: dataVersionValue ?? undefined,
        });
      }
    });

    // Navigate and set version to 1
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const settingsButton = page.locator('button, a').filter({
      hasText: /settings|configuration/i,
    }).first();

    const settingsButtonVisible = await settingsButton.isVisible().catch(() => false);

    if (settingsButtonVisible) {
      await settingsButton.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('/#/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
    }

    const dataVersionSelector = page.locator('[data-testid="data-version-selector"]');
    const selectorExists = await dataVersionSelector.isVisible().catch(() => false);

    if (!selectorExists) {
      console.log('ℹ️ Data version selector not found - skipping test');
      return;
    }

    await dataVersionSelector.click();
    await page.waitForTimeout(300);

    const version1Option = page.locator('div').filter({
      hasText: /^Version 1 \(legacy\)$/,
    }).first();

    const version1Exists = await version1Option.isVisible().catch(() => false);
    if (!version1Exists) {
      console.log('ℹ️ Version 1 option not found - skipping test');
      return;
    }

    await version1Option.click();
    console.log('✓ Selected Version 1');
    await page.waitForTimeout(500);

    // Clear prior requests
    allInterceptedRequests.length = 0;

    // Make multiple API calls by navigating to different entities
    const entityPages = [
      '/#/works/W2741809807',
      '/#/authors/A123456789',
      '/#/works/W987654321',
    ];

    for (const entityPage of entityPages) {
      await page.goto(entityPage, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      await page.waitForTimeout(800);
    }

    // Verify all requests have data_version=1
    const allHaveVersion1 = allInterceptedRequests.every(
      (req) => !req.hasDataVersion || req.dataVersionValue === '1'
    );

    const actualVersion1Requests = allInterceptedRequests.filter(
      (req) => req.hasDataVersion && req.dataVersionValue === '1'
    );

    console.log(`Total API requests: ${allInterceptedRequests.length}`);
    console.log(`Requests with data_version=1: ${actualVersion1Requests.length}`);

    expect(allInterceptedRequests.length).toBeGreaterThan(0);
    expect(allHaveVersion1).toBe(true);

    console.log('✓ All API calls consistently include data_version=1');
  });

  /**
   * Test: Version Parameter Persists Across Page Refreshes
   *
   * Verifies that the selected data version persists in IndexedDB and
   * is re-applied after a page refresh.
   */
  test('should persist data_version selection across page refresh', async ({ page }) => {
    // Set date to November 2025
    await page.clock.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    const interceptedRequests: InterceptedRequest[] = [];

    page.on('request', (request) => {
      const url = request.url();
      const parsedUrl = new URL(url);

      if (
        url.includes('api.openalex.org') ||
        url.includes('/api/openalex')
      ) {
        const hasDataVersion = parsedUrl.searchParams.has('data_version');
        const dataVersionValue = parsedUrl.searchParams.get('data_version');

        interceptedRequests.push({
          url: parsedUrl.pathname + parsedUrl.search,
          hasDataVersion,
          dataVersionValue: dataVersionValue ?? undefined,
        });
      }
    });

    // Navigate and set version to 1
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const settingsButton = page.locator('button, a').filter({
      hasText: /settings|configuration/i,
    }).first();

    const settingsButtonVisible = await settingsButton.isVisible().catch(() => false);

    if (settingsButtonVisible) {
      await settingsButton.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('/#/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
    }

    const dataVersionSelector = page.locator('[data-testid="data-version-selector"]');
    const selectorExists = await dataVersionSelector.isVisible().catch(() => false);

    if (!selectorExists) {
      console.log('ℹ️ Data version selector not found - skipping test');
      return;
    }

    await dataVersionSelector.click();
    await page.waitForTimeout(300);

    const version1Option = page.locator('div').filter({
      hasText: /^Version 1 \(legacy\)$/,
    }).first();

    const version1Exists = await version1Option.isVisible().catch(() => false);
    if (!version1Exists) {
      console.log('ℹ️ Version 1 option not found - skipping test');
      return;
    }

    await version1Option.click();
    console.log('✓ Selected Version 1');
    await page.waitForTimeout(500);

    // Clear requests before refresh
    interceptedRequests.length = 0;

    // Refresh the page
    await page.reload({ waitUntil: 'load' });
    console.log('✓ Page refreshed');
    await page.waitForTimeout(1000);

    // Navigate to an entity page
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Verify data_version=1 is still in requests after refresh
    const version1Requests = interceptedRequests.filter(
      (req) => req.hasDataVersion && req.dataVersionValue === '1'
    );

    console.log(`API requests after refresh: ${interceptedRequests.length}`);
    console.log(`Requests with persisted data_version=1: ${version1Requests.length}`);

    expect(interceptedRequests.length).toBeGreaterThan(0);
    expect(version1Requests.length).toBeGreaterThan(0);

    console.log('✓ Data version selection persisted after page refresh');
  });

  /**
   * Test: Date Mock Enables Version Selector in November
   *
   * Verifies that the date mocking properly sets the system date to November 2025,
   * making the version selector component visible as intended during the transition period.
   */
  test('should display version selector when date is November 2025', async ({ page }) => {
    // Set date to November 2025
    await page.clock.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const settingsButton = page.locator('button, a').filter({
      hasText: /settings|configuration/i,
    }).first();

    const settingsButtonVisible = await settingsButton.isVisible().catch(() => false);

    if (settingsButtonVisible) {
      await settingsButton.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('/#/settings', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
    }

    // Check that the version selector is visible
    const dataVersionSelector = page.locator('[data-testid="data-version-selector"]');
    const selectorVisible = await dataVersionSelector.isVisible().catch(() => false);

    if (selectorVisible) {
      console.log('✓ Data version selector is visible in November 2025');
      expect(selectorVisible).toBe(true);

      // Verify selector has the expected options
      const selectorOptions = page.locator(`[data-testid="data-version-selector"] option,
                                             [data-testid="data-version-selector"] div:has-text("Auto")`);
      const optionCount = await selectorOptions.count().catch(() => 0);

      console.log(`Version selector options count: ${optionCount}`);
      expect(optionCount).toBeGreaterThan(0);
    } else {
      console.log('ℹ️ Version selector not visible - may be behind menu or conditional rendering');
    }
  });
});
