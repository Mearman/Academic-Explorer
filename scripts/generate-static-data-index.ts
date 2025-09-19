#!/usr/bin/env npx tsx

import { join } from "path";
import { fileURLToPath } from "url";
import { generateAllIndexes } from "../src/lib/utils/static-data-index-generator.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const STATIC_DATA_DIR = join(__dirname, "..", "public", "data", "openalex");

/**
 * Generate static data indexes CLI script
 */
async function main(): Promise<void> {
  try {
    // Check for auto-download flag
    const autoDownload = process.argv.includes("--auto-download") || process.argv.includes("-d");

    if (autoDownload) {
      console.log("🔄 Auto-download enabled - will download missing entities");
    }

    await generateAllIndexes(STATIC_DATA_DIR, { autoDownload });

    if (autoDownload) {
      console.log("✅ Index generation with auto-download completed");
    }
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
Usage: npx tsx scripts/generate-static-data-index.ts [options]

Options:
  --auto-download, -d    Download missing entities from OpenAlex API
  --help, -h            Show this help message

Examples:
  npx tsx scripts/generate-static-data-index.ts
  npx tsx scripts/generate-static-data-index.ts --auto-download
  pnpm generate:static-indexes
  pnpm generate:static-indexes --auto-download
`);
}

// Show help if requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  showUsage();
  process.exit(0);
}

// Run if called directly
void main();