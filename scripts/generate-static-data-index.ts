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
    await generateAllIndexes(STATIC_DATA_DIR);
  } catch (error) {
    console.error("❌ Error generating static data indexes:", error);
    process.exit(1);
  }
}

// Run if called directly
void main();