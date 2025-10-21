/**
 * Unit tests for useRawEntityData hook
 * @vitest-environment jsdom
 */

import type { OpenAlexEntity } from "@academic-explorer/types";
import { EntityDetectionService } from "@academic-explorer/graph";
import * as reactQuery from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithQueryClient } from "../test/test-utils";
import { useRawEntityData } from "./use-raw-entity-data";

vi.mock("@academic-explorer/utils", async () => {
  const actual = await vi.importActual<
    typeof import("@academic-explorer/utils")
  >("@academic-explorer/utils");
  return {
    ...actual,
    useOpenAlexEntity: vi.fn(),
  };
});

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

const mockUseQueryResult = {
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

const mockUseRawEntityDataResult = {
  ...mockUseQueryResult,
  entityType: null,
  entityId: null,
};

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: vi.fn(() => mockUseQueryResult as any),
  };
});

describe("useRawEntityData", () => {
  const getLastUseQueryCall = () => {
    const lastCall = (reactQuery.useQuery as any).mock.calls.at(-1)?.[0];
    expect(lastCall).toBeDefined();
    return lastCall;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useOpenAlexEntity } = await import("@academic-explorer/utils");
    const { EntityDetectionService } = await import("@academic-explorer/graph");

    vi.mocked(useOpenAlexEntity).mockReturnValue(mockUseQueryResult);
    vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
      entityType: "works",
      normalizedId: "W123456789",
      originalInput: "W123456789",
      detectionMethod: "OpenAlex ID",
    });

    vi.spyOn(testLogger, "debug").mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("hook initialization", () => {
    it("should initialize with default options", () => {
      const { result } = renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "W123456789" } }),
      );

      expect(result.current).toMatchObject({
        ...mockUseQueryResult,
        entityType: "works",
        entityId: "W123456789",
      });
    });

    it("should handle missing entityId", () => {
      const { result } = renderHookWithQueryClient(() =>
        useRawEntityData({ options: {} }),
      );

      expect(result.current).toMatchObject({
        ...mockUseQueryResult,
        entityType: null,
        entityId: null,
      });
    });

    it("should handle enabled=false", () => {
      const { result } = renderHookWithQueryClient(() =>
        useRawEntityData({
          options: { entityId: "W123456789", enabled: false },
        }),
      );

      expect(result.current).toMatchObject({
        ...mockUseQueryResult,
        entityType: "works",
        entityId: "W123456789",
      });
    });
  });

  describe("entity type detection", () => {
    it("should detect work entity type", async () => {
      vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
        entityType: "works",
        detectionMethod: "OpenAlex ID",
        normalizedId: "W123456789",
        originalInput: "W123456789",
      });

      renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "W123456789" } }),
      );

      expect(
        vi.mocked(EntityDetectionService.detectEntity),
      ).toHaveBeenCalledWith("W123456789");
      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.queryKey).toEqual([
        "raw-entity",
        "works",
        "W123456789",
        "{}",
      ]);
      expect(lastCall.enabled).toBe(true);
    });

    it("should detect author entity type", async () => {
      vi.mocked(EntityDetectionService.detectEntity).mockReturnValue({
        entityType: "authors",
        detectionMethod: "OpenAlex ID",
        normalizedId: "A123456789",
        originalInput: "A123456789",
      });

      renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "A123456789" } }),
      );

      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.queryKey).toEqual([
        "raw-entity",
        "authors",
        "A123456789",
        "{}",
      ]);
      expect(lastCall.enabled).toBe(true);
    });

    it("should handle all entity type mappings", async () => {
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
          useRawEntityData({ options: { entityId: "TEST123" } }),
        );

        expect(reactQuery.useQuery).toHaveBeenCalled();
        const lastCall = getLastUseQueryCall();
        expect(lastCall.queryKey).toEqual([
          "raw-entity",
          testCase.expected,
          "TEST123",
          "{}",
        ]);
        expect(lastCall.enabled).toBe(true);
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
          useRawEntityData({ options: { entityId: "INVALID123" } }),
        );
      }).toThrow("Unable to detect entity type for: INVALID123");
    });
  });

  describe("query enablement logic", () => {
    it("should enable query when entityId provided", async () => {
      renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "W123456789" } }),
      );
      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.queryKey).toEqual([
        "raw-entity",
        "works",
        "W123456789",
        "{}",
      ]);
      expect(lastCall.enabled).toBe(true);
    });

    it("should disable query when enabled=false", async () => {
      renderHookWithQueryClient(() =>
        useRawEntityData({
          options: { entityId: "W123456789", enabled: false },
        }),
      );
      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.enabled).toBe(false);
    });

    it("should disable query when no entityId", async () => {
      renderHookWithQueryClient(() => useRawEntityData({ options: {} }));
      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.queryKey).toEqual(["raw-entity", null, null, "{}"]);
      expect(lastCall.enabled).toBe(false);
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
        useRawEntityData({ options: { entityId: "W123456789" } }),
      );

      expect(testLogger.debug).toHaveBeenCalledWith(
        "cache",
        "Detected entity type for raw data cache",
        {
          entityId: "W123456789",
          detectedType: "works",
          cacheType: "works",
        },
        "useRawEntityData",
      );
    });

    it("should not log when no entityId provided", () => {
      renderHookWithQueryClient(() => useRawEntityData({ options: {} }));

      expect(testLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe("cache behavior", () => {
    it("should use React Query caching", async () => {
      const mockEntityData: OpenAlexEntity = {
        id: "https://openalex.org/W123456789",
        display_name: "Test Work",
      } as OpenAlexEntity;

      (reactQuery.useQuery as unknown as any).mockReturnValue({
        ...mockUseQueryResult,
        data: mockEntityData,
        dataUpdatedAt: 1000,
      } as any);

      renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "W123456789" } }),
      );

      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.staleTime).toBeDefined();
      expect(lastCall.gcTime).toBeDefined();
    });
  });

  describe("options handling", () => {
    it("should handle undefined options gracefully", () => {
      const { result } = renderHookWithQueryClient(() =>
        useRawEntityData({ options: {} } as any),
      );

      expect(result.current).toEqual(mockUseRawEntityDataResult);
    });

    it("should default enabled to true", async () => {
      renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "W123456789" } }),
      );

      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.enabled).toBe(true);
    });
  });

  describe("fallback behavior", () => {
    it("should handle empty string entityId", async () => {
      renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "" } }),
      );

      expect(reactQuery.useQuery).toHaveBeenCalled();
      const lastCall = getLastUseQueryCall();
      expect(lastCall.queryKey).toEqual(["raw-entity", null, null, "{}"]);
      expect(lastCall.enabled).toBe(false);
    });
  });

  describe("function stability", () => {
    it("should return consistent query object", () => {
      const { result, rerender } = renderHookWithQueryClient(() =>
        useRawEntityData({ options: { entityId: "W123456789" } }),
      );

      const firstResult = result.current;

      rerender();

      // The object reference should be stable for React Query properties
      // but entityType/entityId are computed values that may change reference
      expect(result.current.data).toBe(firstResult.data);
      expect(result.current.isLoading).toBe(firstResult.isLoading);
      expect(result.current.error).toBe(firstResult.error);
      expect(result.current.entityType).toBe(firstResult.entityType);
      expect(result.current.entityId).toBe(firstResult.entityId);
    });
  });
});
