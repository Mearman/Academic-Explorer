/**
 * E2E Test: URL Redirect and Data Display
 * 
 * Tests that:
 * 1. OpenAlex API URLs redirect correctly to internal routes
 * 2. All data from the API response is displayed in the UI
 */

import { test, expect } from "@playwright/test";

test.describe("URL Redirect and Data Display", () => {
  test("should redirect bioplastics URL and display all data", async ({ page }) => {
    // Navigate to the full OpenAlex API URL (as hash route)
    const fullUrl = "/#/https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc";
    await page.goto(`http://localhost:5173${fullUrl}`);
    
    // Wait for redirect to complete
    await page.waitForURL(/\/#\/works\?filter=/, { timeout: 10000 });
    
    // Verify the URL was redirected correctly
    const currentUrl = page.url();
    expect(currentUrl).toContain("/#/works?filter=display_name.search:bioplastics");
    expect(currentUrl).toContain("sort=publication_year:desc,relevance_score:desc");
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="entity-list"], [data-testid="entity-grid"]', { timeout: 15000 });
    
    // Verify that results are displayed
    const hasResults = await page.locator('[data-testid="entity-list"], [data-testid="entity-grid"]').count();
    expect(hasResults).toBeGreaterThan(0);
    
    // Check that work items are displayed
    const workItems = await page.locator('[data-testid^="work-"]').count();
    expect(workItems).toBeGreaterThan(0);
  });

  test("should display author A5017898742 with all data fields", async ({ page }) => {
    // Navigate directly to author page
    await page.goto("http://localhost:5173/#/authors/A5017898742");
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="entity-data-display"], .entity-detail-layout', { timeout: 15000 });
    
    // Verify key fields are present (based on OpenAlex author schema)
    const expectedFields = [
      "id",
      "display_name",
      "orcid",
      "works_count",
      "cited_by_count",
      "last_known_institution",
      "works_api_url",
    ];
    
    for (const field of expectedFields) {
      const fieldExists = await page.getByText(field, { exact: false }).count();
      expect(fieldExists).toBeGreaterThan(0);
    }
  });

  test("should handle all URL variations from openalex-urls.json", async ({ page }) => {
    // Test a sample of different URL patterns
    const testUrls = [
      {
        input: "/#/https://api.openalex.org/works/W2741809807",
        expected: "/#/works/W2741809807",
      },
      {
        input: "/#/https://api.openalex.org/authors/A5017898742",
        expected: "/#/authors/A5017898742",
      },
      {
        input: "/#/https://api.openalex.org/works?filter=author.id:A5023888391",
        expected: "/#/works?filter=author.id:A5023888391",
      },
    ];
    
    for (const urlTest of testUrls) {
      await page.goto(`http://localhost:5173${urlTest.input}`);
      await page.waitForURL(new RegExp(urlTest.expected.replace(/[?]/g, "\\?")), { timeout: 10000 });
      const currentUrl = page.url();
      expect(currentUrl).toContain(urlTest.expected);
    }
  });
});
