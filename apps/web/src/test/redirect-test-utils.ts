import { extractOpenAlexPaths } from "../../../../scripts/extract-openalex-paths";
import * as path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface RedirectTestCase {
  originalUrl: string;
  path: string;
  webAppVariations: string[];
  apiVariations: string[];
  expectedCanonicalRoute: string;
  expectedApiRoute: string;
}

/**
 * Generate all redirect test cases from documented URLs
 * Prefers openalex-urls.json if available, otherwise falls back to docs
 */
export async function generateRedirectTestCases(): Promise<RedirectTestCase[]> {
  let urls: string[] = [];

  // Try to load from openalex-urls.json first
  try {
    const urlsJsonPath = path.resolve(__dirname, "../../../../openalex-urls.json");
    console.log(`Attempting to load URLs from: ${urlsJsonPath}`);
    const urlsJson = readFileSync(urlsJsonPath, "utf-8");
    urls = JSON.parse(urlsJson);
    console.log(`✅ Successfully loaded ${urls.length} URLs from openalex-urls.json`);
  } catch (error) {
    // Fallback to extracting from docs
    console.log(`⚠️  openalex-urls.json not found (${error instanceof Error ? error.message : error}), falling back to docs`);
    const docsPath = path.resolve(__dirname, "../../../../docs/openalex-docs");
    const result = await extractOpenAlexPaths({
      searchDir: docsPath,
    });
    urls = result.urls;
    console.log(`Loaded ${urls.length} URLs from docs`);
  }

  const testCases: RedirectTestCase[] = [];

  for (const originalUrl of urls) {
    const path = originalUrl.replace("https://api.openalex.org/", "");

    // Skip if path is empty
    if (!path) continue;

    // Generate web app variations
    const webAppVariations = [
      `#/https://api.openalex.org/${path}`,
      `#/https://openalex.org/${path}`,
      `#/api.openalex.org/${path}`,
      `#/openalex.org/${path}`,
      `#/${path}`,
    ];

    // Generate API variations
    const apiVariations = [
      `/api/https://api.openalex.org/${path}`,
      `/api/https://openalex.org/${path}`,
      `/api/api.openalex.org/${path}`,
      `/api/openalex.org/${path}`,
      `/api/${path}`,
    ];

    // Determine expected canonical routes
    const expectedCanonicalRoute = determineCanonicalRoute(path);
    const expectedApiRoute = `/api/openalex/${path}`;

    testCases.push({
      originalUrl,
      path,
      webAppVariations,
      apiVariations,
      expectedCanonicalRoute,
      expectedApiRoute,
    });
  }

  return testCases;
}

/**
 * Determine the canonical web app route for a given path
 */
function determineCanonicalRoute(path: string): string {
  // Extract entity type and ID from path
  const pathSegments = path.split("/");
  if (pathSegments.length >= 2) {
    const entityType = pathSegments[0];
    const entityId = pathSegments[1].split("?")[0]; // Remove query params for entity routes
    return `#/${entityType}/${entityId}`;
  }

  // For collection routes (e.g., "works?filter=...")
  if (pathSegments.length === 1 && pathSegments[0].includes("?")) {
    const [entityType] = pathSegments[0].split("?");
    return `#/${entityType}`;
  }

  return `#/${path}`;
}
