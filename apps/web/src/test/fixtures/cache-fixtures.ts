/**
 * Playwright test fixtures for enhanced caching
 * Provides HAR recording and cache management utilities
 */

import { test as base, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import crypto from "crypto";

interface CacheFixtures {
  cachedPage: Page;
  cacheStats: {
    hits: number;
    misses: number;
    enabled: boolean;
  };
}

const HAR_CACHE_DIR = path.join(__dirname, "../../test-results/har-cache");

/**
 * Generate a stable cache key for a test
 */
function getCacheKey(testTitle: string): string {
  // Create a hash of the test title for a stable filename
  return crypto.createHash("md5").update(testTitle).digest("hex").substring(0, 8);
}

/**
 * Extended test with caching capabilities
 */
export const test = base.extend<CacheFixtures>({
  /**
   * Enhanced page with HAR caching
   */
  cachedPage: async ({ page, context }, use, testInfo) => {
    const cacheKey = getCacheKey(testInfo.title);
    const harPath = path.join(HAR_CACHE_DIR, `${cacheKey}.har`);

    // Ensure HAR cache directory exists
    if (!fs.existsSync(HAR_CACHE_DIR)) {
      fs.mkdirSync(HAR_CACHE_DIR, { recursive: true });
    }

    const harExists = fs.existsSync(harPath);
    const shouldRecordHar = !harExists || process.env.E2E_REFRESH_CACHE === "true";

    if (shouldRecordHar) {
      console.log(`📹 Recording HAR for test: ${testInfo.title}`);

      // Start HAR recording for this test
      await context.routeFromHAR(harPath, {
        url: "**/api.openalex.org/**",
        update: true,
        updateMode: "minimal",
        updateContent: "embed",
      });
    } else {
      console.log(`📦 Using cached HAR for test: ${testInfo.title}`);

      // Use existing HAR file
      await context.routeFromHAR(harPath, {
        url: "**/api.openalex.org/**",
        update: false,
        notFound: "fallback",
      });
    }

    await use(page);

    // Log HAR file size
    if (fs.existsSync(harPath)) {
      const stats = fs.statSync(harPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(
        `📊 HAR file ${harExists ? "updated" : "created"}: ${harPath} (${sizeMB} MB)`
      );
    }
  },

  /**
   * Cache statistics for monitoring
   */
  cacheStats: async ({ page }, use, testInfo) => {
    const stats = {
      hits: 0,
      misses: 0,
      enabled: true,
    };

    // Monitor IndexedDB operations to track cache hits/misses
    await page.route("**/api.openalex.org/**", async (route) => {
      // This will be overridden by HAR routing, but we can still track stats
      const fromCache = route.request().resourceType() === "document";
      if (fromCache) {
        stats.hits++;
      } else {
        stats.misses++;
      }
      await route.continue();
    });

    await use(stats);

    // Log cache statistics after test
    console.log(`📈 Cache stats for "${testInfo.title}":`);
    console.log(`   Hits: ${stats.hits}, Misses: ${stats.misses}`);
    if (stats.hits + stats.misses > 0) {
      const hitRate = ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1);
      console.log(`   Hit rate: ${hitRate}%`);
    }
  },
});

export { expect } from "@playwright/test";
