/**
 * Navigation Helper for E2E Tests
 * Provides utilities for navigating through the Academic Explorer application
 */

import { type Page } from '@playwright/test';
import { type EntityType } from '../page-objects/BaseEntityPageObject';

export class NavigationHelper {
  private readonly page: Page;
  private readonly baseURL: string;

  constructor(page: Page) {
    this.page = page;
    this.baseURL = process.env.E2E_BASE_URL ?? (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173');
  }

  /**
   * Navigate to an entity detail page
   * @param entityType - Type of entity (works, authors, institutions, etc.)
   * @param entityId - The OpenAlex ID
   */
  async navigateToEntity(entityType: EntityType, entityId: string): Promise<void> {
    await this.page.goto(`${this.baseURL}/${entityType}/${entityId}`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to an entity index/list page
   * @param entityType - Type of entity
   */
  async navigateToIndex(entityType: EntityType): Promise<void> {
    await this.page.goto(`${this.baseURL}/${entityType}`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the browse page
   */
  async navigateToBrowse(): Promise<void> {
    await this.page.goto(`${this.baseURL}/browse`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the search page
   * @param query - Optional search query
   */
  async navigateToSearch(query?: string): Promise<void> {
    const url = query
      ? `${this.baseURL}/search?q=${encodeURIComponent(query)}`
      : `${this.baseURL}/search`;
    await this.page.goto(url);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the explore page
   */
  async navigateToExplore(): Promise<void> {
    await this.page.goto(`${this.baseURL}/explore`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the settings page
   */
  async navigateToSettings(): Promise<void> {
    await this.page.goto(`${this.baseURL}/settings`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the about page
   */
  async navigateToAbout(): Promise<void> {
    await this.page.goto(`${this.baseURL}/about`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the cache management page
   */
  async navigateToCache(): Promise<void> {
    await this.page.goto(`${this.baseURL}/cache`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the history page
   */
  async navigateToHistory(): Promise<void> {
    await this.page.goto(`${this.baseURL}/history`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the privacy page
   */
  async navigateToPrivacy(): Promise<void> {
    await this.page.goto(`${this.baseURL}/privacy`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to the terms page
   */
  async navigateToTerms(): Promise<void> {
    await this.page.goto(`${this.baseURL}/terms`);
    await this.waitForAppReady();
  }

  /**
   * Navigate to home page
   */
  async navigateToHome(): Promise<void> {
    await this.page.goto(this.baseURL);
    await this.waitForAppReady();
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForAppReady();
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForAppReady();
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForAppReady();
  }

  /**
   * Wait for the app to be ready (custom ready check)
   */
  async waitForAppReady(timeout = 30000): Promise<void> {
    // Wait for React root
    await this.page.waitForSelector('#root', { state: 'attached', timeout });

    // Wait for app to hydrate
    await this.page.waitForFunction(
      () => {
        const root = document.querySelector('#root');
        return root !== null && root.childElementCount > 0;
      },
      { timeout }
    );

    // Wait for no loading indicators
    await this.waitForLoadingComplete(timeout);
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (true) {
      const isLoading = await this.page.evaluate(() => {
        const loadingIndicators = [
          '[data-loading="true"]',
          '.loading',
          '.spinner',
          '[role="progressbar"]',
        ];

        for (const selector of loadingIndicators) {
          const element = document.querySelector(selector);
          if (element) {
            return true;
          }
        }

        return false;
      });

      if (!isLoading) {
        break;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Loading did not complete within ${timeout}ms`);
      }

      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Get the current route path
   */
  getCurrentPath(): string {
    const url = new URL(this.page.url());
    return url.pathname;
  }

  /**
   * Get the current query parameters
   */
  getQueryParams(): URLSearchParams {
    const url = new URL(this.page.url());
    return url.searchParams;
  }

  /**
   * Check if currently on a specific route
   * @param route - The route path or pattern
   */
  isOnRoute(route: string | RegExp): boolean {
    const currentPath = this.getCurrentPath();

    if (typeof route === 'string') {
      return currentPath === route || currentPath.startsWith(route);
    }

    return route.test(currentPath);
  }

  /**
   * Click a navigation link by text
   * @param linkText - The visible text of the link
   */
  async clickNavLink(linkText: string): Promise<void> {
    await this.page.getByRole('link', { name: linkText }).click();
    await this.waitForAppReady();
  }

  /**
   * Click a navigation link by href
   * @param href - The href attribute value
   */
  async clickLinkByHref(href: string): Promise<void> {
    await this.page.locator(`a[href="${href}"]`).click();
    await this.waitForAppReady();
  }
}
