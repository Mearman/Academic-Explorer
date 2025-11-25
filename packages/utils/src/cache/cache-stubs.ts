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
export function initializeQueryClient(): Promise<{
	queryClient: unknown;
	invalidationResult: unknown;
}> {
	return Promise.resolve({
		queryClient: null,
		invalidationResult: { success: true, message: "Stub implementation" },
	});
}

/**
 * Create a standard query client
 * Stub implementation - applications should provide their own
 */
export function createStandardQueryClient(): unknown {
	return null;
}

/**
 * Clear expired cache entries
 * Stub implementation - applications should provide their own
 */
export function clearExpiredCache(): Promise<void> {
	logger.warn("cache", "clearExpiredCache: Using stub implementation");
	return Promise.resolve();
}

/**
 * Clear all cache layers
 * Stub implementation - applications should provide their own
 */
export function clearAllCacheLayers(): Promise<unknown> {
	logger.warn("cache", "clearAllCacheLayers: Using stub implementation");
	return Promise.resolve({ success: true, message: "Stub implementation" });
}

/**
 * Clear application metadata
 * Stub implementation - applications should provide their own
 */
export function clearAppMetadata(): Promise<void> {
	logger.warn("cache", "clearAppMetadata: Using stub implementation");
	return Promise.resolve();
}
