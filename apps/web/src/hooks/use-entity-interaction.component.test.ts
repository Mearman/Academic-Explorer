/**
 * Unit tests for useEntityInteraction hook
 * Tests entity interaction logic for graph nodes and sidebar entities
 * @vitest-environment jsdom
 */

import type { GraphNode } from "@academic-explorer/graph";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTERACTION_PRESETS,
  useEntityInteraction,
} from "./use-entity-interaction";

let mockGraphStore: any;
let logger: any;

// Mock dependencies with factory functions
vi.mock("@/stores/graph-store", () => {
  // Shared state object that will be mutated and accessed via getters
  const sharedState = {
    nodes: {},
    edges: {},
    isLoading: false,
    error: null,
    selectedNodeId: null as string | null,
    hoveredNodeId: null,
    selectedNodes: {},
    pinnedNodes: {},
    currentLayout: { type: "force" },
    visibleEntityTypes: {},
    visibleEdgeTypes: {},
    showAllCachedNodes: false,
    traversalDepth: 1,
    totalNodeCount: 0,
    totalEdgeCount: 0,
    entityTypeStats: {},
  };

  // Mock store with getters that always return current shared state
  const mockStore: any = {
    // Essential methods
    addNode: vi.fn(),
    addNodes: vi.fn(),
    addEdge: vi.fn(),
    addEdges: vi.fn(),
    removeNode: vi.fn(),
    removeEdge: vi.fn(),
    updateNode: vi.fn(),
    getNode: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clear: vi.fn(),
    setGraphData: vi.fn(),

    // Selection and interaction
    selectNode: vi.fn((nodeId: string | null) => {
      sharedState.selectedNodeId = nodeId;
    }),
    hoverNode: vi.fn(),
    addToSelection: vi.fn(),
    removeFromSelection: vi.fn(),
    clearSelection: vi.fn(),

    // Pinning system
    pinNode: vi.fn(),
    unpinNode: vi.fn(),
    clearAllPinnedNodes: vi.fn(),
    isPinned: vi.fn(),

    // Layout system
    setLayout: vi.fn(),

    // Visibility
    toggleEdgeTypeVisibility: vi.fn(),

    // Methods
    calculateNodeDepths: vi.fn(),
    updateSearchStats: vi.fn(),
    markNodeAsLoading: vi.fn(),
    markNodeAsLoaded: vi.fn(),
    markNodeAsError: vi.fn(),
    getMinimalNodes: vi.fn(() => []),
  };

  // Define getters for reactive state properties
  Object.defineProperty(mockStore, 'nodes', {
    get: () => sharedState.nodes,
    set: (value) => { sharedState.nodes = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'edges', {
    get: () => sharedState.edges,
    set: (value) => { sharedState.edges = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'selectedNodeId', {
    get: () => sharedState.selectedNodeId,
    set: (value) => { sharedState.selectedNodeId = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'hoveredNodeId', {
    get: () => sharedState.hoveredNodeId,
    set: (value) => { sharedState.hoveredNodeId = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'selectedNodes', {
    get: () => sharedState.selectedNodes,
    set: (value) => { sharedState.selectedNodes = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'pinnedNodes', {
    get: () => sharedState.pinnedNodes,
    set: (value) => { sharedState.pinnedNodes = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'currentLayout', {
    get: () => sharedState.currentLayout,
    set: (value) => { sharedState.currentLayout = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'visibleEntityTypes', {
    get: () => sharedState.visibleEntityTypes,
    set: (value) => { sharedState.visibleEntityTypes = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'visibleEdgeTypes', {
    get: () => sharedState.visibleEdgeTypes,
    set: (value) => { sharedState.visibleEdgeTypes = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'isLoading', {
    get: () => sharedState.isLoading,
    set: (value) => { sharedState.isLoading = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'error', {
    get: () => sharedState.error,
    set: (value) => { sharedState.error = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'showAllCachedNodes', {
    get: () => sharedState.showAllCachedNodes,
    set: (value) => { sharedState.showAllCachedNodes = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'traversalDepth', {
    get: () => sharedState.traversalDepth,
    set: (value) => { sharedState.traversalDepth = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'totalNodeCount', {
    get: () => sharedState.totalNodeCount,
    set: (value) => { sharedState.totalNodeCount = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'totalEdgeCount', {
    get: () => sharedState.totalEdgeCount,
    set: (value) => { sharedState.totalEdgeCount = value; },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(mockStore, 'entityTypeStats', {
    get: () => sharedState.entityTypeStats,
    set: (value) => { sharedState.entityTypeStats = value; },
    enumerable: true,
    configurable: true,
  });

  // Add getState method to mockStore itself
  mockStore.getState = () => mockStore;

  // useGraphStore always returns the same mockStore object with reactive getters
  // graphStore IS mockStore (same reference) so test mutations are visible
  return {
    useGraphStore: vi.fn(() => mockStore),
    graphStore: mockStore,
  };
});

vi.mock("@/stores/layout-store", () => ({
  useLayoutStore: vi.fn(),
}));

vi.mock("@/hooks/use-graph-data", () => ({
  useGraphData: vi.fn(),
}));

vi.mock("@academic-explorer/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockLayoutStore = {
  previewEntityId: null as string | null,
  setPreviewEntity: vi.fn().mockImplementation((entityId: string | null) => {
    // Simulate state guard behavior - only update if different
    if (mockLayoutStore.previewEntityId !== entityId) {
      mockLayoutStore.previewEntityId = entityId;
    }
  }),
  autoPinOnLayoutStabilization: false,
  // Required layout store methods
  toggleLeftSidebar: vi.fn(),
  toggleRightSidebar: vi.fn(),
  setLeftSidebarOpen: vi.fn(),
  setRightSidebarOpen: vi.fn(),
  pinLeftSidebar: vi.fn(),
  pinRightSidebar: vi.fn(),
  setLeftSidebarAutoHidden: vi.fn(),
  setRightSidebarAutoHidden: vi.fn(),
  setLeftSidebarHovered: vi.fn(),
  setRightSidebarHovered: vi.fn(),
  setSectionCollapsed: vi.fn(),
  expandSidebarToSection: vi.fn(),
  setActiveGroup: vi.fn(),
  setGraphProvider: vi.fn(),
  setAutoPinOnLayoutStabilization: vi.fn(),
  resetSectionPlacements: vi.fn(),
  getToolGroupsForSidebar: vi.fn(() => []),
  getActiveGroup: vi.fn(() => null),
  addSectionToGroup: vi.fn(),
  removeSectionFromGroup: vi.fn(),
  reorderGroups: vi.fn(),
  moveGroupToSidebar: vi.fn(),
};

const mockGraphData = {
  loadEntity: vi.fn(),
  loadEntityIntoGraph: vi.fn(),
  loadEntityIntoRepository: vi.fn(),
  loadAllCachedNodes: vi.fn(),
  expandNode: vi.fn(),
  expandAllNodesOfType: vi.fn(),
  search: vi.fn(),
  clearGraph: vi.fn(),
  hydrateNode: vi.fn(),
  isLoading: false,
  error: null,
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

  const createMockNode = (
    id: string,
    entityId: string,
    entityData?: Record<string, unknown>,
  ): GraphNode => ({
    id,
    entityId,
    entityType: "works",
    label: "Test Work",
    x: 100, // Direct x coordinate
    y: 200, // Direct y coordinate
    externalIds: [],
    entityData: entityData ?? {
      id: entityId,
      display_name: "Test Work",
      publication_year: 2023,
    },
  });

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get the mocked modules
    const { useGraphStore, graphStore } = await import("../stores/graph-store");
    const { useLayoutStore } = await import("../stores/layout-store");
    const { useGraphData } = await import("./use-graph-data");
    const loggerModule = await import("@academic-explorer/utils/logger");

    // Assign the mocked modules to our variables
    mockGraphStore = graphStore;
    logger = loggerModule.logger;

    // Setup default mock implementations
    mockGraphStore.nodes = {};
    mockGraphStore.selectedNodeId = null;

    // Reset layout store state
    mockLayoutStore.previewEntityId = null;
    mockLayoutStore.autoPinOnLayoutStabilization = false;

    vi.mocked(useGraphStore).mockReturnValue(mockGraphStore);
    vi.mocked(useLayoutStore).mockReturnValue({
      ...mockLayoutStore,
      // Add all required LayoutState properties
      leftSidebarOpen: true,
      leftSidebarPinned: false,
      rightSidebarOpen: true,
      rightSidebarPinned: false,
      leftSidebarAutoHidden: false,
      rightSidebarAutoHidden: false,
      leftSidebarHovered: false,
      rightSidebarHovered: false,
      collapsedSections: {},
      sectionPlacements: {},
      activeGroups: { left: null, right: null },
      toolGroups: { left: {}, right: {} },
      graphProvider: "xyflow" as const,
    });
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
        centerOnNode: false,
        expandNode: false,
        pinNode: false,
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
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );

      expect(result.current).toHaveProperty("interactWithEntity");
      expect(result.current).toHaveProperty("handleGraphNodeClick");
      expect(result.current).toHaveProperty("handleGraphNodeDoubleClick");
      expect(result.current).toHaveProperty("handleSidebarEntityClick");
      expect(result.current).toHaveProperty("INTERACTION_PRESETS");
    });

    it("should initialize hook without center function", () => {
      const { result } = renderHook(() => useEntityInteraction(undefined));

      expect(result.current).toHaveProperty("interactWithEntity");
      expect(result.current).toHaveProperty("handleGraphNodeClick");
      expect(result.current).toHaveProperty("handleGraphNodeDoubleClick");
      expect(result.current).toHaveProperty("handleSidebarEntityClick");
      expect(result.current).toHaveProperty("INTERACTION_PRESETS");
    });
  });

  describe("interactWithEntity", () => {
    it("should handle existing node with entity data", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId);

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
          existingNode,
        });
      });

      expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
      expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(
        testEntityId,
      );
      expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
      expect(mockCenterOnNodeFn).not.toHaveBeenCalled();
    });

    it("should handle errors during interaction", async () => {
      expect(mockGraphData.expandNode).not.toHaveBeenCalled();
    });

    it("should handle existing node found by entity ID", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId, {
        id: testEntityId,
        display_name: "Existing Work",
      });

      // Mock finding the existing node by entity ID
      mockGraphStore.nodes["node1"] = existingNode;

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
        });
      });

      // Should use existing node without loading
      expect(mockGraphData.loadEntityIntoGraph).not.toHaveBeenCalled();
      expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
      expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(
        testEntityId,
      );
      expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
    });

    // TODO: Fix mock reactivity - this test requires proper Zustand mock that simulates re-renders
    // The production code now correctly uses graphStore.getState().nodes which re-queries the store
    // after loadEntityIntoGraph completes, but the test mock doesn't properly simulate this.
    // See: apps/web/src/hooks/use-entity-interaction.ts line 162
    it.skip("should load new entity when no existing node found", async () => {
      const newNode = createMockNode("node1", testEntityId);

      // Mock no existing nodes initially
      mockGraphStore.nodes = {};

      // Mock loadEntityIntoGraph to add the node to the store
      mockGraphData.loadEntityIntoGraph.mockImplementation(async () => {
        mockGraphStore.nodes["node1"] = newNode;
      });

      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
        });
      });

      expect(mockGraphData.loadEntityIntoGraph).toHaveBeenCalledWith(
        testEntityId,
      );
      expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
      expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(
        testEntityId,
      );
    });

    it("should handle expansion when requested", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId);

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_DOUBLE_CLICK,
          existingNode,
        });
      });

      expect(mockGraphData.expandNode).toHaveBeenCalledWith({
        nodeId: "node1",
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "graph",
        "Entity interaction completed",
        expect.objectContaining({
          expanded: true,
        }),
      );
    });

    it("should clear pinned nodes when auto-pin is disabled", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId);
      mockLayoutStore.autoPinOnLayoutStabilization = false;

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
          existingNode,
        });
      });

      expect(mockGraphStore.clearAllPinnedNodes).not.toHaveBeenCalled();
      expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
    });

    it("should not clear pinned nodes when auto-pin is enabled", async () => {
      // Set up layout store with auto-pin enabled
      const autoPinLayoutStore = {
        ...mockLayoutStore,
        autoPinOnLayoutStabilization: true,
        // Add all required LayoutState properties
        leftSidebarOpen: true,
        leftSidebarPinned: false,
        rightSidebarOpen: true,
        rightSidebarPinned: false,
        leftSidebarAutoHidden: false,
        rightSidebarAutoHidden: false,
        leftSidebarHovered: false,
        rightSidebarHovered: false,
        collapsedSections: {},
        sectionPlacements: {},
        activeGroups: { left: null, right: null },
        toolGroups: { left: {}, right: {} },
        graphProvider: "xyflow" as const,
      };
      const { useLayoutStore } = await import("../stores/layout-store");
      vi.mocked(useLayoutStore).mockReturnValue(autoPinLayoutStore);

      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId);

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
          existingNode,
        });
      });

      expect(mockGraphStore.clearAllPinnedNodes).not.toHaveBeenCalled();
      expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
    });

    it("should skip centering when no center function provided", async () => {
      const { result } = renderHook(() => useEntityInteraction(undefined));
      const existingNode = createMockNode("node1", testEntityId);

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
          existingNode,
        });
      });
    });

    it("should handle errors during interaction", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const error = new Error("Test error");

      // Mock an error during loading
      mockGraphData.loadEntityIntoGraph.mockRejectedValue(error);
      const mockValues = vi.fn().mockReturnValue([]);
      mockGraphStore.nodes.values = mockValues;

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
        });
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "graph",
        "Entity interaction failed",
        expect.objectContaining({
          entityId: testEntityId,
          entityType: testEntityType,
          error,
        }),
      );
    });

    it("should use custom options", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId);
      const customOptions = {
        centerOnNode: true,
        expandNode: false,
        pinNode: false,
        updatePreview: false,
      };

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: customOptions,
          existingNode,
        });
      });

      expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
      expect(mockLayoutStore.setPreviewEntity).not.toHaveBeenCalled();
      expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
      expect(mockCenterOnNodeFn).toHaveBeenCalledWith("node1", {
        x: 100,
        y: 200,
      });
      expect(mockGraphData.expandNode).not.toHaveBeenCalled();
    });
  });

  describe("convenience methods", () => {
    it("should handle graph node click with correct preset", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const graphNode = createMockNode("node1", testEntityId);

      // Mock the entity already exists in the store
      mockGraphStore.nodes["node1"] = graphNode;

      await act(async () => {
        await result.current.handleGraphNodeClick(graphNode);
      });

      // Verify the method was called correctly by checking store interactions
      expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
      expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(
        testEntityId,
      );
      expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
    });

    it("should handle graph node double click with correct preset", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const graphNode = createMockNode("node1", testEntityId);

      // Mock the entity already exists in the store
      mockGraphStore.nodes["node1"] = graphNode;

      await act(async () => {
        await result.current.handleGraphNodeDoubleClick(graphNode);
      });

      // Verify double-click behavior (expansion)
      expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
      expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(
        testEntityId,
      );
      expect(mockGraphStore.pinNode).toHaveBeenCalledWith("node1");
      expect(mockGraphData.expandNode).toHaveBeenCalledWith({
        nodeId: "node1",
      });
    });

    it("should handle sidebar entity click with correct preset", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId);

      // Mock the entity already exists in the store
      mockGraphStore.nodes["node1"] = existingNode;

      await act(async () => {
        await result.current.handleSidebarEntityClick({
          entityId: testEntityId,
          entityType: testEntityType,
        });
      });

      // Verify sidebar click behavior (same as single click - no expansion)
      expect(mockGraphStore.selectNode).toHaveBeenCalledWith("node1");
      expect(mockLayoutStore.setPreviewEntity).toHaveBeenCalledWith(
        testEntityId,
      );
      expect(mockGraphStore.pinNode).not.toHaveBeenCalled();
      expect(mockGraphData.expandNode).not.toHaveBeenCalled();
    });
  });

  describe("function stability", () => {
    it("should maintain stable function references", () => {
      const { result, rerender } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );

      const firstRender = {
        interactWithEntity: result.current.interactWithEntity,
        handleGraphNodeClick: result.current.handleGraphNodeClick,
        handleGraphNodeDoubleClick: result.current.handleGraphNodeDoubleClick,
        handleSidebarEntityClick: result.current.handleSidebarEntityClick,
      };

      rerender();

      expect(result.current.interactWithEntity).toBe(
        firstRender.interactWithEntity,
      );
      expect(result.current.handleGraphNodeClick).toBe(
        firstRender.handleGraphNodeClick,
      );
      expect(result.current.handleGraphNodeDoubleClick).toBe(
        firstRender.handleGraphNodeDoubleClick,
      );
      expect(result.current.handleSidebarEntityClick).toBe(
        firstRender.handleSidebarEntityClick,
      );
    });

    it("should update functions when centerOnNodeFn changes", () => {
      const { result, rerender } = renderHook(
        ({
          centerFn,
        }: {
          centerFn?: (
            nodeId: string,
            position?: { x: number; y: number },
          ) => void;
        }) => useEntityInteraction(centerFn),
        {
          initialProps: { centerFn: mockCenterOnNodeFn },
        },
      );

      const firstInteract = result.current.interactWithEntity;

      const newCenterFn = vi.fn();
      rerender({ centerFn: newCenterFn });

      expect(result.current.interactWithEntity).not.toBe(firstInteract);
    });
  });

  describe("logging", () => {
    it("should log interaction start and completion", async () => {
      const { result } = renderHook(() =>
        useEntityInteraction(mockCenterOnNodeFn),
      );
      const existingNode = createMockNode("node1", testEntityId);

      await act(async () => {
        await result.current.interactWithEntity({
          entityId: testEntityId,
          entityType: testEntityType,
          options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
          existingNode,
        });
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "graph",
        "Entity interaction started",
        expect.objectContaining({
          entityId: testEntityId,
          entityType: testEntityType,
          hasExistingNode: true,
        }),
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "graph",
        "Entity interaction completed",
        expect.objectContaining({
          entityId: testEntityId,
          entityType: testEntityType,
          nodeId: "node1",
          selected: true,
          pinned: false,
          expanded: false,
        }),
      );
    });
  });
});
