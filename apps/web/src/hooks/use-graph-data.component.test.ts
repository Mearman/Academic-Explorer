/**
 * Unit tests for use-graph-data hook
 */

import { useUnifiedExecutionWorker } from "@/hooks/use-unified-execution-worker";
import { createGraphDataService } from "@/services/graph-data-service";
import { useGraphStore } from "@/stores/graph-store";
import type { SearchOptions } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import React from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { useGraphData } from "./use-graph-data";

// Mock dependencies after imports
vi.mock("@/services/graph-data-service", () => ({
  createGraphDataService: vi.fn(),
  GraphDataService: vi.fn(),
}));
vi.mock("@/stores/graph-store");
vi.mock("@/hooks/use-unified-execution-worker");
vi.mock("@academic-explorer/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logError: vi.fn(),
}));

const mockedCreateGraphDataService = createGraphDataService as unknown as Mock;

const mockUseGraphStore = useGraphStore as unknown as Mock & {
  getState: Mock;
};

const mockUseUnifiedExecutionWorker =
  useUnifiedExecutionWorker as unknown as Mock;

describe("useGraphData", () => {
  let queryClient: QueryClient;
  let mockService: {
    loadEntityGraph: Mock;
    loadEntityIntoGraph: Mock;
    loadEntityIntoRepository: Mock;
    expandNode: Mock;
    searchAndVisualize: Mock;
    loadAllCachedNodes: Mock;
  };
  let mockStore: {
    setLoading: Mock;
    setError: Mock;
    clear: Mock;
    traversalDepth: number;
    pinnedNodes: Set<string>;
    calculateNodeDepths: Mock;
    markNodeAsLoading: Mock;
  };

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup mock service
    mockService = {
      loadEntityGraph: vi.fn(),
      loadEntityIntoGraph: vi.fn(),
      loadEntityIntoRepository: vi.fn(),
      expandNode: vi.fn(),
      searchAndVisualize: vi.fn(),
      loadAllCachedNodes: vi.fn(),
    };

    mockedCreateGraphDataService.mockReturnValue(mockService);

    // Setup mock store
    mockStore = {
      setLoading: vi.fn(),
      setError: vi.fn(),
      clear: vi.fn(),
      traversalDepth: 2,
      pinnedNodes: { node1: true },
      calculateNodeDepths: vi.fn(),
      markNodeAsLoading: vi.fn(),
      nodes: {
        "test-node-id": {
          id: "test-node-id",
          entityId: "W123456789",
          entityData: { id: "W123456789", display_name: "Test Node" },
          label: "Test Node",
          entityType: "works",
          externalIds: [],
        },
      },
    } as any;

    // Mock useGraphStore to return primitive values based on selector
    mockUseGraphStore.mockImplementation((selector?: (state: any) => any) => {
      const state = {
        isLoading: false,
        error: null,
        ...mockStore,
      };

      if (selector) {
        return selector(state);
      }
      return state;
    });

    mockUseGraphStore.getState = vi.fn().mockReturnValue({
      isLoading: false,
      error: null,
      ...mockStore,
    });

    // Mock animated force simulation (not ready to force fallback to service)
    mockUseUnifiedExecutionWorker.mockReturnValue({
      isWorkerReady: false, // Force fallback to service for predictable tests
      expandNode: vi.fn().mockResolvedValue(undefined),
      cancelExpansion: vi.fn(),
      // Other properties that might be accessed
      animationState: { isRunning: false, isPaused: false },
      nodePositions: [],
      performanceStats: {},
      startAnimation: vi.fn(),
      stopAnimation: vi.fn(),
      pauseAnimation: vi.fn(),
      resumeAnimation: vi.fn(),
      updateParameters: vi.fn(),
      resetPositions: vi.fn(),
      getOptimalConfig: vi.fn(),
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("hook initialization", () => {
    it("should initialize with correct state", () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toMatchObject({
        loadEntity: expect.any(Function),
        loadEntityIntoGraph: expect.any(Function),
        loadAllCachedNodes: expect.any(Function),
        expandNode: expect.any(Function),
        search: expect.any(Function),
        clearGraph: expect.any(Function),
        isLoading: false,
        error: null,
      });
    });

    it("should create GraphDataService instance with queryClient", () => {
      renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      expect(mockedCreateGraphDataService).toHaveBeenCalledWith(queryClient);
    });

    it("should return loading state from store", () => {
      mockUseGraphStore.mockImplementation((selector?: (state: any) => any) => {
        const state = {
          isLoading: true,
          error: null,
          ...mockStore,
        };

        if (selector) {
          return selector(state);
        }
        return state;
      });

      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("should return error state from store", () => {
      const errorMessage = "Test error";
      mockUseGraphStore.mockImplementation((selector?: (state: any) => any) => {
        const state = {
          isLoading: false,
          error: errorMessage,
          ...mockStore,
        };

        if (selector) {
          return selector(state);
        }
        return state;
      });

      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe("loadEntity", () => {
    it("should call service.loadEntityGraph with correct parameters", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const entityId = "test-entity-id";
      await result.current.loadEntity(entityId);

      expect(mockService.loadEntityGraph).toHaveBeenCalledWith(entityId);
    });

    it("should handle errors and log them", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const error = new Error("Load entity failed");
      mockService.loadEntityGraph.mockRejectedValue(error);

      const entityId = "test-entity-id";
      await result.current.loadEntity(entityId);

      expect(logError).toHaveBeenCalledWith(
        logger,
        "Failed to load entity in graph data hook",
        error,
        "useGraphData",
        "graph",
      );
    });

    it("should not throw errors when service fails", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      mockService.loadEntityGraph.mockRejectedValue(new Error("Service error"));

      const entityId = "test-entity-id";

      // Should not throw
      await expect(
        result.current.loadEntity(entityId),
      ).resolves.toBeUndefined();
    });
  });

  describe("loadEntityIntoGraph", () => {
    it("should call service.loadEntityIntoGraph with correct parameters", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const entityId = "test-entity-id";
      await result.current.loadEntityIntoGraph(entityId);

      expect(mockService.loadEntityIntoGraph).toHaveBeenCalledWith(entityId);
    });

    it("should handle errors and log them", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const error = new Error("Load entity into graph failed");
      mockService.loadEntityIntoGraph.mockRejectedValue(error);

      const entityId = "test-entity-id";
      await result.current.loadEntityIntoGraph(entityId);

      expect(logError).toHaveBeenCalledWith(
        logger,
        "Failed to load entity into graph in graph data hook",
        error,
        "useGraphData",
        "graph",
      );
    });

    it("should not throw errors when service fails", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      mockService.loadEntityIntoGraph.mockRejectedValue(
        new Error("Service error"),
      );

      const entityId = "test-entity-id";

      // Should not throw
      await expect(
        result.current.loadEntityIntoGraph(entityId),
      ).resolves.toBeUndefined();
    });
  });

  describe("expandNode", () => {
    it("should call service.expandNode with default options from store", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const nodeId = "test-node-id";
      await result.current.expandNode({ nodeId });

      expect(mockStore.setLoading).toHaveBeenCalledWith(true);
      expect(mockService.expandNode).toHaveBeenCalledWith(nodeId, undefined);
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
    });

    it("should use provided options when specified", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const nodeId = "test-node-id";
      const options = { depth: 5, limit: 20, force: false };
      await result.current.expandNode({ nodeId, options });

      expect(mockService.expandNode).toHaveBeenCalledWith(nodeId, options);
    });

    it("should log expansion start and completion", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const nodeId = "test-node-id";
      await result.current.expandNode({ nodeId });

      expect(logger.debug).toHaveBeenCalledWith(
        "graph",
        expect.stringContaining("Node expansion completed"),
        expect.objectContaining({ nodeId }),
        expect.any(String),
      );
    });

    it("should recalculate node depths using first pinned node", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const nodeId = "test-node-id";
      await result.current.expandNode({ nodeId });

      expect(mockStore.calculateNodeDepths).toHaveBeenCalled();
    });

    it("should handle no pinned nodes gracefully", async () => {
      // Override the getState mock for this test to return empty pinnedNodes
      const localMockStore = { ...mockStore, pinnedNodes: {} };
      mockUseGraphStore.getState = vi.fn().mockReturnValue(localMockStore);

      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const nodeId = "test-node-id";
      await result.current.expandNode({ nodeId });

      expect(localMockStore.calculateNodeDepths).not.toHaveBeenCalled();
    });

    it("should handle errors and set error state", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const error = new Error("Expand node failed");
      mockService.expandNode.mockRejectedValue(error);

      const nodeId = "test-node-id";
      await result.current.expandNode({ nodeId });

      expect(logger.error).toHaveBeenCalledWith(
        "graph",
        expect.stringMatching(/Service(?: fallback)? expansion failed/),
        expect.objectContaining({ nodeId, error: expect.any(String) }),
        expect.any(String),
      );

      expect(logError).toHaveBeenCalledWith(
        logger,
        expect.stringMatching(
          /Failed to expand node via service(?: fallback)?/,
        ),
        error,
        "useGraphData",
        "graph",
      );

      expect(mockStore.setError).toHaveBeenCalledWith("Expand node failed");
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
    });

    it("should handle non-Error exceptions", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const errorValue = "String error";
      mockService.expandNode.mockRejectedValue(errorValue);

      const nodeId = "test-node-id";
      await result.current.expandNode({ nodeId });

      expect(logger.error).toHaveBeenCalledWith(
        "graph",
        expect.stringMatching(/Service(?: fallback)? expansion failed/),
        expect.objectContaining({ nodeId, error: expect.any(String) }),
        expect.any(String),
      );

      expect(mockStore.setError).toHaveBeenCalledWith("Failed to expand node");
    });
  });

  describe("search", () => {
    it("should call service.searchAndVisualize with default options", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const query = "test search query";
      await result.current.search(query);

      const expectedOptions: SearchOptions = {
        query,
        entityTypes: ["works", "authors", "sources", "institutions"],
        includeExternalIds: true,
        preferExternalIdResults: false,
        limit: 20,
      };

      expect(mockService.searchAndVisualize).toHaveBeenCalledWith(
        query,
        expectedOptions,
      );
    });

    it("should use provided search options", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const query = "test search query";
      const options: Partial<SearchOptions> = {
        entityTypes: ["works", "authors"],
        includeExternalIds: false,
        preferExternalIdResults: true,
        limit: 50,
      };

      await result.current.search(query, options);

      const expectedOptions: SearchOptions = {
        query,
        entityTypes: options.entityTypes || [],
        includeExternalIds: options.includeExternalIds,
        preferExternalIdResults: options.preferExternalIdResults,
        limit: options.limit,
      };

      expect(mockService.searchAndVisualize).toHaveBeenCalledWith(
        query,
        expectedOptions,
      );
    });

    it("should handle partial options and merge with defaults", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const query = "test search query";
      const partialOptions: Partial<SearchOptions> = {
        entityTypes: ["works"],
        limit: 100,
      };

      await result.current.search(query, partialOptions);

      const expectedOptions: SearchOptions = {
        query,
        entityTypes: ["works"],
        includeExternalIds: true, // Default
        preferExternalIdResults: false, // Default
        limit: 100,
      };

      expect(mockService.searchAndVisualize).toHaveBeenCalledWith(
        query,
        expectedOptions,
      );
    });

    it("should handle errors and log them", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const error = new Error("Search failed");
      mockService.searchAndVisualize.mockRejectedValue(error);

      const query = "test search query";
      await result.current.search(query);

      expect(logError).toHaveBeenCalledWith(
        logger,
        "Failed to perform graph search operation",
        error,
        "useGraphData",
        "graph",
      );
    });

    it("should not throw errors when service fails", async () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      mockService.searchAndVisualize.mockRejectedValue(
        new Error("Service error"),
      );

      const query = "test search query";

      // Should not throw
      await expect(result.current.search(query)).resolves.toBeUndefined();
    });
  });

  describe("loadAllCachedNodes", () => {
    it("should call service.loadAllCachedNodes", () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      result.current.loadAllCachedNodes();

      expect(mockService.loadAllCachedNodes).toHaveBeenCalled();
    });

    it("should handle errors and log them", () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const error = new Error("Load cached nodes failed");
      mockService.loadAllCachedNodes.mockImplementation(() => {
        throw error;
      });

      result.current.loadAllCachedNodes();

      expect(logError).toHaveBeenCalledWith(
        logger,
        "Failed to load cached nodes in graph data hook",
        error,
        "useGraphData",
        "graph",
      );
    });

    it("should not throw errors when service fails", () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      mockService.loadAllCachedNodes.mockImplementation(() => {
        throw new Error("Service error");
      });

      // Should not throw
      expect(() => {
        result.current.loadAllCachedNodes();
      }).not.toThrow();
    });
  });

  describe("clearGraph", () => {
    it("should call store.clear", () => {
      const { result } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      result.current.clearGraph();

      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe("function stability", () => {
    it("should return stable function references", () => {
      const { result, rerender } = renderHook(() => useGraphData(), {
        wrapper: createWrapper(),
      });

      const firstRender = { ...result.current };
      rerender();
      const secondRender = { ...result.current };

      // Functions should be stable
      expect(firstRender.loadEntity).toBe(secondRender.loadEntity);
      expect(firstRender.loadEntityIntoGraph).toBe(
        secondRender.loadEntityIntoGraph,
      );
      expect(firstRender.expandNode).toBe(secondRender.expandNode);
      expect(firstRender.search).toBe(secondRender.search);
      expect(firstRender.loadAllCachedNodes).toBe(
        secondRender.loadAllCachedNodes,
      );
      expect(firstRender.clearGraph).toBe(secondRender.clearGraph);
    });
  });
});
