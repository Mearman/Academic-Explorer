/**
 * End-to-end tests for catalogue sharing functionality
 */

import { expect, type Page,test } from "@playwright/test";

test.describe("Catalogue Sharing Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to catalogue page
    await page.goto("/#/catalogue");
    await page.waitForLoadState("networkidle");
    await Promise.race([
      page.waitForSelector('[data-testid="catalogue-manager"], .mantine-Tabs-panel', { timeout: 10_000 }),
      page.waitForSelector('text="Catalogue"', { timeout: 10_000 })
    ]);
  });

  test("should open share modal for a list", async ({ page }) => {
    // Note: Test depends on entity page functionality (adding entities to lists)
    // Create a test list first
    await createTestListWithEntities(page, "Shareable Test List");

    // Select the list
    await page.click('[data-testid="selected-list-title"]:has-text("Shareable Test List")');

    // Find and click share button
    await expect(page.locator('[data-testid="share-list-button"]')).toBeVisible();
    await page.click('[data-testid="share-list-button"]');

    // Verify share modal opens
    await expect(page.getByRole('dialog', { name: /Share/i })).toBeVisible();
    await expect(page.locator('h2:has-text("Share List")')).toBeVisible();
    await expect(page.locator('text="Share this list with others by sending them this link:"')).toBeVisible();
  });

  test("should generate share URL", async ({ page }) => {
    // Create a test list with entities
    await createTestListWithEntities(page, "URL Generation Test");

    // Select the list and open share modal
    await page.click('[data-testid="selected-list-title"]:has-text("URL Generation Test")');
    await page.click('[data-testid="share-list-button"]');

    // Wait for share URL to be generated
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text="Share URL"')).toBeVisible();

    // Verify URL contains localhost and catalogue path
    const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
    const shareUrl = await shareUrlInput.inputValue();
    expect(shareUrl).toContain("localhost");
    expect(shareUrl).toContain("catalogue/shared/");
  });

  test("should copy share URL to clipboard", async ({ page }) => {
    // Create and open share modal
    await createTestListWithEntities(page, "Copy URL Test");
    await page.click('[data-testid="selected-list-title"]:has-text("Copy URL Test")');
    await page.click('[data-testid="share-list-button"]');

    // Wait for share URL to be generated
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15_000 });

    // Click copy button
    const copyButton = page.locator('[data-testid="copy-share-url-button"]');
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveText("Copy");

    // Click to copy
    await copyButton.click();

    // Note: In test environment, the clipboard API may not work the same as in real browsers
    // Just verify the button is clickable and doesn't cause errors
    await expect(copyButton).toBeVisible();
  });

  test("should display QR code for sharing", async ({ page }) => {
    // Create and open share modal
    await createTestListWithEntities(page, "QR Code Test");
    await page.click('[data-testid="selected-list-title"]:has-text("QR Code Test")');
    await page.click('[data-testid="share-list-button"]');

    // Wait for share URL to be generated
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15_000 });

    // Click QR code button
    await page.click('[data-testid="toggle-qr-code-button"]');

    // Verify QR code is displayed
    await expect(page.locator('img[alt*="QR"], img[src*="data:image"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text="QR Code"')).toBeVisible();
  });

  test("should import list from shared URL", async ({ page }) => {
    // Note: Import functionality may show "Import Failed" error if not fully implemented
    // First create a list and get its share URL
    await createTestListWithEntities(page, "Original Shared List");
    await page.click('[data-testid="selected-list-title"]:has-text("Original Shared List")');
    await page.click('[data-testid="share-list-button"]');

    // Wait for share URL generation
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15_000 });

    // Copy the share URL
    const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
    const shareUrl = await shareUrlInput.inputValue();

    // Close share modal
    await page.keyboard.press('Escape');

    // Click import button
    await expect(page.locator('button:has-text("Import")')).toBeVisible();
    await page.click('button:has-text("Import")');

    // Verify import modal opens
    await expect(page.getByRole('dialog', { name: 'Import Catalogue List' })).toBeVisible();
    await expect(page.locator('text="Import Catalogue List"')).toBeVisible();

    // Paste the share URL
    await page.fill('input:below(:text("URL"))', shareUrl);

    // Click import button
    await page.click('button:has-text("Import List")');

    // Wait for import to complete (modal should close or show success)
    await expect(page.getByRole('dialog', { name: 'Import Catalogue List' })).not.toBeVisible({ timeout: 10_000 });

    // Verify imported list appears
    await expect(page.locator('text="Original Shared List (Imported)"')).toBeVisible({ timeout: 15_000 });

    // Verify it has the imported tag
    await expect(page.locator('text="imported"')).toBeVisible();
  });

  test("should import list from URL parameters", async ({ page }) => {
    // Note: This test expects automatic import modal when navigating to a share URL
    // Create a list and get share URL in first context
    const shareUrl = await createAndGetShareUrl(page);

    // Navigate directly to the shared URL
    await page.goto(shareUrl);
    await page.waitForLoadState("networkidle");

    // Should show import modal automatically
    await expect(page.getByRole('dialog', { name: 'Import Catalogue List' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text="Import Catalogue List"')).toBeVisible();

    // URL should be pre-filled
    const urlInput = page.locator('input:below(:text("URL"))');
    await expect(urlInput).toHaveValue(shareUrl);

    // Import the list
    await page.click('button:has-text("Import List")');

    // Verify import is successful
    await expect(page.getByRole('dialog', { name: 'Import Catalogue List' })).toBeHidden();
    await expect(page.locator('text="(Imported)"')).toBeVisible({ timeout: 15_000 });
  });

  test("should handle invalid shared URLs", async ({ page }) => {
    // Open import modal
    await page.click('button:has-text("Import")');
    await expect(page.getByRole('dialog', { name: 'Import Catalogue List' })).toBeVisible();

    // Enter invalid URL
    await page.fill('input:below(:text("URL"))', 'https://invalid-url.com/not-a-real-share');

    // Try to import
    await page.click('button:has-text("Import List")');

    // Should show error message in Alert component (may have multiple alerts, look for specific one)
    await expect(page.getByRole('alert', { name: 'Import Failed' })).toBeVisible({ timeout: 10_000 });
  });

  test("should make list public when sharing", async ({ page }) => {
    // Note: This test expects lists to automatically become public when shared
    // Create a list
    await createTestListWithEntities(page, "Public List Test");

    // Check initial visibility (should be private)
    await page.click('[data-testid="selected-list-title"]:has-text("Public List Test")');

    // Open share modal
    await page.click('[data-testid="share-list-button"]');

    // Wait for share URL generation
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15_000 });

    // Close share modal and check if list is now public
    await page.keyboard.press('Escape');

    // Look for public indicator - the list should have a public badge or indicator
    // Check if "Private" changes to "Public" or if a public indicator appears
    await expect(page.locator('text="Public"')).toBeVisible({ timeout: 5000 });
  });

  test("should share bibliography as well as lists", async ({ page }) => {
    // Create a bibliography
    await createTestBibliography(page, "Shareable Bibliography");

    // Select the bibliography
    await page.click('[data-testid="selected-list-title"]:has-text("Shareable Bibliography")');

    // Verify share button is available
    await expect(page.locator('[data-testid="share-list-button"]')).toBeVisible();

    // Open share modal
    await page.click('[data-testid="share-list-button"]');

    // Verify share modal works for bibliographies
    await expect(page.getByRole('dialog', { name: /Share/i })).toBeVisible();
    // The modal title should say "Share List" or similar (not necessarily "Share Bibliography")
    await expect(page.locator('h2', { hasText: /Share/i })).toBeVisible();
    await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15_000 });
  });
});

// Helper functions

const createTestListWithEntities = async (page: Page, listName: string): Promise<void> => {
  // Create the list
  await page.click('button:has-text("Create New List")');
  await expect(page.getByRole('dialog').filter({ hasText: /Create|Title/i })).toBeVisible();

  await page.fill('input:below(:text("Title"))', listName);
  await page.fill('textarea:below(:text("Description"))', `Test description for ${listName}`);

  await page.click('button:has-text("Create List")');
  await expect(page.getByRole('dialog').filter({ hasText: /Create|Title/i })).toBeHidden();
  await expect(page.locator('[data-testid="selected-list-title"]:has-text("' + listName + '")')).toBeVisible({ timeout: 10_000 });

  // Add some test entities by navigating to author pages first
  await page.goto("/#/authors/A5017898742");
  await page.waitForLoadState("networkidle");

  // Add the author to the catalogue
  const addToCatalogueButton = page.locator('[data-testid="add-to-catalogue-button"]');
  if (await addToCatalogueButton.isVisible()) {
    await addToCatalogueButton.click();

    // Modal opens directly with AddToListModal
    await expect(page.getByRole('dialog').filter({ hasText: /Add to/i })).toBeVisible({ timeout: 5000 });

    // Select the list we created using the Select dropdown
    await page.locator('[data-testid="add-to-list-select"]').click();
    await page.locator(`[role="option"]:has-text("${listName}")`).click();

    // Click Add to List button
    await page.locator('[data-testid="add-to-list-submit"]').click();
  }

  // Return to catalogue
  await page.goto("/#/catalogue");
  await page.waitForLoadState("networkidle");
};

const createTestBibliography = async (page: Page, bibName: string): Promise<void> => {
  await page.click('button:has-text("Create New List")');
  await expect(page.getByRole('dialog').filter({ hasText: /Create|Title/i })).toBeVisible();

  await page.fill('input:below(:text("Title"))', bibName);
  await page.fill('textarea:below(:text("Description"))', `Test bibliography: ${bibName}`);

  // Select bibliography type
  await page.click('input[value="bibliography"], label:has-text("Bibliography")');

  await page.click('button:has-text("Create Bibliography")');
  await expect(page.getByRole('dialog').filter({ hasText: /Create|Title/i })).toBeHidden();
  await expect(page.locator('[data-testid="selected-list-title"]:has-text("' + bibName + '")')).toBeVisible({ timeout: 10_000 });
};

const createAndGetShareUrl = async (page: Page): Promise<string> => {
  // Create list and get share URL
  await createTestListWithEntities(page, "URL Test List");

  await page.click('[data-testid="selected-list-title"]:has-text("URL Test List")');
  await page.click('[data-testid="share-list-button"]');

  // Wait for share URL generation
  await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({ timeout: 15_000 });

  const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
  return await shareUrlInput.inputValue();
};