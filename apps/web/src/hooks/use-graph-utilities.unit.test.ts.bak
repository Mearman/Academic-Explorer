/**
 * Unit tests for useGraphUtilities hook
 * Tests graph manipulation utilities and analysis functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGraphUtilities } from "./use-graph-utilities";
import type { GraphNode, GraphEdge } from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";

// Mock dependencies with factory functions
vi.mock("@/stores/graph-store", () => ({
	useGraphStore: vi.fn(),
}));

vi.mock("@academic-explorer/utils", () => ({
	graphUtilitiesService: {
		trimLeafNodes: vi.fn(),
		trimRootNodes: vi.fn(),
		trimDegree1Nodes: vi.fn(),
		removeIsolatedNodes: vi.fn(),
		filterByPublicationYear: vi.fn(),
		extractEgoNetwork: vi.fn(),
		getLargestConnectedComponent: vi.fn(),
		findConnectedComponents: vi.fn(),
	},
}));

vi.mock("@academic-explorer/utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

const mockGraphStore = {
	nodes: {} as Record<string, GraphNode>,
	edges: {} as Record<string, GraphEdge>,
	setGraphData: vi.fn(),
	setLoading: vi.fn(),
	setError: vi.fn(),
};

const mockGraphUtilitiesService = {
	trimLeafNodes: vi.fn(),
	trimRootNodes: vi.fn(),
	trimDegree1Nodes: vi.fn(),
	removeIsolatedNodes: vi.fn(),
	filterByPublicationYear: vi.fn(),
	extractEgoNetwork: vi.fn(),
	getLargestConnectedComponent: vi.fn(),
	findConnectedComponents: vi.fn(),
};

const mockLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

describe("useGraphUtilities", () => {
	// Test data
	const testNodes: GraphNode[] = [
		{
			id: "W1",
			entityType: "works",
			label: "Test Work 1",
			entityId: "W1",
			position: { x: 0, y: 0 },
			externalIds: [],
			metadata: { year: 2020 },
		},
		{
			id: "W2",
			entityType: "works",
			label: "Test Work 2",
			entityId: "W2",
			position: { x: 100, y: 100 },
			externalIds: [],
			metadata: { year: 2021 },
		},
		{
			id: "A1",
			entityType: "authors",
			label: "Test Author 1",
			entityId: "A1",
			position: { x: 50, y: 50 },
			externalIds: [],
		},
	];

	const testEdges: GraphEdge[] = [
		{
			id: "E1",
			source: "A1",
			target: "W1",
			entityType: RelationType.AUTHORED,
		},
		{
			id: "E2",
			source: "W1",
			target: "W2",
			entityType: RelationType.REFERENCES,
		},
	];

	beforeEach(async () => {
		// Reset all mocks
		vi.clearAllMocks();

		// Get the mocked modules
		const { useGraphStore } = await import("@/stores/graph-store");
		const { graphUtilitiesService } = await import("@academic-explorer/graph");
		const { logger } = await import("@academic-explorer/utils/logger");

		// Setup mock graph store - use Records instead of Maps
		const testNodesRecord: Record<string, GraphNode> = {};
		const testEdgesRecord: Record<string, GraphEdge> = {};

		testNodes.forEach(node => {
			testNodesRecord[node.id] = node;
		});
		testEdges.forEach(edge => {
			testEdgesRecord[edge.id] = edge;
		});

		mockGraphStore.nodes = testNodesRecord;
		mockGraphStore.edges = testEdgesRecord;

		// Configure useGraphStore mock to return different values based on selector
		vi.mocked(useGraphStore).mockImplementation((selector: any) => {
			if (typeof selector === "function") {
				// Mock the state object
				const state = {
					nodes: testNodesRecord,
					edges: testEdgesRecord,
					setGraphData: mockGraphStore.setGraphData,
					setLoading: mockGraphStore.setLoading,
					setError: mockGraphStore.setError,
				};
				return selector(state);
			}
			// Return the entire store for direct access
			return mockGraphStore;
		});

		// Connect service mocks
		vi.mocked(graphUtilitiesService.trimLeafNodes).mockImplementation(mockGraphUtilitiesService.trimLeafNodes);
		vi.mocked(graphUtilitiesService.trimRootNodes).mockImplementation(mockGraphUtilitiesService.trimRootNodes);
		vi.mocked(graphUtilitiesService.trimDegree1Nodes).mockImplementation(mockGraphUtilitiesService.trimDegree1Nodes);
		vi.mocked(graphUtilitiesService.removeIsolatedNodes).mockImplementation(mockGraphUtilitiesService.removeIsolatedNodes);
		vi.mocked(graphUtilitiesService.filterByPublicationYear).mockImplementation(mockGraphUtilitiesService.filterByPublicationYear);
		vi.mocked(graphUtilitiesService.extractEgoNetwork).mockImplementation(mockGraphUtilitiesService.extractEgoNetwork);
		vi.mocked(graphUtilitiesService.getLargestConnectedComponent).mockImplementation(mockGraphUtilitiesService.getLargestConnectedComponent);
		vi.mocked(graphUtilitiesService.findConnectedComponents).mockImplementation(mockGraphUtilitiesService.findConnectedComponents);

		// Connect logger mocks
		vi.mocked(logger.debug).mockImplementation(mockLogger.debug);
		vi.mocked(logger.info).mockImplementation(mockLogger.info);
		vi.mocked(logger.warn).mockImplementation(mockLogger.warn);
		vi.mocked(logger.error).mockImplementation(mockLogger.error);

		// Setup default service mock return values
		mockGraphUtilitiesService.trimLeafNodes.mockReturnValue({
			nodes: testNodes.slice(0, 2), // Remove one node
			edges: testEdges.slice(0, 1), // Remove one edge
			removedCount: 1,
			operation: "trimLeafNodes",
		});

		mockGraphUtilitiesService.trimRootNodes.mockReturnValue({
			nodes: testNodes.slice(1), // Remove first node
			edges: testEdges.slice(1), // Remove first edge
			removedCount: 1,
			operation: "trimRootNodes",
		});

		mockGraphUtilitiesService.trimDegree1Nodes.mockReturnValue({
			nodes: testNodes.slice(0, 2),
			edges: testEdges.slice(0, 1),
			removedCount: 1,
			operation: "trimDegree1Nodes",
		});

		mockGraphUtilitiesService.removeIsolatedNodes.mockReturnValue({
			nodes: testNodes,
			edges: testEdges,
			removedCount: 0,
			operation: "removeIsolatedNodes",
		});

		mockGraphUtilitiesService.filterByPublicationYear.mockReturnValue({
			nodes: testNodes.slice(0, 1), // Filter to one node
			edges: [],
			removedCount: 2,
			operation: "filterByPublicationYear",
		});

		mockGraphUtilitiesService.extractEgoNetwork.mockReturnValue({
			nodes: testNodes.slice(0, 2),
			edges: testEdges.slice(0, 1),
			removedCount: 1,
			operation: "extractEgoNetwork",
		});

		mockGraphUtilitiesService.getLargestConnectedComponent.mockReturnValue({
			nodes: testNodes,
			edges: testEdges,
			removedCount: 0,
			operation: "getLargestConnectedComponent",
		});

		mockGraphUtilitiesService.findConnectedComponents.mockReturnValue([
			["W1", "A1"],
			["W2"],
		]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("hook initialization", () => {
		it("should initialize with current graph data", () => {
			const { result } = renderHook(() => useGraphUtilities());

			expect(result.current.nodeCount).toBe(3);
			expect(result.current.edgeCount).toBe(2);
		});

		it("should provide all utility functions", () => {
			const { result } = renderHook(() => useGraphUtilities());

			// Graph modification utilities
			expect(result.current.trimLeafNodes).toBeDefined();
			expect(result.current.trimRootNodes).toBeDefined();
			expect(result.current.trimDegree1Nodes).toBeDefined();
			expect(result.current.removeIsolatedNodes).toBeDefined();
			expect(result.current.filterByPublicationYear).toBeDefined();
			expect(result.current.extractEgoNetwork).toBeDefined();
			expect(result.current.getLargestConnectedComponent).toBeDefined();

			// Analysis utilities
			expect(result.current.findConnectedComponents).toBeDefined();
			expect(result.current.getGraphStats).toBeDefined();
		});
	});

	describe("graph modification utilities", () => {
		it("should trim leaf nodes successfully", async () => {
			const { result } = renderHook(() => useGraphUtilities());

			await act(async () => {
				const trimResult = result.current.trimLeafNodes();

				expect(trimResult).toEqual({
					nodes: testNodes.slice(0, 2),
					edges: testEdges.slice(0, 1),
					removedCount: 1,
					operation: "trimLeafNodes",
				});
			});

			expect(mockGraphStore.setLoading).toHaveBeenCalledWith(true);
			expect(mockGraphStore.setError).toHaveBeenCalledWith(null);
			expect(mockGraphUtilitiesService.trimLeafNodes).toHaveBeenCalledWith(testNodes, testEdges);
			expect(mockGraphStore.setGraphData).toHaveBeenCalledWith(
				testNodes.slice(0, 2),
				testEdges.slice(0, 1)
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				"graph",
				"Applied graph utility: trimLeafNodes",
				expect.objectContaining({
					operation: "trimLeafNodes",
					nodesAfter: 2,
					edgesAfter: 1,
					removedCount: 1,
				})
			);
			expect(mockGraphStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should trim root nodes successfully", async () => {
			const { result } = renderHook(() => useGraphUtilities());

			await act(async () => {
				const trimResult = result.current.trimRootNodes();

				expect(trimResult).toEqual({
					nodes: testNodes.slice(1),
					edges: testEdges.slice(1),
					removedCount: 1,
					operation: "trimRootNodes",
				});
			});

			expect(mockGraphUtilitiesService.trimRootNodes).toHaveBeenCalledWith(testNodes, testEdges);
			expect(mockGraphStore.setGraphData).toHaveBeenCalled();
		});

		it("should trim degree 1 nodes successfully", async () => {
			const { result } = renderHook(() => useGraphUtilities());

			await act(async () => {
				const trimResult = result.current.trimDegree1Nodes();

				expect(trimResult.operation).toBe("trimDegree1Nodes");
			});

			expect(mockGraphUtilitiesService.trimDegree1Nodes).toHaveBeenCalledWith(testNodes, testEdges);
		});

		it("should remove isolated nodes successfully", async () => {
			const { result } = renderHook(() => useGraphUtilities());

			await act(async () => {
				const removeResult = result.current.removeIsolatedNodes();

				expect(removeResult.operation).toBe("removeIsolatedNodes");
			});

			expect(mockGraphUtilitiesService.removeIsolatedNodes).toHaveBeenCalledWith(testNodes, testEdges);
		});

		it("should filter by publication year successfully", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			const minYear = 2020;
			const maxYear = 2020;

			await act(async () => {
				const filterResult = result.current.filterByPublicationYear(minYear, maxYear);

				expect(filterResult.operation).toBe("filterByPublicationYear");
			});

			expect(mockGraphUtilitiesService.filterByPublicationYear).toHaveBeenCalledWith(
				testNodes,
				testEdges,
				minYear,
				maxYear
			);
		});

		it("should extract ego network successfully", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			const centerNodeId = "W1";
			const hops = 2;

			await act(async () => {
				const egoResult = result.current.extractEgoNetwork(centerNodeId, hops);

				expect(egoResult.operation).toBe("extractEgoNetwork");
			});

			expect(mockGraphUtilitiesService.extractEgoNetwork).toHaveBeenCalledWith(
				testNodes,
				testEdges,
				centerNodeId,
				hops
			);
		});

		it("should extract ego network with default hops", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			const centerNodeId = "W1";

			await act(async () => {
				result.current.extractEgoNetwork(centerNodeId);
			});

			expect(mockGraphUtilitiesService.extractEgoNetwork).toHaveBeenCalledWith(
				testNodes,
				testEdges,
				centerNodeId,
				2
			);
		});

		it("should get largest connected component successfully", async () => {
			const { result } = renderHook(() => useGraphUtilities());

			await act(async () => {
				const componentResult = result.current.getLargestConnectedComponent();

				expect(componentResult.operation).toBe("getLargestConnectedComponent");
			});

			expect(mockGraphUtilitiesService.getLargestConnectedComponent).toHaveBeenCalledWith(testNodes, testEdges);
		});
	});

	describe("error handling", () => {
		it("should handle trim leaf nodes error", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			const error = new Error("Service error");
			mockGraphUtilitiesService.trimLeafNodes.mockImplementation(() => {
				throw error;
			});

			await act(async () => {
				expect(() => result.current.trimLeafNodes()).toThrow("Service error");
			});

			expect(mockGraphStore.setLoading).toHaveBeenCalledWith(true);
			expect(mockGraphStore.setError).toHaveBeenCalledWith(null);
			expect(mockLogger.error).toHaveBeenCalledWith(
				"graph",
				"Trim leaf nodes failed",
				{ error: "Service error" }
			);
			expect(mockGraphStore.setError).toHaveBeenCalledWith("Failed to trim leaf nodes: Service error");
			expect(mockGraphStore.setLoading).toHaveBeenCalledWith(false);
		});

		it("should handle trim root nodes error", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			const error = new Error("Root trim error");
			mockGraphUtilitiesService.trimRootNodes.mockImplementation(() => {
				throw error;
			});

			await act(async () => {
				expect(() => result.current.trimRootNodes()).toThrow("Root trim error");
			});

			expect(mockLogger.error).toHaveBeenCalledWith(
				"graph",
				"Trim root nodes failed",
				{ error: "Root trim error" }
			);
			expect(mockGraphStore.setError).toHaveBeenCalledWith("Failed to trim root nodes: Root trim error");
		});

		it("should handle filter by publication year error", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			const error = new Error("Filter error");
			mockGraphUtilitiesService.filterByPublicationYear.mockImplementation(() => {
				throw error;
			});

			await act(async () => {
				expect(() => result.current.filterByPublicationYear(2020, 2021)).toThrow("Filter error");
			});

			expect(mockLogger.error).toHaveBeenCalledWith(
				"graph",
				"Filter by publication year failed",
				{
					error: "Filter error",
					minYear: 2020,
					maxYear: 2021,
				}
			);
		});

		it("should handle extract ego network error", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			const error = new Error("Ego network error");
			mockGraphUtilitiesService.extractEgoNetwork.mockImplementation(() => {
				throw error;
			});

			await act(async () => {
				expect(() => result.current.extractEgoNetwork("W1", 2)).toThrow("Ego network error");
			});

			expect(mockLogger.error).toHaveBeenCalledWith(
				"graph",
				"Extract ego network failed",
				{
					error: "Ego network error",
					centerNodeId: "W1",
					hops: 2,
				}
			);
		});

		it("should handle non-Error exceptions", async () => {
			const { result } = renderHook(() => useGraphUtilities());
			mockGraphUtilitiesService.trimLeafNodes.mockImplementation(() => {
				throw new Error("String error");
			});

			await act(async () => {
				expect(() => result.current.trimLeafNodes()).toThrow("String error");
			});

			expect(mockLogger.error).toHaveBeenCalledWith(
				"graph",
				"Trim leaf nodes failed",
				{ error: "String error" }
			);
			expect(mockGraphStore.setError).toHaveBeenCalledWith("Failed to trim leaf nodes: String error");
		});
	});

	describe("analysis utilities", () => {
		it("should find connected components", () => {
			const { result } = renderHook(() => useGraphUtilities());

			const components = result.current.findConnectedComponents();

			expect(components).toEqual([
				["W1", "A1"],
				["W2"],
			]);
			expect(mockGraphUtilitiesService.findConnectedComponents).toHaveBeenCalledWith(testNodes, testEdges);
		});

		it("should handle find connected components error", () => {
			const { result } = renderHook(() => useGraphUtilities());
			const error = new Error("Components error");
			mockGraphUtilitiesService.findConnectedComponents.mockImplementation(() => {
				throw error;
			});

			expect(() => result.current.findConnectedComponents()).toThrow("Components error");

			expect(mockLogger.error).toHaveBeenCalledWith(
				"graph",
				"Find connected components failed",
				{ error: "Components error" }
			);
		});

		it("should calculate graph statistics", () => {
			const { result } = renderHook(() => useGraphUtilities());

			const stats = result.current.getGraphStats();

			expect(stats).toEqual({
				totalNodes: 3,
				totalEdges: 2,
				connectedComponents: 2,
				largestComponentSize: 2,
				nodesByType: {
					works: 2,
					authors: 1,
				},
				edgesByType: {
					authored: 1,
					references: 1,
				},
			});
		});

		it("should handle empty graph statistics", async () => {
			// Mock empty graph
			mockGraphUtilitiesService.findConnectedComponents.mockReturnValue([]);

			const { useGraphStore } = await import("@/stores/graph-store");
			vi.mocked(useGraphStore).mockImplementation((selector: any) => {
				if (typeof selector === "function") {
					const state = {
						nodes: {},
						edges: {},
						setGraphData: mockGraphStore.setGraphData,
						setLoading: mockGraphStore.setLoading,
						setError: mockGraphStore.setError,
					};
					return selector(state);
				}
				return mockGraphStore;
			});

			const { result } = renderHook(() => useGraphUtilities());

			const stats = result.current.getGraphStats();

			expect(stats).toEqual({
				totalNodes: 0,
				totalEdges: 0,
				connectedComponents: 0,
				largestComponentSize: 0,
				nodesByType: {},
				edgesByType: {},
			});
		});
	});

	describe("reactive updates", () => {
		it("should update node and edge counts when store changes", async () => {
			const { result, rerender } = renderHook(() => useGraphUtilities());

			expect(result.current.nodeCount).toBe(3);
			expect(result.current.edgeCount).toBe(2);

			// Simulate store update
			const newNodesRecord: Record<string, GraphNode> = {};
			const newEdgesRecord: Record<string, GraphEdge> = {};

			testNodes.slice(0, 2).forEach(node => {
				newNodesRecord[node.id] = node;
			});
			testEdges.slice(0, 1).forEach(edge => {
				newEdgesRecord[edge.id] = edge;
			});

			const { useGraphStore } = await import("@/stores/graph-store");
			vi.mocked(useGraphStore).mockImplementation((selector: any) => {
				if (typeof selector === "function") {
					const state = {
						nodes: newNodesRecord,
						edges: newEdgesRecord,
						setGraphData: mockGraphStore.setGraphData,
						setLoading: mockGraphStore.setLoading,
						setError: mockGraphStore.setError,
					};
					return selector(state);
				}
				return mockGraphStore;
			});

			rerender();

			expect(result.current.nodeCount).toBe(2);
			expect(result.current.edgeCount).toBe(1);
		});
	});

	describe("function stability", () => {
		it("should maintain stable function references", () => {
			const { result, rerender } = renderHook(() => useGraphUtilities());

			const firstRender = {
				trimLeafNodes: result.current.trimLeafNodes,
				trimRootNodes: result.current.trimRootNodes,
				findConnectedComponents: result.current.findConnectedComponents,
				getGraphStats: result.current.getGraphStats,
			};

			rerender();

			expect(result.current.trimLeafNodes).toBe(firstRender.trimLeafNodes);
			expect(result.current.trimRootNodes).toBe(firstRender.trimRootNodes);
			expect(result.current.findConnectedComponents).toBe(firstRender.findConnectedComponents);
			expect(result.current.getGraphStats).toBe(firstRender.getGraphStats);
		});
	});
});