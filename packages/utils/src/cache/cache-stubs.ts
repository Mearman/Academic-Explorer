/**
 * Stub implementations for cache functions
 * These provide basic functionality to prevent compilation errors
 * Applications should provide their own implementations
 */

import { logger } from "../logger.js";

/**
 * Initialize query client with cache restoration
 * Stub implementation - applications should provide their own
 */
export const initializeQueryClient = (): Promise<{
	queryClient: unknown;
	invalidationResult: unknown;
}> => Promise.resolve({
		queryClient: null,
		invalidationResult: { success: true, message: "Stub implementation" },
	});

/**
 * Create a standard query client
 * Stub implementation - applications should provide their own
 */
export const createStandardQueryClient = (): unknown => null;

/**
 * Clear expired cache entries
 * Stub implementation - applications should provide their own
 */
export const clearExpiredCache = (): Promise<void> => {
	logger.warn("cache", "clearExpiredCache: Using stub implementation");
	return Promise.resolve();
};

/**
 * Clear all cache layers
 * Stub implementation - applications should provide their own
 */
export const clearAllCacheLayers = (): Promise<unknown> => {
	logger.warn("cache", "clearAllCacheLayers: Using stub implementation");
	return Promise.resolve({ success: true, message: "Stub implementation" });
};

/**
 * Clear application metadata
 * Stub implementation - applications should provide their own
 */
export const clearAppMetadata = (): Promise<void> => {
	logger.warn("cache", "clearAppMetadata: Using stub implementation");
	return Promise.resolve();
};
