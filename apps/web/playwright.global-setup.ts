/**
 * Playwright global setup
 * Handles storage state persistence and HAR caching for faster e2e tests
 */

import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Use relative paths to avoid import.meta issues
const STORAGE_STATE_PATH = path.join(
  process.cwd(),
  "apps/web/test-results/storage-state/state.json"
);
const HAR_CACHE_DIR = path.join(
  process.cwd(),
  "apps/web/test-results/har-cache"
);

async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting Playwright global setup...");

  // Ensure directories exist
  const storageDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
    console.log(`✅ Created storage state directory: ${storageDir}`);
  }

  if (!fs.existsSync(HAR_CACHE_DIR)) {
    fs.mkdirSync(HAR_CACHE_DIR, { recursive: true });
    console.log(`✅ Created HAR cache directory: ${HAR_CACHE_DIR}`);
  }

  // Check if we should warm up the cache
  // Skip cache warmup in CI environments to prevent hanging
  const shouldWarmCache =
    !process.env.CI &&
    (process.env.E2E_WARM_CACHE === "true" || !fs.existsSync(STORAGE_STATE_PATH));

  if (shouldWarmCache) {
    console.log("🔥 Warming cache with initial application load...");

    const browser = await chromium.launch();
    const context = await browser.newContext({
      // Record network traffic for caching
      recordHar: {
        path: path.join(HAR_CACHE_DIR, "warmup.har"),
        mode: "minimal",
      },
    });

    const page = await context.newPage();

    try {
      // Navigate to the base URL to warm up the cache
      const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:5173";
      console.log(`📡 Loading ${baseURL} to warm cache...`);

      // Add timeout protection for the entire page load process
      await Promise.race([
        page.goto(baseURL, { waitUntil: "networkidle", timeout: 30000 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Page load timeout")), 30000)
        )
      ]);

      // Wait for the application to initialize and cache to populate (with shorter timeout)
      await Promise.race([
        page.waitForTimeout(3000),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Application initialization timeout")), 3000)
        )
      ]);

      // Save storage state for reuse in tests (with timeout protection)
      await Promise.race([
        context.storageState({ path: STORAGE_STATE_PATH }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Storage state save timeout")), 10000)
        )
      ]);
      console.log(`✅ Storage state saved to: ${STORAGE_STATE_PATH}`);

      // Clear IndexedDB databases to prevent DexieError2 conflicts in E2E tests
      await page.evaluate(() => {
        return new Promise((resolve) => {
          if (!("indexedDB" in window)) {
            resolve({ error: "IndexedDB not available" });
            return;
          }

          const databasesToDelete = [
            "user-interactions",
            "catalogue-db",
            "openalex-cache"
          ];

          let deletedCount = 0;
          const totalCount = databasesToDelete.length;

          const checkComplete = () => {
            if (deletedCount === totalCount) {
              resolve({ deletedDatabases: databasesToDelete.length });
            }
          };

          databasesToDelete.forEach(dbName => {
            try {
              const deleteRequest = indexedDB.deleteDatabase(dbName);

              deleteRequest.onsuccess = () => {
                console.log(`✅ Deleted IndexedDB: ${dbName}`);
                deletedCount++;
                checkComplete();
              };

              deleteRequest.onerror = () => {
                console.log(`❌ Failed to delete IndexedDB: ${dbName}`);
                deletedCount++; // Still count as complete to avoid hanging
                checkComplete();
              };

              deleteRequest.onblocked = () => {
                console.log(`⚠️ Blocked deleting IndexedDB: ${dbName}`);
                deletedCount++; // Still count as complete to avoid hanging
                checkComplete();
              };
            } catch (error) {
              console.log(`❌ Exception deleting IndexedDB ${dbName}:`, error);
              deletedCount++; // Still count as complete to avoid hanging
              checkComplete();
            }
          });
        });
      });

      // Additional cleanup: Clear localStorage and sessionStorage
      await page.evaluate(() => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          console.log("✅ Cleared localStorage and sessionStorage");
        } catch (error) {
          console.log("⚠️ Failed to clear storage:", error);
        }
      });

      console.log("🧹 IndexedDB databases cleared for fresh E2E test state");

      // Log cache statistics if available (with timeout protection)
      const cacheStats = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Set a timeout for IndexedDB operations
          const timeout = setTimeout(() => {
            resolve({
              error: "IndexedDB access timeout",
              localStorageKeys: Object.keys(localStorage)
            });
          }, 3000); // Reduced timeout since we just cleared databases

          // Check IndexedDB cache size
          if ("indexedDB" in window) {
            try {
              const request = indexedDB.open("openalex-cache");

              request.onsuccess = () => {
                clearTimeout(timeout);
                const db = request.result;
                const objectStoreNames = Array.from(db.objectStoreNames);
                db.close();
                resolve({
                  indexedDBStores: objectStoreNames,
                  localStorageKeys: Object.keys(localStorage),
                });
              };

              request.onerror = () => {
                clearTimeout(timeout);
                resolve({
                  error: "Could not access IndexedDB",
                  localStorageKeys: Object.keys(localStorage)
                });
              };

              request.onblocked = () => {
                clearTimeout(timeout);
                resolve({
                  error: "IndexedDB access blocked",
                  localStorageKeys: Object.keys(localStorage)
                });
              };

              request.onupgradeneeded = () => {
                clearTimeout(timeout);
                resolve({
                  error: "IndexedDB needs upgrade",
                  localStorageKeys: Object.keys(localStorage)
                });
              };

            } catch (error) {
              clearTimeout(timeout);
              resolve({
                error: `IndexedDB exception: ${error}`,
                localStorageKeys: Object.keys(localStorage)
              });
            }
          } else {
            clearTimeout(timeout);
            resolve({
              error: "IndexedDB not available",
              localStorageKeys: Object.keys(localStorage)
            });
          }
        });
      });

      console.log("📊 Cache statistics after cleanup:", cacheStats);
    } catch (error) {
      console.error("❌ Cache warmup failed:", error);
      // Don't fail the entire setup if warmup fails
    } finally {
      await context.close();
      await browser.close();
    }
  } else {
    console.log("✅ Storage state exists, skipping cache warmup");
    console.log(`   Using: ${STORAGE_STATE_PATH}`);
  }

  console.log("✨ Global setup complete!");
  console.log(`   Storage state: ${STORAGE_STATE_PATH}`);
  console.log(`   HAR cache: ${HAR_CACHE_DIR}`);
}

export default globalSetup;
