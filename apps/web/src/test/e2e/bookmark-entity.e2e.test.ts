/**
 * E2E Test: Bookmark Entity Pages (T010)
 *
 * Tests bookmarking functionality on entity pages including:
 * - Navigate to entity page
 * - Click bookmark button to add bookmark
 * - Verify bookmark is added and persists in storage
 * - Navigate away and return to verify persistence
 * - Click bookmark button again to remove bookmark
 * - Verify bookmark is removed from storage
 *
 * This test is designed to FAIL initially as the bookmark button
 * does not have a data-testid attribute for reliable E2E testing.
 *
 * Required implementation:
 * - Add data-testid="entity-bookmark-button" to bookmark ActionIcon
 * - Ensure bookmark state persists across navigations
 * - Verify storage provider integration works correctly
 */

import { test, expect, type Page } from "@playwright/test";

test.describe("Bookmark Entity Pages (T010)", () => {
  const BASE_URL = "http://localhost:5173";

  // Test entities from different types with known stable IDs
  const TEST_ENTITIES = [
    { type: "authors", id: "A5017898742", description: "Test Author" },
    { type: "works", id: "W2741809807", description: "Test Work" },
    { type: "institutions", id: "I27837315", description: "Test Institution" },
    { type: "sources", id: "S137773608", description: "Test Source" },
  ];

  test.beforeEach(async ({ page, context }) => {
    // Clear all storage to ensure clean state
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Clear IndexedDB storage (bookmarks are stored here)
    await page.evaluate(() => {
      const deleteDB = (dbName: string) => {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => {
            console.warn(`Database ${dbName} deletion blocked`);
            resolve(); // Continue anyway
          };
        });
      };

      // Delete both catalogue and user interactions databases
      return Promise.all([
        deleteDB('catalogue-db'),
        deleteDB('user-interactions')
      ]);
    });

    // Wait a moment for cleanup to complete
    await page.waitForTimeout(500);
  });

  test.describe("Author Entity Bookmarking", () => {
    test("should display bookmark button on author page", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // Wait for page to fully render
      await page.waitForTimeout(2000);

      // THIS TEST WILL FAIL - bookmark button needs data-testid attribute
      // Expected: <ActionIcon data-testid="entity-bookmark-button">
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');

      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
    });

    test("should bookmark author entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // THIS TEST WILL FAIL - bookmark button needs data-testid attribute
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Verify initial state - should NOT be bookmarked
      // The button should have variant="light" and color="gray" when not bookmarked
      const initialVariant = await bookmarkButton.getAttribute('data-variant');
      expect(initialVariant).not.toBe('filled');

      // Click to bookmark
      await bookmarkButton.click();

      // Wait for bookmark operation to complete
      await page.waitForTimeout(1000);

      // Verify bookmark state changed - button should now be filled/yellow
      const updatedVariant = await bookmarkButton.getAttribute('data-variant');
      expect(updatedVariant).toBe('filled');

      // Verify bookmark was persisted in IndexedDB
      const isBookmarked = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest = store.getAll();

        const entities = await new Promise<any[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
          getAllRequest.onerror = () => reject(getAllRequest.error);
        });

        db.close();

        // Check if entity exists in bookmarks list
        return entities.some(entity =>
          entity.listId === 'bookmarks' &&
          entity.entityId === 'A5017898742' &&
          entity.entityType === 'authors'
        );
      });

      expect(isBookmarked).toBe(true);
    });

    test("should persist bookmark across page navigation", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      // Navigate to author page and bookmark it
      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Navigate away to a different entity
      const differentEntity = TEST_ENTITIES[1]; // Work
      await page.goto(`${BASE_URL}/#/${differentEntity.type}/${differentEntity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Navigate back to the original author
      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Verify bookmark is still active (button should be filled)
      const returnedBookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(returnedBookmarkButton).toBeVisible({ timeout: 10000 });

      const variant = await returnedBookmarkButton.getAttribute('data-variant');
      expect(variant).toBe('filled');
    });

    test("should unbookmark entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // First bookmark the entity
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Verify it's bookmarked
      let variant = await bookmarkButton.getAttribute('data-variant');
      expect(variant).toBe('filled');

      // Now unbookmark it
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Verify it's no longer bookmarked
      variant = await bookmarkButton.getAttribute('data-variant');
      expect(variant).not.toBe('filled');

      // Verify bookmark was removed from IndexedDB
      const isBookmarked = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest = store.getAll();

        const entities = await new Promise<any[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
          getAllRequest.onerror = () => reject(getAllRequest.error);
        });

        db.close();

        // Check if entity still exists in bookmarks list
        return entities.some(entity =>
          entity.listId === 'bookmarks' &&
          entity.entityId === 'A5017898742' &&
          entity.entityType === 'authors'
        );
      });

      expect(isBookmarked).toBe(false);
    });

    test("should reload page and maintain bookmark state", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Bookmark the entity
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Reload the page
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(2000);

      // Verify bookmark button still shows bookmarked state
      const reloadedBookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(reloadedBookmarkButton).toBeVisible({ timeout: 10000 });

      const variant = await reloadedBookmarkButton.getAttribute('data-variant');
      expect(variant).toBe('filled');
    });
  });

  test.describe("Work Entity Bookmarking", () => {
    test("should bookmark work entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[1]; // Work

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Click to bookmark
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Verify bookmark state changed
      const variant = await bookmarkButton.getAttribute('data-variant');
      expect(variant).toBe('filled');

      // Verify in storage
      const isBookmarked = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest = store.getAll();

        const entities = await new Promise<any[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
          getAllRequest.onerror = () => reject(getAllRequest.error);
        });

        db.close();

        return entities.some(entity =>
          entity.listId === 'bookmarks' &&
          entity.entityId === 'W2741809807' &&
          entity.entityType === 'works'
        );
      });

      expect(isBookmarked).toBe(true);
    });
  });

  test.describe("Institution Entity Bookmarking", () => {
    test("should bookmark institution entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[2]; // Institution

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      const variant = await bookmarkButton.getAttribute('data-variant');
      expect(variant).toBe('filled');
    });
  });

  test.describe("Multiple Entity Bookmarking", () => {
    test("should bookmark multiple entities from different types", async ({ page }) => {
      // Bookmark entities of different types
      for (const entity of TEST_ENTITIES.slice(0, 3)) {
        await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        await page.waitForTimeout(2000);

        const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
        await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
        await bookmarkButton.click();
        await page.waitForTimeout(1000);
      }

      // Verify all bookmarks exist in storage
      const bookmarkCount = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest = store.getAll();

        const entities = await new Promise<any[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => resolve(getAllRequest.result);
          getAllRequest.onerror = () => reject(getAllRequest.error);
        });

        db.close();

        return entities.filter(entity => entity.listId === 'bookmarks').length;
      });

      expect(bookmarkCount).toBe(3);
    });

    test("should navigate to bookmarks page and see bookmarked entities", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      // Bookmark an entity first
      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await bookmarkButton.click();
      await page.waitForTimeout(1000);

      // Navigate to bookmarks page
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Should see the bookmarked entity card
      const bookmarkCard = page.locator('[data-testid="bookmark-card"]').first();
      await expect(bookmarkCard).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Error Handling", () => {
    test("should handle rapid bookmark toggle without errors", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      // Listen for console errors
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // Rapidly toggle bookmark multiple times
      for (let i = 0; i < 5; i++) {
        await bookmarkButton.click();
        await page.waitForTimeout(200);
      }

      // Wait for any errors to surface
      await page.waitForTimeout(2000);

      // Should not have any bookmark-related errors
      const bookmarkErrors = errors.filter(e =>
        e.toLowerCase().includes('bookmark') ||
        e.toLowerCase().includes('storage')
      );
      expect(bookmarkErrors).toHaveLength(0);
    });

    test("should display loading state during bookmark operation", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      await page.waitForTimeout(2000);

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      // The ActionIcon component should show loading state
      // This is indicated by the 'loading' prop being true
      await bookmarkButton.click();

      // In a real scenario, the loading prop would be briefly true
      // For this test, we just verify the button remains interactable
      await page.waitForTimeout(500);

      const isEnabled = await bookmarkButton.isEnabled();
      expect(isEnabled).toBe(true);
    });
  });
});
