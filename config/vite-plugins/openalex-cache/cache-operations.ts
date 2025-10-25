import type { CacheContext, CachedResponse } from "./types";
import { createLogVerbose } from "./utils";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

/**
 * Gets the cache path for a given URL
 */
export function getCachePath(url: string, context: CacheContext): string {
  const urlHash = Buffer.from(url).toString("base64").replace(/[+/=]/g, "");
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
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}