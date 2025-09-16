/**
 * @fileoverview Comprehensive unit tests for cache persister functionality
 * Tests the multi-tier cache persistence system with localStorage → IndexedDB fallback
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { openDB } from "idb";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { CACHE_CONFIG } from "@/config/cache";
import * as logger from "@/lib/logger";
import {
	createHybridPersister,
	createIDBPersister,
	getCacheStats,
	clearExpiredCache,
} from "./persister";

// Mock dependencies
vi.mock("idb");
vi.mock("@/lib/logger");
vi.mock("@/config/cache", () => ({
	CACHE_CONFIG: {
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
	},
}));

// Mock IDB database interface
const mockDatabase = {
	transaction: vi.fn(),
	objectStoreNames: { contains: vi.fn() },
	createObjectStore: vi.fn(),
};

const mockTransaction = {
	objectStore: vi.fn(),
	done: Promise.resolve(),
};

const mockStore = {
	put: vi.fn(),
	get: vi.fn(),
	delete: vi.fn(),
};

// Mock localStorage with tracking for usage calculations
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	length: 0,
	key: vi.fn(),
};

// Mock localStorage keys iteration for usage calculation
Object.defineProperty(localStorageMock, Symbol.iterator, {
	value: function* () {
		yield* [];
	},
});

// Sample test data
const samplePersistedClient: PersistedClient = {
	clientState: {
		queries: [
			{
				queryKey: ["test", "key"],
				queryHash: "test-hash",
				state: {
					data: { id: "test", value: "data" },
					status: "success",
					fetchStatus: "idle",
					dataUpdatedAt: Date.now(),
				},
			},
		],
		mutations: [],
	},
};

const samplePersistedData = {
	...samplePersistedClient,
	timestamp: Date.now(),
	version: "1.0",
};

describe("Cache Persister", () => {
	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Setup IDB mocks
		mockDatabase.objectStoreNames.contains.mockReturnValue(false);
		mockTransaction.objectStore.mockReturnValue(mockStore);
		mockDatabase.transaction.mockReturnValue(mockTransaction);
		vi.mocked(openDB).mockResolvedValue(mockDatabase as any);

		// Setup localStorage mock with empty state
		Object.defineProperty(window, "localStorage", {
			value: localStorageMock,
			writable: true,
		});

		// Reset localStorage state
		localStorageMock.length = 0;
		localStorageMock.getItem.mockReturnValue(null);
		localStorageMock.setItem.mockClear();
		localStorageMock.removeItem.mockClear();

		// Setup logger mocks
		vi.mocked(logger.logger.info).mockImplementation(() => {});
		vi.mocked(logger.logger.warn).mockImplementation(() => {});
		vi.mocked(logger.logError).mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("createHybridPersister", () => {
		describe("persistClient method", () => {
			it("should persist to localStorage when available and size is under limit", async () => {
				const persister = createHybridPersister();

				// Mock localStorage as available with minimal usage
				localStorageMock.setItem.mockImplementation(() => {});

				await persister.persistClient(samplePersistedClient);

				expect(localStorageMock.setItem).toHaveBeenCalledWith(
					"academic-explorer-cache",
					expect.stringContaining('"timestamp"')
				);
				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"Persisted query client to localStorage",
					expect.objectContaining({
						size: expect.any(Number),
						usage: expect.any(Number),
						limit: 5242880, // 5MB
					})
				);
			});

			it("should fallback to IndexedDB when localStorage fails", async () => {
				const persister = createHybridPersister();

				// Mock localStorage as failing
				localStorageMock.setItem.mockImplementation(() => {
					throw new Error("Storage full");
				});

				await persister.persistClient(samplePersistedClient);

				expect(mockStore.put).toHaveBeenCalledWith(
					expect.objectContaining({
						...samplePersistedClient,
						timestamp: expect.any(Number),
						version: "1.0",
					}),
					"queryClient"
				);
				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"Persisted query client to IndexedDB",
					expect.objectContaining({ size: expect.any(Number) })
				);
			});

			it("should use IndexedDB when localStorage usage would exceed limit", async () => {
				const persister = createHybridPersister();

				// Mock localStorage with high usage (simulate near 5MB limit)
				const highUsageData = "x".repeat(4 * 1024 * 1024); // 4MB existing usage
				localStorageMock.getItem.mockReturnValue(highUsageData);

				await persister.persistClient(samplePersistedClient);

				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"localStorage full, using IndexedDB for persistence",
					expect.objectContaining({
						currentUsage: expect.any(Number),
						dataSize: expect.any(Number),
						limit: 5242880,
					})
				);
				expect(mockStore.put).toHaveBeenCalled();
			});

			it("should handle localStorage unavailable gracefully", async () => {
				const persister = createHybridPersister();

				// Mock localStorage as unavailable
				Object.defineProperty(window, "localStorage", {
					get: () => {
						throw new Error("localStorage not available");
					},
				});

				await persister.persistClient(samplePersistedClient);

				expect(mockStore.put).toHaveBeenCalledWith(
					expect.objectContaining({
						...samplePersistedClient,
						timestamp: expect.any(Number),
						version: "1.0",
					}),
					"queryClient"
				);
			});

			it("should handle persistence errors gracefully without throwing", async () => {
				const persister = createHybridPersister();

				// Mock both localStorage and IndexedDB failures
				localStorageMock.setItem.mockImplementation(() => {
					throw new Error("Storage error");
				});
				vi.mocked(openDB).mockRejectedValue(new Error("IndexedDB error"));

				// Should not throw
				await expect(persister.persistClient(samplePersistedClient)).resolves.toBeUndefined();

				expect(logger.logError).toHaveBeenCalledWith(
					"Failed to persist query client",
					expect.any(Error),
					"CachePersister",
					"storage"
				);
			});

			it("should clean up localStorage on partial write failure", async () => {
				const persister = createHybridPersister();

				// Mock localStorage availability check to pass, then fail on actual data
				localStorageMock.setItem.mockImplementation((key) => {
					if (key === "__test__") return; // Availability test passes
					throw new Error("Quota exceeded"); // Actual data persistence fails
				});

				localStorageMock.removeItem.mockImplementation(() => {
					// Allow removal of academic-explorer-cache key
				});

				await persister.persistClient(samplePersistedClient);

				expect(localStorageMock.removeItem).toHaveBeenCalledWith("academic-explorer-cache");
				expect(logger.logger.warn).toHaveBeenCalledWith(
					"cache",
					"localStorage persistence failed, falling back to IndexedDB",
					expect.objectContaining({ error: expect.any(Error) })
				);
			});
		});

		describe("restoreClient method", () => {
			it("should restore from localStorage when available and valid", async () => {
				const persister = createHybridPersister();

				localStorageMock.getItem.mockReturnValue(JSON.stringify(samplePersistedData));

				const result = await persister.restoreClient();

				expect(localStorageMock.getItem).toHaveBeenCalledWith("academic-explorer-cache");
				// Result should include timestamp but not version
				expect(result).toEqual({
					...samplePersistedClient,
					timestamp: expect.any(Number),
				});
				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"Restored query client from localStorage",
					expect.objectContaining({ age: expect.any(Number) })
				);
			});

			it("should fallback to IndexedDB when localStorage data is invalid", async () => {
				const persister = createHybridPersister();

				// Mock invalid localStorage data
				localStorageMock.getItem.mockReturnValue('{"invalid": "data"}');
				mockStore.get.mockResolvedValue(samplePersistedData);

				const result = await persister.restoreClient();

				expect(localStorageMock.removeItem).toHaveBeenCalledWith("academic-explorer-cache");
				expect(mockStore.get).toHaveBeenCalledWith("queryClient");
				// Result should include timestamp but not version
				expect(result).toEqual({
					...samplePersistedClient,
					timestamp: expect.any(Number),
				});
			});

			it("should clear expired localStorage cache", async () => {
				const persister = createHybridPersister();

				const expiredData = {
					...samplePersistedData,
					timestamp: Date.now() - CACHE_CONFIG.maxAge - 1000, // Expired
				};

				localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));

				await persister.restoreClient();

				expect(localStorageMock.removeItem).toHaveBeenCalledWith("academic-explorer-cache");
				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"localStorage cache expired, clearing",
					expect.objectContaining({
						age: expect.any(Number),
						maxAge: CACHE_CONFIG.maxAge,
					})
				);
			});

			it("should restore from IndexedDB when localStorage is empty", async () => {
				const persister = createHybridPersister();

				localStorageMock.getItem.mockReturnValue(null);
				mockStore.get.mockResolvedValue(samplePersistedData);

				const result = await persister.restoreClient();

				expect(mockStore.get).toHaveBeenCalledWith("queryClient");
				// Result should include timestamp but not version
				expect(result).toEqual({
					...samplePersistedClient,
					timestamp: expect.any(Number),
				});
				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"Restored query client from IndexedDB",
					expect.objectContaining({ age: expect.any(Number) })
				);
			});

			it("should clear expired IndexedDB cache", async () => {
				const persister = createHybridPersister();

				const expiredData = {
					...samplePersistedData,
					timestamp: Date.now() - CACHE_CONFIG.maxAge - 1000, // Expired
				};

				localStorageMock.getItem.mockReturnValue(null);
				mockStore.get.mockResolvedValue(expiredData);

				const result = await persister.restoreClient();

				expect(mockStore.delete).toHaveBeenCalledWith("queryClient");
				expect(result).toBeUndefined();
				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"IndexedDB cache expired, clearing old data",
					expect.objectContaining({
						age: expect.any(Number),
						maxAge: CACHE_CONFIG.maxAge,
					})
				);
			});

			it("should handle localStorage corruption gracefully", async () => {
				const persister = createHybridPersister();

				// Mock corrupted localStorage data
				localStorageMock.getItem.mockReturnValue('{"corrupted": json');
				mockStore.get.mockResolvedValue(samplePersistedData);

				const result = await persister.restoreClient();

				expect(localStorageMock.removeItem).toHaveBeenCalledWith("academic-explorer-cache");
				expect(logger.logger.warn).toHaveBeenCalledWith(
					"cache",
					"localStorage restore failed, trying IndexedDB",
					expect.objectContaining({ error: expect.any(Error) })
				);
				// Result should include timestamp but not version
				expect(result).toEqual({
					...samplePersistedClient,
					timestamp: expect.any(Number),
				});
			});

			it("should clear invalid IndexedDB data structure", async () => {
				const persister = createHybridPersister();

				localStorageMock.getItem.mockReturnValue(null);
				mockStore.get.mockResolvedValue({ invalid: "structure" });

				const result = await persister.restoreClient();

				expect(mockStore.delete).toHaveBeenCalledWith("queryClient");
				expect(result).toBeUndefined();
				expect(logger.logger.warn).toHaveBeenCalledWith(
					"cache",
					"Invalid IndexedDB cache structure, clearing"
				);
			});

			it("should return undefined when no cache exists", async () => {
				const persister = createHybridPersister();

				localStorageMock.getItem.mockReturnValue(null);
				mockStore.get.mockResolvedValue(undefined);

				const result = await persister.restoreClient();

				expect(result).toBeUndefined();
			});

			it("should handle restore errors gracefully", async () => {
				const persister = createHybridPersister();

				localStorageMock.getItem.mockReturnValue(null);
				vi.mocked(openDB).mockRejectedValue(new Error("Database error"));

				const result = await persister.restoreClient();

				expect(result).toBeUndefined();
				expect(logger.logError).toHaveBeenCalledWith(
					"Failed to restore query client",
					expect.any(Error),
					"CachePersister",
					"storage"
				);
			});
		});

		describe("removeClient method", () => {
			it("should remove from both localStorage and IndexedDB", async () => {
				const persister = createHybridPersister();

				await persister.removeClient();

				expect(localStorageMock.removeItem).toHaveBeenCalledWith("academic-explorer-cache");
				expect(mockStore.delete).toHaveBeenCalledWith("queryClient");
				expect(logger.logger.info).toHaveBeenCalledWith(
					"cache",
					"Removed query client from all storage layers"
				);
			});

			it("should continue with IndexedDB removal even if localStorage fails", async () => {
				const persister = createHybridPersister();

				// Mock localStorage availability check to pass
				localStorageMock.setItem.mockImplementation((key) => {
					if (key === "__test__") return; // Availability test passes
				});
				localStorageMock.removeItem.mockImplementation((key) => {
					if (key === "__test__") return; // Availability test passes
					if (key === "academic-explorer-cache") {
						throw new Error("localStorage error"); // Actual removal fails
					}
				});

				await persister.removeClient();

				expect(logger.logger.warn).toHaveBeenCalledWith(
					"cache",
					"Failed to remove localStorage item",
					expect.objectContaining({ error: expect.any(Error) })
				);
				expect(mockStore.delete).toHaveBeenCalledWith("queryClient");
			});

			it("should handle removal errors gracefully", async () => {
				const persister = createHybridPersister();

				vi.mocked(openDB).mockRejectedValue(new Error("Database error"));

				await persister.removeClient();

				expect(logger.logError).toHaveBeenCalledWith(
					"Failed to remove persisted client",
					expect.any(Error),
					"CachePersister",
					"storage"
				);
			});
		});
	});

	describe("createIDBPersister", () => {
		it("should create IndexedDB-only persister with basic functionality", async () => {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const persister = createIDBPersister("test-db");

			await persister.persistClient(samplePersistedClient);

			expect(mockStore.put).toHaveBeenCalledWith(
				expect.objectContaining({
					...samplePersistedClient,
					timestamp: expect.any(Number),
					version: "1.0",
				}),
				"queryClient"
			);
		});

		it("should restore client data without version metadata", async () => {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const persister = createIDBPersister();

			mockStore.get.mockResolvedValue(samplePersistedData);

			const result = await persister.restoreClient();

			// Result should include timestamp but not version
			expect(result).toEqual({
				...samplePersistedClient,
				timestamp: expect.any(Number),
			});
		});

		it("should handle expired cache in IndexedDB-only mode", async () => {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const persister = createIDBPersister();

			const expiredData = {
				...samplePersistedData,
				timestamp: Date.now() - CACHE_CONFIG.maxAge - 1000,
			};

			mockStore.get.mockResolvedValue(expiredData);

			const result = await persister.restoreClient();

			expect(mockStore.delete).toHaveBeenCalledWith("queryClient");
			expect(result).toBeUndefined();
		});
	});

	describe("getCacheStats", () => {
		it("should return cache statistics when cache exists", async () => {
			const testData = {
				...samplePersistedData,
				timestamp: Date.now() - 3600000, // 1 hour ago
			};

			mockStore.get.mockResolvedValue(testData);

			const stats = await getCacheStats("test-db");

			expect(stats).toEqual({
				exists: true,
				size: expect.any(Number),
				age: expect.any(Number),
				queryCount: 1,
				isExpired: false,
			});
			expect(stats.age).toBeGreaterThan(3600000 - 1000); // Approximately 1 hour
		});

		it("should return default stats when cache does not exist", async () => {
			mockStore.get.mockResolvedValue(undefined);

			const stats = await getCacheStats();

			expect(stats).toEqual({
				exists: false,
				size: 0,
				age: 0,
				queryCount: 0,
			});
		});

		it("should handle invalid cache data structure", async () => {
			mockStore.get.mockResolvedValue({ invalid: "data" });

			const stats = await getCacheStats();

			expect(stats).toEqual({
				exists: false,
				size: 0,
				age: 0,
				queryCount: 0,
			});
		});

		it("should detect expired cache", async () => {
			const expiredData = {
				...samplePersistedData,
				timestamp: Date.now() - CACHE_CONFIG.maxAge - 1000,
			};

			mockStore.get.mockResolvedValue(expiredData);

			const stats = await getCacheStats();

			expect(stats.isExpired).toBe(true);
			expect(stats.age).toBeGreaterThan(CACHE_CONFIG.maxAge);
		});

		it("should handle errors gracefully", async () => {
			vi.mocked(openDB).mockRejectedValue(new Error("Database error"));

			const stats = await getCacheStats();

			expect(stats).toEqual({
				exists: false,
				size: 0,
				age: 0,
				queryCount: 0,
				error: "Database error",
			});
			expect(logger.logError).toHaveBeenCalled();
		});
	});

	describe("clearExpiredCache", () => {
		it("should clear expired cache and return true", async () => {
			const expiredData = {
				...samplePersistedData,
				timestamp: Date.now() - CACHE_CONFIG.maxAge - 1000,
			};

			mockStore.get.mockResolvedValue(expiredData);

			const result = await clearExpiredCache("test-db");

			expect(result).toBe(true);
			expect(mockStore.delete).toHaveBeenCalledWith("queryClient");
			expect(logger.logger.info).toHaveBeenCalledWith(
				"cache",
				"Cleared expired cache",
				{ dbName: "test-db" }
			);
		});

		it("should not clear non-expired cache and return false", async () => {
			const freshData = {
				...samplePersistedData,
				timestamp: Date.now() - 1000, // 1 second ago
			};

			mockStore.get.mockResolvedValue(freshData);

			const result = await clearExpiredCache();

			expect(result).toBe(false);
			expect(mockStore.delete).not.toHaveBeenCalled();
		});

		it("should handle errors from getCacheStats and return false", async () => {
			// Mock getCacheStats failure by making openDB fail
			vi.mocked(openDB).mockRejectedValue(new Error("Database error"));

			const result = await clearExpiredCache();

			expect(result).toBe(false);
			expect(logger.logError).toHaveBeenCalledWith(
				"Failed to get cache stats",
				expect.any(Error),
				"CachePersister",
				"storage"
			);
		});
	});

	describe("localStorage availability checks", () => {
		it("should detect when localStorage is unavailable", async () => {
			const persister = createHybridPersister();

			// Mock localStorage to throw on access
			Object.defineProperty(window, "localStorage", {
				get: () => {
					throw new Error("localStorage disabled");
				},
			});

			await persister.persistClient(samplePersistedClient);

			// Should fallback directly to IndexedDB
			expect(mockStore.put).toHaveBeenCalled();
		});

		it("should handle localStorage quota exceeded gracefully", async () => {
			const persister = createHybridPersister();

			// Mock localStorage availability and usage checks to pass
			localStorageMock.getItem.mockImplementation((key) => {
				if (key === "__test__") return null; // Availability test passes
				return null; // No existing data, low usage
			});

			localStorageMock.setItem.mockImplementation((key, _value) => {
				if (key === "__test__") return; // Availability test passes
				const error = new Error("QuotaExceededError");
				error.name = "QuotaExceededError";
				throw error;
			});

			await persister.persistClient(samplePersistedClient);

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("academic-explorer-cache");
			expect(mockStore.put).toHaveBeenCalled();
		});
	});

	describe("data validation", () => {
		it("should validate PersistedClient structure with required properties", async () => {
			const persister = createHybridPersister();

			const invalidData = {
				clientState: "invalid", // Should be object
				timestamp: Date.now(),
			};

			localStorageMock.getItem.mockReturnValue(null);
			mockStore.get.mockResolvedValue(invalidData);

			const result = await persister.restoreClient();

			expect(result).toBeUndefined();
			expect(mockStore.delete).toHaveBeenCalledWith("queryClient");
		});

		it("should validate timestamp property types", async () => {
			const persister = createHybridPersister();

			const invalidData = {
				clientState: { queries: [], mutations: [] },
				timestamp: "invalid", // Should be number
			};

			localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidData));

			await persister.restoreClient();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("academic-explorer-cache");
		});

		it("should handle missing timestamp gracefully", async () => {
			const persister = createHybridPersister();

			const dataWithoutTimestamp = {
				clientState: { queries: [], mutations: [] },
				version: "1.0",
			};

			localStorageMock.getItem.mockReturnValue(null);
			mockStore.get.mockResolvedValue(dataWithoutTimestamp);

			const result = await persister.restoreClient();

			expect(result).toEqual({ clientState: { queries: [], mutations: [] } });
		});
	});

	describe("compression behavior", () => {
		it("should log when data exceeds compression threshold", async () => {
			const persister = createHybridPersister();

			// Create data that exceeds the 50KB threshold
			const largeData = Array(60000).fill("x").join("");
			const largeClient = {
				...samplePersistedClient,
				clientState: {
					...samplePersistedClient.clientState,
					largeField: largeData,
				},
			};

			await persister.persistClient(largeClient);

			expect(logger.logger.info).toHaveBeenCalledWith(
				"cache",
				"Data size over compression threshold, storing uncompressed",
				expect.objectContaining({
					size: expect.any(Number),
					threshold: 51200, // 50KB
				})
			);
		});
	});
});