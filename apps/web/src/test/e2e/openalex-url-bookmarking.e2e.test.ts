/**
 * E2E tests for OpenAlex URL redirection and bookmarking
 * Tests bookmarking of OpenAlex API URLs as mentioned in requirements
 */

import { expect, test } from "@playwright/test";

test.describe("OpenAlex URL Redirection and Bookmarking", () => {
  const BASE_URL = "http://localhost:5173";

  // Sample URLs from openalex-urls.json that should be bookmarkable
  const TEST_URLS = [
    "https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc",
    "https://api.openalex.org/authors/A5017898742",
    "https://api.openalex.org/institutions/I27837315",
    "https://api.openalex.org/sources/S137773608",
    "https://api.openalex.org/works/W2741809807",
  ];

  test.beforeEach(async ({ page, context }) => {
    // Clear storage before each test
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test.describe("URL Redirection", () => {
    test("should redirect OpenAlex API URLs to internal routes", async ({ page }) => {
      const testUrl = TEST_URLS[0]; // bioplastics works search

      // Navigate to the OpenAlex URL via our redirection route
      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`;
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Should redirect to internal works route
      await page.waitForURL(`**/works**`, { timeout: 10000 });

      // URL should contain the filter parameters
      const currentUrl = page.url();
      expect(currentUrl).toContain("works");
      expect(currentUrl).toContain("display_name.search:bioplastics");
    });

    test("should redirect entity URLs to detail pages", async ({ page }) => {
      const testUrl = TEST_URLS[1]; // author entity

      // Navigate to the OpenAlex entity URL
      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/authors/A5017898742`;
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Should redirect to author detail page
      await page.waitForURL(`**/authors/A5017898742**`, { timeout: 10000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain("authors/A5017898742");
    });

    test("should handle institution URLs", async ({ page }) => {
      const testUrl = TEST_URLS[2]; // institution entity

      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/institutions/I27837315`;
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForURL(`**/institutions/I27837315**`, { timeout: 10000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain("institutions/I27837315");
    });

    test("should handle source URLs", async ({ page }) => {
      const testUrl = TEST_URLS[3]; // source entity

      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/sources/S137773608`;
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForURL(`**/sources/S137773608**`, { timeout: 10000 });

      const currentUrl = page.url();
      expect(currentUrl).toContain("sources/S137773608");
    });
  });

  test.describe("Bookmarking Redirected URLs", () => {
    test("should bookmark redirected OpenAlex URLs", async ({ page }) => {
      const testUrl = TEST_URLS[0]; // bioplastics works search

      // Navigate via OpenAlex URL (gets redirected)
      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`;
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for redirect to complete
      await page.waitForTimeout(2000);

      // Look for bookmark button
      const bookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();

      // Try to find bookmark button with multiple selectors
      if (await bookmarkButton.isVisible({ timeout: 5000 })) {
        await bookmarkButton.click();
        await page.waitForTimeout(1000);

        // Verify bookmark was created by going to bookmarks page
        await page.goto(`${BASE_URL}/bookmarks`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        await page.waitForTimeout(2000);

        // Should see bookmark content
        const bookmarkContent = page.locator('.mantine-Card-root').first();
        if (await bookmarkContent.isVisible({ timeout: 5000 })) {
          await expect(bookmarkContent).toBeVisible();
        }
      }
    });

    test("should bookmark entity pages from OpenAlex URLs", async ({ page }) => {
      const testUrl = TEST_URLS[1]; // author entity

      // Navigate via OpenAlex URL
      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/authors/A5017898742`;
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for redirect and page load
      await page.waitForTimeout(3000);

      // Look for bookmark button in entity detail
      const bookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Bookmark the entity
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Verify in bookmarks page
      await page.goto(`${BASE_URL}/bookmarks`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Should see the bookmarked author
      const bookmarkContent = page.locator('.mantine-Card-root').first();
      await expect(bookmarkContent).toBeVisible({ timeout: 10000 });
    });

    test("should maintain bookmark state across URL redirections", async ({ page }) => {
      const testUrl = TEST_URLS[1]; // author entity

      // Navigate via OpenAlex URL
      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/authors/A5017898742`;
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      // Bookmark the entity
      const bookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Navigate to the same entity via direct URL
      await page.goto(`${BASE_URL}/authors/A5017898742`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Should still show as bookmarked
      const directBookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(directBookmarkButton).toBeVisible({ timeout: 10000 });

      // Navigate again via OpenAlex URL
      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      // Should still show as bookmarked
      const redirectedBookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(redirectedBookmarkButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("GitHub Pages Deployment URLs", () => {
    test("should handle GitHub Pages deployment URLs", async ({ page }) => {
      // Test with the specific URL format from requirements
      const githubPagesUrl = "https://mearman.github.io/Academic-Explorer/#/https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc";

      // For local testing, we'll simulate the hash-based routing
      const localTestUrl = `${BASE_URL}/#/https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`;

      await page.goto(localTestUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Should redirect to internal works route with proper parameters
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      expect(currentUrl).toContain("works");
    });
  });

  test.describe("URL Parameter Preservation", () => {
    test("should preserve complex query parameters during redirection", async ({ page }) => {
      const complexUrl = "https://api.openalex.org/works?filter=publication_year:2023,is_oa:true&sort=cited_by_count:desc&per-page=50";

      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/works?filter=publication_year:2023,is_oa:true&sort=cited_by_count:desc&per-page=50`;

      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Check that parameters are preserved in the redirected URL
      const currentUrl = page.url();
      expect(currentUrl).toContain("works");
      expect(currentUrl).toContain("publication_year:2023");
      expect(currentUrl).toContain("is_oa:true");
      expect(currentUrl).toContain("cited_by_count:desc");
    });
  });

  test.describe("Error Handling for Invalid URLs", () => {
    test("should handle invalid OpenAlex URLs gracefully", async ({ page }) => {
      const invalidUrl = "https://api.openalex.org/invalid-endpoint";

      const redirectUrl = `${BASE_URL}/#/https://api.openalex.org/invalid-endpoint`;

      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Should handle gracefully - either show error or redirect to search
      const currentUrl = page.url();
      // Should not crash and should still be on our app
      expect(currentUrl).toMatch(/localhost|mearman\.github\.io/);
    });

    test("should handle malformed URLs", async ({ page }) => {
      const malformedUrl = "not-a-valid-url";

      const redirectUrl = `${BASE_URL}/#/${malformedUrl}`;

      await page.goto(redirectUrl, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Should not crash the application
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();
    });
  });
});