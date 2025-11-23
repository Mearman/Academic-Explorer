/**
 * App Ready Helper
 * Provides deterministic wait functions to ensure the app is ready for testing
 * Avoids flaky tests by using explicit checks instead of arbitrary timeouts
 */

import { type Page } from '@playwright/test';

/**
 * Wait for the Academic Explorer app to be fully ready for interaction
 * This function performs comprehensive checks to ensure deterministic test execution
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait for app to be ready (default: 30000ms)
 */
export async function waitForAppReady(page: Page, timeout = 30000): Promise<void> {
  const startTime = Date.now();

  // Step 1: Wait for DOM to be ready
  await page.waitForLoadState('domcontentloaded', { timeout });

  // Step 2: Wait for React root to be present
  await page.waitForSelector('#root', {
    state: 'attached',
    timeout: getRemainingTimeout(startTime, timeout),
  });

  // Step 3: Wait for React to hydrate (root has children)
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#root');
      return root !== null && root.childElementCount > 0;
    },
    { timeout: getRemainingTimeout(startTime, timeout) }
  );

  // Step 4: Wait for all loading indicators to disappear
  await waitForLoadingComplete(page, getRemainingTimeout(startTime, timeout));

  // Step 5: Wait for no error states
  await waitForNoErrors(page, getRemainingTimeout(startTime, timeout));

  // Step 6: Give the app a moment to settle (animations, etc.)
  await page.waitForTimeout(100);
}

/**
 * Wait for all loading indicators to disappear
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait
 */
export async function waitForLoadingComplete(page: Page, timeout = 30000): Promise<void> {
  const startTime = Date.now();

  while (true) {
    const isLoading = await page.evaluate(() => {
      const loadingSelectors = [
        '[data-loading="true"]',
        '.loading',
        '.spinner',
        '[role="progressbar"]',
        '[aria-busy="true"]',
      ];

      for (const selector of loadingSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Check if any are actually visible
          for (const element of Array.from(elements)) {
            const style = window.getComputedStyle(element);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
              return true;
            }
          }
        }
      }

      return false;
    });

    if (!isLoading) {
      break;
    }

    if (Date.now() - startTime > timeout) {
      throw new Error(`Loading indicators did not disappear within ${timeout}ms`);
    }

    await page.waitForTimeout(100);
  }
}

/**
 * Wait for no error states to be displayed
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait
 */
export async function waitForNoErrors(page: Page, timeout = 5000): Promise<void> {
  // Give errors a chance to appear
  await page.waitForTimeout(500);

  const hasError = await page.evaluate(() => {
    const errorSelectors = [
      '[data-error="true"]',
      '.error-message',
      '[role="alert"]:has-text("error")',
      '[data-error-boundary="true"]',
    ];

    for (const selector of errorSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // Check if any are actually visible
        for (const element of Array.from(elements)) {
          const style = window.getComputedStyle(element);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true;
          }
        }
      }
    }

    return false;
  });

  if (hasError) {
    const errorText = await page.locator('[data-error="true"], .error-message, [role="alert"]').first().textContent();
    throw new Error(`App loaded with error: ${errorText}`);
  }
}

/**
 * Wait for entity data to be loaded on an entity detail page
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait
 */
export async function waitForEntityReady(page: Page, timeout = 30000): Promise<void> {
  await waitForAppReady(page, timeout);

  const startTime = Date.now();

  // Wait for entity title/heading to appear
  await page.waitForSelector('h1, [data-entity-title]', {
    state: 'visible',
    timeout: getRemainingTimeout(startTime, timeout),
  });

  // Ensure entity content is loaded (not just skeleton)
  await page.waitForFunction(
    () => {
      const heading = document.querySelector('h1, [data-entity-title]');
      if (!heading) return false;

      const text = heading.textContent || '';
      // Check that heading has actual content (not loading placeholder)
      return text.length > 0 && !text.includes('...');
    },
    { timeout: getRemainingTimeout(startTime, timeout) }
  );
}

/**
 * Wait for search results to be loaded
 * @param page - Playwright page instance
 * @param minResults - Minimum number of results expected
 * @param timeout - Maximum time to wait
 */
export async function waitForSearchResults(page: Page, minResults = 1, timeout = 30000): Promise<void> {
  await waitForAppReady(page, timeout);

  const startTime = Date.now();

  // Wait for search results container
  await page.waitForSelector('[data-search-results], .search-results, [role="list"]', {
    state: 'visible',
    timeout: getRemainingTimeout(startTime, timeout),
  });

  // Wait for minimum number of results
  await page.waitForFunction(
    (min) => {
      const resultSelectors = [
        '[data-search-results] [data-result-item]',
        '.search-results .result-item',
        '[role="list"] [role="listitem"]',
      ];

      for (const selector of resultSelectors) {
        const results = document.querySelectorAll(selector);
        if (results.length >= min) {
          return true;
        }
      }

      return false;
    },
    minResults,
    { timeout: getRemainingTimeout(startTime, timeout) }
  );
}

/**
 * Wait for graph/visualization to be rendered
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait
 */
export async function waitForGraphReady(page: Page, timeout = 30000): Promise<void> {
  await waitForAppReady(page, timeout);

  const startTime = Date.now();

  // Wait for canvas element
  await page.waitForSelector('canvas, [data-graph], #graph', {
    state: 'visible',
    timeout: getRemainingTimeout(startTime, timeout),
  });

  // Wait for graph to have content (non-zero dimensions)
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;

      return canvas.width > 0 && canvas.height > 0;
    },
    { timeout: getRemainingTimeout(startTime, timeout) }
  );

  // Give graph time to render initial frame
  await page.waitForTimeout(500);
}

/**
 * Wait for navigation to complete (client-side routing)
 * @param page - Playwright page instance
 * @param expectedPath - Expected path after navigation (optional)
 * @param timeout - Maximum time to wait
 */
export async function waitForNavigation(page: Page, expectedPath?: string | RegExp, timeout = 10000): Promise<void> {
  const startTime = Date.now();

  if (expectedPath) {
    await page.waitForFunction(
      (path) => {
        const currentPath = window.location.pathname;
        if (typeof path === 'string') {
          return currentPath === path || currentPath.startsWith(path);
        }
        return new RegExp(path).test(currentPath);
      },
      expectedPath,
      { timeout: getRemainingTimeout(startTime, timeout) }
    );
  }

  await waitForAppReady(page, getRemainingTimeout(startTime, timeout));
}

/**
 * Calculate remaining timeout based on elapsed time
 * @param startTime - The start time (Date.now())
 * @param totalTimeout - Total timeout allowed
 */
function getRemainingTimeout(startTime: number, totalTimeout: number): number {
  const elapsed = Date.now() - startTime;
  const remaining = totalTimeout - elapsed;
  return Math.max(remaining, 1000); // Always leave at least 1 second
}

/**
 * Wait for a specific element to be ready (visible, non-empty text)
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param timeout - Maximum time to wait
 */
export async function waitForElementReady(page: Page, selector: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(selector, {
    state: 'visible',
    timeout,
  });

  // Ensure element has content (not just a placeholder)
  await page.waitForFunction(
    (sel) => {
      const element = document.querySelector(sel);
      if (!element) return false;

      const text = element.textContent || '';
      return text.trim().length > 0;
    },
    selector,
    { timeout }
  );
}
