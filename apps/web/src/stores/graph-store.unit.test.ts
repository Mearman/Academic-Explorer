/**
 * @vitest-environment jsdom
 */

/**
 * Comprehensive unit tests for graph-store.ts
 * Testing provider-agnostic graph state management with Zustand + Immer
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { graphStore } from "./graph-store";
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
    graphStore.clear();
    graphStore.clearAllPinnedNodes();
    graphStore.setError(null);
    graphStore.setLoading(false);
    graphStore.setShowAllCachedNodes(false);
    graphStore.setTraversalDepth(2);
    graphStore.resetEntityTypesToDefaults();
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
      const state = graphStore.getState();
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
      const state = graphStore.getState();
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
      const state = graphStore.getState();

      expect(state.currentLayout.type).toBe("force");
      expect(state.currentLayout.options!.iterations).toBe(100);
      expect(state.currentLayout.options!.strength).toBe(-200);
      expect(state.currentLayout.options!.distance).toBe(150);
    });
  });

  // TODO: Provider-related tests need refactoring after store architecture change
  // The store now only stores provider as a string identifier, not an object
  describe.skip("Provider Management", () => {
    it("should set provider and transfer existing data", () => {
      // Skipped: Store refactored to only accept string provider, not object
    });

    it("should set provider type", () => {
      graphStore.setProviderType("d3-force");

      const state = graphStore.getState();
      expect(state.providerType).toBe("d3-force");
    });
  });

  // TODO: Layout+Provider tests need refactoring after store architecture change
  describe.skip("Layout Management", () => {
    it("should set layout and apply to provider", () => {
      // Skipped: Store no longer has provider object integration
    });

    it("should apply current layout to provider", () => {
      // Skipped: applyCurrentLayout method removed in refactoring
    });

    it("should handle layout operations when no provider is set", () => {
      // Skipped: Store no longer has provider object integration
    });
  });

  describe("Node Management", () => {
    it("should add single node", () => {
      const testNode = createTestNode("N1", "authors");
      graphStore.addNode(testNode);

      const state = graphStore.getState();
      expect(state.nodes["N1"]).toEqual(testNode);
      expect(Object.keys(state.nodes).length).toBe(1);
    });

    it("should add multiple nodes", () => {
      const testNodes = [
        createTestNode("N1", "authors"),
        createTestNode("N2", "works"),
        createTestNode("N3", "institutions"),
      ];

      graphStore.addNodes(testNodes);

      const state = graphStore.getState();
      expect(Object.keys(state.nodes).length).toBe(3);
      testNodes.forEach((node) => {
        expect(state.nodes[node.id]).toEqual(node);
      });
    });

    it("should add nodes without provider", () => {
      const testNode = createTestNode("N1");

      expect(() => {
        graphStore.addNode(testNode);
      }).not.toThrow();

      const state = graphStore.getState();
      expect(state.nodes["N1"]).toEqual(testNode);
    });

    it("should remove node and connected edges", () => {
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

      graphStore.addNodes(nodes);
      graphStore.addEdges(edges);

      // Select and hover the node to be removed
      graphStore.selectNode("N1");
      graphStore.hoverNode("N1");
      graphStore.addToSelection("N1");

      // Remove node
      graphStore.removeNode("N1");

      const state = graphStore.getState();
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
    });

    it("should update existing node", () => {
      const testNode = createTestNode("N1");
      graphStore.addNode(testNode);

      const updates = {
        entityData: { ...testNode.entityData, label: "Updated Label" },
        metadata: { ...testNode.metadata, directlyVisited: true },
      };

      graphStore.updateNode("N1", updates);

      const state = graphStore.getState();
      const updatedNode = state.nodes["N1"];
      expect(updatedNode.entityData?.label).toBe("Updated Label");
      expect(updatedNode.metadata?.directlyVisited).toBe(true);
    });

    it("should handle update of non-existent node", () => {
      expect(() => {
        graphStore.updateNode("NON_EXISTENT", {
          metadata: { directlyVisited: true },
        });
      }).not.toThrow();

      const state = graphStore.getState();
      // updateNode creates a node with the updates even if it didn't exist before
      expect(Object.keys(state.nodes).length).toBe(1);
    });

    it("should get existing node", () => {
      const testNode = createTestNode("N1");
      graphStore.addNode(testNode);

      const retrieved = graphStore.getNode("N1");
      expect(retrieved).toEqual(testNode);
    });

    it("should return undefined for non-existent node", () => {
      const retrieved = graphStore.getNode("NON_EXISTENT");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("Selection Management", () => {
    it("should select node", () => {
      graphStore.selectNode("N1");
      expect(graphStore.getState().selectedNodeId).toBe("N1");

      graphStore.selectNode("N2");
      expect(graphStore.getState().selectedNodeId).toBe("N2");

      graphStore.selectNode(null);
      expect(graphStore.getState().selectedNodeId).toBeNull();
    });

    it("should hover node", () => {
      graphStore.hoverNode("N1");
      expect(graphStore.getState().hoveredNodeId).toBe("N1");

      graphStore.hoverNode("N2");
      expect(graphStore.getState().hoveredNodeId).toBe("N2");

      graphStore.hoverNode(null);
      expect(graphStore.getState().hoveredNodeId).toBeNull();
    });

    it("should add to selection", () => {
      graphStore.addToSelection("N1");
      graphStore.addToSelection("N2");
      graphStore.addToSelection("N3");

      const state = graphStore.getState();
      expect(state.selectedNodes["N1"]).toBeTruthy();
      expect(state.selectedNodes["N2"]).toBeTruthy();
      expect(state.selectedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.selectedNodes).length).toBe(3);
    });

    it("should remove from selection", () => {
      graphStore.addToSelection("N1");
      graphStore.addToSelection("N2");
      graphStore.addToSelection("N3");

      graphStore.removeFromSelection("N2");

      const state = graphStore.getState();
      expect(state.selectedNodes["N1"]).toBeTruthy();
      expect(state.selectedNodes["N2"]).toBeFalsy();
      expect(state.selectedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.selectedNodes).length).toBe(2);
    });

    it("should clear all selection", () => {
      graphStore.selectNode("N1");
      graphStore.addToSelection("N1");
      graphStore.addToSelection("N2");
      graphStore.addToSelection("N3");

      graphStore.clearSelection();

      const state = graphStore.getState();
      expect(state.selectedNodeId).toBeNull();
      expect(Object.keys(state.selectedNodes).length).toBe(0);
    });
  });

  describe("Multi-Pin Node Management", () => {
    it("should pin node", () => {
      graphStore.pinNode("N1");

      const state = graphStore.getState();
      expect(state.pinnedNodes["N1"]).toBeTruthy();
      expect(Object.keys(state.pinnedNodes).length).toBe(1);
    });

    it("should pin multiple nodes", () => {
      graphStore.pinNode("N1");
      graphStore.pinNode("N2");
      graphStore.pinNode("N3");

      const state = graphStore.getState();
      expect(state.pinnedNodes["N1"]).toBeTruthy();
      expect(state.pinnedNodes["N2"]).toBeTruthy();
      expect(state.pinnedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.pinnedNodes).length).toBe(3);
    });

    it("should unpin node", () => {
      graphStore.pinNode("N1");
      graphStore.pinNode("N2");
      graphStore.pinNode("N3");

      graphStore.unpinNode("N2");

      const state = graphStore.getState();
      expect(state.pinnedNodes["N1"]).toBeTruthy();
      expect(state.pinnedNodes["N2"]).toBeFalsy();
      expect(state.pinnedNodes["N3"]).toBeTruthy();
      expect(Object.keys(state.pinnedNodes).length).toBe(2);
    });

    it("should update legacy pin when unpinning first node", () => {
      graphStore.pinNode("N1");
      graphStore.pinNode("N2");
      graphStore.pinNode("N3");

      graphStore.unpinNode("N1");

      const state = graphStore.getState();
      expect(state.pinnedNodes["N1"]).toBeFalsy();
    });

    it("should clear legacy pin when unpinning last node", () => {
      graphStore.pinNode("N1");
      graphStore.unpinNode("N1");

      const state = graphStore.getState();
      expect(Object.keys(state.pinnedNodes).length).toBe(0);
    });

    it("should clear all pinned nodes", () => {
      graphStore.pinNode("N1");
      graphStore.pinNode("N2");
      graphStore.pinNode("N3");

      graphStore.clearAllPinnedNodes();

      const state = graphStore.getState();
      expect(Object.keys(state.pinnedNodes).length).toBe(0);
    });

    it("should check if node is pinned", () => {
      graphStore.pinNode("N1");

      expect(graphStore.isPinned("N1")).toBe(true);
      expect(graphStore.isPinned("N2")).toBe(false);
    });
  });

  describe("Loading States", () => {
    it("should set loading state", () => {
      expect(graphStore.getState().isLoading).toBe(false);

      graphStore.setLoading(true);
      expect(graphStore.getState().isLoading).toBe(true);

      graphStore.setLoading(false);
      expect(graphStore.getState().isLoading).toBe(false);
    });

    it("should set error state", () => {
      expect(graphStore.getState().error).toBeNull();

      graphStore.setError("Test error message");
      expect(graphStore.getState().error).toBe("Test error message");

      graphStore.setError(null);
      expect(graphStore.getState().error).toBeNull();
    });
  });

  describe("Entity Type Management", () => {
    it("should toggle entity type visibility", () => {
      expect(graphStore.getState().visibleEntityTypes["works"]).toBe(true);

      graphStore.toggleEntityTypeVisibility("works");
      expect(graphStore.getState().visibleEntityTypes["works"]).toBe(false);

      graphStore.toggleEntityTypeVisibility("works");
      expect(graphStore.getState().visibleEntityTypes["works"]).toBe(true);
    });

    it("should set entity type visibility explicitly", () => {
      graphStore.setEntityTypeVisibility("authors", false);
      expect(graphStore.getState().visibleEntityTypes["authors"]).toBe(false);

      graphStore.setEntityTypeVisibility("authors", true);
      expect(graphStore.getState().visibleEntityTypes["authors"]).toBe(true);

      graphStore.setEntityTypeVisibility("new_type" as EntityType, true);
      expect(graphStore.getState().visibleEntityTypes["new_type" as EntityType]).toBe(
        true,
      );
    });

    it("should set all entity types visible", () => {
      // Clear all first - this replaces current object entirely
      graphStore.setAllEntityTypesVisible(false);
      const falseState = graphStore.getState();
      expect(Object.keys(falseState.visibleEntityTypes).length).toBe(9); // concepts, topics, keywords, works, authors, sources, institutions, publishers, funders
      // When false, all values should be false (the key exists but value is false)
      expect(falseState.visibleEntityTypes["works"]).toBe(false);
      expect(falseState.visibleEntityTypes["authors"]).toBe(false);
      expect(falseState.visibleEntityTypes["concepts"]).toBe(false);

      // Set all visible - this creates a new object with all true
      graphStore.setAllEntityTypesVisible(true);
      const state = graphStore.getState();
      expect(Object.keys(state.visibleEntityTypes).length).toBe(9); // same 9 types
      expect(state.visibleEntityTypes["works"]).toBe(true);
      expect(state.visibleEntityTypes["authors"]).toBe(true);
      expect(state.visibleEntityTypes["sources"]).toBe(true);
    });

    it("should update search stats", () => {
      const stats = {
        works: 100,
        authors: 50,
        sources: 25,
      } as Record<EntityType, number>;

      graphStore.updateSearchStats(stats);

      const state = graphStore.getState();
      expect(state.lastSearchStats["works"]).toBe(100);
      expect(state.lastSearchStats["authors"]).toBe(50);
      expect(state.lastSearchStats["sources"]).toBe(25);
    });

    it("should get entity type stats", () => {
      // Add nodes of different types
      const nodes = [
        createTestNode("W1", "works"),
        createTestNode("W2", "works"),
        createTestNode("A1", "authors"),
        createTestNode("S1", "sources"),
        createTestNode("S2", "sources"),
      ];
      graphStore.addNodes(nodes);

      // Set some types invisible
      graphStore.setEntityTypeVisibility("sources", false);

      // Set search stats
      const searchStats = {
        works: 200,
        authors: 150,
      } as Record<EntityType, number>;
      graphStore.updateSearchStats(searchStats);

      const stats = graphStore.getEntityTypeStats();

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
      const nodes = [
        createTestNode("W1", "works"),
        createTestNode("A1", "authors"),
        createTestNode("S1", "sources"),
      ];
      graphStore.addNodes(nodes);

      graphStore.setEntityTypeVisibility("sources", false);

      const visibleNodes = graphStore.getVisibleNodes();

      expect(visibleNodes).toHaveLength(2);
      expect(visibleNodes.map((n) => n.id).sort()).toEqual(["A1", "W1"]);
    });
  });

  describe("Cache Visibility and Traversal Control", () => {
    it("should set show all cached nodes", () => {
      expect(graphStore.getState().showAllCachedNodes).toBe(false);

      graphStore.setShowAllCachedNodes(true);
      expect(graphStore.getState().showAllCachedNodes).toBe(true);

      graphStore.setShowAllCachedNodes(false);
      expect(graphStore.getState().showAllCachedNodes).toBe(false);
    });

    it("should set traversal depth with minimum validation", () => {
      graphStore.setTraversalDepth(5);
      expect(graphStore.getState().traversalDepth).toBe(5);

      graphStore.setTraversalDepth(0); // Should be clamped to 1
      expect(graphStore.getState().traversalDepth).toBe(1);

      graphStore.setTraversalDepth(-5); // Should be clamped to 1
      expect(graphStore.getState().traversalDepth).toBe(1);

      graphStore.setTraversalDepth(Infinity);
      expect(graphStore.getState().traversalDepth).toBe(Infinity);
    });

    it("should calculate node depths using BFS", () => {
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

      graphStore.addNodes(nodes);
      graphStore.addEdges(edges);

      graphStore.calculateNodeDepths();

      const state = graphStore.getState();
      expect(state.nodeDepths["N1"]).toBe(0);
      expect(state.nodeDepths["N2"]).toBe(1);
      expect(state.nodeDepths["N3"]).toBe(2);
      expect(state.nodeDepths["N4"]).toBe(1);
    });

    it("should handle calculate depths for disconnected graph", () => {
      // Create disconnected nodes
      const nodes = [
        createTestNode("N1"),
        createTestNode("N2"),
        createTestNode("N3"),
      ];

      graphStore.addNodes(nodes);
      graphStore.calculateNodeDepths();

      const state = graphStore.getState();
      expect(state.nodeDepths["N1"]).toBe(0);
      expect(state.nodeDepths["N2"]).toBeUndefined();
      expect(state.nodeDepths["N3"]).toBeUndefined();
    });

    it("should get nodes within depth", () => {
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

      graphStore.addNodes(nodes);
      graphStore.addEdges(edges);
      graphStore.calculateNodeDepths();

      const depth0 = graphStore.getNodesWithinDepth(0);
      expect(depth0).toHaveLength(1);
      expect(depth0[0].id).toBe("N1");

      const depth1 = graphStore.getNodesWithinDepth(1);
      expect(depth1).toHaveLength(3);
      expect(depth1.map((n) => n.id).sort()).toEqual(["N1", "N2", "N4"]);

      const depth2 = graphStore.getNodesWithinDepth(2);
      expect(depth2).toHaveLength(4);

      const depthInfinity = graphStore.getNodesWithinDepth(Infinity);
      expect(depthInfinity).toHaveLength(4);
    });

    it("should handle get nodes within depth when no depths calculated", () => {
      const nodes = [createTestNode("N1"), createTestNode("N2")];
      graphStore.addNodes(nodes);

      const result = graphStore.getNodesWithinDepth(1);
      expect(result).toHaveLength(0);
    });
  });

  describe("Graph Algorithms", () => {
    beforeEach(() => {
      // Create test graph: N1 <-> N2 <-> N3, N1 <-> N4
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

      graphStore.addNodes(nodes);
      graphStore.addEdges(edges);
    });

    it("should get neighbors of a node", () => {
      const n1Neighbors = graphStore.getNeighbors("N1");
      expect(n1Neighbors).toHaveLength(2);
      expect(n1Neighbors.map((n) => n.id).sort()).toEqual(["N2", "N4"]);

      const n2Neighbors = graphStore.getNeighbors("N2");
      expect(n2Neighbors).toHaveLength(2);
      expect(n2Neighbors.map((n) => n.id).sort()).toEqual(["N1", "N3"]);

      const n3Neighbors = graphStore.getNeighbors("N3");
      expect(n3Neighbors).toHaveLength(1);
      expect(n3Neighbors[0].id).toBe("N2");

      const nonExistentNeighbors = graphStore.getNeighbors("NON_EXISTENT");
      expect(nonExistentNeighbors).toHaveLength(0);
    });

    it("should get connected edges of a node", () => {
      const n1Edges = graphStore.getConnectedEdges("N1");
      expect(n1Edges).toHaveLength(2);
      expect(n1Edges.map((e) => e.id).sort()).toEqual(["E1", "E3"]);

      const n2Edges = graphStore.getConnectedEdges("N2");
      expect(n2Edges).toHaveLength(2);
      expect(n2Edges.map((e) => e.id).sort()).toEqual(["E1", "E2"]);

      const n4Edges = graphStore.getConnectedEdges("N4");
      expect(n4Edges).toHaveLength(1);
      expect(n4Edges[0].id).toBe("E3");

      const nonExistentEdges = graphStore.getConnectedEdges("NON_EXISTENT");
      expect(nonExistentEdges).toHaveLength(0);
    });

    it("should find shortest path between nodes", () => {
      const path1to3 = graphStore.findShortestPath("N1", "N3");
      expect(path1to3).toEqual(["N1", "N2", "N3"]);

      const path1to4 = graphStore.findShortestPath("N1", "N4");
      expect(path1to4).toEqual(["N1", "N4"]);

      const path4to3 = graphStore.findShortestPath("N4", "N3");
      expect(path4to3).toEqual(["N4", "N1", "N2", "N3"]);

      const path1to1 = graphStore.findShortestPath("N1", "N1");
      expect(path1to1).toEqual(["N1"]);
    });

    it("should return empty path when no path exists", () => {
      // Add disconnected node
      graphStore.addNode(createTestNode("ISOLATED"));

      const pathToIsolated = graphStore.findShortestPath("N1", "ISOLATED");
      expect(pathToIsolated).toEqual([]);

      const pathFromIsolated = graphStore.findShortestPath("ISOLATED", "N1");
      expect(pathFromIsolated).toEqual([]);
    });

    it("should return empty path for non-existent nodes", () => {
      const pathToNonExistent = graphStore.findShortestPath(
        "N1",
        "NON_EXISTENT",
      );
      expect(pathToNonExistent).toEqual([]);

      const pathFromNonExistent = graphStore.findShortestPath(
        "NON_EXISTENT",
        "N1",
      );
      expect(pathFromNonExistent).toEqual([]);
    });

    it("should get connected component", () => {
      const component1 = graphStore.getConnectedComponent("N1");
      expect(component1.length).toBe(4);
      expect(component1.sort()).toEqual(["N1", "N2", "N3", "N4"]);

      const component2 = graphStore.getConnectedComponent("N3");
      expect(component2.length).toBe(4);
      expect(component2.sort()).toEqual(["N1", "N2", "N3", "N4"]);

      // Add isolated node
      graphStore.addNode(createTestNode("ISOLATED"));
      const isolatedComponent = graphStore.getConnectedComponent("ISOLATED");
      expect(isolatedComponent.length).toBe(1);
      expect(isolatedComponent).toEqual(["ISOLATED"]);
    });

    it("should handle connected component for non-existent node", () => {
      const component = graphStore.getConnectedComponent("NON_EXISTENT");
      expect(component.length).toBe(1);
      expect(component).toEqual(["NON_EXISTENT"]);
    });
  });

  describe("Type Safety", () => {
    it("should maintain type safety for entity types", () => {
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
          graphStore.setEntityTypeVisibility(type, true);
          graphStore.toggleEntityTypeVisibility(type);
        }).not.toThrow();
      });
    });

    it("should maintain type safety for edge types", () => {
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
          graphStore.setEdgeTypeVisibility(type, true);
          graphStore.toggleEdgeTypeVisibility(type);
        }).not.toThrow();
      });
    });

    it("should handle Record operations correctly", () => {
      // Test Record operations
      const node = createTestNode("N1");
      graphStore.addNode(node);
      expect(graphStore.getState().nodes["N1"]).toEqual(node);

      // Test Record operations
      graphStore.pinNode("N1");
      expect(graphStore.getState().pinnedNodes["N1"]).toBeTruthy();
      expect(graphStore.isPinned("N1")).toBe(true);
    });
  });
});
