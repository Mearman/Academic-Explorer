/**
 * E2E Tests for Search Page
 * Tests search page functionality including search input and basic results display
 *
 * @tags @utility @search @critical
 */

import { test, expect } from '@playwright/test';
import { SearchPage } from '../page-objects/SearchPage';
import { waitForAppReady, waitForSearchResults } from '../helpers/app-ready';
import { AssertionHelper } from '../helpers/AssertionHelper';

test.describe('Search Page', () => {
  let searchPage: SearchPage;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
    assertions = new AssertionHelper(page);
  });

  test('should load search page successfully', async ({ page }) => {
    await searchPage.goto();
    await waitForAppReady(page);

    expect(page.url()).toContain('/search');
    await assertions.waitForNoError();
  });

  test('should have search input field', async ({ page }) => {
    await searchPage.goto();
    await waitForAppReady(page);

    const searchInput = searchPage.getSearchInput();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();
  });

  test('should perform search and display results', async ({ page }) => {
    await searchPage.goto();
    await waitForAppReady(page);

    // Perform a search
    await searchPage.search('machine learning');
    await waitForSearchResults(page, 1);

    // Verify results are displayed
    const hasResults = await searchPage.hasResults();
    expect(hasResults).toBe(true);

    const resultCount = await searchPage.getResultCount();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should update URL with search query', async ({ page }) => {
    await searchPage.goto();
    await waitForAppReady(page);

    await searchPage.search('quantum computing');
    await waitForSearchResults(page, 1);

    // URL should contain the query parameter
    expect(page.url()).toContain('q=');
    expect(page.url()).toContain('quantum');
  });

  test('should navigate to search page with pre-filled query', async ({ page }) => {
    await searchPage.goto('artificial intelligence');
    await waitForAppReady(page);

    const currentQuery = await searchPage.getCurrentQuery();
    expect(currentQuery).toContain('artificial intelligence');
  });

  test('should be accessible', async ({ page }) => {
    await searchPage.goto();
    await waitForAppReady(page);

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
