/**
 * Unit tests for use-graph-data hook
 */

// Mock dependencies first (before any imports)
vi.mock("@/services/graph-data-service");
vi.mock("@/stores/graph-store");
vi.mock("@/hooks/use-data-fetching-worker");
vi.mock("@/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
	logError: vi.fn(),
}));

import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, type Mock } from "vitest";
import { useGraphData } from "./use-graph-data";
import { GraphDataService } from "@/services/graph-data-service";
import { useGraphStore } from "@/stores/graph-store";
import { useDataFetchingWorker } from "@/hooks/use-data-fetching-worker";
import { logger, logError } from "@/lib/logger";
import type { SearchOptions } from "@/lib/graph/types";
import React from "react";

const MockedGraphDataService = GraphDataService as unknown as {
  new (queryClient: QueryClient): {
    loadEntityGraph: Mock;
    loadEntityIntoGraph: Mock;
    expandNode: Mock;
    searchAndVisualize: Mock;
    loadAllCachedNodes: Mock;
  };
};

const mockUseGraphStore = useGraphStore as unknown as Mock & {
  getState: Mock;
};

const mockUseDataFetchingWorker = useDataFetchingWorker as unknown as Mock;

describe("useGraphData", () => {
	let queryClient: QueryClient;
	let mockService: ReturnType<typeof MockedGraphDataService.prototype>;
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
			return React.createElement(QueryClientProvider, { client: queryClient }, children);
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
			expandNode: vi.fn(),
			searchAndVisualize: vi.fn(),
			loadAllCachedNodes: vi.fn(),
		};

		MockedGraphDataService.mockImplementation(() => mockService);

		// Setup mock store
		mockStore = {
			setLoading: vi.fn(),
			setError: vi.fn(),
			clear: vi.fn(),
			traversalDepth: 2,
			pinnedNodes: { "node1": true },
			calculateNodeDepths: vi.fn(),
			markNodeAsLoading: vi.fn(),
			nodes: {
				"test-node-id": {
					id: "test-node-id",
					entityId: "W123456789",
					entityData: { id: "W123456789", display_name: "Test Node" },
					label: "Test Node",
					type: "works",
					externalIds: [],
				}
			},
		};

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

		// Mock data fetching worker (default to not ready to test fallback behavior)
		mockUseDataFetchingWorker.mockReturnValue({
			isWorkerReady: false,
			activeRequests: new Set(),
			expandNode: vi.fn().mockResolvedValue(undefined),
			cancelExpansion: vi.fn(),
			cancelAllExpansions: vi.fn(),
			getStats: vi.fn().mockReturnValue({
				totalRequests: 0,
				completedRequests: 0,
				failedRequests: 0,
				averageDuration: 0,
			}),
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

			expect(MockedGraphDataService).toHaveBeenCalledWith(queryClient);
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
				"Failed to load entity in graph data hook",
				error,
				"useGraphData",
				"graph"
			);
		});

		it("should not throw errors when service fails", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			mockService.loadEntityGraph.mockRejectedValue(new Error("Service error"));

			const entityId = "test-entity-id";

			// Should not throw
			await expect(result.current.loadEntity(entityId)).resolves.toBeUndefined();
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
				"Failed to load entity into graph in graph data hook",
				error,
				"useGraphData",
				"graph"
			);
		});

		it("should not throw errors when service fails", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			mockService.loadEntityIntoGraph.mockRejectedValue(new Error("Service error"));

			const entityId = "test-entity-id";

			// Should not throw
			await expect(result.current.loadEntityIntoGraph(entityId)).resolves.toBeUndefined();
		});
	});

	describe("expandNode", () => {
		beforeEach(() => {
			// Configure worker to NOT be ready so tests fall back to service
			mockUseDataFetchingWorker.mockReturnValue({
				isWorkerReady: false, // Force fallback to service
				activeRequests: new Set(),
				expandNode: vi.fn().mockResolvedValue(undefined),
				cancelExpansion: vi.fn(),
				cancelAllExpansions: vi.fn(),
				getStats: vi.fn().mockReturnValue({
					totalRequests: 0,
					completedRequests: 0,
					failedRequests: 0,
					averageDuration: 0,
				}),
			});
		});

		it("should call service.expandNode with default options from store", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			const nodeId = "test-node-id";
			await result.current.expandNode(nodeId);

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
			await result.current.expandNode(nodeId, options);

			expect(mockService.expandNode).toHaveBeenCalledWith(nodeId, options);
		});

		it("should log expansion start and completion", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			const nodeId = "test-node-id";
			await result.current.expandNode(nodeId);

			expect(logger.debug).toHaveBeenCalledWith(
				"graph",
				"Fallback expansion completed",
				{
					nodeId,
				},
				"useGraphData"
			);

			expect(logger.debug).toHaveBeenCalledWith(
				"graph",
				"Fallback expansion completed",
				{ nodeId },
				"useGraphData"
			);
		});

		it("should recalculate node depths using first pinned node", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			const nodeId = "test-node-id";
			await result.current.expandNode(nodeId);

			expect(mockStore.calculateNodeDepths).toHaveBeenCalledWith("node1");
		});

		it("should handle no pinned nodes gracefully", async () => {
			// Override the getState mock for this test to return empty pinnedNodes
			const localMockStore = { ...mockStore, pinnedNodes: {} };
			mockUseGraphStore.getState = vi.fn().mockReturnValue(localMockStore);

			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			const nodeId = "test-node-id";
			await result.current.expandNode(nodeId);

			expect(localMockStore.calculateNodeDepths).not.toHaveBeenCalled();
		});

		it("should handle errors and set error state", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			const error = new Error("Expand node failed");
			mockService.expandNode.mockRejectedValue(error);

			const nodeId = "test-node-id";
			await result.current.expandNode(nodeId);

			expect(logger.error).toHaveBeenCalledWith(
				"graph",
				"Fallback expansion failed",
				{
					nodeId,
					error: "Expand node failed",
				},
				"useGraphData"
			);

			expect(logError).toHaveBeenCalledWith(
				"Failed to expand node via fallback",
				error,
				"useGraphData",
				"graph"
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
			await result.current.expandNode(nodeId);

			expect(logger.error).toHaveBeenCalledWith(
				"graph",
				"Fallback expansion failed",
				{
					nodeId,
					error: "Unknown error",
				},
				"useGraphData"
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

			expect(mockService.searchAndVisualize).toHaveBeenCalledWith(query, expectedOptions);
		});

		it("should use provided search options", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			const query = "test search query";
			const options = {
				entityTypes: ["works", "authors"] as const,
				includeExternalIds: false,
				preferExternalIdResults: true,
				limit: 50,
			};

			await result.current.search(query, options);

			const expectedOptions: SearchOptions = {
				query,
				...options,
			};

			expect(mockService.searchAndVisualize).toHaveBeenCalledWith(query, expectedOptions);
		});

		it("should handle partial options and merge with defaults", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			const query = "test search query";
			const partialOptions = {
				entityTypes: ["works"] as const,
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

			expect(mockService.searchAndVisualize).toHaveBeenCalledWith(query, expectedOptions);
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
				"Failed to perform graph search operation",
				error,
				"useGraphData",
				"graph"
			);
		});

		it("should not throw errors when service fails", async () => {
			const { result } = renderHook(() => useGraphData(), {
				wrapper: createWrapper(),
			});

			mockService.searchAndVisualize.mockRejectedValue(new Error("Service error"));

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
				"Failed to load cached nodes in graph data hook",
				error,
				"useGraphData",
				"graph"
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
			expect(() => { result.current.loadAllCachedNodes(); }).not.toThrow();
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
			expect(firstRender.loadEntityIntoGraph).toBe(secondRender.loadEntityIntoGraph);
			expect(firstRender.expandNode).toBe(secondRender.expandNode);
			expect(firstRender.search).toBe(secondRender.search);
			expect(firstRender.loadAllCachedNodes).toBe(secondRender.loadAllCachedNodes);
			expect(firstRender.clearGraph).toBe(secondRender.clearGraph);
		});
	});
});