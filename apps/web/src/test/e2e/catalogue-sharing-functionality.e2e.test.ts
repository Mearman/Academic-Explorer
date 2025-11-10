/**
 * End-to-end tests for catalogue sharing functionality
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("Catalogue Sharing Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to catalogue page
    await page.goto("http://localhost:5173/#/catalogue");
    await page.waitForLoadState("networkidle");
    await Promise.race([
      page.waitForSelector('[data-testid="catalogue-manager"], .mantine-Tabs-panel', { timeout: 10000 }),
      page.waitForSelector('text="Catalogue"', { timeout: 10000 })
    ]);
  });

  test("should open share modal for a list", async ({ page }) => {
    // Create a test list first
    await createTestListWithEntities(page, "Shareable Test List");

    // Select the list
    await page.click('[data-testid="selected-list-title"]:has-text("Shareable Test List")');

    // Find and click share button
    await expect(page.locator('button:has-text("Share")')).toBeVisible();
    await page.click('button:has-text("Share")');

    // Verify share modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Share List")')).toBeVisible();
    await expect(page.locator('text="Share this list"')).toBeVisible();
  });

  test("should generate share URL", async ({ page }) => {
    // Create a test list with entities
    await createTestListWithEntities(page, "URL Generation Test");

    // Select the list and open share modal
    await page.click('[data-testid="selected-list-title"]:has-text("URL Generation Test")');
    await page.click('button:has-text("Share")');

    // Wait for share URL to be generated
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text="Share URL"')).toBeVisible();

    // Verify URL contains localhost and catalogue path
    const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
    const shareUrl = await shareUrlInput.inputValue();
    expect(shareUrl).toContain("localhost:5173");
    expect(shareUrl).toContain("catalogue/shared/");
  });

  test("should copy share URL to clipboard", async ({ page }) => {
    // Create and open share modal
    await createTestListWithEntities(page, "Copy URL Test");
    await page.click('[data-testid="selected-list-title"]:has-text("Copy URL Test")');
    await page.click('button:has-text("Share")');

    // Wait for share URL to be generated
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15000 });

    // Click copy button
    await page.click('[data-testid="copy-share-url-button"]');

    // Verify copy success feedback
    await expect(page.locator('text="Copied!", text="URL copied to clipboard"')).toBeVisible({ timeout: 5000 });
  });

  test("should display QR code for sharing", async ({ page }) => {
    // Create and open share modal
    await createTestListWithEntities(page, "QR Code Test");
    await page.click('[data-testid="selected-list-title"]:has-text("QR Code Test")');
    await page.click('button:has-text("Share")');

    // Wait for share URL to be generated
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15000 });

    // Click QR code button
    await page.click('[data-testid="qr-code-button"]');

    // Verify QR code is displayed
    await expect(page.locator('img[alt*="QR"], img[src*="data:image"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="QR Code"')).toBeVisible();
  });

  test("should import list from shared URL", async ({ page }) => {
    // First create a list and get its share URL
    await createTestListWithEntities(page, "Original Shared List");
    await page.click('[data-testid="selected-list-title"]:has-text("Original Shared List")');
    await page.click('button:has-text("Share")');

    // Wait for share URL generation
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15000 });

    // Copy the share URL
    const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
    const shareUrl = await shareUrlInput.inputValue();

    // Close share modal
    await page.keyboard.press('Escape');

    // Click import button
    await expect(page.locator('button:has-text("Import")')).toBeVisible();
    await page.click('button:has-text("Import")');

    // Verify import modal opens
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Import Shared List")')).toBeVisible();

    // Paste the share URL
    await page.fill('input:below(:text("URL"))', shareUrl);

    // Click import button
    await page.click('button:has-text("Import List")');

    // Wait for import to complete
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify imported list appears
    await expect(page.locator('text="Original Shared List (Imported)"')).toBeVisible({ timeout: 15000 });

    // Verify it has the imported tag
    await expect(page.locator('text="imported"')).toBeVisible();
  });

  test("should import list from URL parameters", async ({ page }) => {
    // Create a list and get share URL in first context
    const shareUrl = await createAndGetShareUrl(page);

    // Navigate directly to the shared URL
    await page.goto(shareUrl);
    await page.waitForLoadState("networkidle");

    // Should show import modal automatically
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Import Shared List")')).toBeVisible();

    // URL should be pre-filled
    const urlInput = page.locator('input:below(:text("URL"))');
    await expect(urlInput).toHaveValue(shareUrl);

    // Import the list
    await page.click('button:has-text("Import List")');

    // Verify import is successful
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page.locator('text="(Imported)"')).toBeVisible({ timeout: 15000 });
  });

  test("should handle invalid shared URLs", async ({ page }) => {
    // Open import modal
    await page.click('button:has-text("Import")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Enter invalid URL
    await page.fill('input:below(:text("URL"))', 'https://invalid-url.com/not-a-real-share');

    // Try to import
    await page.click('button:has-text("Import List")');

    // Should show error message
    await expect(page.locator('text="Invalid", text="URL"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Could not import"')).toBeVisible();
  });

  test("should make list public when sharing", async ({ page }) => {
    // Create a list
    await createTestListWithEntities(page, "Public List Test");

    // Check initial visibility (should be private)
    await page.click('[data-testid="selected-list-title"]:has-text("Public List Test")');

    // Open share modal
    await page.click('button:has-text("Share")');

    // Wait for share URL generation
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15000 });

    // Close share modal and check if list is now public
    await page.keyboard.press('Escape');

    // Look for public indicator
    await expect(page.locator('text="Public", [aria-label*="public"]')).toBeVisible({ timeout: 5000 });
  });

  test("should share bibliography as well as lists", async ({ page }) => {
    // Create a bibliography
    await createTestBibliography(page, "Shareable Bibliography");

    // Select the bibliography
    await page.click('[data-testid="selected-list-title"]:has-text("Shareable Bibliography")');

    // Verify share button is available
    await expect(page.locator('button:has-text("Share")')).toBeVisible();

    // Open share modal
    await page.click('button:has-text("Share")');

    // Verify share modal works for bibliographies
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Share Bibliography")')).toBeVisible();
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15000 });
  });
});

// Helper functions

async function createTestListWithEntities(page: Page, listName: string): Promise<void> {
  // Create the list
  await page.click('button:has-text("Create New List")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill('input:below(:text("Title"))', listName);
  await page.fill('textarea:below(:text("Description"))', `Test description for ${listName}`);

  await page.click('button:has-text("Create List")');
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="selected-list-title"]:has-text("' + listName + '")')).toBeVisible({ timeout: 10000 });

  // Add some test entities by navigating to author pages first
  await page.goto("http://localhost:5173/#/authors/A5017898742");
  await page.waitForLoadState("networkidle");

  // Add the author to the catalogue
  const addToCatalogueButton = page.locator('[data-testid="add-to-catalogue-button"]');
  if (await addToCatalogueButton.isVisible()) {
    await addToCatalogueButton.click();

    // Select the list we created - use modal list selection
    await page.click('[role="dialog"] [role="radio"]:has-text("' + listName + '")');
    await page.click('button:has-text("Add to List")');
  }

  // Return to catalogue
  await page.goto("http://localhost:5173/#/catalogue");
  await page.waitForLoadState("networkidle");
}

async function createTestBibliography(page: Page, bibName: string): Promise<void> {
  await page.click('button:has-text("Create New List")');
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill('input:below(:text("Title"))', bibName);
  await page.fill('textarea:below(:text("Description"))', `Test bibliography: ${bibName}`);

  // Select bibliography type
  await page.click('input[value="bibliography"], label:has-text("Bibliography")');

  await page.click('button:has-text("Create Bibliography")');
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="selected-list-title"]:has-text("' + bibName + '")')).toBeVisible({ timeout: 10000 });
}

async function createAndGetShareUrl(page: Page): Promise<string> {
  // Create list and get share URL
  await createTestListWithEntities(page, "URL Test List");

  await page.click('[data-testid="selected-list-title"]:has-text("URL Test List")');
  await page.click('button:has-text("Share")');

  // Wait for share URL generation
  await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15000 });

  const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
  return await shareUrlInput.inputValue();
}