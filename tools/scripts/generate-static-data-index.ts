#!/usr/bin/env npx tsx

import { join } from "path";
import { fileURLToPath } from "url";
import { generateAllIndexes } from "../../apps/web/src/lib/utils/static-data-index-generator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const STATIC_DATA_DIR = join(__dirname, "..", "public", "data", "openalex");

/**
 * Generate static data indexes CLI script
 */
async function main(): Promise<void> {
  try {
    console.log("🔄 Auto-download enabled - will download missing entities");

    await generateAllIndexes(STATIC_DATA_DIR, { autoDownload: true });

    console.log("✅ Index generation with auto-download completed");
  } catch (error) {
    console.error("❌ Error generating static data indexes:", error);
    process.exit(1);
  }
}

/**
 * Show usage information
 */
function showUsage(): void {
  console.log(`
Usage: npx tsx tools/scripts/generate-static-data-index.ts [options]

Options:
  --help, -h            Show this help message

Examples:
  npx tsx tools/scripts/generate-static-data-index.ts
  pnpm generate:static-indexes

Note: Auto-download of missing entities is always enabled.
`);
}

// Show help if requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  showUsage();
  process.exit(0);
}

// Run if called directly
void main();