/**
 * Assertion Helper for E2E Tests
 * Provides custom assertion utilities for common test scenarios
 */

import { type Page, expect } from '@playwright/test';
import { injectAxe, checkA11y, type AxeResults } from 'axe-playwright';

export class AssertionHelper {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for entity data to be loaded (no loading indicators, no errors)
   * @param timeout - Maximum time to wait
   */
  async waitForEntityData(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    // Wait for loading to complete
    while (true) {
      const isLoading = await this.page.evaluate(() => {
        const loadingIndicators = [
          '[data-loading="true"]',
          '.loading',
          '.spinner',
          '[role="progressbar"]',
        ];

        for (const selector of loadingIndicators) {
          if (document.querySelector(selector)) {
            return true;
          }
        }
        return false;
      });

      if (!isLoading) {
        break;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Entity data did not load within ${timeout}ms - still showing loading indicators`);
      }

      await this.page.waitForTimeout(100);
    }

    // Verify no error state
    await this.waitForNoError(timeout);

    // Ensure content is present (at minimum, a title/heading)
    await expect(this.page.locator('h1')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for no error messages to be displayed
   * @param timeout - Maximum time to wait
   */
  async waitForNoError(timeout = 10000): Promise<void> {
    const errorSelectors = [
      '[data-error="true"]',
      '.error',
      '[role="alert"]:has-text("error")',
      'text=/error:/i',
      'text=/failed to/i',
      'text=/something went wrong/i',
    ];

    // Wait a bit for any errors to appear
    await this.page.waitForTimeout(500);

    const hasError = await this.page.evaluate((selectors) => {
      for (const selector of selectors) {
        if (document.querySelector(selector)) {
          return true;
        }
      }
      return false;
    }, errorSelectors);

    if (hasError) {
      const errorText = await this.page.locator('[data-error="true"], .error, [role="alert"]').first().textContent();
      throw new Error(`Page loaded with error: ${errorText}`);
    }
  }

  /**
   * Wait for search results to be displayed
   * @param minCount - Minimum number of results expected
   * @param timeout - Maximum time to wait
   */
  async waitForSearchResults(minCount = 1, timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (true) {
      // Wait for search results container
      const resultsContainer = this.page.locator('[data-search-results], .search-results, [role="list"]');

      if ((await resultsContainer.count()) > 0) {
        // Check if we have enough results
        const resultItems = resultsContainer.locator('[data-result-item], .result-item, [role="listitem"]');
        const count = await resultItems.count();

        if (count >= minCount) {
          return;
        }
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Search results did not appear with at least ${minCount} items within ${timeout}ms`);
      }

      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Verify accessibility using @axe-core/playwright
   * @param options - Axe options (e.g., which rules to run, which elements to include/exclude)
   */
  async verifyAccessibility(options?: {
    includedImpacts?: string[];
    detailedReport?: boolean;
    detailedReportOptions?: { html?: boolean };
  }): Promise<void> {
    // Inject axe-core into the page
    await injectAxe(this.page);

    // Run accessibility check
    await checkA11y(
      this.page,
      undefined,
      {
        detailedReport: options?.detailedReport ?? false,
        detailedReportOptions: options?.detailedReportOptions ?? { html: false },
        includedImpacts: options?.includedImpacts ?? ['critical', 'serious'],
      }
    );
  }

  /**
   * Get accessibility violations (returns results without throwing)
   * @param options - Axe options
   */
  async getAccessibilityViolations(options?: {
    includedImpacts?: string[];
  }): Promise<AxeResults> {
    await injectAxe(this.page);

    return this.page.evaluate(async (opts) => {
      // @ts-expect-error - axe is injected globally
      const results = await window.axe.run({
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      });

      // Filter by impact if specified
      if (opts?.includedImpacts && opts.includedImpacts.length > 0) {
        results.violations = results.violations.filter((violation: { impact?: string }) =>
          opts.includedImpacts?.includes(violation.impact ?? '')
        );
      }

      return results;
    }, options);
  }

  /**
   * Assert that an element is visible and has text content
   * @param selector - The element selector
   * @param expectedText - The expected text (string or regex)
   */
  async assertElementHasText(selector: string, expectedText: string | RegExp): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();

    if (typeof expectedText === 'string') {
      await expect(element).toHaveText(expectedText);
    } else {
      await expect(element).toHaveText(expectedText);
    }
  }

  /**
   * Assert that an element has a specific attribute value
   * @param selector - The element selector
   * @param attribute - The attribute name
   * @param expectedValue - The expected value (string or regex)
   */
  async assertElementHasAttribute(selector: string, attribute: string, expectedValue: string | RegExp): Promise<void> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toHaveAttribute(attribute, expectedValue);
  }

  /**
   * Assert that a specific number of elements match a selector
   * @param selector - The element selector
   * @param expectedCount - The expected count
   */
  async assertElementCount(selector: string, expectedCount: number): Promise<void> {
    const elements = this.page.locator(selector);
    await expect(elements).toHaveCount(expectedCount);
  }

  /**
   * Assert that the page title matches expected value
   * @param expectedTitle - The expected title (string or regex)
   */
  async assertPageTitle(expectedTitle: string | RegExp): Promise<void> {
    if (typeof expectedTitle === 'string') {
      await expect(this.page).toHaveTitle(expectedTitle);
    } else {
      await expect(this.page).toHaveTitle(expectedTitle);
    }
  }

  /**
   * Assert that the current URL matches expected pattern
   * @param expectedURL - The expected URL pattern (string or regex)
   */
  async assertURL(expectedURL: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expectedURL);
  }

  /**
   * Assert that an element is visible
   * @param selector - The element selector
   */
  async assertElementVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Assert that an element is hidden/not visible
   * @param selector - The element selector
   */
  async assertElementHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  /**
   * Assert that an element is enabled
   * @param selector - The element selector
   */
  async assertElementEnabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeEnabled();
  }

  /**
   * Assert that an element is disabled
   * @param selector - The element selector
   */
  async assertElementDisabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeDisabled();
  }

  /**
   * Assert that an element is focused
   * @param selector - The element selector
   */
  async assertElementFocused(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeFocused();
  }

  /**
   * Assert that localStorage contains a specific key with expected value
   * @param key - The storage key
   * @param expectedValue - The expected value (will be JSON stringified if object)
   */
  async assertLocalStorage(key: string, expectedValue: string | Record<string, unknown>): Promise<void> {
    const actualValue = await this.page.evaluate((k) => localStorage.getItem(k), key);

    const expected = typeof expectedValue === 'string' ? expectedValue : JSON.stringify(expectedValue);

    if (actualValue !== expected) {
      throw new Error(`localStorage["${key}"] = ${actualValue}, expected ${expected}`);
    }
  }

  /**
   * Assert that the page has no console errors
   * NOTE: This requires setting up a console error listener before navigation
   */
  async assertNoConsoleErrors(errors: string[]): Promise<void> {
    if (errors.length > 0) {
      throw new Error(`Console errors found:\n${errors.join('\n')}`);
    }
  }

  /**
   * Wait for and assert that a graph/canvas is rendered
   * @param timeout - Maximum time to wait
   */
  async waitForGraphRendered(timeout = 30000): Promise<void> {
    // Wait for canvas element
    await expect(this.page.locator('canvas')).toBeVisible({ timeout });

    // Verify canvas has content (width and height > 0)
    const hasContent = await this.page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas !== null && canvas.width > 0 && canvas.height > 0;
    });

    if (!hasContent) {
      throw new Error('Graph canvas found but has no content (width or height is 0)');
    }
  }

  /**
   * Assert that a form field has a specific validation error
   * @param fieldSelector - The field selector
   * @param errorMessage - Expected error message (string or regex)
   */
  async assertFieldError(fieldSelector: string, errorMessage: string | RegExp): Promise<void> {
    const field = this.page.locator(fieldSelector);
    await expect(field).toHaveAttribute('aria-invalid', 'true');

    // Look for error message near the field
    const errorElement = this.page.locator(`${fieldSelector} + .error, ${fieldSelector} ~ .error, [data-field-error]`);
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toHaveText(errorMessage);
  }
}
