/**
 * Page Object for Search Page
 */

import { BaseSPAPageObject } from './BaseSPAPageObject';
import { type Page } from '@playwright/test';
import { type EntityType } from './BaseEntityPageObject';

export class SearchPage extends BaseSPAPageObject {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the search page
   * @param query - Optional initial search query
   */
  async goto(query?: string): Promise<void> {
    const path = query ? `/search?q=${encodeURIComponent(query)}` : '/search';
    await super.goto(path);
    await this.waitForPageReady();
  }

  /**
   * Get the search input element
   */
  getSearchInput(): import('@playwright/test').Locator {
    return this.page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"]').first();
  }

  /**
   * Enter a search query
   * @param query - The search query
   */
  async search(query: string): Promise<void> {
    const searchInput = this.getSearchInput();
    await searchInput.fill(query);
    await searchInput.press('Enter');
    await this.waitForPageReady();
  }

  /**
   * Get search results count
   */
  async getResultCount(): Promise<number> {
    const results = this.page.locator('[data-search-result], .search-result, [data-result-item]');
    return results.count();
  }

  /**
   * Check if search results are displayed
   */
  async hasResults(): Promise<boolean> {
    return this.elementExists('[data-search-results], .search-results');
  }

  /**
   * Check if "no results" message is displayed
   */
  async hasNoResults(): Promise<boolean> {
    return this.elementExists('[data-no-results], .no-results, text=/no results/i');
  }

  /**
   * Filter results by entity type
   * @param entityType - The entity type filter
   */
  async filterByEntityType(entityType: EntityType): Promise<void> {
    const filter = this.page.locator(`[data-filter="${entityType}"], button:has-text("${entityType}")`).first();
    await filter.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get list of available filters
   */
  async getAvailableFilters(): Promise<string[]> {
    const filters = this.page.locator('[data-filter], .filter-button, .filter-option');
    const count = await filters.count();

    const filterNames: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await filters.nth(i).textContent();
      if (text) {
        filterNames.push(text.trim());
      }
    }

    return filterNames;
  }

  /**
   * Click on the first search result
   */
  async clickFirstResult(): Promise<void> {
    const firstResult = this.page.locator('[data-search-result], .search-result, [data-result-item]').first();
    await firstResult.click();
    await this.waitForNavigation();
  }

  /**
   * Click on a specific search result by index
   * @param index - The zero-based index of the result
   */
  async clickResult(index: number): Promise<void> {
    const result = this.page.locator('[data-search-result], .search-result, [data-result-item]').nth(index);
    await result.click();
    await this.waitForNavigation();
  }

  /**
   * Get the current search query from the URL or input
   */
  async getCurrentQuery(): Promise<string> {
    const url = new URL(this.getCurrentURL());
    const queryParam = url.searchParams.get('q');

    if (queryParam) {
      return queryParam;
    }

    const searchInput = this.getSearchInput();
    return (await searchInput.inputValue()) ?? '';
  }

  /**
   * Check if autocomplete suggestions are displayed
   */
  async hasAutocompleteSuggestions(): Promise<boolean> {
    return this.elementExists('[data-autocomplete], .autocomplete, [role="listbox"]');
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(): Promise<string[]> {
    const suggestions = this.page.locator('[data-autocomplete] li, .autocomplete li, [role="option"]');
    const count = await suggestions.count();

    const suggestionTexts: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await suggestions.nth(i).textContent();
      if (text) {
        suggestionTexts.push(text.trim());
      }
    }

    return suggestionTexts;
  }

  /**
   * Select an autocomplete suggestion by index
   * @param index - The zero-based index of the suggestion
   */
  async selectAutocompleteSuggestion(index: number): Promise<void> {
    const suggestion = this.page.locator('[data-autocomplete] li, .autocomplete li, [role="option"]').nth(index);
    await suggestion.click();
    await this.waitForPageReady();
  }
}
