/**
 * E2E tests for homepage functionality
 * Tests the main Academic Explorer homepage with search, navigation, and basic interactions
 */

import { expect, test } from "@playwright/test";

test.describe("Homepage E2E Tests", () => {
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

  // Responsive Layout Tests (User Story 1)
  test.describe("Responsive Layout", () => {
    test("should display properly on mobile viewport (320px) without horizontal scroll", async ({
      page,
    }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Verify content is visible
      const title = page.locator('h1:has-text("Academic Explorer")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Check for horizontal scrollbar by comparing scrollWidth to clientWidth
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify card is within viewport using the Card component's role
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        expect(cardBox.width).toBeLessThanOrEqual(320);
      }
    });

    test("should display properly on tablet viewport (768px) with card centered", async ({
      page,
    }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Verify content is visible
      const title = page.locator('h1:has-text("Academic Explorer")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Verify card stays within reasonable bounds (should be centered with maxWidth)
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        // Card should be less than viewport width (allowing for centering)
        expect(cardBox.width).toBeLessThanOrEqual(768);
        // Card should have some margin on sides (not full width on tablet)
        expect(cardBox.x).toBeGreaterThan(0);
      }
    });

    test("should display properly on desktop viewport (1920px) with maxWidth constraint", async ({
      page,
    }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Verify content is visible
      const title = page.locator('h1:has-text("Academic Explorer")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Verify card respects maxWidth (should be constrained, not full width)
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        // Card should be significantly less than viewport width (respects maxWidth)
        expect(cardBox.width).toBeLessThan(1000);
        // Card should not be taking full viewport width
        expect(cardBox.width).toBeLessThan(1920 * 0.9);
      }
    });

    test("should display properly on 4K viewport (3840px) with content constrained", async ({
      page,
    }) => {
      // Set 4K viewport
      await page.setViewportSize({ width: 3840, height: 2160 });
      await page.goto("/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Verify content is visible
      const title = page.locator('h1:has-text("Academic Explorer")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Verify card remains width-constrained with maxWidth
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        // Card should maintain maxWidth constraint
        expect(cardBox.width).toBeLessThan(1000);
        // Card should not be taking full viewport width
        expect(cardBox.width).toBeLessThan(3840 * 0.9);
      }
    });
  });
});
