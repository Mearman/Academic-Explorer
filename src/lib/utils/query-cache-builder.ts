/**
 * Build-time query cache utilities
 * Utilities for adding pre-computed queries to the static data cache
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { generateContentHash } from "./query-hash";
import { logger } from "../logger";
import type { QueryResult } from "../api/static-data-provider";
import { z } from "zod";

import { execSync } from "child_process";

/**
 * Zod schema for OpenAlex API response
 */
const openAlexResponseSchema = z.object({
  results: z.array(z.unknown()),
  meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Type guard using Zod for guaranteed type safety
 */
function isValidOpenAlexResponse(data: unknown): data is { results: unknown[]; meta?: Record<string, unknown> } {
  const result = openAlexResponseSchema.safeParse(data);
  return result.success;
}

/**
 * Rate limiting configuration for OpenAlex API
 */
const RATE_LIMIT = {
  politePoolDelay: 1000, // 1 second for polite pool
  regularDelay: 100, // 100ms for regular requests
  maxRetries: 5,
  baseBackoffMs: 1000, // Start with 1 second
  maxBackoffMs: 32000, // Max 32 seconds
  jitterMs: 500, // Add up to 500ms jitter
};

/**
 * Request queue for managing OpenAlex API requests
 */
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private userEmail: string | null = null;

  constructor() {
    this.userEmail = this.getGitUserEmail();
  }

  /**
   * Get git user email for polite pool
   */
  private getGitUserEmail(): string | null {
    try {
      const email = execSync("git config user.email", { encoding: "utf8" }).trim();
      if (email) {
        logger.debug("query-cache", "Using git email for OpenAlex polite pool", { email });
        return email;
      }
    } catch {
      logger.warn("query-cache", "Could not get git user email, using regular rate limits");
    }
    return null;
  }

  /**
   * Get appropriate delay based on email availability
   */
  private getDelay(): number {
    return this.userEmail ? RATE_LIMIT.politePoolDelay : RATE_LIMIT.regularDelay;
  }

  /**
   * Add request to queue
   */
  async enqueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });

      if (!this.processing) {
        void this.processQueue();
      }
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const delay = this.getDelay();

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        await request();

        // Add delay between requests
        if (this.queue.length > 0) {
          await sleep(delay);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get request headers with polite pool email if available
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Accept": "application/json",
      "User-Agent": "Academic-Explorer/1.0 (https://github.com/your-org/academic-explorer)",
    };

    if (this.userEmail) {
      headers["User-Agent"] += `; mailto:${this.userEmail}`;
    }

    return headers;
  }
}

/**
 * Global request queue instance
 */
const requestQueue = new RequestQueue();

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number): number {
  const exponential = Math.min(
    RATE_LIMIT.baseBackoffMs * Math.pow(2, attempt),
    RATE_LIMIT.maxBackoffMs
  );
  const jitter = Math.random() * RATE_LIMIT.jitterMs;
  return exponential + jitter;
}

/**
 * Save a query result to the static data cache
 */
export async function saveQueryToCache(
  entityType: string,
  url: string,
  results: unknown[],
  options: {
    outputDir: string;
    page?: number;
    per_page?: number;
    totalCount?: number;
  }
): Promise<void> {
  try {
    // Use URL encoding for filename, not content hash
    const filename = encodeURIComponent(url) + ".json";
    const entityDir = join(options.outputDir, entityType);

    // Ensure entity directory exists
    await mkdir(entityDir, { recursive: true });

    // Create query result with metadata
    const queryResult: QueryResult = {
      results,
      meta: {
        count: results.length,
        page: options.page,
        per_page: options.per_page,
        originalUrl: url,
        cached: true,
        ...(options.totalCount && { total_count: options.totalCount })
      }
    };

    const jsonContent = JSON.stringify(queryResult, null, 2);

    // Use content hash for the actual content
    const contentHash = generateContentHash(jsonContent);

    // Write to file
    const filePath = join(entityDir, filename);
    await writeFile(filePath, jsonContent);

    logger.debug("query-cache", `Saved query cache for ${entityType}`, {
      filename,
      contentHash,
      url,
      resultCount: results.length,
      filePath
    });
  } catch (error) {
    logger.error("query-cache", `Failed to save query cache for ${entityType}`, {
      url,
      error
    });
    throw error;
  }
}

/**
 * Build commonly used queries for an entity type
 */
export function buildCommonQueries(
  entityType: string,
  outputDir: string,
  options: {
    sampleSize?: number;
    baseUrl?: string;
  } = {}
): void {
  const { sampleSize = 25, baseUrl = "https://api.openalex.org" } = options;

  logger.debug("query-cache", `Building common queries for ${entityType}`, {
    sampleSize,
    outputDir
  });

  const commonQueries = getCommonQueries(entityType, baseUrl, sampleSize);

  // Note: In a real implementation, you would fetch these queries from OpenAlex
  // For now, this provides the structure for build-time query caching

  logger.debug("query-cache", `Generated ${String(commonQueries.length)} common queries for ${entityType}`);
}

/**
 * Get common query patterns for an entity type
 */
function getCommonQueries(entityType: string, baseUrl: string, sampleSize: number): string[] {
  const queries: string[] = [];

  switch (entityType) {
    case "works":
      queries.push(
        `${baseUrl}/works`,
        `${baseUrl}/works?per_page=${String(sampleSize)}`,
        `${baseUrl}/works?filter=publication_year:2023`,
        `${baseUrl}/works?filter=publication_year:2023&per_page=${String(sampleSize)}`,
        `${baseUrl}/works?sort=cited_by_count:desc`,
        `${baseUrl}/works?select=id,display_name,publication_year&per_page=${String(sampleSize)}`
      );
      break;

    case "authors":
      queries.push(
        `${baseUrl}/authors`,
        `${baseUrl}/authors?per_page=${String(sampleSize)}`,
        `${baseUrl}/authors?sort=works_count:desc`,
        `${baseUrl}/authors?sort=cited_by_count:desc`,
        `${baseUrl}/authors?select=id,display_name,works_count&per_page=${String(sampleSize)}`
      );
      break;

    case "institutions":
      queries.push(
        `${baseUrl}/institutions`,
        `${baseUrl}/institutions?per_page=${String(sampleSize)}`,
        `${baseUrl}/institutions?sort=works_count:desc`,
        `${baseUrl}/institutions?select=id,display_name,country_code&per_page=${String(sampleSize)}`
      );
      break;

    case "sources":
      queries.push(
        `${baseUrl}/sources`,
        `${baseUrl}/sources?per_page=${String(sampleSize)}`,
        `${baseUrl}/sources?sort=works_count:desc`,
        `${baseUrl}/sources?select=id,display_name,issn&per_page=${String(sampleSize)}`
      );
      break;

    case "topics":
      queries.push(
        `${baseUrl}/topics`
      );
      break;

    default:
      queries.push(`${baseUrl}/${entityType}`);
  }

  return queries;
}

/**
 * Add query with specific filters
 *
 * @example
 * ```typescript
 * // Add works by specific author
 * await addFilteredQuery('works', {
 *   filter: 'author.id:A5017898742',
 *   select: ['id', 'display_name', 'publication_year'],
 *   per_page: 25
 * }, outputDir);
 * ```
 */
export async function addFilteredQuery(
  entityType: string,
  params: Record<string, unknown>,
  outputDir: string,
  options: {
    baseUrl?: string;
    fetchResults?: boolean;
  } = {}
): Promise<string> {
  const { baseUrl = "https://api.openalex.org", fetchResults = false } = options;

  // Build query URL
  const url = new URL(`${baseUrl}/${entityType}`);

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.join(","));
    } else {
      url.searchParams.set(key, String(value));
    }
  });

  const queryUrl = url.toString();
  const urlIdentifier = encodeURIComponent(queryUrl);

  logger.debug("query-cache", `Adding filtered query for ${entityType}`, {
    urlIdentifier,
    params,
    url: queryUrl
  });

  if (fetchResults) {
    try {
      const results = await fetchOpenAlexQuery(queryUrl);
      await saveQueryToCache(entityType, queryUrl, results, {
        outputDir,
        page: typeof params.page === "number" ? params.page : undefined,
        per_page: typeof params.per_page === "number" ? params.per_page : undefined,
      });
      logger.debug("query-cache", "Successfully fetched and cached query results");
    } catch (error) {
      logger.error("query-cache", "Failed to fetch query results", { error });
      throw error;
    }
  }

  return urlIdentifier;
}

/**
 * Fetch query results from OpenAlex API with retry and backoff
 */
export async function fetchOpenAlexQuery(url: string): Promise<unknown[]> {
  const maxRetries = RATE_LIMIT.maxRetries;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug("query-cache", "Fetching from OpenAlex API", { url, attempt });

      const results = await requestQueue.enqueue(async () => {
        const response = await fetch(url, {
          headers: requestQueue.getHeaders(),
        });

        if (!response.ok) {
          // Handle rate limiting specifically
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : calculateBackoff(attempt);
            logger.warn("query-cache", "Rate limited, backing off", {
              url,
              attempt,
              waitTime: `${String(waitTime)}ms`,
              retryAfter
            });
            throw new RateLimitError(`Rate limited: ${String(response.status)}`, waitTime);
          }

          // Handle other HTTP errors
          if (response.status >= 500) {
            throw new RetryableError(`Server error: ${String(response.status)} ${response.statusText}`);
          }

          // Non-retryable errors (4xx except 429)
          throw new Error(`OpenAlex API error: ${String(response.status)} ${response.statusText}`);
        }

        const data: unknown = await response.json();

        // Use Zod validation for guaranteed type safety
        if (!isValidOpenAlexResponse(data)) {
          throw new Error("Invalid response format from OpenAlex API");
        }

        return data.results;
      });

      logger.debug("query-cache", "Successfully fetched results", {
        url,
        attempt,
        resultCount: results.length,
      });

      return results;

    } catch (error) {
      const isLastAttempt = attempt === maxRetries;

      if (error instanceof RateLimitError) {
        if (isLastAttempt) {
          logger.error("query-cache", "Max retries exceeded for rate limited request", { url, attempt });
          throw error;
        }

        logger.warn("query-cache", "Rate limited, retrying after backoff", { url, attempt, waitTime: error.waitTime });
        await sleep(error.waitTime);
        continue;
      }

      if (error instanceof RetryableError) {
        if (isLastAttempt) {
          logger.error("query-cache", "Max retries exceeded for server error", { url, attempt });
          throw error;
        }

        const backoffTime = calculateBackoff(attempt);
        logger.warn("query-cache", "Server error, retrying after backoff", { url, attempt, backoffTime });
        await sleep(backoffTime);
        continue;
      }

      // Non-retryable error
      logger.error("query-cache", "Non-retryable error fetching from OpenAlex API", { url, attempt, error });
      throw error;
    }
  }

  // This should never be reached
  throw new Error("Unexpected end of retry loop");
}

/**
 * Custom error classes for retry logic
 */
class RateLimitError extends Error {
  constructor(message: string, public waitTime: number) {
    super(message);
    this.name = "RateLimitError";
  }
}

class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

/**
 * Fetch and cache multiple queries with improved error handling
 */
export async function fetchAndCacheQueries(
  queries: { url: string; entityType: string }[],
  outputDir: string
): Promise<{ success: number; failed: number; errors: Array<{ url: string; error: string }> }> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ url: string; error: string }> = [];

  logger.debug("query-cache", `Fetching ${String(queries.length)} queries from OpenAlex with retry logic`);

  for (const { url, entityType } of queries) {
    try {
      logger.debug("query-cache", `Processing query ${String(success + failed + 1)}/${String(queries.length)}`, { url });

      const results = await fetchOpenAlexQuery(url);
      const urlObj = new URL(url);
      const params = Object.fromEntries(urlObj.searchParams);

      await saveQueryToCache(entityType, url, results, {
        outputDir,
        page: params.page ? parseInt(params.page, 10) : undefined,
        per_page: params.per_page ? parseInt(params.per_page, 10) : undefined,
      });

      success++;
      logger.debug("query-cache", `Successfully cached query ${String(success)}/${String(queries.length)}`, { url });
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ url, error: errorMessage });
      logger.error("query-cache", "Failed to cache query", { url, error: errorMessage });
    }
  }

  logger.debug("query-cache", "Batch query caching completed", { success, failed, totalQueries: queries.length });

  if (errors.length > 0) {
    logger.warn("query-cache", "Some queries failed", { errors });
  }

  return { success, failed, errors };
}

/**
 * Get URL identifier for a URL (utility function)
 */
export function getUrlIdentifier(url: string): string {
  return encodeURIComponent(url);
}