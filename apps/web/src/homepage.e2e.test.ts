/**
 * E2E tests for homepage functionality
 * Tests the main Academic Explorer homepage with search, navigation, and basic interactions
 */

import { expect, test } from "@playwright/test";

// Skipped: Requires Playwright browser context. Run separately with E2E test runner.
test.describe.skip("Homepage E2E Tests", () => {
  test("should load homepage without infinite loops", async ({ page }) => {
    // Set up error tracking before navigation
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Navigate to homepage with a reasonable timeout
    await page.goto("/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Check that page loaded successfully - h1 title should be visible
    // Homepage is a Card component, not MainLayout with header
    const title = page.locator('h1:has-text("Academic Explorer")');
    await expect(title).toBeVisible({ timeout: 15000 });

    // Wait a bit to ensure no delayed errors
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test("should display homepage content correctly", async ({ page }) => {
    await page.goto("/");

    // Check main title in the homepage card
    const title = page.locator('h1:has-text("Academic Explorer")');
    await expect(title).toBeVisible();

    // Check description text
    const description = page.locator(
      "text=Explore academic literature through interactive knowledge graphs",
    );
    await expect(description).toBeVisible();

    // Check search input is present with correct aria-label
    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    await expect(searchInput).toBeVisible();

    // Check search button
    const searchButton = page.locator('button:has-text("Search & Visualize")');
    await expect(searchButton).toBeVisible();
  });

  test("should have working example search links", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Check example search links exist
    const mlExample = page.locator('a:has-text("machine learning")');
    await expect(mlExample).toBeVisible({ timeout: 15000 });

    const climateExample = page.locator('a:has-text("climate change")');
    await expect(climateExample).toBeVisible({ timeout: 15000 });

    const orcidExample = page.locator('a:has-text("ORCID example")');
    await expect(orcidExample).toBeVisible({ timeout: 15000 });

    // Note: We don't click these as they would trigger searches and navigation
    // The visibility check confirms the links are rendered correctly
  });

  test("should display technology stack correctly", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Verify the technology stack indicators are visible
    const reactIndicator = page.locator("text=React 19");
    await expect(reactIndicator).toBeVisible({ timeout: 15000 });

    const openAlexIndicator = page.locator("text=OpenAlex API");
    await expect(openAlexIndicator).toBeVisible({ timeout: 15000 });

    const xyFlowIndicator = page.locator("text=XYFlow");
    await expect(xyFlowIndicator).toBeVisible({ timeout: 15000 });

    // Note: Homepage is a landing page without navigation/theme controls
    // These elements are only available in the full app layout
  });

  test("should display example searches", async ({ page }) => {
    await page.goto("/");

    // Check for example search section
    const exampleSection = page.locator("text=Try these examples:");
    await expect(exampleSection).toBeVisible();

    // Check specific example links - they should be clickable anchors
    const mlExample = page.locator('a:has-text("machine learning")');
    await expect(mlExample).toBeVisible();

    const climateExample = page.locator('a:has-text("climate change")');
    await expect(climateExample).toBeVisible();

    const orcidExample = page.locator('a:has-text("ORCID example")');
    await expect(orcidExample).toBeVisible();
  });

  test("should allow typing in search input", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    await expect(searchInput).toBeVisible();

    // Type in search input
    const testQuery = "machine learning";
    await searchInput.fill(testQuery);

    // Verify the input value
    await expect(searchInput).toHaveValue(testQuery);

    // Search button should be enabled when there's text
    const searchButton = page.locator('button:has-text("Search & Visualize")');
    await expect(searchButton).toBeEnabled();
  });

  test("should handle search button states correctly", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    const searchButton = page.locator('button:has-text("Search & Visualize")');

    // Button should be disabled when input is empty
    await searchInput.fill("");
    await expect(searchButton).toBeDisabled();

    // Button should be enabled when there's text
    await searchInput.fill("test");
    await expect(searchButton).toBeEnabled();

    // Clear input - button should be disabled again
    await searchInput.fill("");
    await expect(searchButton).toBeDisabled();
  });


  test("should display helpful usage instructions", async ({ page }) => {
    await page.goto("/");

    // Check for usage instructions - the actual text from the component
    const instructions = page.locator(
      "text=Use the sidebar to search and filter • Click nodes to navigate • Double-click to expand relationships",
    );
    await expect(instructions).toBeVisible();
  });

  test("should have proper accessibility features", async ({ page }) => {
    await page.goto("/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Check search input has proper aria-label
    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // Verify search input is focusable and has correct attributes
    await searchInput.focus();
    const ariaLabel = await searchInput.getAttribute("aria-label");
    expect(ariaLabel).toBe("Search academic literature");

    // Note: Homepage is a landing page without full app layout
    // Theme toggle and sidebar controls are only in MainLayout (non-homepage routes)
  });
});
