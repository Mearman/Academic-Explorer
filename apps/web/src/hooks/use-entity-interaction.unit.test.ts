/**
 * Unit tests for useEntityInteraction hook
 * Tests entity interaction logic for graph nodes and sidebar entities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEntityInteraction, INTERACTION_PRESETS } from "./use-entity-interaction";
import type { GraphNode } from "@academic-explorer/graph";

// Mock dependencies with factory functions
vi.mock("@/stores/graph-store", () => ({
	useGraphStore: {
		getState: vi.fn(),
	},
}));

vi.mock("@/stores/layout-store", () => ({
	useLayoutStore: vi.fn(),
}));

vi.mock("@/hooks/use-graph-data", () => ({
	useGraphData: vi.fn(),
}));

vi.mock("@academic-explorer/shared-utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

const mockGraphStore = {
	nodes: {} as Record<string, any>,
	selectedNodeId: null as string | null,
	selectNode: vi.fn().mockImplementation((nodeId: string | null) => {
		// Simulate state guard behavior - only update if different
		if (mockGraphStore.selectedNodeId !== nodeId) {
			mockGraphStore.selectedNodeId = nodeId;
		}
	}),
	pinNode: vi.fn(),
	clearAllPinnedNodes: vi.fn(),
	getState: vi.fn(),
};

const mockLayoutStore = {
	previewEntityId: null as string | null,
	setPreviewEntity: vi.fn().mockImplementation((entityId: string | null) => {
		// Simulate state guard behavior - only update if different
		if (mockLayoutStore.previewEntityId !== entityId) {
			mockLayoutStore.previewEntityId = entityId;
		}
	}),
	autoPinOnLayoutStabilization: false,
};

const mockGraphData = {
	loadEntityIntoGraph: vi.fn(),
	expandNode: vi.fn(),
};

const mockLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

describe("useEntityInteraction", () => {
	const mockCenterOnNodeFn = vi.fn();
	const testEntityId = "W123456789";
	const testEntityType = "works";

	const createMockNode = (id: string, entityId: string, entityData?: Record<string, unknown>): GraphNode => ({
		id,
		entityId,
		type: "works",
		label: "Test Work",
		position: { x: 100, y: 200 },
		externalIds: [],
		entityData: entityData || {
			id: entityId,
			display_name: "Test Work",
			publication_year: 2023,
		},
	});

	beforeEach(async () => {
		// Reset all mocks
		vi.clearAllMocks();

		// Get the mocked modules
		const { useGraphStore } = await import("@/stores/graph-store");
		const { useLayoutStore } = await import("@/stores/layout-store");
		const { useGraphData } = await import("@/hooks/use-graph-data");
		const { logger } = await import("@academic-explorer/shared-utils/logger");

		// Setup default mock implementations
		mockGraphStore.nodes = {};
		mockGraphStore.selectedNodeId = null;
		mockGraphStore.getState.mockReturnValue(mockGraphStore);

		// Reset layout store state
		mockLayoutStore.previewEntityId = null;

		vi.mocked(useGraphStore.getState).mockReturnValue(mockGraphStore);
		vi.mocked(useLayoutStore).mockReturnValue(mockLayoutStore);
		vi.mocked(useGraphData).mockReturnValue(mockGraphData);

		// Reset and setup mock functions
		mockGraphData.loadEntityIntoGraph.mockResolvedValue(undefined);
		mockGraphData.expandNode.mockResolvedValue(undefined);

		// Setup logger mocks
		vi.mocked(logger.debug).mockImplementation(mockLogger.debug);
		vi.mocked(logger.warn).mockImplementation(mockLogger.warn);
		vi.mocked(logger.error).mockImplementation(mockLogger.error);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("INTERACTION_PRESETS", () => {
		it("should export correct presets for different interaction types", () => {
			expect(INTERACTION_PRESETS.GRAPH_NODE_CLICK).toEqual({
				centerOnNode: true,
				expandNode: false,
				pinNode: true,
				updatePreview: true,
			});

			expect(INTERACTION_PRESETS.GRAPH_NODE_DOUBLE_CLICK).toEqual({
				centerOnNode: true,
				expandNode: true,
				pinNode: true,
				updatePreview: true,
			});
		});
	});

	describe("hook initialization", () => {
		it("should initialize hook with center function", () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));

			expect(result.current).toHaveProperty("interactWithEntity");
			expect(result.current).toHaveProperty("handleGraphNodeClick");
			expect(result.current).toHaveProperty("handleGraphNodeDoubleClick");
			expect(result.current).toHaveProperty("handleSidebarEntityClick");
			expect(result.current).toHaveProperty("INTERACTION_PRESETS");
		});

		it("should initialize hook without center function", () => {
			const { result } = renderHook(() => useEntityInteraction());

			expect(result.current).toHaveProperty("interactWithEntity");
			expect(result.current).toHaveProperty("handleGraphNodeClick");
			expect(result.current).toHaveProperty("handleGraphNodeDoubleClick");
			expect(result.current).toHaveProperty("handleSidebarEntityClick");
		});
	});

	describe("interactWithEntity", () => {
		it("should handle existing node with entity data", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId);

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK,
					existingNode
				);
			});

			expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
			expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(testEntityId);
			expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
			expect(mockCenterOnNodeFn).toHaveBeenCalledWith("node1", { x: 100, y: 200 });
			expect(mockGraphData.expandNode).not.toHaveBeenCalled();
		});

		it("should handle existing node found by entity ID", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId, {
				id: testEntityId,
				display_name: "Existing Work",
			});

			// Mock finding the existing node by entity ID
			mockGraphStore.nodes["node1"] = existingNode;

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK
				);
			});

			// Should use existing node without loading
			expect(mockGraphData.loadEntityIntoGraph).not.toHaveBeenCalled();
			expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
			expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(testEntityId);
			expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
		});

		it("should load new entity when no existing node found", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const newNode = createMockNode("node1", testEntityId);

			// Mock no existing nodes initially
			mockGraphStore.nodes = {};

			// Mock loadEntityIntoGraph to add the node to the store
			mockGraphData.loadEntityIntoGraph.mockImplementation(async () => {
				mockGraphStore.nodes["node1"] = newNode;
			});

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK
				);
			});

			expect(mockGraphData.loadEntityIntoGraph).toHaveBeenCalledWith(testEntityId);
			expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
			expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(testEntityId);
		});

		it("should handle expansion when requested", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId);

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_DOUBLE_CLICK,
					existingNode
				);
			});

			expect(mockGraphData.expandNode).toHaveBeenCalledWith("node1");
			expect(mockLogger.debug).toHaveBeenCalledWith(
				"graph",
				"Entity interaction completed",
				expect.objectContaining({
					expanded: true,
				})
			);
		});

		it("should clear pinned nodes when auto-pin is disabled", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId);
			mockLayoutStore.autoPinOnLayoutStabilization = false;

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK,
					existingNode
				);
			});

			expect(mockGraphStore.clearAllPinnedNodes).toHaveBeenCalled();
			expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
		});

		it("should not clear pinned nodes when auto-pin is enabled", async () => {
			// Set up layout store with auto-pin enabled
			const autoPinLayoutStore = {
				...mockLayoutStore,
				autoPinOnLayoutStabilization: true,
			};
			const { useLayoutStore } = await import("@/stores/layout-store");
			vi.mocked(useLayoutStore).mockReturnValue(autoPinLayoutStore);

			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId);

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK,
					existingNode
				);
			});

			expect(mockGraphStore.clearAllPinnedNodes).not.toHaveBeenCalled();
			expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
		});

		it("should skip centering when no center function provided", async () => {
			const { result } = renderHook(() => useEntityInteraction());
			const existingNode = createMockNode("node1", testEntityId);

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK,
					existingNode
				);
			});

			expect(mockCenterOnNodeFn).not.toHaveBeenCalled();
		});

		it("should handle missing target node gracefully", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));

			// Mock no existing nodes and failed loading
			const mockValues = vi.fn().mockReturnValue([]);
			mockGraphStore.nodes.values = mockValues;

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK
				);
			});

			expect(mockLogger.warn).toHaveBeenCalledWith(
				"graph",
				"Entity interaction failed - no target node found",
				{
					entityId: testEntityId,
					entityType: testEntityType,
				}
			);
			expect(mockGraphStore.selectNode).not.toHaveBeenCalled();
		});

		it("should handle errors during interaction", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const error = new Error("Test error");

			// Mock an error during loading
			mockGraphData.loadEntityIntoGraph.mockRejectedValue(error);
			const mockValues = vi.fn().mockReturnValue([]);
			mockGraphStore.nodes.values = mockValues;

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK
				);
			});

			expect(mockLogger.error).toHaveBeenCalledWith(
				"graph",
				"Entity interaction failed",
				expect.objectContaining({
					entityId: testEntityId,
					entityType: testEntityType,
					error,
				})
			);
		});

		it("should use custom options", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId);
			const customOptions = {
				centerOnNode: false,
				expandNode: false,
				pinNode: false,
				updatePreview: false,
			};

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					customOptions,
					existingNode
				);
			});

			expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
			expect(mockLayoutStore.setPreviewEntity).not.toHaveBeenCalled();
			expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
			expect(mockCenterOnNodeFn).not.toHaveBeenCalled();
			expect(mockGraphData.expandNode).not.toHaveBeenCalled();
		});
	});

	describe("convenience methods", () => {
		it("should handle graph node click with correct preset", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const graphNode = createMockNode("node1", testEntityId);

			// Mock the entity already exists in the store
			mockGraphStore.nodes["node1"] = graphNode;

			await act(async () => {
				await result.current.handleGraphNodeClick(graphNode);
			});

			// Verify the method was called correctly by checking store interactions
			expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
			expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(testEntityId);
			expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
		});

		it("should handle graph node double click with correct preset", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const graphNode = createMockNode("node1", testEntityId);

			// Mock the entity already exists in the store
			mockGraphStore.nodes["node1"] = graphNode;

			await act(async () => {
				await result.current.handleGraphNodeDoubleClick(graphNode);
			});

			// Verify double-click behavior (expansion)
			expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
			expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(testEntityId);
			expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
			expect(mockGraphData.expandNode).toHaveBeenCalledWith("node1");
		});

		it("should handle sidebar entity click with correct preset", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId);

			// Mock the entity already exists in the store
			mockGraphStore.nodes["node1"] = existingNode;

			await act(async () => {
				await result.current.handleSidebarEntityClick(testEntityId, testEntityType);
			});

			// Verify sidebar click behavior (same as single click - no expansion)
			expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
			expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(testEntityId);
			expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
			expect(mockGraphData.expandNode).not.toHaveBeenCalled();
		});
	});

	describe("function stability", () => {
		it("should maintain stable function references", () => {
			const { result, rerender } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));

			const firstRender = {
				interactWithEntity: result.current.interactWithEntity,
				handleGraphNodeClick: result.current.handleGraphNodeClick,
				handleGraphNodeDoubleClick: result.current.handleGraphNodeDoubleClick,
				handleSidebarEntityClick: result.current.handleSidebarEntityClick,
			};

			rerender();

			expect(result.current.interactWithEntity).toBe(firstRender.interactWithEntity);
			expect(result.current.handleGraphNodeClick).toBe(firstRender.handleGraphNodeClick);
			expect(result.current.handleGraphNodeDoubleClick).toBe(firstRender.handleGraphNodeDoubleClick);
			expect(result.current.handleSidebarEntityClick).toBe(firstRender.handleSidebarEntityClick);
		});

		it("should update functions when centerOnNodeFn changes", () => {
			const { result, rerender } = renderHook(
				({ centerFn }: { centerFn?: (nodeId: string, position?: { x: number; y: number }) => void }) =>
					useEntityInteraction(centerFn),
				{
					initialProps: { centerFn: mockCenterOnNodeFn },
				}
			);

			const firstInteract = result.current.interactWithEntity;

			const newCenterFn = vi.fn();
			rerender({ centerFn: newCenterFn });

			expect(result.current.interactWithEntity).not.toBe(firstInteract);
		});
	});

	describe("logging", () => {
		it("should log interaction start and completion", async () => {
			const { result } = renderHook(() => useEntityInteraction(mockCenterOnNodeFn));
			const existingNode = createMockNode("node1", testEntityId);

			await act(async () => {
				await result.current.interactWithEntity(
					testEntityId,
					testEntityType,
					INTERACTION_PRESETS.GRAPH_NODE_CLICK,
					existingNode
				);
			});

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"graph",
				"Entity interaction started",
				expect.objectContaining({
					entityId: testEntityId,
					entityType: testEntityType,
					hasExistingNode: true,
				})
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"graph",
				"Entity interaction completed",
				expect.objectContaining({
					entityId: testEntityId,
					entityType: testEntityType,
					nodeId: "node1",
					selected: true,
					pinned: true,
					expanded: false,
				})
			);
		});
	});
});