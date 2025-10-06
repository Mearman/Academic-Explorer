/**
 * Unit tests for useRawEntityData hook
 * Tests raw entity data fetching 		// Get the mocked modules
		const { useOpenAlexEntity } = await import("@academic-explorer/utils");
		const { EntityDetectionService } = await import("@academic-explorer/graph");
		const { logger } = await import("@academic-explorer/utils/logger");

		// Setup default mock implementations
		vi.mocked(useOpenAlexEntity).mockReturnValue(mockUseOpenAlexEntity);ache system integration
 */

import type { OpenAlexEntity } from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import * as reactQuery from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithQueryClient } from "../test/test-utils";
import { useRawEntityData } from "./use-raw-entity-data";

// Mock dependencies with factory functions
// Partially mock the utils package so we preserve the real logger export
// while mocking useOpenAlexEntity for tests.
vi.mock("@academic-explorer/utils", async () => {
	const actual = await vi.importActual<typeof import("@academic-explorer/utils")>("@academic-explorer/utils");
	return {
		...actual,
		useOpenAlexEntity: vi.fn(),
	} as any;
});

// Import the shared logger from the utils module so tests and implementation
// refer to the exact same object.
import { logger as testLogger } from "@academic-explorer/utils";

vi.mock("@academic-explorer/graph", () => ({
	EntityDetectionService: {
		detectEntity: vi.fn(() => ({
			entityType: "works",
			normalizedId: "W123456789",
			originalInput: "W123456789",
			detectionMethod: "OpenAlex ID",
		})),
	},
}));

// We'll partially mock @tanstack/react-query so useQuery returns a stable
// test object while keeping the rest of the module intact (QueryClient, etc.).
const mockUseOpenAlexEntity = {
	data: null,
	isLoading: false,
	isFetching: false,
	error: null,
	status: "idle" as const,
	dataUpdatedAt: 0,
	isError: false,
	isSuccess: false,
	isPending: false,
	failureCount: 0,
	failureReason: null,
	errorUpdateCount: 0,
	errorUpdatedAt: 0,
	isFetched: false,
	isFetchedAfterMount: false,
	isFetchingError: false,
	isInitialLoading: false,
	isLoadingError: false,
	isPaused: false,
	isPlaceholderData: false,
	isRefetchError: false,
	isRefetching: false,
	isStale: false,
	refetch: vi.fn(),
};

// We'll grab the real logger import in tests so both implementation and
// tests share the same mocked functions.

// Partial mock for @tanstack/react-query (hoisted by Vitest)
vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
	return {
		...actual,
		useQuery: vi.fn(() => mockUseOpenAlexEntity as any),
	} as any;
});

let reactQueryModule: any;

describe("useRawEntityData", () => {
	beforeEach(async () => {
		// Reset all mocks
		vi.clearAllMocks();

		// Get the mocked modules
	const { useOpenAlexEntity } = await import("@academic-explorer/utils");
	const { EntityDetectionService: EntityDetectionService } = await import("@academic-explorer/graph");

	// Setup default mock implementations
	vi.mocked(useOpenAlexEntity).mockReturnValue(mockUseOpenAlexEntity);
		vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
			entityType: "works",
			normalizedId: "W123456789",
			originalInput: "W123456789",
			detectionMethod: "OpenAlex ID",
		});

		// react-query is partially mocked at the top of the file; nothing to do here.

	// Ensure the logger methods on the shared logger are jest fns so
	// tests can assert calls. Replace with spies that we can inspect.
	vi.spyOn(testLogger, "debug").mockImplementation(vi.fn());
	vi.spyOn(testLogger, "info").mockImplementation(vi.fn());
	vi.spyOn(testLogger, "error").mockImplementation(vi.fn());

	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("hook initialization", () => {
		it("should initialize with default options", () => {
			const { result } = renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});

		it("should handle missing entityId", () => {
			const { result } = renderHookWithQueryClient(() =>
				useRawEntityData({})
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});

		it("should handle enabled=false", () => {
			const { result } = renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "W123456789", enabled: false })
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});
	});

	describe("entity type detection", () => {
		it("should detect work entity type", async () => {
			const { useOpenAlexEntity } = await import("@academic-explorer/utils");

			vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
				entityType: "works",
				detectionMethod: "OpenAlex ID",
				normalizedId: "W123456789",
				originalInput: "W123456789",
			});

			renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(vi.mocked(EntityDetectionService.detectEntity)).toHaveBeenCalledWith("W123456789");
			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", "works", "W123456789"]);
			expect(lastCall!.enabled).toBe(true);
		});

		it("should detect author entity type", async () => {
			const { useOpenAlexEntity } = await import("@academic-explorer/utils");

			vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
				entityType: "authors",
				detectionMethod: "OpenAlex ID",
				normalizedId: "A123456789",
				originalInput: "A123456789",
			});

			renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "A123456789" })
			);

			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", "authors", "A123456789"]);
			expect(lastCall!.enabled).toBe(true);
		});

		it("should handle all entity type mappings", async () => {
			const { useOpenAlexEntity } = await import("@academic-explorer/utils");

			const testCases = [
				{ input: "works", expected: "works" },
				{ input: "authors", expected: "authors" },
				{ input: "sources", expected: "sources" },
				{ input: "institutions", expected: "institutions" },
				{ input: "topics", expected: "topics" },
				{ input: "publishers", expected: "publishers" },
				{ input: "funders", expected: "funders" },
				{ input: "keywords", expected: "keywords" },
				{ input: "concepts", expected: "concepts" },
			];

			for (const testCase of testCases) {
				vi.clearAllMocks();
				vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
					entityType: testCase.input as any,
					detectionMethod: "OpenAlex ID",
					normalizedId: "TEST123",
					originalInput: "TEST123",
				});

				renderHookWithQueryClient(() =>
					useRawEntityData({ entityId: "TEST123" })
				);

				expect(reactQuery.useQuery).toHaveBeenCalled();
				const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
				expect(lastCall).toBeDefined();
				expect(lastCall!.queryKey).toEqual(["raw-entity", testCase.expected, "TEST123"]);
				expect(lastCall!.enabled).toBe(true);
			}
		});

		it("should throw error for undetectable entity type", () => {
			vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
				entityType: undefined as any,
				detectionMethod: "OpenAlex ID",
				normalizedId: "",
				originalInput: "INVALID123",
			});

			expect(() => {
				renderHookWithQueryClient(() =>
					useRawEntityData({ entityId: "INVALID123" })
				);
			}).toThrow("Unable to detect entity type for: INVALID123");
		});
	});

	describe("query enablement logic", () => {
		it("should enable query when entityId and enabled=true", async () => {
			renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "W123456789", enabled: true })
			);
				expect(reactQuery.useQuery).toHaveBeenCalled();
				const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", "works", "W123456789"]);
			expect(lastCall!.enabled).toBe(true);
		});

		it("should disable query when enabled=false", async () => {
			renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "W123456789", enabled: false })
			);
			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", "works", "W123456789"]);
			expect(lastCall!.enabled).toBe(false);
		});

		it("should disable query when no entityId", async () => {
			renderHookWithQueryClient(() =>
				useRawEntityData({ enabled: true })
			);
			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
 			expect(lastCall!.queryKey).toEqual(["raw-entity", null, null]);
			expect(lastCall!.enabled).toBe(false);
		});

		it("should disable query when entityId is null", async () => {
			renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: null, enabled: true })
			);
			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
 			expect(lastCall!.queryKey).toEqual(["raw-entity", null, null]);
			expect(lastCall!.enabled).toBe(false);
		});
	});

	describe("logging behavior", () => {
		it("should log entity detection debug info", () => {
			vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
				entityType: "works",
				detectionMethod: "OpenAlex ID",
				normalizedId: "W123456789",
				originalInput: "W123456789",
			});

			renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			expect(testLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Detected entity type for raw data cache",
				{
					entityId: "W123456789",
					detectedType: "works",
					cacheType: "works",
				},
				"useRawEntityData"
			);
		});

		it("should log successful data loading", async () => {
		const mockEntityData: OpenAlexEntity = {
			id: "https://openalex.org/W123456789",
			display_name: "Test Work",
		} as OpenAlexEntity;

		(reactQuery.useQuery as unknown as vi.Mock).mockReturnValue({
			...mockUseOpenAlexEntity,
			data: mockEntityData,
			status: "success",
			dataUpdatedAt: Date.now() - 5000,
		} as any);

		renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789" }));

		expect(testLogger.debug).toHaveBeenCalledWith(
			"cache",
			"Raw entity data loaded from cache system",
			expect.objectContaining({
				entityId: "W123456789",
				entityType: "works",
				fromCache: true,
				cacheStatus: "success",
				dataAge: expect.any(Number),
			}),
			"useRawEntityData"
		);
		});

		it("should log errors", async () => {
			const mockError = new Error("Network error");
			(reactQuery.useQuery as unknown as any).mockReturnValue({
				...mockUseOpenAlexEntity,
				error: mockError,
				status: "error",
			} as any);

			renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789" }));

			expect(testLogger.error).toHaveBeenCalledWith(
				"cache",
				"Failed to fetch raw entity data",
				{
					entityId: "W123456789",
					entityType: "works",
					error: "Network error",
				},
				"useRawEntityData"
			);
		});

		it("should handle non-Error exceptions in logging", async () => {
			(reactQuery.useQuery as unknown as any).mockReturnValue({
				...mockUseOpenAlexEntity,
				error: "String error" as any,
				status: "error",
			} as any);

			renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789" }));

			expect(testLogger.error).toHaveBeenCalledWith(
				"cache",
				"Failed to fetch raw entity data",
				{
					entityId: "W123456789",
					entityType: "works",
					error: "Unknown error",
				},
				"useRawEntityData"
			);
		});

		it("should not log when no entityId provided", () => {
			renderHookWithQueryClient(() =>
				useRawEntityData({})
			);

			expect(testLogger.debug).not.toHaveBeenCalled();
		});
	});

	describe("cache behavior", () => {
		it("should track cache hit with dataUpdatedAt", async () => {
			const { useOpenAlexEntity } = await import("@academic-explorer/utils");

			// Mock Date.now to ensure consistent timing
			const fixedNow = 1000000000000; // Fixed timestamp
			const mockDateNow = vi.spyOn(Date, "now").mockReturnValue(fixedNow);

			const mockEntityData: OpenAlexEntity = {
				id: "https://openalex.org/W123456789",
				display_name: "Test Work",
			} as OpenAlexEntity;

			(reactQuery.useQuery as unknown as any).mockReturnValue({
				...mockUseOpenAlexEntity,
				data: mockEntityData,
				isFetching: false,
				dataUpdatedAt: fixedNow - 10000,
			} as any);

			renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789" }));

			expect(testLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Raw entity data loaded from cache system",
				expect.objectContaining({
					fromCache: true,
					dataAge: 10000, // Should be exactly 10000ms
				}),
				"useRawEntityData"
			);

			// Get the second call which should have the cache data with dataAge
			const cacheLogCall = (testLogger.debug as any).mock.calls.find((call: any) =>
				call[1] === "Raw entity data loaded from cache system"
			);

			expect(cacheLogCall).toBeDefined();
			const dataAge = cacheLogCall![2].dataAge;
			expect(dataAge).toBe(10000); // Should be exactly 10 seconds

			// Restore Date.now
			mockDateNow.mockRestore();
		});

		it("should handle missing dataUpdatedAt", async () => {
			const mockEntityData: OpenAlexEntity = {
				id: "https://openalex.org/W123456789",
				display_name: "Test Work",
			} as OpenAlexEntity;

			(reactQuery.useQuery as unknown as any).mockReturnValue({
				...mockUseOpenAlexEntity,
				data: mockEntityData,
				dataUpdatedAt: 0,
			} as any);

			renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789" }));

			expect(testLogger.debug).toHaveBeenCalledWith(
				"cache",
				"Raw entity data loaded from cache system",
				expect.objectContaining({
					dataAge: expect.any(Number),
				}),
				"useRawEntityData"
			);
		});

		it("should detect fresh API fetch", async () => {
			const { useOpenAlexEntity } = await import("@academic-explorer/utils");

			const mockEntityData: OpenAlexEntity = {
				id: "https://openalex.org/W123456789",
				display_name: "Test Work",
			} as OpenAlexEntity;

			(reactQuery.useQuery as unknown as any).mockReturnValue({
				...mockUseOpenAlexEntity,
				data: mockEntityData,
				isFetching: true,
			} as any);

			renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789" }));

			expect(testLogger.debug).toHaveBeenCalledWith(
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
			const { result } = renderHookWithQueryClient(() =>
				useRawEntityData({} as any)
			);

			expect(result.current).toEqual(mockUseOpenAlexEntity);
		});

		it("should default enabled to true", async () => {
			renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789" }));

			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", "works", "W123456789"]);
			expect(lastCall!.enabled).toBe(true);
		});

		it("should respect explicit enabled: true", async () => {
			renderHookWithQueryClient(() => useRawEntityData({ entityId: "W123456789", enabled: true }));

			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", "works", "W123456789"]);
			expect(lastCall!.enabled).toBe(true);
		});
	});

	describe("fallback behavior", () => {
		it("should provide fallback type and ID when disabled", async () => {
			renderHookWithQueryClient(() => useRawEntityData({ enabled: false }));

			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", null, null]);
			expect(lastCall!.enabled).toBe(false);
		});

		it("should handle empty string entityId", async () => {
			renderHookWithQueryClient(() => useRawEntityData({ entityId: "" }));

			expect(reactQuery.useQuery).toHaveBeenCalled();
			const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
			expect(lastCall).toBeDefined();
			expect(lastCall!.queryKey).toEqual(["raw-entity", null, null]);
			expect(lastCall!.enabled).toBe(false);
		});
	});

	describe("function stability", () => {
		it("should return consistent query object", () => {
			const { result, rerender } = renderHookWithQueryClient(() =>
				useRawEntityData({ entityId: "W123456789" })
			);

			const firstResult = result.current;

			rerender();

			expect(result.current).toBe(firstResult);
		});
	});
});
