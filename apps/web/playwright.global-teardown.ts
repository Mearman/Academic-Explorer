/**
 * Playwright global teardown
 * Handles cleanup after all tests complete
 */

import { FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

const HAR_CACHE_DIR = path.join(__dirname, "test-results/har-cache");

async function globalTeardown(config: FullConfig) {
  console.log("🧹 Starting Playwright global teardown...");

  // Log HAR cache statistics
  if (fs.existsSync(HAR_CACHE_DIR)) {
    const harFiles = fs.readdirSync(HAR_CACHE_DIR).filter((f) => f.endsWith(".har"));
    const totalSize = harFiles.reduce((acc, file) => {
      const stats = fs.statSync(path.join(HAR_CACHE_DIR, file));
      return acc + stats.size;
    }, 0);

    console.log(`📊 HAR cache statistics:`);
    console.log(`   Files: ${harFiles.length}`);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    // Clean up warmup HAR file if it exists (keep only test-specific HARs in CI)
    if (process.env.CI) {
      const warmupHar = path.join(HAR_CACHE_DIR, "warmup.har");
      if (fs.existsSync(warmupHar)) {
        fs.unlinkSync(warmupHar);
        console.log("✅ Cleaned up warmup HAR file");
      }
    }
  }

  console.log("✨ Global teardown complete!");
}

export default globalTeardown;
