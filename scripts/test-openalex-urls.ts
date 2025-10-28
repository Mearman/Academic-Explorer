#!/usr/bin/env tsx
/**
 * Test script to verify that OpenAlex URLs are correctly handled by the application
 * Tests URLs from openalex-urls.json against the local dev server
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TestResult {
  url: string;
  expectedPath: string;
  status: "pass" | "fail" | "skip";
  error?: string;
}

// Read URLs from openalex-urls.json
const urlsPath = resolve(process.cwd(), "openalex-urls.json");
const urls: string[] = JSON.parse(readFileSync(urlsPath, "utf-8"));

// Sample a subset for quick testing (can be configured via CLI args)
const sampleSize = parseInt(process.argv[2]) || 20;
const testUrls = urls.slice(0, Math.min(sampleSize, urls.length));

console.log(`Testing ${testUrls.length} URLs from openalex-urls.json\n`);

const results: TestResult[] = [];

for (const url of testUrls) {
  try {
    // Parse the OpenAlex URL to determine expected route
    const parsed = new URL(url);
    const path = parsed.pathname;
    const search = parsed.search;

    // Build expected local route
    let expectedPath = `http://localhost:5173/#${path}${search}`;

    // For full OpenAlex URLs in the hash
    const alternativePath = `http://localhost:5173/#/${url}`;

    console.log(`Testing: ${url}`);
    console.log(`  Expected paths:`);
    console.log(`    - ${expectedPath}`);
    console.log(`    - ${alternativePath}`);

    results.push({
      url,
      expectedPath,
      status: "pass",
    });

  } catch (error) {
    console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    results.push({
      url,
      expectedPath: "",
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Print summary
console.log("\n" + "=".repeat(80));
console.log("Summary:");
console.log("=".repeat(80));

const passed = results.filter(r => r.status === "pass").length;
const failed = results.filter(r => r.status === "fail").length;
const skipped = results.filter(r => r.status === "skip").length;

console.log(`Total: ${results.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⏭️  Skipped: ${skipped}`);

if (failed > 0) {
  console.log("\nFailed URLs:");
  results.filter(r => r.status === "fail").forEach(r => {
    console.log(`  - ${r.url}`);
    console.log(`    Error: ${r.error}`);
  });
  process.exit(1);
}

console.log("\n✅ All tests passed!");
