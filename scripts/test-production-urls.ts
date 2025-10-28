#!/usr/bin/env tsx
/**
 * Test script to verify that OpenAlex URLs are correctly handled by the production deployment
 * Tests all URLs from openalex-urls.json against GitHub Pages
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TestResult {
  url: string;
  testUrls: string[];
  status: "pass" | "fail" | "skip";
  httpCode?: number;
  error?: string;
  testedUrl?: string;
}

const PRODUCTION_BASE = "https://mearman.github.io/Academic-Explorer";
const MAX_CONCURRENT = 5; // Limit concurrent requests to avoid rate limiting

// Read URLs from openalex-urls.json
const urlsPath = resolve(process.cwd(), "openalex-urls.json");
const urls: string[] = JSON.parse(readFileSync(urlsPath, "utf-8"));

// Parse CLI arguments
const args = process.argv.slice(2);
const sampleSize = args[0] === "all" ? urls.length : parseInt(args[0]) || 20;
const testUrls = urls.slice(0, Math.min(sampleSize, urls.length));

console.log(`Testing ${testUrls.length} URLs from openalex-urls.json against production`);
console.log(`Base URL: ${PRODUCTION_BASE}\n`);

/**
 * Test a single URL by making an HTTP request
 */
async function testUrl(url: string): Promise<TestResult> {
  try {
    // Parse the OpenAlex URL
    const parsed = new URL(url);
    const path = parsed.pathname;
    const search = parsed.search;

    // Build test URLs - try both relative path and full URL in hash
    const relativeUrl = `${PRODUCTION_BASE}/#${path}${search}`;
    const fullUrl = `${PRODUCTION_BASE}/#/${url}`;

    const testCandidates = [relativeUrl, fullUrl];

    // Try the first URL format (relative path)
    try {
      const response = await fetch(relativeUrl, {
        method: "HEAD",
        redirect: "follow",
      });

      if (response.ok) {
        return {
          url,
          testUrls: testCandidates,
          status: "pass",
          httpCode: response.status,
          testedUrl: relativeUrl,
        };
      }
    } catch (error) {
      // If first format fails, we'll try the second
    }

    // Try the second URL format (full URL in hash)
    try {
      const response = await fetch(fullUrl, {
        method: "HEAD",
        redirect: "follow",
      });

      return {
        url,
        testUrls: testCandidates,
        status: response.ok ? "pass" : "fail",
        httpCode: response.status,
        testedUrl: fullUrl,
      };
    } catch (error) {
      return {
        url,
        testUrls: testCandidates,
        status: "fail",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } catch (error) {
    return {
      url,
      testUrls: [],
      status: "fail",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process URLs in batches to avoid overwhelming the server
 */
async function testUrlsBatch(urls: string[]): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
    const batch = urls.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(batch.map(testUrl));
    results.push(...batchResults);

    // Log progress
    const progress = Math.min(i + MAX_CONCURRENT, urls.length);
    process.stdout.write(`\rProgress: ${progress}/${urls.length}`);
  }

  process.stdout.write("\n\n");
  return results;
}

// Run tests
const results = await testUrlsBatch(testUrls);

// Print results
console.log("=".repeat(80));
console.log("Test Results:");
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
    if (r.httpCode) {
      console.log(`    HTTP ${r.httpCode}: ${r.testedUrl}`);
    }
    if (r.error) {
      console.log(`    Error: ${r.error}`);
    }
  });

  console.log("\n❌ Some tests failed!");
  process.exit(1);
}

// Show sample of successful URLs
if (passed > 0) {
  console.log("\nSample successful URLs (first 5):");
  results
    .filter(r => r.status === "pass")
    .slice(0, 5)
    .forEach(r => {
      console.log(`  ✅ ${r.url}`);
      console.log(`     → ${r.testedUrl}`);
    });
}

console.log("\n✅ All tests passed!");
