/**
 * Cache initialization with version-aware invalidation
 * Handles setup of TanStack Query persistence with automatic cache clearing on version changes
 */

import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";
import { persistQueryClient, type PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { createHybridPersister } from "./persister";
import { checkAndInvalidateCache, CacheLayer, type InvalidationResult } from "./cache-invalidator";
import { CACHE_CONFIG } from "@/config/cache";
import { calculateRetryDelay, RETRY_CONFIG } from "@/config/rate-limit";
import { logger, logError } from "@/lib/logger";

/**
 * Enhanced query client configuration with intelligent caching and retry logic
 */
function createQueryClientConfig(): QueryClientConfig {
	return {
		defaultOptions: {
			queries: {
				// Default cache times
				staleTime: CACHE_CONFIG.defaultStaleTime, // 5 minutes
				gcTime: CACHE_CONFIG.maxAge, // 7 days (keep data longer for offline support)

				// Network and focus behavior
				refetchOnWindowFocus: false,    // Don't refetch on tab focus (annoying for users)
				refetchOnReconnect: "always",   // Always refetch when coming back online

				// Intelligent retry logic for different error types
				retry: (failureCount: number, error: unknown) => {
					// Type guard for error with status
					const hasStatus = (err: unknown): err is { status: number } => {
						return typeof err === "object" && err !== null && "status" in err;
					};

					// Don't retry client errors (4xx) except 429 rate limits
					if (hasStatus(error) && error.status >= 400 && error.status < 500) {
						if (error.status === 429) {
							return failureCount < RETRY_CONFIG.rateLimited.maxAttempts;
						}
						return false; // Don't retry other 4xx errors
					}

					// Retry server errors (5xx) with limited attempts
					if (hasStatus(error) && error.status >= 500) {
						return failureCount < RETRY_CONFIG.server.maxAttempts;
					}

					// Retry network errors
					return failureCount < RETRY_CONFIG.network.maxAttempts;
				},

				// Smart retry delay with exponential backoff
				retryDelay: (attemptIndex: number, error: unknown) => {
					// Type guard for error with status and headers
					const hasStatus = (err: unknown): err is { status: number } => {
						return typeof err === "object" && err !== null && "status" in err;
					};
					const hasHeaders = (err: unknown): err is { headers: { get?: (key: string) => string | null } } => {
						return typeof err === "object" && err !== null && "headers" in err;
					};

					// Handle rate limiting specially
					if (hasStatus(error) && error.status === 429) {
						const retryAfterMs = hasHeaders(error) && error.headers.get
							? parseInt(error.headers.get("Retry-After") || "0") * 1000
							: undefined;
						return calculateRetryDelay(attemptIndex, RETRY_CONFIG.rateLimited, retryAfterMs);
					}

					// Handle server errors
					if (hasStatus(error) && error.status >= 500) {
						return calculateRetryDelay(attemptIndex, RETRY_CONFIG.server);
					}

					// Handle network errors
					return calculateRetryDelay(attemptIndex, RETRY_CONFIG.network);
				},
			},
			mutations: {
				retry: 2, // Limited retries for mutations
				retryDelay: (attemptIndex: number) =>
					calculateRetryDelay(attemptIndex, RETRY_CONFIG.network),
			},
		},
	};
}

/**
 * Initialize QueryClient with version-aware cache persistence
 * This function handles version checking and cache invalidation before setting up persistence
 */
export async function initializeQueryClient(): Promise<{
  queryClient: QueryClient;
  invalidationResult: InvalidationResult;
}> {
	logger.info("cache", "Initializing QueryClient with version-aware persistence");

	// Create the query client
	const queryClient = new QueryClient(createQueryClientConfig());

	try {
		// Check for version changes and invalidate cache if necessary
		const invalidationResult = await checkAndInvalidateCache();

		// Set up persistence with hybrid persister
		const persisterConfig: PersistQueryClientOptions = {
			queryClient,
			persister: createHybridPersister("academic-explorer-cache"),
			maxAge: CACHE_CONFIG.maxAge, // 7 days

			// Dehydrate options - what gets persisted
			dehydrateOptions: {
				shouldDehydrateQuery: (query) => {
					// Only persist successful queries to avoid caching errors
					return query.state.status === "success";
				},
			},
		};

		// If cache was invalidated, we start fresh
		// Otherwise, restore from existing cache
		if (invalidationResult.triggered) {
			logger.info("cache", "Setting up fresh persistence after cache invalidation");
		} else {
			logger.info("cache", "Setting up persistence with existing cache");
		}

		// Set up persistence (this will restore from cache if available and not invalidated)
		void persistQueryClient(persisterConfig);

		logger.info("cache", "QueryClient initialization completed", {
			cacheInvalidated: invalidationResult.triggered,
			reason: invalidationResult.reason
		});

		return {
			queryClient,
			invalidationResult
		};

	} catch (error) {
		logError("Failed to initialize QueryClient with version checking", error, "CacheInit", "storage");

		// Fall back to basic setup without persistence if initialization fails
		logger.warn("cache", "Falling back to in-memory cache only");

		return {
			queryClient,
			invalidationResult: {
				triggered: false,
				clearedLayers: [],
				errors: [{ layer: CacheLayer.METADATA, error: "Initialization failed" }],
				newVersion: "unknown",
				timestamp: new Date().toISOString()
			}
		};
	}
}

/**
 * Create a standard QueryClient without version checking
 * Used for testing or when version checking is not needed
 */
export function createStandardQueryClient(): QueryClient {
	return new QueryClient(createQueryClientConfig());
}

/**
 * Set up basic persistence without version checking
 * Used for testing or fallback scenarios
 */
export function setupBasicPersistence(queryClient: QueryClient): void {
	void persistQueryClient({
		queryClient,
		persister: createHybridPersister("academic-explorer-cache"),
		maxAge: CACHE_CONFIG.maxAge,
		dehydrateOptions: {
			shouldDehydrateQuery: (query) => query.state.status === "success",
		},
	});
}