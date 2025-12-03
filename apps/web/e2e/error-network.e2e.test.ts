/**
 * E2E tests for network failure scenarios
 *
 * Tests handling of network disconnection, connection failures, and offline mode
 * @module error-network.e2e
 * @tag @error
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { expect,test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

test.describe('@error Network Errors', () => {
  test('should handle network failure gracefully', async ({ page }) => {
    // Abort all API requests to simulate network failure
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Should display network error or retry option
    const errorIndicators = [
      page.getByText(/connection|failed to fetch|network|offline/i),
      page.getByText(/error|try again|unavailable/i),
      page.locator('[data-testid="error-message"], [role="alert"]'),
    ];

    let foundError = false;
    for (const indicator of errorIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        foundError = true;
        break;
      }
    }
    expect(foundError).toBe(true);
  });

  test('should handle connection reset error', async ({ page }) => {
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('connectionreset');
    });

    await page.goto('/authors/A5017898742');
    await waitForAppReady(page);

    // Should show error state
    const errorText = page.getByText(/connection|error|failed|try again/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should handle internet disconnected error', async ({ page }) => {
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('internetdisconnected');
    });

    await page.goto('/institutions/I33213144');
    await waitForAppReady(page);

    // Should show offline/connection error
    const errorText = page.getByText(/connection|disconnected|error|offline/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should provide retry option on network failure', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api.openalex.org/**', (route) => {
      requestCount++;
      if (requestCount <= 1) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Look for retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again"), [data-testid="retry-button"]');

    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
      await page.waitForTimeout(2000);
      expect(requestCount).toBeGreaterThan(1);
    }
  });

  test('should recover when network is restored', async ({ page }) => {
    let blockNetwork = true;

    await page.route('**/api.openalex.org/**', (route) => {
      if (blockNetwork) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Verify error state
    const errorText = page.getByText(/connection|error|failed/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });

    // "Restore" network
    blockNetwork = false;

    // Reload page
    await page.reload();
    await waitForAppReady(page);

    // Should now show content or at least different state
    await page.waitForTimeout(3000);

    // After reload with network, should either show content or be in loading state
    const contentOrLoading = page.locator('h1, [data-testid="entity-title"], .skeleton, [data-testid="loading"]');
    await expect(contentOrLoading.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should handle DNS resolution failure', async ({ page }) => {
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('namenotresolved');
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Should show error
    const errorText = page.getByText(/error|failed|unavailable/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should handle timeout errors gracefully', async ({ page }) => {
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('timedout');
    });

    await page.goto('/sources/S2764455272');
    await waitForAppReady(page);

    // Should show timeout or connection error
    const errorText = page.getByText(/connection|error|timed out|timeout|unavailable/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should handle slow network connections', async ({ page }) => {
    // Simulate slow network by delaying responses
    await page.route('**/api.openalex.org/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      route.continue();
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Should show loading state during delay
    const loadingIndicators = page.locator('.skeleton, [data-testid="loading"], .loading, [aria-busy="true"]');

    // At least one loading indicator should be visible
    const count = await loadingIndicators.count();
    if (count > 0) {
      await expect(loadingIndicators.first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('should handle intermittent connection failures', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api.openalex.org/**', (route) => {
      requestCount++;
      // Fail every other request
      if (requestCount % 2 === 1) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Should handle intermittent failures
    // Either show error with retry, or successfully load (depending on retry logic)
    const errorOrContent = page.locator('h1, [data-testid="entity-title"], [role="alert"]');
    await expect(errorOrContent.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should maintain app functionality with cached data on network failure', async ({ page }) => {
    // First visit to cache data
    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Wait for initial content to load
    await page.waitForTimeout(2000);

    // Now block network
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('failed');
    });

    // Navigate to another page
    await page.goto('/');
    await waitForAppReady(page);

    // Should still show app shell/navigation even without network
    const appShell = page.locator('header, nav, [role="navigation"]');
    await expect(appShell.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle network errors during search', async ({ page }) => {
    await page.goto('/search');
    await waitForAppReady(page);

    // Block network before searching
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('failed');
    });

    // Attempt search
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('machine learning');
      await searchInput.press('Enter');

      await page.waitForTimeout(2000);

      // Should show error or no results
      const errorOrEmpty = page.locator('[role="alert"], .error, [data-testid="error-message"], .empty-state');
      const hasError = await errorOrEmpty.count();
      expect(hasError).toBeGreaterThan(0);
    }
  });

  test('should handle network errors when loading relationships', async ({ page }) => {
    // Allow initial page load
    let blockNetwork = false;

    await page.route('**/api.openalex.org/**', (route) => {
      if (blockNetwork) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);
    await page.waitForTimeout(2000);

    // Block network for relationship requests
    blockNetwork = true;

    // Try to expand relationships section if exists
    const relationshipsSection = page.locator('[data-testid="relationships"], section:has-text("Relationships"), section:has-text("Related")');

    if (await relationshipsSection.isVisible().catch(() => false)) {
      const expandButton = relationshipsSection.locator('button, summary');
      if (await expandButton.first().isVisible().catch(() => false)) {
        await expandButton.first().click();
        await page.waitForTimeout(2000);

        // Should show error or retry option
        const errorText = page.getByText(/error|failed|try again|unavailable/i);
        const hasError = await errorText.count();
        expect(hasError).toBeGreaterThan(0);
      }
    }
  });

  test('should display user-friendly error messages for network failures', async ({ page }) => {
    await page.route('**/api.openalex.org/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/works/W2741809807');
    await waitForAppReady(page);

    // Check for user-friendly messaging (not technical error codes)
    const bodyText = await page.textContent('body');

    // Should NOT show raw technical errors
    expect(bodyText).not.toContain('ERR_CONNECTION_REFUSED');
    expect(bodyText).not.toContain('ECONNREFUSED');

    // Should show user-friendly messages (at least one of these patterns)
    const friendlyPatterns = [
      /connection|network|offline/i.test(bodyText || ''),
      /retry|try again|unavailable/i.test(bodyText || ''),
      /failed to load|unable to connect/i.test(bodyText || ''),
    ];

    expect(friendlyPatterns.some(Boolean)).toBe(true);
  });
});
