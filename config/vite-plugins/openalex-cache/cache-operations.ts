import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { logger } from "../../../packages/utils/src/logger.js";
import {
  generateContentHash,
  getCacheFilePath,
  isValidOpenAlexEntity,
  isValidOpenAlexQueryResult,
  parseOpenAlexUrl,
} from "../../../packages/utils/src/static-data/cache-utilities";
import type { CacheContext } from "./types";

/**
 * Get cache path for a request using shared utilities
 */
export const getCachePath = (
  url: string,
  context: CacheContext,
): string | null => {
  return getCacheFilePath(url, context.staticDataDir);
};

/**
 * Check if response is cached and still valid
 */
export const getCachedResponse = async (
  cachePath: string,
): Promise<unknown | null> => {
  try {
    if (!existsSync(cachePath)) {
      return null;
    }

    const content = await readFile(cachePath, "utf-8");
    const response = JSON.parse(content);

    // Cache files now contain raw API responses only
    return response;
  } catch {
    return null;
  }
};

/**
 * Save response to cache and update directory indexes
 */
export const saveToCache = async (
  cachePath: string,
  url: string,
  data: unknown,
  context: CacheContext,
  updateDirectoryIndexes: (
    cachePath: string,
    url: string,
    fileName: string,
    retrieved_at?: string,
    contentHash?: string,
  ) => Promise<void>,
): Promise<void> => {
  try {
    // Ensure directory exists
    const dir = join(cachePath, "..");
    await mkdir(dir, { recursive: true });

    // Generate metadata
    const retrieved_at = new Date().toISOString();
    const contentHash = await generateContentHash(data);

    // Save raw API response only (no wrapper)
    await writeFile(cachePath, JSON.stringify(data, null, 2));

    if (context.verbose) {
      console.log(`[openalex-cache] Cached response to ${cachePath}`);
    }

    // Update directory indexes with metadata
    const fileName = cachePath.split("/").pop() || "";
    await updateDirectoryIndexes(
      cachePath,
      url,
      fileName,
      retrieved_at,
      contentHash,
    );
  } catch (error) {
    console.error(`[openalex-cache] Failed to save to cache: ${error}`);
  }
};

/**
 * Fetch data from the OpenAlex API with response validation
 */
export const fetchFromAPI = async (url: string): Promise<unknown> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Validate OpenAlex response structure
  const parsedUrl = parseOpenAlexUrl(url);
  if (parsedUrl) {
    const isEntity = !!parsedUrl.entityId;
    const isValid = isEntity
      ? isValidOpenAlexEntity(data)
      : isValidOpenAlexQueryResult(data);

    if (!isValid) {
      logger.warn(
        "openalex-cache",
        "Invalid OpenAlex response structure detected, preventing cache",
        {
          url,
          expectedFormat: isEntity ? "entity" : "query result",
          isEntity,
          entityId: parsedUrl.entityId,
        },
      );
      throw new Error(
        `Invalid OpenAlex response structure: expected ${isEntity ? "entity" : "query result"} format`,
      );
    }
  }

  return data;
};
