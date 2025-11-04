import type { CacheContext, CachedResponse } from "./types";
import { createLogVerbose } from "./utils";
// Import from source file directly - Vite plugin runs in Node.js, not bundled
import { DiskCacheWriter } from "../../../packages/client/src/cache/disk/disk-writer.js";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";

/**
 * DiskCacheWriter instance for the Vite plugin
 * This ensures cache files are written with the same structure as the client package
 */
let diskWriter: DiskCacheWriter | null = null;

/**
 * Initialize or get the DiskCacheWriter instance
 */
function getDiskWriter(context: CacheContext): DiskCacheWriter {
  if (!diskWriter) {
    diskWriter = new DiskCacheWriter({
      basePath: context.staticDataDir,
      enabled: true,
    });
  }
  return diskWriter;
}

/**
 * Gets the cache path for a given URL by checking if it exists
 * Returns null if not found
 */
export function getCachePath(url: string, context: CacheContext): string | null {
  try {
    // Parse URL to determine entity type and path
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    const queryParams = urlObj.searchParams.toString();

    // Check for autocomplete endpoint
    if (pathParts[0] === "autocomplete") {
      const subtype = pathParts.length > 1 ? pathParts[1] : "general";
      const autocompleteDir = join(context.staticDataDir, "autocomplete", subtype);

      if (existsSync(autocompleteDir)) {
        const files = readdirSync(autocompleteDir);
        // Look for matching query file
        const queryFile = files.find(f => f.includes(encodeURIComponent(urlObj.search)));
        if (queryFile) {
          return join(autocompleteDir, queryFile);
        }
      }
      return null;
    }

    // Check for entity endpoints
    const validEntityTypes = ["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"];

    if (pathParts.length >= 1 && validEntityTypes.includes(pathParts[0])) {
      const entityType = pathParts[0];
      const entityDir = join(context.staticDataDir, entityType);

      // Single entity: /entity_type/entity_id
      if (pathParts.length >= 2 && !queryParams) {
        const entityId = pathParts[1];
        const entityFile = join(entityDir, `${entityId}.json`);
        if (existsSync(entityFile)) {
          return entityFile;
        }
      }

      // Query response: /entity_type?params
      if (queryParams && existsSync(entityDir)) {
        const files = readdirSync(entityDir);
        const queryFile = files.find(f => f.startsWith("query=") && f.includes(encodeURIComponent("?" + queryParams)));
        if (queryFile) {
          return join(entityDir, queryFile);
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`[openalex-cache] Failed to get cache path: ${error}`);
    return null;
  }
}

/**
 * Retrieves a cached response if it exists
 */
export function getCachedResponse(cachePath: string | null): CachedResponse | null {
  try {
    if (!cachePath || !existsSync(cachePath)) {
      return null;
    }

    const cached = readFileSync(cachePath, "utf-8");
    const parsed = JSON.parse(cached);

    // DiskCacheWriter stores raw responses, return as CachedResponse format
    return {
      data: parsed,
      headers: {},
      timestamp: new Date().toISOString(),
      url: "",
    };
  } catch (error) {
    console.error(`[openalex-cache] Failed to read cache: ${error}`);
    return null;
  }
}

/**
 * Saves response data to cache using DiskCacheWriter
 */
export async function saveToCache(
  cachePath: string | null,
  data: unknown,
  headers: Record<string, string>,
  url: string,
  context: CacheContext
): Promise<void> {
  try {
    const logVerbose = createLogVerbose(context.verbose);

    if (context.dryRun) {
      logVerbose(`[DRY RUN] Would save cache for URL: ${url}`);
      logVerbose(`[DRY RUN] Cache data: ${JSON.stringify(data, null, 2)}`);
      return;
    }

    const writer = getDiskWriter(context);

    // Use DiskCacheWriter to save the response
    // writeToCache expects InterceptedData format with all required fields
    await writer.writeToCache({
      url,
      method: "GET",
      requestHeaders: {},
      responseData: data,
      statusCode: 200,
      responseHeaders: headers,
      timestamp: new Date().toISOString(),
    });

    logVerbose(`Saved cache for URL: ${url}`);
  } catch (error) {
    const logVerbose = createLogVerbose(context.verbose);
    logVerbose(`Failed to save cache for ${url}: ${error}`);
  }
}

/**
 * Fetches data from the OpenAlex API
 */
export async function fetchFromAPI(url: string): Promise<unknown> {
  // Get git email for polite pool access
  let gitEmail = "";
  try {
    const { execSync } = require("child_process");
    gitEmail = execSync("git config user.email", { encoding: "utf8" }).trim();
  } catch {
    // Ignore if git email not available
  }

  const headers: Record<string, string> = {
    "User-Agent": "Academic-Explorer/1.0 (https://github.com/Mearman/Academic-Explorer)",
  };

  // Add email for polite pool if available
  if (gitEmail) {
    headers["User-Agent"] = `Academic-Explorer/1.0 (https://github.com/Mearman/Academic-Explorer; mailto:${gitEmail})`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}
