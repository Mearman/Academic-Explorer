import type { CacheContext, CachedResponse } from "./types";
import { createLogVerbose } from "./utils";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";

/**
 * Creates a short hash from a URL for use as a filename
 * Uses SHA-256 hash truncated to 32 characters for reasonable uniqueness
 */
function createUrlHash(url: string): string {
  const hash = createHash("sha256").update(url).digest("hex");
  return hash.substring(0, 32); // 32 chars is enough for uniqueness
}

/**
 * Gets the cache path for a given URL
 * Uses a hash-based filename to avoid ENAMETOOLONG errors with long URLs
 */
export function getCachePath(url: string, context: CacheContext): string {
  const urlHash = createUrlHash(url);
  return join(context.staticDataDir, "cache", `${urlHash}.json`);
}

/**
 * Retrieves a cached response if it exists and is not expired
 */
export function getCachedResponse(cachePath: string): CachedResponse | null {
  try {
    if (!existsSync(cachePath)) {
      return null;
    }

    const cached = readFileSync(cachePath, "utf-8");
    const parsed = JSON.parse(cached) as CachedResponse;

    // Check if cache is expired (24 hours)
    const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (cacheAge > maxAge) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Saves response data to cache
 */
export async function saveToCache(
  cachePath: string,
  data: unknown,
  headers: Record<string, string>,
  url: string,
  context: CacheContext
): Promise<void> {
  try {
    const logVerbose = createLogVerbose(context.verbose);

    // Ensure cache directory exists
    const cacheDir = dirname(cachePath);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const cachedResponse: CachedResponse = {
      data,
      headers,
      timestamp: new Date().toISOString(),
      url,
    };

    if (context.dryRun) {
      logVerbose(`[DRY RUN] Would save cache to: ${cachePath}`);
      logVerbose(`[DRY RUN] Cache data: ${JSON.stringify(cachedResponse, null, 2)}`);
      return;
    }

    writeFileSync(cachePath, JSON.stringify(cachedResponse, null, 2), "utf-8");
    logVerbose(`Saved cache to: ${cachePath}`);
  } catch (error) {
    const logVerbose = createLogVerbose(context.verbose);
    logVerbose(`Failed to save cache to ${cachePath}: ${error}`);
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