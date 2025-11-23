/**
 * E2E Tests for Search Workflow
 * Tests complete search workflow: query → results → filtering → entity selection
 *
 * @tags @workflow @search @important
 */

import { test, expect } from '@playwright/test';
import { SearchPage } from '../src/test/page-objects/SearchPage';
import { NavigationHelper } from '../src/test/helpers/NavigationHelper';
import { AssertionHelper } from '../src/test/helpers/AssertionHelper';
import { waitForAppReady, waitForSearchResults } from '../src/test/helpers/app-ready';

test.describe('Search Workflow', () => {
  let searchPage: SearchPage;
  let navigation: NavigationHelper;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
    navigation = new NavigationHelper(page);
    assertions = new AssertionHelper(page);
  });

  test('complete search workflow: query to entity detail', async ({ page }) => {
    // Step 1: Navigate to search page
    await navigation.navigateToSearch();
    await waitForAppReady(page);

    // Step 2: Enter search query
    await searchPage.search('climate change');
    await waitForSearchResults(page, 1);

    // Step 3: Verify results are displayed
    const hasResults = await searchPage.hasResults();
    expect(hasResults).toBe(true);

    const resultCount = await searchPage.getResultCount();
    expect(resultCount).toBeGreaterThan(0);

    // Step 4: Click on first result
    await searchPage.clickFirstResult();
    await waitForAppReady(page);

    // Step 5: Verify navigation to entity detail page
    const currentPath = navigation.getCurrentPath();
    expect(currentPath).toMatch(/\/(works|authors|institutions|sources|concepts|topics|domains|fields|subfields)\//);

    // Step 6: Verify entity page loaded successfully
    await assertions.waitForEntityData();
  });

  test('search with filtering workflow', async ({ page }) => {
    // Step 1: Navigate to search with query
    await navigation.navigateToSearch('neural networks');
    await waitForAppReady(page);
    await waitForSearchResults(page, 1);

    // Step 2: Get initial result count
    const initialResultCount = await searchPage.getResultCount();
    expect(initialResultCount).toBeGreaterThan(0);

    // Step 3: Apply entity type filter (if available)
    const hasFilters = await searchPage.getAvailableFilters();

    if (hasFilters.length > 0) {
      // Try to filter by works
      const worksFilterExists = hasFilters.some(f => f.toLowerCase().includes('work'));

      if (worksFilterExists) {
        await searchPage.filterByEntityType('works');
        await page.waitForTimeout(1000); // Wait for filter to apply

        // Verify results still exist (may be different count)
        const filteredResultCount = await searchPage.getResultCount();
        expect(filteredResultCount).toBeGreaterThan(0);
      }
    }
  });

  test('search with autocomplete workflow', async ({ page }) => {
    // Step 1: Navigate to search
    await navigation.navigateToSearch();
    await waitForAppReady(page);

    // Step 2: Start typing to trigger autocomplete
    const searchInput = searchPage.getSearchInput();
    await searchInput.fill('machine');
    await page.waitForTimeout(500); // Wait for autocomplete

    // Step 3: Check if autocomplete suggestions appear
    const hasSuggestions = await searchPage.hasAutocompleteSuggestions();

    if (hasSuggestions) {
      const suggestions = await searchPage.getAutocompleteSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);

      // Step 4: Select first suggestion
      await searchPage.selectAutocompleteSuggestion(0);
      await waitForSearchResults(page, 1);

      // Step 5: Verify search was executed
      const hasResults = await searchPage.hasResults();
      expect(hasResults).toBe(true);
    }
  });

  test('search workflow handles no results gracefully', async ({ page }) => {
    // Step 1: Navigate to search
    await navigation.navigateToSearch();
    await waitForAppReady(page);

    // Step 2: Search for something very unlikely to return results
    await searchPage.search('xyzabc123definitely-not-a-real-term-987654');
    await waitForAppReady(page);

    // Step 3: Verify "no results" message is displayed
    const hasNoResults = await searchPage.hasNoResults();

    // Should either show no results message OR have zero results
    if (!hasNoResults) {
      const resultCount = await searchPage.getResultCount();
      // If no explicit "no results" message, count should be 0
      expect(resultCount).toBe(0);
    }
  });

  test('search workflow maintains query across navigation', async ({ page }) => {
    // Step 1: Navigate to search with query
    const searchQuery = 'renewable energy';
    await navigation.navigateToSearch(searchQuery);
    await waitForAppReady(page);

    // Step 2: Verify query is in URL and input
    const currentQuery = await searchPage.getCurrentQuery();
    expect(currentQuery).toContain(searchQuery);

    // Step 3: Navigate away and back
    await navigation.navigateToHome();
    await waitForAppReady(page);

    await navigation.goBack();
    await waitForAppReady(page);

    // Step 4: Verify query is still there
    const persistedQuery = await searchPage.getCurrentQuery();
    expect(persistedQuery).toContain(searchQuery);
  });
});
