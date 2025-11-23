/**
 * Base Page Object for all page objects in E2E tests
 * Provides common functionality for page navigation, element interaction, and assertions
 */

import { type Page, type Locator } from '@playwright/test';

export abstract class BasePageObject {
  protected readonly page: Page;
  protected readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.E2E_BASE_URL ?? (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173');
  }

  /**
   * Navigate to a specific path
   * @param path - The path to navigate to (e.g., '/browse', '/works/W123')
   * @param options - Navigation options
   */
  async goto(path: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' }): Promise<void> {
    const url = `${this.baseURL}${path}`;
    await this.page.goto(url, {
      waitUntil: options?.waitUntil ?? 'domcontentloaded',
    });
  }

  /**
   * Wait for the page to be ready (app-specific ready state)
   * Override this in subclasses for app-specific ready checks
   */
  async waitForPageReady(timeout = 30000): Promise<void> {
    // Default: wait for document to be ready
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Get the current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Check if an element exists on the page
   * @param selector - The selector to check
   */
  async elementExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Get a locator by selector
   * @param selector - The selector to locate
   */
  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Get a locator by role
   * @param role - The ARIA role
   * @param options - Additional options
   */
  getByRole(role: 'button' | 'link' | 'heading' | 'textbox' | 'list' | 'listitem' | 'navigation' | 'main' | 'article' | 'region', options?: { name?: string | RegExp }): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get a locator by text
   * @param text - The text to find
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Get a locator by test ID
   * @param testId - The test ID (data-testid attribute)
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Wait for a selector to be visible
   * @param selector - The selector to wait for
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForSelector(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for a selector to be hidden
   * @param selector - The selector to wait for
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitForSelectorHidden(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Click an element
   * @param selector - The selector to click
   */
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /**
   * Fill an input field
   * @param selector - The selector of the input
   * @param value - The value to fill
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * Take a screenshot
   * @param name - The name of the screenshot file
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
  }

  /**
   * Execute JavaScript in the page context
   * @param script - The script to execute
   */
  async evaluate<T>(script: () => T | Promise<T>): Promise<T> {
    return this.page.evaluate(script);
  }

  /**
   * Wait for a specific condition
   * @param condition - Function that returns true when condition is met
   * @param timeout - Maximum time to wait in milliseconds
   */
  async waitFor(condition: () => boolean | Promise<boolean>, timeout = 10000): Promise<void> {
    const startTime = Date.now();
    while (!(await condition())) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for condition after ${timeout}ms`);
      }
      await this.page.waitForTimeout(100);
    }
  }
}
