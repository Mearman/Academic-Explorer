/**
 * End-to-end tests for catalogue basic functionality
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("Catalogue Basic Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to catalogue page
    await page.goto("http://localhost:5173/#/catalogue");
    await page.waitForLoadState("networkidle");
    // Wait for catalogue to load
    await Promise.race([
      page.waitForSelector('[data-testid="catalogue-manager"], .mantine-Tabs-panel', { timeout: 10000 }),
      page.waitForSelector('text="Catalogue"', { timeout: 10000 })
    ]);
  });

  test("should load catalogue page with navigation", async ({ page }) => {
    // Check that catalogue navigation button exists and is clickable
    await expect(page.locator('button:has-text("Catalogue")')).toBeVisible();

    // Navigate to catalogue via navigation
    await page.click('button:has-text("Catalogue")');
    await page.waitForLoadState("networkidle");

    // Verify URL contains catalogue
    expect(page.url()).toContain("catalogue");

    // Check for main catalogue elements
    await expect(page.locator('h1:has-text("Catalogue"), h2:has-text("Catalogue")')).toBeVisible();
    await expect(page.locator('button:has-text("Create New List")')).toBeVisible();
  });

  test("should display empty state when no lists exist", async ({ page }) => {
    // Clear existing catalogue data
    await page.evaluate(async () => {
      try {
        // @ts-ignore - Access global service for testing
        const { catalogueService } = window;
        if (catalogueService) {
          const lists = await catalogueService.getAllLists();
          for (const list of lists) {
            await catalogueService.deleteList(list.id);
          }
        }
      } catch (error) {
        console.log("Could not clear catalogue data:", error);
      }
    });

    // Reload page to see empty state
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check for empty state message
    await expect(page.locator('text="No lists yet", text="Create your first list"')).toBeVisible({ timeout: 10000 });
  });

  test("should create a new list successfully", async ({ page }) => {
    // Click create new list button
    await page.click('button:has-text("Create New List")');

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Create New List")')).toBeVisible();

    // Fill in list details
    await page.fill('input[placeholder*="list name"], input[aria-label*="title"], #list-title', 'Test List for E2E');
    await page.fill('textarea[placeholder*="description"], #list-description', 'This is a test list created by e2e tests');

    // Select list type
    await page.click('input[value="list"], label:has-text("List")');

    // Add tags
    await page.fill('input[placeholder*="tags"], #list-tags', 'test,e2e,demo');

    // Create the list
    await page.click('button:has-text("Create List")');

    // Wait for modal to close and list to appear
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('text="Test List for E2E"')).toBeVisible({ timeout: 10000 });

    // Verify list details are displayed
    await expect(page.locator('text="This is a test list created by e2e tests"')).toBeVisible();
    await expect(page.locator('text="test"')).toBeVisible();
    await expect(page.locator('text="e2e"')).toBeVisible();
  });

  test("should create a new bibliography successfully", async ({ page }) => {
    // Click create new list button
    await page.click('button:has-text("Create New List")');

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill in bibliography details
    await page.fill('input[placeholder*="list name"], input[aria-label*="title"], #list-title', 'Test Bibliography for E2E');
    await page.fill('textarea[placeholder*="description"], #list-description', 'This is a test bibliography created by e2e tests');

    // Select bibliography type
    await page.click('input[value="bibliography"], label:has-text("Bibliography")');

    // Create the bibliography
    await page.click('button:has-text("Create List")');

    // Wait for modal to close and bibliography to appear
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('text="Test Bibliography for E2E"')).toBeVisible({ timeout: 10000 });

    // Verify it shows as bibliography type
    await expect(page.locator('text="Bibliography"')).toBeVisible();
  });

  test("should edit list details", async ({ page }) => {
    // First create a list
    await createTestList(page, "Editable Test List");

    // Find edit button and click it
    await page.click('[aria-label*="edit"], button:has-text("Edit")');

    // Wait for edit modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Edit List")')).toBeVisible();

    // Update title
    await page.fill('input[placeholder*="list name"], input[aria-label*="title"], #list-title', 'Updated Test List');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify changes are saved
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('text="Updated Test List"')).toBeVisible({ timeout: 10000 });
  });

  test("should delete a list", async ({ page }) => {
    // First create a list
    await createTestList(page, "Deletable Test List");

    // Find delete button and click it
    await page.click('[aria-label*="delete"], button:has-text("Delete")');

    // Wait for confirmation dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text="Are you sure"')).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Delete"), button:has-text("Confirm")');

    // Verify list is deleted
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('text="Deletable Test List"')).not.toBeVisible({ timeout: 10000 });
  });

  test("should search and filter lists", async ({ page }) => {
    // Create multiple test lists
    await createTestList(page, "Machine Learning Research");
    await createTestList(page, "Data Science Papers");
    await createTestList(page, "AI Applications");

    // Search for specific list
    await page.fill('input[placeholder*="Search"], input[aria-label*="search"]', 'Machine Learning');

    // Verify search results
    await expect(page.locator('text="Machine Learning Research"')).toBeVisible();
    await expect(page.locator('text="Data Science Papers"')).not.toBeVisible();
    await expect(page.locator('text="AI Applications"')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder*="Search"], input[aria-label*="search"]', '');

    // Verify all lists are visible again
    await expect(page.locator('text="Machine Learning Research"')).toBeVisible();
    await expect(page.locator('text="Data Science Papers"')).toBeVisible();
    await expect(page.locator('text="AI Applications"')).toBeVisible();
  });

  test("should navigate between tabs", async ({ page }) => {
    // Check that default tabs are visible
    await expect(page.locator('button:has-text("Lists")')).toBeVisible();
    await expect(page.locator('button:has-text("Bibliographies")')).toBeVisible();

    // Click on Bibliographies tab
    await page.click('button:has-text("Bibliographies")');

    // Verify tab is active
    await expect(page.locator('button:has-text("Bibliographies")[aria-selected="true"]')).toBeVisible();

    // Click back to Lists tab
    await page.click('button:has-text("Lists")');

    // Verify tab is active
    await expect(page.locator('button:has-text("Lists")[aria-selected="true"]')).toBeVisible();
  });

  test("should display list statistics", async ({ page }) => {
    // Create a list
    await createTestList(page, "Statistics Test List");

    // Click on the list to view details
    await page.click('text="Statistics Test List"');

    // Wait for details view
    await expect(page.locator('text="Entities", text="0"')).toBeVisible({ timeout: 10000 });

    // Check for various statistics sections
    await expect(page.locator('text="Total", text="0"')).toBeVisible();
  });
});

// Helper function to create a test list
async function createTestList(page: Page, listName: string): Promise<void> {
  await page.click('button:has-text("Create New List")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill('input[placeholder*="list name"], input[aria-label*="title"], #list-title', listName);
  await page.fill('textarea[placeholder*="description"], #list-description', `Test description for ${listName}`);

  await page.click('button:has-text("Create List")');
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await expect(page.locator(`text="${listName}"`)).toBeVisible({ timeout: 10000 });
}