/**
 * E2E tests for edge direction filtering functionality
 * User Story 3 (T049): Full user flow verification
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.CI ? "http://localhost:4173" : "http://localhost:5173";

test.describe("Edge Direction Filtering E2E Tests", () => {
  test.setTimeout(30000);

  test.beforeEach(async ({ page }) => {
    // Navigate to a work with relationships for testing
    // W2741809807 is "Scholarship: A Manifesto" by Jason Priem - has multiple relationship types
    await page.goto(`${BASE_URL}/#/works/W2741809807`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");
  });

  test("should display direction filter controls in EdgeFiltersSection", async ({ page }) => {
    // Wait for page content to load
    await page.waitForTimeout(2000);

    // Check for Edge Direction section heading
    const edgeDirectionHeading = page.getByText("Edge Direction");
    const isVisible = await edgeDirectionHeading.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("Edge Direction section not immediately visible, waiting...");
      await page.waitForTimeout(2000);
    }

    // Verify direction filter section exists
    await expect(edgeDirectionHeading).toBeVisible({ timeout: 10000 });

    // Verify direction filter options are present
    const outboundOption = page.getByText("Outbound", { exact: false });
    const inboundOption = page.getByText("Inbound", { exact: false });
    const bothOption = page.getByText("Both", { exact: false });

    await expect(outboundOption.first()).toBeVisible({ timeout: 5000 });
    await expect(inboundOption.first()).toBeVisible({ timeout: 5000 });
    await expect(bothOption.first()).toBeVisible({ timeout: 5000 });

    console.log("Direction filter controls are visible");
  });

  test("should show 'Both' as default filter state", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for "All Directions" badge indicating Both filter is active
    const allDirectionsBadge = page.getByText("All Directions");
    await expect(allDirectionsBadge).toBeVisible({ timeout: 10000 });

    console.log("Default filter state is 'Both' (All Directions)");
  });

  test("should update filter badge when Outbound is selected", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find and click Outbound option (use getAllByText to avoid ambiguity)
    const outboundOptions = await page.getByText("Outbound").all();
    // Click the last occurrence (the one in the SegmentedControl)
    if (outboundOptions.length > 0) {
      await outboundOptions[outboundOptions.length - 1].click();
    }

    // Wait for filter to update
    await page.waitForTimeout(1000);

    // Verify badge shows "outbound"
    const outboundBadge = page.getByText("outbound", { exact: true });
    await expect(outboundBadge).toBeVisible({ timeout: 5000 });

    console.log("Filter badge updated to 'outbound'");
  });

  test("should update filter badge when Inbound is selected", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Find and click Inbound option
    const inboundOptions = await page.getByText("Inbound").all();
    // Click the last occurrence (the one in the SegmentedControl)
    if (inboundOptions.length > 0) {
      await inboundOptions[inboundOptions.length - 1].click();
    }

    // Wait for filter to update
    await page.waitForTimeout(1000);

    // Verify badge shows "inbound"
    const inboundBadge = page.getByText("inbound", { exact: true });
    await expect(inboundBadge).toBeVisible({ timeout: 5000 });

    console.log("Filter badge updated to 'inbound'");
  });

  test("should toggle between all three filter states", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Initial state: Both (All Directions)
    await expect(page.getByText("All Directions")).toBeVisible({ timeout: 10000 });
    console.log("Initial state: Both");

    // Click Outbound
    const outboundOptions = await page.getByText("Outbound").all();
    if (outboundOptions.length > 0) {
      await outboundOptions[outboundOptions.length - 1].click();
      await page.waitForTimeout(1000);
      await expect(page.getByText("outbound", { exact: true })).toBeVisible({ timeout: 5000 });
      console.log("Changed to: Outbound");
    }

    // Click Inbound
    const inboundOptions = await page.getByText("Inbound").all();
    if (inboundOptions.length > 0) {
      await inboundOptions[inboundOptions.length - 1].click();
      await page.waitForTimeout(1000);
      await expect(page.getByText("inbound", { exact: true })).toBeVisible({ timeout: 5000 });
      console.log("Changed to: Inbound");
    }

    // Click Both
    const bothOption = page.getByText("Both");
    await bothOption.click();
    await page.waitForTimeout(1000);
    await expect(page.getByText("All Directions")).toBeVisible({ timeout: 5000 });
    console.log("Changed back to: Both");
  });

  test("should display direction filter description", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify description text is present
    await expect(page.getByText("Filter edges by their data ownership direction:")).toBeVisible({
      timeout: 10000,
    });

    // Verify outbound description
    await expect(page.getByText("- Data stored on source entity")).toBeVisible({ timeout: 5000 });

    // Verify inbound description
    await expect(page.getByText("- Data discovered via reverse lookup")).toBeVisible({ timeout: 5000 });

    console.log("Direction filter description is visible");
  });

  test("should maintain filter state during user interaction", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Set filter to Outbound
    const outboundOptions = await page.getByText("Outbound").all();
    if (outboundOptions.length > 0) {
      await outboundOptions[outboundOptions.length - 1].click();
      await page.waitForTimeout(1000);
    }

    // Verify outbound is active
    await expect(page.getByText("outbound", { exact: true })).toBeVisible({ timeout: 5000 });

    // Interact with other elements (scroll, etc.)
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(500);

    // Filter should still be outbound
    await expect(page.getByText("outbound", { exact: true })).toBeVisible({ timeout: 5000 });

    console.log("Filter state maintained during user interaction");
  });

  test("should handle rapid filter changes", async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Rapidly toggle between filters
    for (let i = 0; i < 3; i++) {
      // Outbound
      const outboundOptions = await page.getByText("Outbound").all();
      if (outboundOptions.length > 0) {
        await outboundOptions[outboundOptions.length - 1].click();
        await page.waitForTimeout(200);
      }

      // Inbound
      const inboundOptions = await page.getByText("Inbound").all();
      if (inboundOptions.length > 0) {
        await inboundOptions[inboundOptions.length - 1].click();
        await page.waitForTimeout(200);
      }

      // Both
      await page.getByText("Both").click();
      await page.waitForTimeout(200);
    }

    // Final state should be Both
    await expect(page.getByText("All Directions")).toBeVisible({ timeout: 5000 });

    console.log("Handled rapid filter changes successfully");
  });

  test("should display filter controls without errors", async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Verify direction filter is visible
    await expect(page.getByText("Edge Direction")).toBeVisible({ timeout: 10000 });

    // Interact with filter
    const outboundOptions = await page.getByText("Outbound").all();
    if (outboundOptions.length > 0) {
      await outboundOptions[outboundOptions.length - 1].click();
      await page.waitForTimeout(1000);
    }

    // Check for critical errors (ignore warnings)
    const criticalErrors = errors.filter((err) => !err.includes("Warning") && !err.includes("useLayoutState"));

    if (criticalErrors.length > 0) {
      console.log("Critical errors detected:", criticalErrors);
    }

    // Test should pass even if there are non-critical warnings
    expect(criticalErrors.length).toBe(0);

    console.log("Filter controls displayed without critical errors");
  });
});
