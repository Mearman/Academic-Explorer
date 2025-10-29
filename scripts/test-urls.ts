#!/usr/bin/env tsx
/**
 * Comprehensive URL Testing Script
 * Tests all 276 URLs from openalex-urls.json against the deployed GitHub Pages site
 * Verifies both full API URLs and relative paths return HTTP 200
 */

import { readFileSync } from "fs";
import { join } from "path";

const BASE_URL = "https://mearman.github.io/Academic-Explorer/#";
const TIMEOUT_MS = 10000;
const MAX_CONCURRENT = 5; // Limit concurrent requests to avoid rate limiting

interface TestResult {
  url: string;
  fullUrl: string;
  relativeUrl: string;
  fullUrlStatus: number;
  relativeUrlStatus: number;
  success: boolean;
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: "HEAD", // Use HEAD to avoid downloading full content
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function convertToRelativePath(apiUrl: string): string {
  // Convert https://api.openalex.org/works/W123 to /works/W123
  // Convert https://api.openalex.org/works?filter=... to /works?filter=...
  const match = apiUrl.match(/https:\/\/api\.openalex\.org(\/[^?]*)(\?.*)?/);
  if (match) {
    return match[1] + (match[2] || "");
  }
  return apiUrl;
}

async function testUrl(apiUrl: string): Promise<TestResult> {
  const relativePath = convertToRelativePath(apiUrl);
  const fullUrl = `${BASE_URL}${apiUrl}`;
  const relativeUrl = `${BASE_URL}${relativePath}`;

  const result: TestResult = {
    url: apiUrl,
    fullUrl,
    relativeUrl,
    fullUrlStatus: 0,
    relativeUrlStatus: 0,
    success: false,
  };

  try {
    // Test full API URL format
    const fullResponse = await fetchWithTimeout(fullUrl, TIMEOUT_MS);
    result.fullUrlStatus = fullResponse.status;

    // Test relative path format
    const relativeResponse = await fetchWithTimeout(relativeUrl, TIMEOUT_MS);
    result.relativeUrlStatus = relativeResponse.status;

    // Both should return 200
    result.success =
      result.fullUrlStatus === 200 && result.relativeUrlStatus === 200;
  } catch (error) {
    result.error =
      error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function testUrlsBatch(
  urls: string[],
  batchSize: number,
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(testUrl));
    results.push(...batchResults);

    // Progress indicator
    const progress = Math.min(i + batchSize, urls.length);
    const percentage = ((progress / urls.length) * 100).toFixed(1);
    console.log(`Progress: ${progress}/${urls.length} (${percentage}%)`);
  }

  return results;
}

function generateReport(results: TestResult[]): string {
  const total = results.length;
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  let report = `\n${"=".repeat(80)}\n`;
  report += `URL Testing Report\n`;
  report += `${"=".repeat(80)}\n\n`;
  report += `Total URLs tested: ${total}\n`;
  report += `Successful: ${successful} (${((successful / total) * 100).toFixed(1)}%)\n`;
  report += `Failed: ${failed.length} (${((failed.length / total) * 100).toFixed(1)}%)\n\n`;

  if (failed.length > 0) {
    report += `${"=".repeat(80)}\n`;
    report += `Failed URLs:\n`;
    report += `${"=".repeat(80)}\n\n`;

    for (const result of failed) {
      report += `URL: ${result.url}\n`;
      report += `  Full URL Status: ${result.fullUrlStatus}\n`;
      report += `  Relative URL Status: ${result.relativeUrlStatus}\n`;
      if (result.error) {
        report += `  Error: ${result.error}\n`;
      }
      report += "\n";
    }
  }

  return report;
}

async function main() {
  console.log("Loading URLs from openalex-urls.json...");

  const urlsPath = join(process.cwd(), "openalex-urls.json");
  let urls: string[];

  try {
    const content = readFileSync(urlsPath, "utf-8");
    urls = JSON.parse(content) as string[];
  } catch (error) {
    console.error("Failed to load openalex-urls.json:", error);
    process.exit(1);
  }

  console.log(`Loaded ${urls.length} URLs\n`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms`);
  console.log(`Max concurrent requests: ${MAX_CONCURRENT}\n`);
  console.log("Starting tests...\n");

  const startTime = Date.now();
  const results = await testUrlsBatch(urls, MAX_CONCURRENT);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const report = generateReport(results);
  console.log(report);

  console.log(`\nTotal time: ${duration}s`);
  console.log(`Average: ${(parseFloat(duration) / urls.length).toFixed(2)}s per URL\n`);

  // Exit with error code if any tests failed
  const failedCount = results.filter((r) => !r.success).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
