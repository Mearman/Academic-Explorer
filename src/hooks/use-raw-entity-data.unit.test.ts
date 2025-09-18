/**
 * Unit tests for useRawEntityData hook
 * Tests raw entity data fetching with proper cache system integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRawEntityData } from "./use-raw-entity-data";
import type { OpenAlexEntity } from "@/lib/openalex/types";

// Mock dependencies with factory functions
vi.mock("@/lib/hooks/use-openalex-query", () => ({
	useOpenAlexEntity: vi.fn(),
}));

vi.mock("@/lib/graph/utils/entity-detection", () => ({
	EntityDetector: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
	},
}));

const mockUseOpenAlexEntity = {
	data: null,
	isLoading: false,
	isFetching: false,
	error: null,
	status: "idle" as const,
	dataUpdatedAt: 0,
};

const mockEntityDetector = {
	detectEntityIdentifier: vi.fn(),
};

const mockLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
};

describe("useRawEntityData", () => {
	beforeEach(async () => {
		// Reset all mocks
		vi.clearAllMocks();

		// Get the mocked modules
		const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");
		const { EntityDetector } = await import("@/lib/graph/utils/entity-detection");
		const { logger } = await import("@/lib/logger");

		// Setup default mock implementations
		vi.mocked(useOpenAlexEntity).mockReturnValue(mockUseOpenAlexEntity);
		vi.mocked(EntityDetector).mockImplementation(() => mockEntityDetector as any);

		// Setup logger mocks
		vi.mocked(logger.debug).mockImplementation(mockLogger.debug);
		vi.mocked(logger.info).mockImplementation(mockLogger.info);
		vi.mocked(logger.error).mockImplementation(mockLogger.error);

		// Setup default entity detection
		mockEntityDetector.detectEntityIdentifier.mockReturnValue({
			entityType: "works",
			idType: "openalex",
			normalizedId: "W123456789",
			originalInput: "W123456789",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("hook initialization", () => {
		it("should initialize with default options", () => {
			const { result } = renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});

		it("should handle missing entityId", () => {
			const { result } = renderHook(() =>
				useRawEntityData({})
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});

		it("should handle enabled=false", () => {
			const { result } = renderHook(() =>
				useRawEntityData({ entityId: "W123456789", enabled: false })
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});
	});

	describe("entity type detection", () => {
		it("should detect work entity type", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			mockEntityDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				idType: "openalex",
				normalizedId: "W123456789",
				originalInput: "W123456789",
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockEntityDetector.detectEntityIdentifier).toHaveBeenCalledWith("W123456789");
			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"W123456789",
				undefined,
				{ enabled: true }
			);
		});

		it("should detect author entity type", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			mockEntityDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "authors",
				idType: "openalex",
				normalizedId: "A123456789",
				originalInput: "A123456789",
			});

			renderHook(() =>
				useRawEntityData({ entityId: "A123456789" })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"author",
				"A123456789",
				undefined,
				{ enabled: true }
			);
		});

		it("should handle all entity type mappings", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			const testCases = [
				{ input: "works", expected: "work" },
				{ input: "authors", expected: "author" },
				{ input: "sources", expected: "source" },
				{ input: "institutions", expected: "institution" },
				{ input: "topics", expected: "topic" },
				{ input: "publishers", expected: "publisher" },
				{ input: "funders", expected: "funder" },
				{ input: "keywords", expected: "keyword" },
				{ input: "concepts", expected: "concepts" },
			];

			for (const testCase of testCases) {
				vi.clearAllMocks();
				mockEntityDetector.detectEntityIdentifier.mockReturnValue({
					entityType: testCase.input as any,
					idType: "openalex",
					normalizedId: "TEST123",
					originalInput: "TEST123",
				});

				renderHook(() =>
					useRawEntityData({ entityId: "TEST123" })
				);

				expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
					testCase.expected,
					"TEST123",
					undefined,
					{ enabled: true }
				);
			}
		});

		it("should throw error for undetectable entity type", () => {
			mockEntityDetector.detectEntityIdentifier.mockReturnValue({
				entityType: null,
				idType: "openalex",
				normalizedId: "",
				originalInput: "INVALID123",
			});

			expect(() => {
				renderHook(() =>
					useRawEntityData({ entityId: "INVALID123" })
				);
			}).toThrow("Unable to detect entity type for: INVALID123");
		});
	});

	describe("query enablement logic", () => {
		it("should enable query when entityId and enabled=true", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789", enabled: true })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"W123456789",
				undefined,
				{ enabled: true }
			);
		});

		it("should disable query when enabled=false", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789", enabled: false })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"W123456789",
				undefined,
				{ enabled: false }
			);
		});

		it("should disable query when no entityId", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ enabled: true })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"",
				undefined,
				{ enabled: false }
			);
		});

		it("should disable query when entityId is null", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ entityId: null, enabled: true })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"",
				undefined,
				{ enabled: false }
			);
		});
	});

	describe("logging behavior", () => {
		it("should log entity detection debug info", () => {
			mockEntityDetector.detectEntityIdentifier.mockReturnValue({
				entityType: "works",
				idType: "openalex",
				normalizedId: "W123456789",
				originalInput: "W123456789",
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Detected entity type for raw data cache",
				{
					entityId: "W123456789",
					detectedType: "works",
					cacheType: "work",
				},
				"useRawEntityData"
			);
		});

		it("should log successful data loading", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			const mockEntityData: OpenAlexEntity = {
				id: "https://openalex.org/W123456789",
				display_name: "Test Work",
			} as OpenAlexEntity;

			vi.mocked(useOpenAlexEntity).mockReturnValue({
				...mockUseOpenAlexEntity,
				data: mockEntityData,
				status: "success",
				dataUpdatedAt: Date.now() - 5000, // 5 seconds ago
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Raw entity data loaded from cache system",
				expect.objectContaining({
					entityId: "W123456789",
					entityType: "work",
					fromCache: true,
					cacheStatus: "success",
					dataAge: expect.any(Number),
				}),
				"useRawEntityData"
			);
		});

		it("should log errors", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			const mockError = new Error("Network error");
			vi.mocked(useOpenAlexEntity).mockReturnValue({
				...mockUseOpenAlexEntity,
				error: mockError,
				status: "error",
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				"cache",
				"Failed to fetch raw entity data",
				{
					entityId: "W123456789",
					entityType: "work",
					error: "Network error",
				},
				"useRawEntityData"
			);
		});

		it("should handle non-Error exceptions in logging", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			vi.mocked(useOpenAlexEntity).mockReturnValue({
				...mockUseOpenAlexEntity,
				error: "String error" as any,
				status: "error",
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockLogger.error).toHaveBeenCalledWith(
				"cache",
				"Failed to fetch raw entity data",
				{
					entityId: "W123456789",
					entityType: "work",
					error: "Unknown error",
				},
				"useRawEntityData"
			);
		});

		it("should not log when no entityId provided", () => {
			renderHook(() =>
				useRawEntityData({})
			);

			expect(mockLogger.debug).not.toHaveBeenCalled();
		});
	});

	describe("cache behavior", () => {
		it("should track cache hit with dataUpdatedAt", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			// Mock Date.now to ensure consistent timing
			const fixedNow = 1000000000000; // Fixed timestamp
			const mockDateNow = vi.spyOn(Date, "now").mockReturnValue(fixedNow);

			const mockEntityData: OpenAlexEntity = {
				id: "https://openalex.org/W123456789",
				display_name: "Test Work",
			} as OpenAlexEntity;

			vi.mocked(useOpenAlexEntity).mockReturnValue({
				...mockUseOpenAlexEntity,
				data: mockEntityData,
				isFetching: false,
				dataUpdatedAt: fixedNow - 10000, // 10 seconds ago
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Raw entity data loaded from cache system",
				expect.objectContaining({
					fromCache: true,
					dataAge: 10000, // Should be exactly 10000ms
				}),
				"useRawEntityData"
			);

			// Get the second call which should have the cache data with dataAge
			const cacheLogCall = mockLogger.debug.mock.calls.find(call =>
				call[1] === "Raw entity data loaded from cache system"
			);

			expect(cacheLogCall).toBeDefined();
			const dataAge = cacheLogCall![2].dataAge;
			expect(dataAge).toBe(10000); // Should be exactly 10 seconds

			// Restore Date.now
			mockDateNow.mockRestore();
		});

		it("should handle missing dataUpdatedAt", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			const mockEntityData: OpenAlexEntity = {
				id: "https://openalex.org/W123456789",
				display_name: "Test Work",
			} as OpenAlexEntity;

			vi.mocked(useOpenAlexEntity).mockReturnValue({
				...mockUseOpenAlexEntity,
				data: mockEntityData,
				dataUpdatedAt: 0, // No timestamp
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Raw entity data loaded from cache system",
				expect.objectContaining({
					dataAge: undefined,
				}),
				"useRawEntityData"
			);
		});

		it("should detect fresh API fetch", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			const mockEntityData: OpenAlexEntity = {
				id: "https://openalex.org/W123456789",
				display_name: "Test Work",
			} as OpenAlexEntity;

			vi.mocked(useOpenAlexEntity).mockReturnValue({
				...mockUseOpenAlexEntity,
				data: mockEntityData,
				isFetching: true, // Currently fetching
			});

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Raw entity data loaded from cache system",
				expect.objectContaining({
					fromCache: false, // Fresh fetch
				}),
				"useRawEntityData"
			);
		});
	});

	describe("options handling", () => {
		it("should handle undefined options gracefully", () => {
			const { result } = renderHook(() =>
				useRawEntityData({} as any)
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});

		it("should default enabled to true", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"W123456789",
				undefined,
				{ enabled: true }
			);
		});

		it("should respect explicit enabled: true", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ entityId: "W123456789", enabled: true })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"W123456789",
				undefined,
				{ enabled: true }
			);
		});
	});

	describe("fallback behavior", () => {
		it("should provide fallback type and ID when disabled", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ enabled: false })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",  // fallback type
				"",      // fallback ID
				undefined,
				{ enabled: false }
			);
		});

		it("should handle empty string entityId", async () => {
			const { useOpenAlexEntity } = await import("@/lib/hooks/use-openalex-query");

			renderHook(() =>
				useRawEntityData({ entityId: "" })
			);

			expect(vi.mocked(useOpenAlexEntity)).toHaveBeenCalledWith(
				"work",
				"",
				undefined,
				{ enabled: false }
			);
		});
	});

	describe("function stability", () => {
		it("should return consistent query object", () => {
			const { result, rerender } = renderHook(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			const firstResult = result.current;

			rerender();

			expect(result.current).toBe(firstResult);
		});
	});
});