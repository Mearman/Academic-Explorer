/**
 * @vitest-environment jsdom
 */

/**
 * Comprehensive unit tests for graph-store.ts
 * Testing provider-agnostic graph state management with Zustand + Immer
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGraphStore, graphStore, graphActions } from "./graph-store";
import type {
  GraphNode,
  GraphEdge,
  GraphProvider,
  GraphLayout,
  EntityType,
} from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";
import { DEFAULT_FORCE_PARAMS } from "@academic-explorer/graph";

// Mock localStorage for persistence testing
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    // Test helper to reset the internal store
    _resetStore: () => {
      store = {};
    },
  };
};

let localStorageMock: ReturnType<typeof createLocalStorageMock>;

Object.defineProperty(window, "localStorage", {
  get: () => localStorageMock,
  configurable: true,
});

// Mock graph provider
const createMockProvider = (): GraphProvider => ({
  // Lifecycle
  initialize: vi.fn(),
  destroy: vi.fn(),

  // Data management
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  addNode: vi.fn(),
  addEdge: vi.fn(),
  removeNode: vi.fn(),
  removeEdge: vi.fn(),
  clear: vi.fn(),

  // Layout
  applyLayout: vi.fn(),
  fitView: vi.fn(),
  center: vi.fn(),

  // Interaction
  setEvents: vi.fn(),
  highlightNode: vi.fn(),
  highlightPath: vi.fn(),
  clearHighlights: vi.fn(),

  // State
  getSnapshot: vi.fn(),
  loadSnapshot: vi.fn(),
});

// Test data fixtures
const createTestNode = (
  id: string,
  entityType: EntityType = "works",
): GraphNode => ({
  id,
  entityType: entityType,
  label: `Test ${entityType} ${id}`,
  entityId: id,
  x: 0,
  y: 0,
  externalIds: [],
  entityData: {
    id,
    type: entityType,
    label: `Test ${entityType} ${id}`,
    displayName: `Test ${entityType} ${id}`,
    url: `https://openalex.org/${id}`,
  },
  metadata: {
    directlyVisited: false,
    expanded: false,
  },
});

const createTestEdge = (
  id: string,
  source: string,
  target: string,
  relationType: RelationType = RelationType.AUTHORED,
): GraphEdge => ({
  id,
  source,
  target,
  type: relationType,
  label: `${relationType} relationship`,
  metadata: {
    relationship: relationType,
  },
});

describe("GraphStore", () => {
  beforeEach(() => {
    // Create fresh localStorage mock for each test
    localStorageMock = createLocalStorageMock();

    // Clear all mocks
    vi.clearAllMocks();

    // Reset store to initial state using store methods
    graphActions.clear();
    graphActions.clearAllPinnedNodes();
    graphActions.setError(null);
    graphActions.setLoading(false);
    graphActions.setShowAllCachedNodes(false);
    graphActions.setTraversalDepth(2);
    graphActions.resetEntityTypesToDefaults();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = graphStore.getState();

      expect(Object.keys(state.nodes).length).toBe(0);
      expect(Object.keys(state.edges).length).toBe(0);
      expect(state.selectedNodeId).toBeNull();
      expect(Object.keys(state.pinnedNodes).length).toBe(0);
      expect(state.showAllCachedNodes).toBe(false);
      expect(state.traversalDepth).toBe(2); // Default from implementation
      expect(state.provider).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(Object.keys(state.visibleEntityTypes).length).toBe(9);
      expect(Object.keys(state.visibleEdgeTypes).length).toBe(15); // Updated count
    });

    it("should have correct default visible entity types", () => {
      const state = useGraphStore();
      const expectedTypes: EntityType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "topics",
        "concepts",
        "publishers",
        "funders",
        "keywords",
      ];

      expectedTypes.forEach((type) => {
        expect(state.visibleEntityTypes[type]).toBe(true);
      });
    });

    it("should have correct default visible edge types", () => {
      const state = useGraphStore();
      const expectedTypes: RelationType[] = [
        RelationType.AUTHORED,
        RelationType.AFFILIATED,
        RelationType.PUBLISHED_IN,
        RelationType.FUNDED_BY,
        RelationType.RELATED_TO,
        RelationType.REFERENCES,
      ];

      expectedTypes.forEach((type) => {
        expect(state.visibleEdgeTypes[type]).toBe(true);
      });
    });

    it("should have correct default layout configuration", () => {
      const state = useGraphStore();

      expect(state.currentLayout.type).toBe("force");
      expect(state.currentLayout.options!.iterations).toBe(100);
      expect(state.currentLayout.options!.strength).toBe(-200);
      expect(state.currentLayout.options!.distance).toBe(150);
    });
  });

  describe("Provider Management", () => {
    it("should set provider and transfer existing data", () => {
      const mockProvider = createMockProvider();

      // Add some test data first
      const testNode = createTestNode("N1");
      const testEdge = createTestEdge("E1", "N1", "N2");

      const { addNode, addEdge, setProvider } = useGraphStore();
      addNode(testNode);
      addEdge(testEdge);

      // Set provider
      setProvider(mockProvider);

      const state = useGraphStore();
      expect(state.provider).toBe(mockProvider);
      expect(mockProvider.setNodes).toHaveBeenCalledWith([testNode]);
      expect(mockProvider.setEdges).toHaveBeenCalledWith([testEdge]);
    });

    it("should set provider type", () => {
      const { setProviderType } = useGraphStore();

      setProviderType("d3-force");

      const state = useGraphStore();
      expect(state.providerType).toBe("d3-force");
    });
  });

  describe("Layout Management", () => {
    it("should set layout and apply to provider", () => {
      const mockProvider = createMockProvider();
      const { setProvider, setLayout } = useGraphStore();
      setProvider(mockProvider);

      const newLayout: GraphLayout = {
        type: "hierarchical",
        options: {
          seed: 123,
          iterations: 500,
          linkDistance: DEFAULT_FORCE_PARAMS.linkDistance,
          linkStrength: 1.0,
          chargeStrength: -400,
          centerStrength: 0.1,
          collisionRadius: 50,
          velocityDecay: 0.3,
          alpha: 0.8,
          alphaDecay: 0.02,
          collisionStrength: 0.9,
        },
      };

      setLayout(newLayout);

      const state = useGraphStore();
      expect(state.currentLayout).toEqual(newLayout);
      expect(mockProvider.applyLayout).toHaveBeenCalledWith(newLayout);
    });

    it("should apply current layout to provider", () => {
      const mockProvider = createMockProvider();
      const { setProvider, applyCurrentLayout } = useGraphStore();
      setProvider(mockProvider);

      applyCurrentLayout();

      const state = useGraphStore();
      expect(mockProvider.applyLayout).toHaveBeenCalledWith(
        state.currentLayout,
      );
    });

    it("should handle layout operations when no provider is set", () => {
      const { setLayout, applyCurrentLayout } = useGraphStore();

      const newLayout: GraphLayout = {
        type: "hierarchical",
        options: {
          seed: 123,
          iterations: 500,
          linkDistance: DEFAULT_FORCE_PARAMS.linkDistance,
          linkStrength: 1.0,
          chargeStrength: -400,
          centerStrength: 0.1,
          collisionRadius: 50,
          velocityDecay: 0.3,
          alpha: 0.8,
          alphaDecay: 0.02,
          collisionStrength: 0.9,
        },
      };

      // Should not throw without provider
      expect(() => {
        setLayout(newLayout);
        applyCurrentLayout();
      }).not.toThrow();

      const state = useGraphStore();
      expect(state.currentLayout).toEqual(newLayout);
    });
  });

  describe("Node Management", () => {
    it("should add single node", () => {
      const mockProvider = createMockProvider();
      const { setProvider, addNode } = useGraphStore();
      setProvider(mockProvider);

      const testNode = createTestNode("N1", "authors");
      addNode(testNode);

      const state = useGraphStore();
      expect(state.nodes["N1"]).toEqual(testNode);
      expect(Object.keys(state.nodes).length).toBe(1);
      expect(mockProvider.addNode).toHaveBeenCalledWith(testNode);
    });

    it("should add multiple nodes", () => {
      const mockProvider = createMockProvider();
      const { setProvider, addNodes } = useGraphStore();
      setProvider(mockProvider);

      const testNodes = [
        createTestNode("N1", "authors"),
        createTestNode("N2", "works"),
        createTestNode("N3", "institutions"),
      ];

      addNodes(testNodes);

      const state = useGraphStore();
      expect(Object.keys(state.nodes).length).toBe(3);
      testNodes.forEach((node) => {
        expect(state.nodes[node.id]).toEqual(node);
        expect(mockProvider.addNode).toHaveBeenCalledWith(node);
      });
    });

    it("should add nodes without provider", () => {
      const { addNode } = useGraphStore();
      const testNode = createTestNode("N1");

      expect(() => {
        addNode(testNode);
      }).not.toThrow();

      const state = useGraphStore();
      expect(state.nodes["N1"]).toEqual(testNode);
    });

    it("should remove node and connected edges", () => {
      const mockProvider = createMockProvider();
      const {
        setProvider,
        addNodes,
        addEdges,
        selectNode,
        hoverNode,
        addToSelection,
        removeNode,
      } = useGraphStore();
      setProvider(mockProvider);

      // Add nodes and edges
      const nodes = [
        createTestNode("N1"),
        createTestNode("N2"),
        createTestNode("N3"),
      ];
      const edges = [
        createTestEdge("E1", "N1", "N2"),
        createTestEdge("E2", "N2", "N3"),
        createTestEdge("E3", "N1", "N3"),
      ];

      addNodes(nodes);
      addEdges(edges);

      // Select and hover the node to be removed
      selectNode("N1");
      hoverNode("N1");
      addToSelection("N1");

      // Remove node
      removeNode("N1");

      const state = useGraphStore();
      expect(state.nodes["N1"]).toBeUndefined();
      expect(Object.keys(state.nodes).length).toBe(2);
      expect(state.edges["E1"]).toBeUndefined(); // Connected edge removed
      expect(state.edges["E3"]).toBeUndefined(); // Connected edge removed
      expect(state.edges["E2"]).toBeDefined(); // Unconnected edge remains
      expect(Object.keys(state.edges).length).toBe(1);

      // Selection and hover should be cleared
      expect(state.selectedNodeId).toBeNull();
      expect(state.hoveredNodeId).toBeNull();
      expect(state.selectedNodes["N1"]).toBeFalsy();

      expect(mockProvider.removeNode).toHaveBeenCalledWith("N1");
      expect(mockProvider.removeEdge).toHaveBeenCalledWith("E1");
      expect(mockProvider.removeEdge).toHaveBeenCalledWith("E3");
    });

    it("should update existing node", () => {
      const { addNode, updateNode } = useGraphStore();
      const testNode = createTestNode("N1");
      addNode(testNode);

      const updates = {
        entityData: { ...testNode.entityData, label: "Updated Label" },
        metadata: { ...testNode.metadata, directlyVisited: true },
      };

      updateNode("N1", updates);

      const state = useGraphStore();
      const updatedNode = state.nodes["N1"];
      expect(updatedNode.entityData?.label).toBe("Updated Label");
      expect(updatedNode.metadata?.directlyVisited).toBe(true);
    });

    it("should handle update of non-existent node", () => {
      const { updateNode } = useGraphStore();

      expect(() => {
        updateNode("NON_EXISTENT", { metadata: { directlyVisited: true } });
      }).not.toThrow();

      const state = useGraphStore();
      // updateNode creates a node with the updates even if it didn't exist before
      expect(Object.keys(state.nodes).length).toBe(1);
    });

    it("should get existing node", () => {
      const { addNode, getNode } = useGraphStore();
      const testNode = createTestNode("N1");
      addNode(testNode);

      const retrieved = getNode("N1");
      expect(retrieved).toEqual(testNode);
    });

    it("should return undefined for non-existent node", () => {
      const { getNode } = useGraphStore();

      const retrieved = getNode("NON_EXISTENT");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("Selection Management", () => {
    it("should select node", () => {
      const { selectNode } = useGraphStore();

      selectNode("N1");
      expect(useGraphStore().selectedNodeId).toBe("N1");

      selectNode("N2");
      expect(useGraphStore().selectedNodeId).toBe("N2");

      selectNode(null);
      expect(useGraphStore().selectedNodeId).toBeNull();
    });

    it("should hover node", () => {
      const { hoverNode } = useGraphStore();

      hoverNode("N1");
      expect(useGraphStore().hoveredNodeId).toBe("N1");

      hoverNode("N2");
      expect(useGraphStore().hoveredNodeId).toBe("N2");

      hoverNode(null);
      expect(useGraphStore().hoveredNodeId).toBeNull();
    });

    it("should add to selection", () => {
      const { addToSelection } = useGraphStore();

      addToSelection("N1");
      addToSelection("N2");
      addToSelection("N3");

      const state = useGraphStore();
      expect(state.selectedNodes["N1"]).toBeTruthy();
      expect(state.selectedNodes["N2"]).toBeTruthy();
      expect(state.selectedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.selectedNodes).length).toBe(3);
    });

    it("should remove from selection", () => {
      const { addToSelection, removeFromSelection } = useGraphStore();

      addToSelection("N1");
      addToSelection("N2");
      addToSelection("N3");

      removeFromSelection("N2");

      const state = useGraphStore();
      expect(state.selectedNodes["N1"]).toBeTruthy();
      expect(state.selectedNodes["N2"]).toBeFalsy();
      expect(state.selectedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.selectedNodes).length).toBe(2);
    });

    it("should clear all selection", () => {
      const { selectNode, addToSelection, clearSelection } = useGraphStore();

      selectNode("N1");
      addToSelection("N1");
      addToSelection("N2");
      addToSelection("N3");

      clearSelection();

      const state = useGraphStore();
      expect(state.selectedNodeId).toBeNull();
      expect(Object.keys(state.selectedNodes).length).toBe(0);
    });
  });

  describe("Multi-Pin Node Management", () => {
    it("should pin node", () => {
      const { pinNode } = useGraphStore();

      pinNode("N1");

      const state = useGraphStore();
      expect(state.pinnedNodes["N1"]).toBeTruthy();
      expect(Object.keys(state.pinnedNodes).length).toBe(1);
    });

    it("should pin multiple nodes", () => {
      const { pinNode } = useGraphStore();

      pinNode("N1");
      pinNode("N2");
      pinNode("N3");

      const state = useGraphStore();
      expect(state.pinnedNodes["N1"]).toBeTruthy();
      expect(state.pinnedNodes["N2"]).toBeTruthy();
      expect(state.pinnedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.pinnedNodes).length).toBe(3);
    });

    it("should unpin node", () => {
      const { pinNode, unpinNode } = useGraphStore();

      pinNode("N1");
      pinNode("N2");
      pinNode("N3");

      unpinNode("N2");

      const state = useGraphStore();
      expect(state.pinnedNodes["N1"]).toBeTruthy();
      expect(state.pinnedNodes["N2"]).toBeFalsy();
      expect(state.pinnedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.pinnedNodes).length).toBe(2);
    });

    it("should update legacy pin when unpinning first node", () => {
      const { pinNode, unpinNode } = useGraphStore();

      pinNode("N1");
      pinNode("N2");
      pinNode("N3");

      unpinNode("N1");

      const state = useGraphStore();
      expect(state.pinnedNodes["N1"]).toBeFalsy();
    });

    it("should clear legacy pin when unpinning last node", () => {
      const { pinNode, unpinNode } = useGraphStore();

      pinNode("N1");
      unpinNode("N1");

      const state = useGraphStore();
      expect(Object.keys(state.pinnedNodes).length).toBe(0);
    });

    it("should clear all pinned nodes", () => {
      const { pinNode, clearAllPinnedNodes } = useGraphStore();

      pinNode("N1");
      pinNode("N2");
      pinNode("N3");

      clearAllPinnedNodes();

      const state = useGraphStore();
      expect(Object.keys(state.pinnedNodes).length).toBe(0);
    });

    it("should check if node is pinned", () => {
      const { pinNode, isPinned } = useGraphStore();

      pinNode("N1");

      expect(isPinned("N1")).toBe(true);
      expect(isPinned("N2")).toBe(false);
    });
  });

  describe("Loading States", () => {
    it("should set loading state", () => {
      const { setLoading } = useGraphStore();

      expect(useGraphStore().isLoading).toBe(false);

      setLoading(true);
      expect(useGraphStore().isLoading).toBe(true);

      setLoading(false);
      expect(useGraphStore().isLoading).toBe(false);
    });

    it("should set error state", () => {
      const { setError } = useGraphStore();

      expect(useGraphStore().error).toBeNull();

      setError("Test error message");
      expect(useGraphStore().error).toBe("Test error message");

      setError(null);
      expect(useGraphStore().error).toBeNull();
    });
  });

  describe("Entity Type Management", () => {
    it("should toggle entity type visibility", () => {
      const { toggleEntityTypeVisibility } = useGraphStore();

      expect(useGraphStore().visibleEntityTypes["works"]).toBe(true);

      toggleEntityTypeVisibility("works");
      expect(useGraphStore().visibleEntityTypes["works"]).toBe(false);

      toggleEntityTypeVisibility("works");
      expect(useGraphStore().visibleEntityTypes["works"]).toBe(true);
    });

    it("should set entity type visibility explicitly", () => {
      const { setEntityTypeVisibility } = useGraphStore();

      setEntityTypeVisibility("authors", false);
      expect(useGraphStore().visibleEntityTypes["authors"]).toBe(false);

      setEntityTypeVisibility("authors", true);
      expect(useGraphStore().visibleEntityTypes["authors"]).toBe(true);

      setEntityTypeVisibility("new_type" as EntityType, true);
      expect(useGraphStore().visibleEntityTypes["new_type" as EntityType]).toBe(
        true,
      );
    });

    it("should set all entity types visible", () => {
      const { setAllEntityTypesVisible } = useGraphStore();

      // Clear all first - this replaces current object entirely
      setAllEntityTypesVisible(false);
      const falseState = useGraphStore();
      expect(Object.keys(falseState.visibleEntityTypes).length).toBe(9); // concepts, topics, keywords, works, authors, sources, institutions, publishers, funders
      // When false, all values should be false (the key exists but value is false)
      expect(falseState.visibleEntityTypes["works"]).toBe(false);
      expect(falseState.visibleEntityTypes["authors"]).toBe(false);
      expect(falseState.visibleEntityTypes["concepts"]).toBe(false);

      // Set all visible - this creates a new object with all true
      setAllEntityTypesVisible(true);
      const state = useGraphStore();
      expect(Object.keys(state.visibleEntityTypes).length).toBe(9); // same 9 types
      expect(state.visibleEntityTypes["works"]).toBe(true);
      expect(state.visibleEntityTypes["authors"]).toBe(true);
      expect(state.visibleEntityTypes["sources"]).toBe(true);
    });

    it("should update search stats", () => {
      const { updateSearchStats } = useGraphStore();

      const stats = {
        works: 100,
        authors: 50,
        sources: 25,
      } as Record<EntityType, number>;

      updateSearchStats(stats);

      const state = useGraphStore();
      expect(state.lastSearchStats["works"]).toBe(100);
      expect(state.lastSearchStats["authors"]).toBe(50);
      expect(state.lastSearchStats["sources"]).toBe(25);
    });

    it("should get entity type stats", () => {
      const {
        addNodes,
        setEntityTypeVisibility,
        updateSearchStats,
        getEntityTypeStats,
      } = useGraphStore();

      // Add nodes of different types
      const nodes = [
        createTestNode("W1", "works"),
        createTestNode("W2", "works"),
        createTestNode("A1", "authors"),
        createTestNode("S1", "sources"),
        createTestNode("S2", "sources"),
      ];
      addNodes(nodes);

      // Set some types invisible
      setEntityTypeVisibility("sources", false);

      // Set search stats
      const searchStats = {
        works: 200,
        authors: 150,
      } as Record<EntityType, number>;
      updateSearchStats(searchStats);

      const stats = getEntityTypeStats();

      expect(stats.total["works"]).toBe(2);
      expect(stats.total["authors"]).toBe(1);
      expect(stats.total["sources"]).toBe(2);

      expect(stats.visible["works"]).toBe(2);
      expect(stats.visible["authors"]).toBe(1);
      expect(stats.visible["sources"]).toBe(0); // Not visible but still present with count 0

      expect(stats.searchResults["works"]).toBe(200);
      expect(stats.searchResults["authors"]).toBe(150);
    });

    it("should get visible nodes", () => {
      const { addNodes, setEntityTypeVisibility, getVisibleNodes } =
        useGraphStore();

      const nodes = [
        createTestNode("W1", "works"),
        createTestNode("A1", "authors"),
        createTestNode("S1", "sources"),
      ];
      addNodes(nodes);

      setEntityTypeVisibility("sources", false);

      const visibleNodes = getVisibleNodes();

      expect(visibleNodes).toHaveLength(2);
      expect(visibleNodes.map((n) => n.id).sort()).toEqual(["A1", "W1"]);
    });
  });

  describe("Cache Visibility and Traversal Control", () => {
    it("should set show all cached nodes", () => {
      const { setShowAllCachedNodes } = useGraphStore();

      expect(useGraphStore().showAllCachedNodes).toBe(false);

      setShowAllCachedNodes(true);
      expect(useGraphStore().showAllCachedNodes).toBe(true);

      setShowAllCachedNodes(false);
      expect(useGraphStore().showAllCachedNodes).toBe(false);
    });

    it("should set traversal depth with minimum validation", () => {
      const { setTraversalDepth } = useGraphStore();

      setTraversalDepth(5);
      expect(useGraphStore().traversalDepth).toBe(5);

      setTraversalDepth(0); // Should be clamped to 1
      expect(useGraphStore().traversalDepth).toBe(1);

      setTraversalDepth(-5); // Should be clamped to 1
      expect(useGraphStore().traversalDepth).toBe(1);

      setTraversalDepth(Infinity);
      expect(useGraphStore().traversalDepth).toBe(Infinity);
    });

    it("should calculate node depths using BFS", () => {
      const { addNodes, addEdges, calculateNodeDepths } = useGraphStore();

      // Create a simple graph: N1 -> N2 -> N3, N1 -> N4
      const nodes = [
        createTestNode("N1"),
        createTestNode("N2"),
        createTestNode("N3"),
        createTestNode("N4"),
      ];
      const edges = [
        createTestEdge("E1", "N1", "N2"),
        createTestEdge("E2", "N2", "N3"),
        createTestEdge("E3", "N1", "N4"),
      ];

      addNodes(nodes);
      addEdges(edges);

      calculateNodeDepths();

      const state = useGraphStore();
      expect(state.nodeDepths["N1"]).toBe(0);
      expect(state.nodeDepths["N2"]).toBe(1);
      expect(state.nodeDepths["N3"]).toBe(2);
      expect(state.nodeDepths["N4"]).toBe(1);
    });

    it("should handle calculate depths for disconnected graph", () => {
      const { addNodes, calculateNodeDepths } = useGraphStore();

      // Create disconnected nodes
      const nodes = [
        createTestNode("N1"),
        createTestNode("N2"),
        createTestNode("N3"),
      ];

      addNodes(nodes);
      calculateNodeDepths();

      const state = useGraphStore();
      expect(state.nodeDepths["N1"]).toBe(0);
      expect(state.nodeDepths["N2"]).toBeUndefined();
      expect(state.nodeDepths["N3"]).toBeUndefined();
    });

    it("should get nodes within depth", () => {
      const { addNodes, addEdges, calculateNodeDepths, getNodesWithinDepth } =
        useGraphStore();

      // Create nodes and calculate depths
      const nodes = [
        createTestNode("N1"),
        createTestNode("N2"),
        createTestNode("N3"),
        createTestNode("N4"),
      ];
      const edges = [
        createTestEdge("E1", "N1", "N2"),
        createTestEdge("E2", "N2", "N3"),
        createTestEdge("E3", "N1", "N4"),
      ];

      addNodes(nodes);
      addEdges(edges);
      calculateNodeDepths();

      const depth0 = getNodesWithinDepth(0);
      expect(depth0).toHaveLength(1);
      expect(depth0[0].id).toBe("N1");

      const depth1 = getNodesWithinDepth(1);
      expect(depth1).toHaveLength(3);
      expect(depth1.map((n) => n.id).sort()).toEqual(["N1", "N2", "N4"]);

      const depth2 = getNodesWithinDepth(2);
      expect(depth2).toHaveLength(4);

      const depthInfinity = getNodesWithinDepth(Infinity);
      expect(depthInfinity).toHaveLength(4);
    });

    it("should handle get nodes within depth when no depths calculated", () => {
      const { addNodes, getNodesWithinDepth } = useGraphStore();

      const nodes = [createTestNode("N1"), createTestNode("N2")];
      addNodes(nodes);

      const result = getNodesWithinDepth(1);
      expect(result).toHaveLength(0);
    });
  });

  describe("Graph Algorithms", () => {
    beforeEach(() => {
      // Create test graph: N1 <-> N2 <-> N3, N1 <-> N4
      const { addNodes, addEdges } = useGraphStore();
      const nodes = [
        createTestNode("N1"),
        createTestNode("N2"),
        createTestNode("N3"),
        createTestNode("N4"),
      ];
      const edges = [
        createTestEdge("E1", "N1", "N2"),
        createTestEdge("E2", "N2", "N3"),
        createTestEdge("E3", "N1", "N4"),
      ];

      addNodes(nodes);
      addEdges(edges);
    });

    it("should get neighbors of a node", () => {
      const { getNeighbors } = useGraphStore();

      const n1Neighbors = getNeighbors("N1");
      expect(n1Neighbors).toHaveLength(2);
      expect(n1Neighbors.map((n) => n.id).sort()).toEqual(["N2", "N4"]);

      const n2Neighbors = getNeighbors("N2");
      expect(n2Neighbors).toHaveLength(2);
      expect(n2Neighbors.map((n) => n.id).sort()).toEqual(["N1", "N3"]);

      const n3Neighbors = getNeighbors("N3");
      expect(n3Neighbors).toHaveLength(1);
      expect(n3Neighbors[0].id).toBe("N2");

      const nonExistentNeighbors = getNeighbors("NON_EXISTENT");
      expect(nonExistentNeighbors).toHaveLength(0);
    });

    it("should get connected edges of a node", () => {
      const { getConnectedEdges } = useGraphStore();

      const n1Edges = getConnectedEdges("N1");
      expect(n1Edges).toHaveLength(2);
      expect(n1Edges.map((e) => e.id).sort()).toEqual(["E1", "E3"]);

      const n2Edges = getConnectedEdges("N2");
      expect(n2Edges).toHaveLength(2);
      expect(n2Edges.map((e) => e.id).sort()).toEqual(["E1", "E2"]);

      const n4Edges = getConnectedEdges("N4");
      expect(n4Edges).toHaveLength(1);
      expect(n4Edges[0].id).toBe("E3");

      const nonExistentEdges = getConnectedEdges("NON_EXISTENT");
      expect(nonExistentEdges).toHaveLength(0);
    });

    it("should find shortest path between nodes", () => {
      const { findShortestPath } = useGraphStore();

      const path1to3 = findShortestPath("N1", "N3");
      expect(path1to3).toEqual(["N1", "N2", "N3"]);

      const path1to4 = findShortestPath("N1", "N4");
      expect(path1to4).toEqual(["N1", "N4"]);

      const path4to3 = findShortestPath("N4", "N3");
      expect(path4to3).toEqual(["N4", "N1", "N2", "N3"]);

      const path1to1 = findShortestPath("N1", "N1");
      expect(path1to1).toEqual(["N1"]);
    });

    it("should return empty path when no path exists", () => {
      const { addNode, findShortestPath } = useGraphStore();

      // Add disconnected node
      addNode(createTestNode("ISOLATED"));

      const pathToIsolated = findShortestPath("N1", "ISOLATED");
      expect(pathToIsolated).toEqual([]);

      const pathFromIsolated = findShortestPath("ISOLATED", "N1");
      expect(pathFromIsolated).toEqual([]);
    });

    it("should return empty path for non-existent nodes", () => {
      const { findShortestPath } = useGraphStore();

      const pathToNonExistent = findShortestPath("N1", "NON_EXISTENT");
      expect(pathToNonExistent).toEqual([]);

      const pathFromNonExistent = findShortestPath("NON_EXISTENT", "N1");
      expect(pathFromNonExistent).toEqual([]);
    });

    it("should get connected component", () => {
      const { getConnectedComponent, addNode } = useGraphStore();

      const component1 = getConnectedComponent("N1");
      expect(component1.length).toBe(4);
      expect(component1.sort()).toEqual(["N1", "N2", "N3", "N4"]);

      const component2 = getConnectedComponent("N3");
      expect(component2.length).toBe(4);
      expect(component2.sort()).toEqual(["N1", "N2", "N3", "N4"]);

      // Add isolated node
      addNode(createTestNode("ISOLATED"));
      const isolatedComponent = getConnectedComponent("ISOLATED");
      expect(isolatedComponent.length).toBe(1);
      expect(isolatedComponent).toEqual(["ISOLATED"]);
    });

    it("should handle connected component for non-existent node", () => {
      const { getConnectedComponent } = useGraphStore();

      const component = getConnectedComponent("NON_EXISTENT");
      expect(component.length).toBe(1);
      expect(component).toEqual(["NON_EXISTENT"]);
    });
  });

  describe("Type Safety", () => {
    it("should maintain type safety for entity types", () => {
      const { setEntityTypeVisibility, toggleEntityTypeVisibility } =
        useGraphStore();

      const entityTypes: EntityType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "topics",
        "publishers",
        "funders",
        "keywords",
        "concepts",
      ];

      entityTypes.forEach((type) => {
        expect(() => {
          setEntityTypeVisibility(type, true);
          toggleEntityTypeVisibility(type);
        }).not.toThrow();
      });
    });

    it("should maintain type safety for edge types", () => {
      const { setEdgeTypeVisibility, toggleEdgeTypeVisibility } =
        useGraphStore();

      const edgeTypes: RelationType[] = [
        RelationType.AUTHORED,
        RelationType.AFFILIATED,
        RelationType.PUBLISHED_IN,
        RelationType.FUNDED_BY,
        RelationType.RELATED_TO,
        RelationType.REFERENCES,
      ];

      edgeTypes.forEach((type) => {
        expect(() => {
          setEdgeTypeVisibility(type, true);
          toggleEdgeTypeVisibility(type);
        }).not.toThrow();
      });
    });

    it("should handle Record operations correctly", () => {
      const { addNode, pinNode, isPinned } = useGraphStore();

      // Test Record operations
      const node = createTestNode("N1");
      addNode(node);
      expect(useGraphStore().nodes["N1"]).toEqual(node);

      // Test Record operations
      pinNode("N1");
      expect(useGraphStore().pinnedNodes["N1"]).toBeTruthy();
      expect(isPinned("N1")).toBe(true);
    });
  });
});
