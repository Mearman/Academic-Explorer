/**
 * Base SPA Page Object for React Single Page Applications
 * Extends BasePageObject with SPA-specific functionality
 */

import { BasePageObject } from './BasePageObject';
import { type Page } from '@playwright/test';

export abstract class BaseSPAPageObject extends BasePageObject {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Wait for React app to be ready
   * Checks for React root element and hydration complete
   */
  async waitForAppReady(timeout = 30000): Promise<void> {
    // Wait for the app root to be present
    await this.waitForSelector('#root', timeout);

    // Wait for React to hydrate (no loading indicators)
    await this.page.waitForFunction(
      () => {
        const root = document.querySelector('#root');
        return root !== null && root.childElementCount > 0;
      },
      { timeout }
    );

    // Give React a moment to settle after hydration
    await this.page.waitForTimeout(100);
  }

  /**
   * Override waitForPageReady to include SPA-specific checks
   */
  override async waitForPageReady(timeout = 30000): Promise<void> {
    await super.waitForPageReady(timeout);
    await this.waitForAppReady(timeout);
  }

  /**
   * Wait for client-side navigation to complete
   * Useful when navigating within the SPA
   */
  async waitForNavigation(timeout = 10000): Promise<void> {
    // Wait for URL to change
    const initialUrl = this.getCurrentURL();
    await this.page.waitForFunction(
      (prevUrl) => window.location.href !== prevUrl,
      initialUrl,
      { timeout }
    );

    // Wait for app to be ready after navigation
    await this.waitForAppReady(timeout);
  }

  /**
   * Check if the app is showing a loading state
   */
  async isLoading(): Promise<boolean> {
    // Check for common loading indicators
    const loadingIndicators = [
      '[data-loading="true"]',
      '.loading',
      '.spinner',
      '[role="progressbar"]',
    ];

    for (const selector of loadingIndicators) {
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Wait for loading state to complete
   */
  async waitForLoadingComplete(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (await this.isLoading()) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Loading did not complete within ${timeout}ms`);
      }
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Wait for data to be loaded (no error messages, has content)
   */
  async waitForDataLoaded(timeout = 30000): Promise<void> {
    await this.waitForLoadingComplete(timeout);

    // Ensure there's no error message displayed
    const errorSelectors = [
      '[data-error="true"]',
      '.error',
      '[role="alert"]',
    ];

    for (const selector of errorSelectors) {
      const errorLocator = this.page.locator(selector);
      const count = await errorLocator.count();
      if (count > 0) {
        const errorText = await errorLocator.first().textContent();
        throw new Error(`Page loaded with error: ${errorText}`);
      }
    }
  }

  /**
   * Navigate within the SPA (client-side navigation)
   * @param path - The path to navigate to
   */
  async navigateTo(path: string): Promise<void> {
    await this.goto(path);
    await this.waitForPageReady();
  }

  /**
   * Check if currently on a specific route
   * @param routePattern - Pattern to match against current URL
   */
  isOnRoute(routePattern: string | RegExp): boolean {
    const currentPath = new URL(this.getCurrentURL()).pathname;

    if (typeof routePattern === 'string') {
      return currentPath === routePattern || currentPath.startsWith(routePattern);
    }

    return routePattern.test(currentPath);
  }

  /**
   * Wait for a specific route to be active
   * @param routePattern - Pattern to match against current URL
   * @param timeout - Maximum time to wait
   */
  async waitForRoute(routePattern: string | RegExp, timeout = 10000): Promise<void> {
    const startTime = Date.now();

    while (!this.isOnRoute(routePattern)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Did not navigate to route ${routePattern} within ${timeout}ms`);
      }
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Check if an error boundary is displayed
   */
  async hasErrorBoundary(): Promise<boolean> {
    // Check for React error boundary indicators
    const errorBoundarySelectors = [
      '[data-error-boundary="true"]',
      '.error-boundary',
      'text=/Something went wrong/i',
    ];

    for (const selector of errorBoundarySelectors) {
      if (await this.elementExists(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get error boundary message if present
   */
  async getErrorBoundaryMessage(): Promise<string | null> {
    if (!(await this.hasErrorBoundary())) {
      return null;
    }

    const errorBoundary = this.page.locator('[data-error-boundary="true"], .error-boundary').first();
    return errorBoundary.textContent();
  }
}
