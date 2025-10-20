/**
 * Integration tests for entity data storage functionality
 * Verifies that entity data is properly stored and accessible on-demand
 */

import { createGraphDataService } from "@/services/graph-data-service";
import { useGraphStore } from "@/stores/graph-store";
import type { Work } from "@academic-explorer/client";
import { logger } from "@academic-explorer/utils/logger";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the graph store with properly shared state
const { mockStore } = vi.hoisted(() => {
  // This is the shared state object that both test and service will see
  const sharedState = {
    nodes: {} as Record<string, any>,
    edges: {} as Record<string, any>,
    // Store methods that operate on shared state
    addNode: (node: any) => {
      sharedState.nodes[node.id] = node;
    },
    addNodes: (nodes: any[]) => {
      nodes.forEach((node) => {
        sharedState.nodes[node.id] = node;
      });
    },
    addEdge: (edge: any) => {
      sharedState.edges[edge.id] = edge;
    },
    addEdges: (edges: any[]) => {
      edges.forEach((edge) => {
        sharedState.edges[edge.id] = edge;
      });
    },
    getNode: (nodeId: string) => sharedState.nodes[nodeId],
    clear: () => {
      sharedState.nodes = {};
      sharedState.edges = {};
    },
    // Add other methods as no-ops but also operate on shared state
    removeNode: vi.fn((nodeId: string) => {
      delete sharedState.nodes[nodeId];
    }),
    removeEdge: vi.fn((edgeId: string) => {
      delete sharedState.edges[edgeId];
    }),
    updateNode: (nodeId: string, updates: any) => {
      if (sharedState.nodes[nodeId]) {
        sharedState.nodes[nodeId] = {
          ...sharedState.nodes[nodeId],
          ...updates,
        };
      }
    },
    setLoading: vi.fn(),
    setError: vi.fn(),
    setGraphData: vi.fn(),
    selectNode: vi.fn(),
    hoverNode: vi.fn(),
    addToSelection: vi.fn(),
    removeFromSelection: vi.fn(),
    clearSelection: vi.fn(),
    pinNode: vi.fn(),
    unpinNode: vi.fn(),
    clearAllPinnedNodes: vi.fn(),
    isPinned: vi.fn(() => false),
    setLayout: vi.fn(),
    applyCurrentLayout: vi.fn(),
    toggleEntityTypeVisibility: vi.fn(),
    toggleEdgeTypeVisibility: vi.fn(),
    setEntityTypeVisibility: vi.fn(),
    setEdgeTypeVisibility: vi.fn(),
    setAllEntityTypesVisible: vi.fn(),
    resetEntityTypesToDefaults: vi.fn(),
    getEntityTypeStats: vi.fn(() => ({
      total: {},
      visible: {},
      searchResults: {},
    })),
    getVisibleNodes: vi.fn(() => Object.values(sharedState.nodes)),
    setShowAllCachedNodes: vi.fn(),
    setTraversalDepth: vi.fn(),
    updateSearchStats: vi.fn(),
    markNodeAsLoading: vi.fn(),
    markNodeAsLoaded: vi.fn(),
    markNodeAsError: vi.fn(),
    calculateNodeDepths: vi.fn(),
    getMinimalNodes: vi.fn(() => Object.values(sharedState.nodes)),
    getNodesWithinDepth: vi.fn(() => []),
    getNeighbors: vi.fn(() => []),
    getConnectedEdges: vi.fn(() => []),
    findShortestPath: vi.fn(() => []),
    getConnectedComponent: vi.fn(() => []),
    setProvider: vi.fn(),
    setProviderType: vi.fn(),
    hasPlaceholderOrLoadingNodes: vi.fn(() => false),
  };

  // The mock store object that Zustand would normally return
  const mockStore = {
    getState: () => ({
      ...sharedState,
      // Include all methods in the state object for tests that call getState()
      addNode: sharedState.addNode,
      addNodes: sharedState.addNodes,
      addEdge: sharedState.addEdge,
      addEdges: sharedState.addEdges,
      getNode: sharedState.getNode,
      clear: sharedState.clear,
      removeNode: sharedState.removeNode,
      removeEdge: sharedState.removeEdge,
      updateNode: sharedState.updateNode,
      setLoading: sharedState.setLoading,
      setError: sharedState.setError,
      setGraphData: sharedState.setGraphData,
      selectNode: sharedState.selectNode,
      hoverNode: sharedState.hoverNode,
      addToSelection: sharedState.addToSelection,
      removeFromSelection: sharedState.removeFromSelection,
      clearSelection: sharedState.clearSelection,
      pinNode: sharedState.pinNode,
      unpinNode: sharedState.unpinNode,
      clearAllPinnedNodes: sharedState.clearAllPinnedNodes,
      isPinned: sharedState.isPinned,
      setLayout: sharedState.setLayout,
      applyCurrentLayout: sharedState.applyCurrentLayout,
      toggleEntityTypeVisibility: sharedState.toggleEntityTypeVisibility,
      toggleEdgeTypeVisibility: sharedState.toggleEdgeTypeVisibility,
      setEntityTypeVisibility: sharedState.setEntityTypeVisibility,
      setEdgeTypeVisibility: sharedState.setEdgeTypeVisibility,
      setAllEntityTypesVisible: sharedState.setAllEntityTypesVisible,
      resetEntityTypesToDefaults: sharedState.resetEntityTypesToDefaults,
      getEntityTypeStats: sharedState.getEntityTypeStats,
      getVisibleNodes: sharedState.getVisibleNodes,
      setShowAllCachedNodes: sharedState.setShowAllCachedNodes,
      setTraversalDepth: sharedState.setTraversalDepth,
      updateSearchStats: sharedState.updateSearchStats,
      markNodeAsLoading: sharedState.markNodeAsLoading,
      markNodeAsLoaded: sharedState.markNodeAsLoaded,
      markNodeAsError: sharedState.markNodeAsError,
      calculateNodeDepths: sharedState.calculateNodeDepths,
      getMinimalNodes: sharedState.getMinimalNodes,
      getNodesWithinDepth: sharedState.getNodesWithinDepth,
      getNeighbors: sharedState.getNeighbors,
      getConnectedEdges: sharedState.getConnectedEdges,
      findShortestPath: sharedState.findShortestPath,
      getConnectedComponent: sharedState.getConnectedComponent,
      setProvider: sharedState.setProvider,
      setProviderType: sharedState.setProviderType,
      hasPlaceholderOrLoadingNodes: sharedState.hasPlaceholderOrLoadingNodes,
    }),
    setState: vi.fn(),
    // Direct access to shared state properties and methods for tests
    get nodes() {
      return sharedState.nodes;
    },
    get edges() {
      return sharedState.edges;
    },
    addNode: sharedState.addNode,
    addNodes: sharedState.addNodes,
    addEdge: sharedState.addEdge,
    addEdges: sharedState.addEdges,
    getNode: sharedState.getNode,
    clear: sharedState.clear,
    // All other methods
    removeNode: sharedState.removeNode,
    removeEdge: sharedState.removeEdge,
    updateNode: sharedState.updateNode,
    setLoading: sharedState.setLoading,
    setError: sharedState.setError,
    setGraphData: sharedState.setGraphData,
    selectNode: sharedState.selectNode,
    hoverNode: sharedState.hoverNode,
    addToSelection: sharedState.addToSelection,
    removeFromSelection: sharedState.removeFromSelection,
    clearSelection: sharedState.clearSelection,
    pinNode: sharedState.pinNode,
    unpinNode: sharedState.unpinNode,
    clearAllPinnedNodes: sharedState.clearAllPinnedNodes,
    isPinned: sharedState.isPinned,
    setLayout: sharedState.setLayout,
    applyCurrentLayout: sharedState.applyCurrentLayout,
    toggleEntityTypeVisibility: sharedState.toggleEntityTypeVisibility,
    toggleEdgeTypeVisibility: sharedState.toggleEdgeTypeVisibility,
    setEntityTypeVisibility: sharedState.setEntityTypeVisibility,
    setEdgeTypeVisibility: sharedState.setEdgeTypeVisibility,
    setAllEntityTypesVisible: sharedState.setAllEntityTypesVisible,
    resetEntityTypesToDefaults: sharedState.resetEntityTypesToDefaults,
    getEntityTypeStats: sharedState.getEntityTypeStats,
    getVisibleNodes: sharedState.getVisibleNodes,
    setShowAllCachedNodes: sharedState.setShowAllCachedNodes,
    setTraversalDepth: sharedState.setTraversalDepth,
    updateSearchStats: sharedState.updateSearchStats,
    markNodeAsLoading: sharedState.markNodeAsLoading,
    markNodeAsLoaded: sharedState.markNodeAsLoaded,
    markNodeAsError: sharedState.markNodeAsError,
    calculateNodeDepths: sharedState.calculateNodeDepths,
    getMinimalNodes: sharedState.getMinimalNodes,
    getNodesWithinDepth: sharedState.getNodesWithinDepth,
    getNeighbors: sharedState.getNeighbors,
    getConnectedEdges: sharedState.getConnectedEdges,
    findShortestPath: sharedState.findShortestPath,
    getConnectedComponent: sharedState.getConnectedComponent,
    setProvider: sharedState.setProvider,
    setProviderType: sharedState.setProviderType,
    hasPlaceholderOrLoadingNodes: sharedState.hasPlaceholderOrLoadingNodes,
  };

  return { mockStore };
});

vi.mock("@/stores/graph-store", () => ({
  useGraphStore: mockStore,
  graphStore: mockStore,
}));

describe("Entity Data Storage Integration", () => {
  let queryClient: QueryClient;
  let graphDataService: ReturnType<typeof createGraphDataService>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    graphDataService = createGraphDataService(queryClient);

    // Reset store state properly
    const store = useGraphStore.getState();

    // Clear nodes and edges properly
    for (const nodeId of Object.keys(store.nodes)) {
      store.removeNode(nodeId);
    }
    for (const edgeId of Object.keys(store.edges)) {
      store.removeEdge(edgeId);
    }
  });

  describe("Entity data storage", () => {
    it("should store referenced works data in primary node", async () => {
      // Mock work with referenced works
      const mockWork: Work = {
        id: "https://openalex.org/W123456789",
        display_name: "Test Paper",
        publication_year: 2023,
        authorships: [],
        primary_location: undefined,
        referenced_works: [
          "https://openalex.org/W987654321",
          "https://openalex.org/W555666777",
        ],
        type_crossref: "journal-article",
        doi: "https://doi.org/10.1234/test",
        title: "Test Paper",
        publication_date: "2023-01-01",
        language: "en",
        locations: [],
        mesh: [],
        sustainable_development_goals: [],
        grants: [],
        apc_list: undefined,
        apc_paid: undefined,
        has_fulltext: false,
        fulltext_origin: undefined,
        cited_by_api_url:
          "https://api.openalex.org/works?filter=cites:W123456789",
        counts_by_year: [],
        updated_date: "2023-01-01",
        created_date: "2023-01-01",
        ids: {
          openalex: "https://openalex.org/W123456789",
          doi: "https://doi.org/10.1234/test",
        },
        locations_count: 0,
        countries_distinct_count: 0,
        institutions_distinct_count: 0,
        corresponding_author_ids: [],
        corresponding_institution_ids: [],
        type: "article",
        indexed_in: [],
        open_access: {
          is_oa: false,
          any_repository_has_fulltext: false,
        },
        cited_by_count: 0,
        fwci: 1.0,
        referenced_works_count: 2,
        related_works: [],
        concepts: [],
        is_retracted: false,
        is_paratext: false,
      };

      // Mock the OpenAlex client response - ensure the mock is set up before any operations
      const mockGetEntity = vi
        .spyOn(graphDataService["deduplicationService"], "getEntity")
        .mockResolvedValue(mockWork);

      try {
        // Load the work into the graph with proper error handling
        await graphDataService.loadEntityGraph(
          "https://openalex.org/W123456789",
        );

        // Verify the mock was called with normalized ID
        expect(mockGetEntity).toHaveBeenCalledWith(
          "W123456789",
          expect.any(Function),
        );

        // Give a small delay for potential async state updates to complete
        await new Promise((resolve) => setTimeout(resolve, 10));

        const store = useGraphStore.getState();

        // Verify the main work was added with entity data
        expect("https://openalex.org/W123456789" in store.nodes).toBe(true);
        const mainNode = store.nodes["https://openalex.org/W123456789"];
        expect(mainNode.entityData).toBeDefined();
        expect(mainNode.entityData?.referenced_works).toEqual([
          "https://openalex.org/W987654321",
          "https://openalex.org/W555666777",
        ]);

        // Verify referenced works are NOT automatically created as nodes
        // (they should be created through relationship detection or on-demand loading)
        expect("https://openalex.org/W987654321" in store.nodes).toBe(false);
        expect("https://openalex.org/W555666777" in store.nodes).toBe(false);

        // Verify only the primary node exists (total nodes should be 1)
        expect(Object.keys(store.nodes).length).toBe(1);

        logger.debug(
          "integration",
          "Entity data storage test completed successfully",
          {
            mainNodeId: mainNode.id,
            hasEntityData: !!mainNode.entityData,
            referencedWorksCount: (mainNode.entityData as any)?.referenced_works
              ?.length,
            totalNodes: Object.keys(store.nodes).length,
          },
        );
      } catch (error) {
        logger.error("integration", "Failed to load entity graph", { error });
        throw error;
      }
    });

    it("should store entity data without creating referenced work nodes", async () => {
      // Mock work entity
      const mockWork: Work = {
        id: "https://openalex.org/W123456789",
        display_name: "Test Paper",
        publication_year: 2023,
        authorships: [],
        primary_location: undefined,
        referenced_works: ["https://openalex.org/W987654321"],
        cited_by_count: 10,
        open_access: {
          is_oa: true,
          oa_url: undefined,
          any_repository_has_fulltext: false,
        },
        type_crossref: "journal-article",
        doi: "https://doi.org/10.1234/test",
        title: "Test Paper",
        publication_date: "2023-01-01",
        language: "en",
        locations: [],
        mesh: [],
        sustainable_development_goals: [],
        grants: [],
        apc_list: undefined,
        apc_paid: undefined,
        has_fulltext: false,
        fulltext_origin: undefined,
        cited_by_api_url:
          "https://api.openalex.org/works?filter=cites:W123456789",
        counts_by_year: [],
        updated_date: "2023-01-01",
        created_date: "2023-01-01",
        ids: {
          openalex: "https://openalex.org/W123456789",
          doi: "https://doi.org/10.1234/test",
        },
        locations_count: 0,
        countries_distinct_count: 0,
        institutions_distinct_count: 0,
        corresponding_author_ids: [],
        corresponding_institution_ids: [],
        type: "article",
        indexed_in: [],
        fwci: 1.0,
        referenced_works_count: 1,
        related_works: [],
        concepts: [],
        is_retracted: false,
        is_paratext: false,
      };

      // Mock the API to return only the primary work
      const mockGetEntity = vi
        .spyOn(graphDataService["deduplicationService"], "getEntity")
        .mockResolvedValue(mockWork);

      try {
        // Load the main work
        await graphDataService.loadEntityGraph(
          "https://openalex.org/W123456789",
        );

        // Verify the mock was called with normalized ID
        expect(mockGetEntity).toHaveBeenCalledWith(
          "W123456789",
          expect.any(Function),
        );

        // Give a small delay for potential async state updates to complete
        await new Promise((resolve) => setTimeout(resolve, 10));

        const store = useGraphStore.getState();

        // Verify only the primary work was loaded
        expect(Object.keys(store.nodes).length).toBe(1);
        expect("https://openalex.org/W123456789" in store.nodes).toBe(true);

        // Verify referenced work is NOT automatically created as a node
        expect("https://openalex.org/W987654321" in store.nodes).toBe(false);

        // Verify the entity data contains referenced works information
        const mainNode = store.nodes["https://openalex.org/W123456789"];
        expect(mainNode.entityData?.referenced_works).toEqual([
          "https://openalex.org/W987654321",
        ]);

        logger.debug("integration", "Entity data test completed", {
          totalNodes: Object.keys(store.nodes).length,
          hasEntityData: !!mainNode.entityData,
          referencedWorksCount: (mainNode.entityData as any)?.referenced_works
            ?.length,
        });
      } catch (error) {
        logger.error(
          "integration",
          "Failed to load entity graph in second test",
          { error },
        );
        throw error;
      }
    });
  });

  describe("Hydration level transitions", () => {
    // TODO: Fix test environment issue where manually added nodes don't persist in Zustand store
    // This test validates functionality that works in the other 3 passing tests
    it("should transition from minimal to full hydration when fully loaded", async () => {
      const store = useGraphStore.getState();

      // Create a minimal node first
      const testNode = {
        id: "https://openalex.org/W123456789",
        entityId: "https://openalex.org/W123456789",
        entityType: "works" as const,
        label: "Minimal Work Node",
        x: 0,
        y: 0,
        externalIds: [],
        metadata: {
          hydrationLevel: "minimal",
          entityType: "works",
          isLoading: false,
          hasError: false,
        },
      };

      logger.debug("integration", "Adding node to store", {
        nodeId: testNode.id,
        nodeCount: Object.keys(store.nodes).length,
      });

      store.addNode(testNode);

      logger.debug("integration", "Node added to store", {
        nodeId: testNode.id,
        nodeCount: Object.keys(store.nodes).length,
        nodeExists: testNode.id in store.nodes,
      });

      // Mock full work entity
      const mockFullWork: Work = {
        id: "https://openalex.org/W123456789",
        display_name: "Full Work Title",
        publication_year: 2023,
        authorships: [],
        primary_location: undefined,
        referenced_works: [],
        cited_by_count: 10,
        open_access: {
          is_oa: true,
          oa_url: undefined,
          any_repository_has_fulltext: false,
        },
        type: "article",
        type_crossref: "journal-article",
        doi: "https://doi.org/10.1234/test",
        title: "Test Paper",
        publication_date: "2023-01-01",
        language: "en",
        locations: [],
        mesh: [],
        sustainable_development_goals: [],
        grants: [],
        apc_list: undefined,
        apc_paid: undefined,
        has_fulltext: false,
        fulltext_origin: undefined,
        cited_by_api_url:
          "https://api.openalex.org/works?filter=cites:W123456789",
        counts_by_year: [],
        updated_date: "2023-01-01",
        created_date: "2023-01-01",
        ids: {
          openalex: "https://openalex.org/W123456789",
          doi: "https://doi.org/10.1234/test",
        },
        locations_count: 0,
        countries_distinct_count: 0,
        institutions_distinct_count: 0,
        corresponding_author_ids: [],
        corresponding_institution_ids: [],
        indexed_in: [],
        fwci: 1.0,
        referenced_works_count: 0,
        related_works: [],
        concepts: [],
        is_retracted: false,
        is_paratext: false,
      };

      vi.spyOn(
        graphDataService["deduplicationService"],
        "getEntity",
      ).mockResolvedValue(mockFullWork);

      // Verify initial minimal state
      let node = store.nodes["https://openalex.org/W123456789"];

      // Debug logging to understand what's happening
      logger.debug("integration", "Node metadata after adding to store", {
        nodeId: node.id,
        hasMetadata: !!node.metadata,
        metadata: node.metadata,
        hydrationLevel: node.metadata?.hydrationLevel,
      });

      expect(node.metadata?.hydrationLevel).toBe("minimal");
      expect(node.label).toBe("Minimal Work Node");

      // Load the entity into graph (which should upgrade minimal to full)
      await graphDataService.loadEntityIntoGraph(
        "https://openalex.org/W123456789",
      );

      // Verify it was upgraded to full hydration
      node = store.nodes["https://openalex.org/W123456789"];
      expect(node.metadata?.hydrationLevel).toBe("full");
      expect(node.label).toBe("Full Work Title");

      logger.debug("integration", "Hydration level transition test completed", {
        initialHydration: "minimal",
        finalHydration: node.metadata?.hydrationLevel,
        labelChanged: "Minimal Work Node" !== node.label,
      });
    });
  });

  describe("Store integration", () => {
    it("should return false for hasPlaceholderOrLoadingNodes function", async () => {
      const store = useGraphStore.getState();

      // Test hasPlaceholderOrLoadingNodes function - should always return false
      // since we no longer have artificial hydration levels
      expect(store.hasPlaceholderOrLoadingNodes()).toBe(false);

      // The function should always return false regardless of store contents
      // since we removed artificial hydration level tracking

      logger.debug("integration", "Store integration test completed", {
        finalNodeCount: Object.keys(store.nodes).length,
        hasMinimalOrLoading: store.hasPlaceholderOrLoadingNodes(),
      });
    });
  });
});
