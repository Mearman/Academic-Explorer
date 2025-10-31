/**
 * Playwright global setup
 * Handles storage state persistence and HAR caching for faster e2e tests
 */

import { chromium, FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

const STORAGE_STATE_PATH = path.join(
  __dirname,
  "test-results/storage-state/state.json"
);
const HAR_CACHE_DIR = path.join(__dirname, "test-results/har-cache");

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
  const shouldWarmCache =
    process.env.E2E_WARM_CACHE === "true" || !fs.existsSync(STORAGE_STATE_PATH);

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

      await page.goto(baseURL, { waitUntil: "networkidle", timeout: 60000 });

      // Wait for the application to initialize and cache to populate
      await page.waitForTimeout(5000);

      // Save storage state for reuse in tests
      await context.storageState({ path: STORAGE_STATE_PATH });
      console.log(`✅ Storage state saved to: ${STORAGE_STATE_PATH}`);

      // Log cache statistics if available
      const cacheStats = await page.evaluate(() => {
        // Check IndexedDB cache size
        if ("indexedDB" in window) {
          return new Promise((resolve) => {
            const request = indexedDB.open("openalex-cache");
            request.onsuccess = () => {
              const db = request.result;
              const objectStoreNames = Array.from(db.objectStoreNames);
              db.close();
              resolve({
                indexedDBStores: objectStoreNames,
                localStorageKeys: Object.keys(localStorage),
              });
            };
            request.onerror = () => resolve({ error: "Could not access IndexedDB" });
          });
        }
        return { localStorageKeys: Object.keys(localStorage) };
      });

      console.log("📊 Cache statistics:", cacheStats);
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
