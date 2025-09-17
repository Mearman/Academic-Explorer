/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	checkAndInvalidateCache,
	forceInvalidateCache,
	getCacheInvalidationStats,
	CacheLayer
} from "./cache-invalidator";

// Mock the dependencies
vi.mock("@/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
	logError: vi.fn(),
}));

vi.mock("./version-manager", () => ({
	getCurrentAppVersion: vi.fn(() => "1.0.0"),
	createAppMetadata: vi.fn(() => ({
		version: "1.0.0",
		buildTimestamp: "2023-01-01T00:00:00.000Z",
		commitHash: "abc123",
		lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
		installationTime: "2023-01-01T00:00:00.000Z",
	})),
	shouldInvalidateCache: vi.fn(() => ({ shouldInvalidate: false })),
	logVersionComparison: vi.fn(),
}));

vi.mock("./metadata-store", () => ({
	getStoredAppMetadata: vi.fn(() => Promise.resolve(null)),
	storeAppMetadata: vi.fn(() => Promise.resolve()),
	updateLastInvalidationTime: vi.fn(() => Promise.resolve()),
}));

// Mock openDB to avoid actual IndexedDB operations
vi.mock("idb", () => ({
	openDB: vi.fn(() => Promise.resolve({
		transaction: vi.fn(() => ({
			objectStore: vi.fn(() => ({
				clear: vi.fn(() => Promise.resolve()),
				put: vi.fn(() => Promise.resolve()),
				delete: vi.fn(() => Promise.resolve()),
			})),
			done: Promise.resolve(),
		})),
	})),
}));

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	key: vi.fn(),
	length: 0,
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Cache Invalidator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("checkAndInvalidateCache", () => {
		it("should not invalidate when version check passes", async () => {
			const { shouldInvalidateCache } = await import("./version-manager");
			const { getStoredAppMetadata } = await import("./metadata-store");

			vi.mocked(shouldInvalidateCache).mockReturnValue({ shouldInvalidate: false });
			vi.mocked(getStoredAppMetadata).mockResolvedValue({
				version: "1.0.0",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z",
			});

			const result = await checkAndInvalidateCache();

			expect(result.triggered).toBe(false);
			expect(result.clearedLayers).toEqual([]);
			expect(result.newVersion).toBe("1.0.0");
		});

		it("should invalidate when version changes", async () => {
			const { shouldInvalidateCache } = await import("./version-manager");
			const { getStoredAppMetadata, storeAppMetadata } = await import("./metadata-store");

			vi.mocked(shouldInvalidateCache).mockReturnValue({
				shouldInvalidate: true,
				reason: "Version changed from 1.0.0 to 1.0.1"
			});
			vi.mocked(getStoredAppMetadata).mockResolvedValue({
				version: "1.0.0",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2023-01-01T00:00:00.000Z",
			});

			const result = await checkAndInvalidateCache();

			expect(result.triggered).toBe(true);
			expect(result.reason).toBe("Version changed from 1.0.0 to 1.0.1");
			expect(result.clearedLayers).toContain(CacheLayer.MEMORY);
			expect(result.clearedLayers).toContain(CacheLayer.LOCALSTORAGE);
			expect(result.clearedLayers).toContain(CacheLayer.INDEXEDDB);
			expect(storeAppMetadata).toHaveBeenCalled();
		});

		it("should preserve installation time when updating metadata", async () => {
			const { shouldInvalidateCache } = await import("./version-manager");
			const { getStoredAppMetadata, storeAppMetadata } = await import("./metadata-store");

			vi.mocked(shouldInvalidateCache).mockReturnValue({
				shouldInvalidate: true,
				reason: "Version changed"
			});

			const originalInstallTime = "2022-01-01T00:00:00.000Z";
			vi.mocked(getStoredAppMetadata).mockResolvedValue({
				version: "1.0.0",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: originalInstallTime,
			});

			await checkAndInvalidateCache();

			expect(storeAppMetadata).toHaveBeenCalledWith(
				expect.objectContaining({
					installationTime: originalInstallTime
				})
			);
		});

		it("should handle first run (no stored metadata)", async () => {
			const { shouldInvalidateCache } = await import("./version-manager");
			const { getStoredAppMetadata } = await import("./metadata-store");

			vi.mocked(shouldInvalidateCache).mockReturnValue({
				shouldInvalidate: true,
				reason: "No stored version metadata found"
			});
			vi.mocked(getStoredAppMetadata).mockResolvedValue(null);

			const result = await checkAndInvalidateCache();

			expect(result.triggered).toBe(true);
			expect(result.oldVersion).toBeUndefined();
			expect(result.reason).toBe("No stored version metadata found");
		});

		it("should handle errors gracefully", async () => {
			const { getStoredAppMetadata } = await import("./metadata-store");

			vi.mocked(getStoredAppMetadata).mockRejectedValue(new Error("Database error"));

			const result = await checkAndInvalidateCache();

			expect(result.triggered).toBe(true);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].layer).toBe(CacheLayer.METADATA);
			expect(result.errors[0].error).toBe("Database error");
		});
	});

	describe("forceInvalidateCache", () => {
		it("should force invalidation with custom reason", async () => {
			const { storeAppMetadata } = await import("./metadata-store");

			const result = await forceInvalidateCache("Manual test invalidation");

			expect(result.triggered).toBe(true);
			expect(result.reason).toBe("Manual test invalidation");
			expect(result.clearedLayers).toContain(CacheLayer.MEMORY);
			expect(result.clearedLayers).toContain(CacheLayer.LOCALSTORAGE);
			expect(result.clearedLayers).toContain(CacheLayer.INDEXEDDB);
			expect(storeAppMetadata).toHaveBeenCalled();
		});

		it("should use default reason when none provided", async () => {
			const result = await forceInvalidateCache();

			expect(result.reason).toBe("Manual invalidation");
		});

		it("should handle errors during forced invalidation", async () => {
			const { storeAppMetadata } = await import("./metadata-store");

			vi.mocked(storeAppMetadata).mockRejectedValue(new Error("Storage error"));

			const result = await forceInvalidateCache("Test force");

			expect(result.triggered).toBe(true);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe("Storage error");
		});
	});

	describe("getCacheInvalidationStats", () => {
		it("should return stats when metadata exists", async () => {
			const { getStoredAppMetadata } = await import("./metadata-store");

			const mockMetadata = {
				version: "1.0.0",
				lastCacheInvalidation: "2023-01-01T00:00:00.000Z",
				installationTime: "2022-01-01T00:00:00.000Z",
			};

			vi.mocked(getStoredAppMetadata).mockResolvedValue(mockMetadata);

			const stats = await getCacheInvalidationStats();

			expect(stats.currentVersion).toBe("1.0.0");
			expect(stats.lastInvalidation).toBe("2023-01-01T00:00:00.000Z");
			expect(stats.installationAge).toBeGreaterThan(0);
			expect(stats.timeSinceLastInvalidation).toBeGreaterThan(0);
		});

		it("should return minimal stats when no metadata", async () => {
			const { getStoredAppMetadata } = await import("./metadata-store");

			vi.mocked(getStoredAppMetadata).mockResolvedValue(null);

			const stats = await getCacheInvalidationStats();

			expect(stats.currentVersion).toBe("1.0.0");
			expect(stats.lastInvalidation).toBeUndefined();
			expect(stats.installationAge).toBeUndefined();
			expect(stats.timeSinceLastInvalidation).toBeUndefined();
		});

		it("should handle errors gracefully", async () => {
			const { getStoredAppMetadata } = await import("./metadata-store");

			vi.mocked(getStoredAppMetadata).mockRejectedValue(new Error("DB error"));

			const stats = await getCacheInvalidationStats();

			expect(stats.currentVersion).toBe("1.0.0");
			expect(stats.lastInvalidation).toBeUndefined();
		});
	});
});