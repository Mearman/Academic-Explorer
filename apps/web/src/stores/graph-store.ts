/**
 * Graph store with infinite loop fixes applied
 * Uses shared createTrackedStore abstraction for DRY compliance
 */

import { createTrackedStore } from "@academic-explorer/utils/state";
import { enableMapSet } from "immer";

// Enable Immer MapSet plugin for Set support
enableMapSet();
import type {
  GraphNode,
  GraphEdge,
  GraphProvider,
  GraphLayout,
  EntityType,
} from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";

interface GraphState {
  // Core state
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  isLoading: boolean;
  error: string | null;

  // Selection and interaction
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedNodes: Record<string, boolean>;

  // Pinning system
  pinnedNodes: Record<string, boolean>;

  // Layout system
  currentLayout: GraphLayout;

  // Visibility state
  visibleEntityTypes: Record<EntityType, boolean>;
  visibleEdgeTypes: Record<RelationType, boolean>;

  // Cache settings
  showAllCachedNodes: boolean;
  traversalDepth: number;

  // Statistics
  totalNodeCount: number;
  totalEdgeCount: number;
  entityTypeStats: Record<EntityType, number> & {
    total: number;
    visible: number;
  };
  edgeTypeStats: Record<RelationType, number> & {
    total: number;
    visible: number;
  };
  lastSearchStats: Record<string, unknown>;

  // Node state management
  nodeDepths: Record<string, number>;

  // Computed getters (cached to prevent infinite loops)
  cachedVisibleNodes: GraphNode[];

  // Provider reference
  provider: GraphProvider | null;
  providerType: string | null;
}

interface GraphActions {
  // Essential methods
  addNode: (node: GraphNode) => void;
  addNodes: (nodes: GraphNode[]) => void;
  addEdge: (edge: GraphEdge) => void;
  addEdges: (edges: GraphEdge[]) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  getNode: (nodeId: string) => GraphNode | undefined;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;

  // Selection and interaction
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;

  // Pinning system
  pinNode: (nodeId: string) => void;
  unpinNode: (nodeId: string) => void;
  clearAllPinnedNodes: () => void;
  isPinned: (nodeId: string) => boolean;

  // Layout system
  setLayout: (layout: GraphLayout) => void;
  applyCurrentLayout: () => void;

  // Visibility state
  toggleEntityTypeVisibility: (entityType: EntityType) => void;
  toggleEdgeTypeVisibility: (edgeType: RelationType) => void;
  setEntityTypeVisibility: (entityType: EntityType, visible: boolean) => void;
  setEdgeTypeVisibility: (edgeType: RelationType, visible: boolean) => void;
  setAllEntityTypesVisible: (visible: boolean) => void;
  resetEntityTypesToDefaults: () => void;
  getEntityTypeStats: () => {
    total: Record<EntityType, number>;
    visible: Record<EntityType, number>;
    searchResults: Record<EntityType, number>;
  };
  getVisibleNodes: () => GraphNode[];

  // Cache settings
  setShowAllCachedNodes: (show: boolean) => void;
  setTraversalDepth: (depth: number) => void;

  // Statistics
  updateSearchStats: (stats: Record<EntityType, number>) => void;

  // Node state management
  markNodeAsLoading: (nodeId: string) => void;
  markNodeAsLoaded: (nodeId: string) => void;
  markNodeAsError: (nodeId: string) => void;
  calculateNodeDepths: () => void;
  getMinimalNodes: () => GraphNode[];
  getNodesWithinDepth: (depth: number) => GraphNode[];

  // Graph algorithms
  getNeighbors: (nodeId: string) => GraphNode[];
  getConnectedEdges: (nodeId: string) => GraphEdge[];
  findShortestPath: (sourceId: string, targetId: string) => string[];
  getConnectedComponent: (nodeId: string) => string[];

  // Provider reference
  setProvider: (provider: GraphProvider) => void;
  setProviderType: (providerType: string) => void;

  // Hydration state
  hasPlaceholderOrLoadingNodes: () => boolean;

  // Index signature to satisfy constraint
  [key: string]: (...args: never[]) => void;
}

// Helper functions
function getNeighborsForNode(state: GraphState, nodeId: string): GraphNode[] {
  const neighbors: GraphNode[] = [];
  const edges = Object.values(state.edges);

  edges.forEach((edge: GraphEdge) => {
    if (edge.source === nodeId) {
      neighbors.push(state.nodes[edge.target]);
    } else if (edge.target === nodeId) {
      neighbors.push(state.nodes[edge.source]);
    }
  });

  return neighbors;
}

function findShortestPathBFS(
  state: GraphState,
  sourceId: string,
  targetId: string,
): string[] {
  if (sourceId === targetId) return [sourceId];

  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [];
  const edges = Object.values(state.edges);

  queue.push({ id: sourceId, path: [sourceId] });
  visited.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const nextIds = findNeighborIds(edges, current.id);
    for (const nextId of nextIds) {
      if (!visited.has(nextId)) {
        const newPath = [...current.path, nextId];

        if (nextId === targetId) {
          return newPath;
        }

        visited.add(nextId);
        queue.push({ id: nextId, path: newPath });
      }
    }
  }

  return []; // No path found
}

function findNeighborIds(edges: GraphEdge[], nodeId: string): string[] {
  const neighbors: string[] = [];

  for (const edge of edges) {
    if (edge.source === nodeId) {
      neighbors.push(edge.target);
    } else if (edge.target === nodeId) {
      neighbors.push(edge.source);
    }
  }

  return neighbors;
}

export const useGraphStore = createTrackedStore<GraphState, GraphActions>(
  {
    name: "graph-store",
    initialState: {
      // Core state
      nodes: {},
      edges: {},
      isLoading: false,
      error: null,
      cachedVisibleNodes: [],
      provider: null,

      // Selection and interaction
      selectedNodeId: null,
      hoveredNodeId: null,
      selectedNodes: {},

      // Node depths and traversal
      nodeDepths: {},

      // Pinning system
      pinnedNodes: {},
      providerType: null,

      // Layout system
      currentLayout: {
        type: "force",
        options: { iterations: 100, strength: -200, distance: 150 },
      },

      // Cache settings
      showAllCachedNodes: false,
      traversalDepth: 2,

      // Statistics
      totalNodeCount: 0,
      totalEdgeCount: 0,
      lastSearchStats: {},
      entityTypeStats: {
        concepts: 0,
        topics: 0,
        keywords: 0,
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        publishers: 0,
        funders: 0,
        total: 0,
        visible: 0,
      },
      edgeTypeStats: {
        [RelationType.AUTHORED]: 0,
        [RelationType.AFFILIATED]: 0,
        [RelationType.PUBLISHED_IN]: 0,
        [RelationType.FUNDED_BY]: 0,
        [RelationType.REFERENCES]: 0,
        [RelationType.RELATED_TO]: 0,
        [RelationType.SOURCE_PUBLISHED_BY]: 0,
        [RelationType.INSTITUTION_CHILD_OF]: 0,
        [RelationType.PUBLISHER_CHILD_OF]: 0,
        [RelationType.WORK_HAS_TOPIC]: 0,
        [RelationType.WORK_HAS_KEYWORD]: 0,
        [RelationType.AUTHOR_RESEARCHES]: 0,
        [RelationType.INSTITUTION_LOCATED_IN]: 0,
        [RelationType.FUNDER_LOCATED_IN]: 0,
        [RelationType.TOPIC_PART_OF_FIELD]: 0,
        total: 0,
        visible: 0,
      },

      // Minimal visibility state
      visibleEntityTypes: {
        concepts: true,
        topics: true,
        keywords: true,
        works: true,
        authors: true,
        sources: true,
        institutions: true,
        publishers: true,
        funders: true,
      },

      visibleEdgeTypes: {
        [RelationType.AUTHORED]: true,
        [RelationType.AFFILIATED]: true,
        [RelationType.PUBLISHED_IN]: true,
        [RelationType.FUNDED_BY]: true,
        [RelationType.REFERENCES]: true,
        [RelationType.RELATED_TO]: true,
        [RelationType.SOURCE_PUBLISHED_BY]: false,
        [RelationType.INSTITUTION_CHILD_OF]: false,
        [RelationType.PUBLISHER_CHILD_OF]: false,
        [RelationType.WORK_HAS_TOPIC]: false,
        [RelationType.WORK_HAS_KEYWORD]: false,
        [RelationType.AUTHOR_RESEARCHES]: false,
        [RelationType.INSTITUTION_LOCATED_IN]: false,
        [RelationType.FUNDER_LOCATED_IN]: false,
        [RelationType.TOPIC_PART_OF_FIELD]: false,
      },
    },
    persist: {
      enabled: true,
      storage: "hybrid",
      config: {
        dbName: "academic-explorer",
        storeName: "graph-store",
        version: 1,
      },
      partialize: (state) => ({
        visibleEntityTypes: state.visibleEntityTypes,
        visibleEdgeTypes: state.visibleEdgeTypes,
      }),
    },
  },
  (set, get) => ({
    // Essential methods
    addNode: (node) => {
      set((draft) => {
        draft.nodes[node.id] = node;
      });
      // Notify provider if available
      const state = get();
      if (state.provider) {
        state.provider.addNode(node);
      }
    },

    setGraphData: (nodes, edges) => {
      const nodesRecord: Record<string, GraphNode> = {};
      const edgesRecord: Record<string, GraphEdge> = {};

      nodes.forEach((node) => {
        nodesRecord[node.id] = node;
      });
      edges.forEach((edge) => {
        edgesRecord[edge.id] = edge;
      });

      set((draft) => {
        draft.nodes = nodesRecord;
        draft.edges = edgesRecord;
      });

      // CRITICAL FIX: Don't immediately recompute to prevent infinite loops
      // Caches will be recomputed on-demand when accessed
    },

    setLoading: (loading) =>
      set((draft) => {
        draft.isLoading = loading;
      }),
    setError: (error) =>
      set((draft) => {
        draft.error = error;
      }),

    clear: () =>
      set((draft) => {
        draft.nodes = {};
        draft.edges = {};
        draft.nodeDepths = {};
        draft.cachedVisibleNodes = [];
        draft.error = null;
      }),

    // Cached visible nodes getter
    getVisibleNodes: () => {
      const state = get() as GraphState;
      const nodes = Object.values(state.nodes);
      return nodes.filter((node) => state.visibleEntityTypes[node.entityType]);
    },

    // Additional CRUD methods
    addNodes: (nodes) => {
      set((draft) => {
        nodes.forEach((node) => {
          draft.nodes[node.id] = node;
        });
      });
      // Notify provider if available
      const state = get();
      if (state.provider) {
        nodes.forEach((node) => {
          if (state.provider) {
            state.provider.addNode(node);
          }
        });
      }
    },

    addEdges: (edges) => {
      set((draft) => {
        edges.forEach((edge) => {
          draft.edges[edge.id] = edge;
        });
      });
    },

    removeNode: (nodeId) => {
      const state = get() as GraphState;

      // Find connected edges to remove
      const connectedEdges = Object.values(state.edges).filter(
        (edge) => edge.source === nodeId || edge.target === nodeId,
      );

      set((draft) => {
        // Remove node using destructuring
        const { [nodeId]: _removedNode, ...remainingNodes } = draft.nodes;
        draft.nodes = remainingNodes;

        // Remove connected edges using destructuring
        const edgeIdsToRemove = new Set(connectedEdges.map((edge) => edge.id));
        const remainingEdges: Record<string, GraphEdge> = {};
        Object.entries(draft.edges).forEach(([edgeId, edge]) => {
          if (!edgeIdsToRemove.has(edgeId)) {
            remainingEdges[edgeId] = edge;
          }
        });
        draft.edges = remainingEdges;

        // Clean up pinning using destructuring
        const { [nodeId]: _removedPin, ...remainingPinned } = draft.pinnedNodes;
        draft.pinnedNodes = remainingPinned;

        // Clean up selection
        if (draft.selectedNodeId === nodeId) {
          draft.selectedNodeId = null;
        }
        if (draft.hoveredNodeId === nodeId) {
          draft.hoveredNodeId = null;
        }
        const { [nodeId]: _removedSelection, ...remainingSelected } =
          draft.selectedNodes;
        draft.selectedNodes = remainingSelected;
      });

      // Notify provider
      if (state.provider) {
        state.provider.removeNode(nodeId);
        connectedEdges.forEach((edge) => {
          if (state.provider) {
            state.provider.removeEdge(edge.id);
          }
        });
      }
    },

    removeEdge: (edgeId) => {
      set((draft) => {
        const { [edgeId]: _removedEdge, ...remainingEdges } = draft.edges;
        draft.edges = remainingEdges;
      });
    },

    updateNode: (nodeId, updates) => {
      set((draft) => {
        draft.nodes[nodeId] = { ...draft.nodes[nodeId], ...updates };
      });
    },

    getNode: (nodeId) => {
      const state = get() as GraphState;
      return state.nodes[nodeId];
    },

    // Selection methods
    selectNode: (nodeId) => {
      set((draft) => {
        draft.selectedNodeId = nodeId;
      });
    },

    addToSelection: (nodeId) => {
      set((draft) => {
        draft.selectedNodes[nodeId] = true;
      });
    },

    clearSelection: () => {
      set((draft) => {
        draft.selectedNodeId = null;
        draft.selectedNodes = {};
      });
    },

    // Pinning methods
    pinNode: (nodeId) => {
      set((draft) => {
        draft.pinnedNodes[nodeId] = true;
      });
    },

    unpinNode: (nodeId) => {
      set((draft) => {
        const { [nodeId]: _removedPin, ...remainingPinned } = draft.pinnedNodes;
        draft.pinnedNodes = remainingPinned;
      });
    },

    clearAllPinnedNodes: () => {
      set((draft) => {
        draft.pinnedNodes = {};
      });
    },

    isPinned: (nodeId) => {
      const state = get() as GraphState;
      return state.pinnedNodes[nodeId] ?? false;
    },

    // Layout methods
    setLayout: (layout) => {
      set((draft) => {
        draft.currentLayout = layout;
      });
      // Auto-apply to provider
      const state = get();
      if (state.provider) {
        state.provider.applyLayout(layout);
      }
    },

    // Visibility methods
    toggleEdgeTypeVisibility: (edgeType) => {
      set((draft) => {
        draft.visibleEdgeTypes[edgeType] = !draft.visibleEdgeTypes[edgeType];
      });
    },

    setEntityTypeVisibility: (entityType, visible) => {
      set((draft) => {
        if (visible) {
          draft.visibleEntityTypes[entityType] = true;
        } else {
          draft.visibleEntityTypes[entityType] = false;
        }
      });
    },

    // Cache settings
    setShowAllCachedNodes: (show) => {
      set((draft) => {
        draft.showAllCachedNodes = show;
      });
    },

    setTraversalDepth: (depth) => {
      set((draft) => {
        draft.traversalDepth = Math.max(1, depth);
      });
    },

    // Statistics methods
    updateSearchStats: (stats) => {
      set((draft) => {
        draft.lastSearchStats = stats;
      });
    },

    getMinimalNodes: () => {
      const state = get() as GraphState;
      return Object.values(state.nodes);
    },

    // Missing selection methods
    hoverNode: (nodeId) => {
      set((draft) => {
        draft.hoveredNodeId = nodeId;
      });
    },

    removeFromSelection: (nodeId) => {
      set((draft) => {
        const { [nodeId]: _removedSelection, ...remainingSelected } =
          draft.selectedNodes;
        draft.selectedNodes = remainingSelected;
      });
    },

    // Missing edge method
    addEdge: (edge) => {
      set((draft) => {
        draft.edges[edge.id] = edge;
      });
    },

    // Missing layout method
    applyCurrentLayout: () => {
      const state = get();
      if (state.provider) {
        state.provider.applyLayout(state.currentLayout);
      }
    },

    // Missing visibility methods
    toggleEntityTypeVisibility: (entityType) => {
      set((draft) => {
        draft.visibleEntityTypes[entityType] =
          !draft.visibleEntityTypes[entityType];
      });
    },

    setEdgeTypeVisibility: (edgeType, visible) => {
      set((draft) => {
        draft.visibleEdgeTypes[edgeType] = visible;
      });
    },

    setAllEntityTypesVisible: (visible) => {
      set((draft) => {
        Object.keys(draft.visibleEntityTypes).forEach((type) => {
          draft.visibleEntityTypes[type as EntityType] = visible;
        });
      });
    },

    resetEntityTypesToDefaults: () => {
      set((draft) => {
        draft.visibleEntityTypes = {
          concepts: true,
          topics: true,
          keywords: true,
          works: true,
          authors: true,
          sources: true,
          institutions: true,
          publishers: true,
          funders: true,
        };
      });
    },

    getEntityTypeStats: () => {
      const state = get() as GraphState;
      const nodes = Object.values(state.nodes);
      const total: Record<EntityType, number> = {} as Record<
        EntityType,
        number
      >;
      const visible: Record<EntityType, number> = {} as Record<
        EntityType,
        number
      >;
      const searchResults: Record<EntityType, number> = {} as Record<
        EntityType,
        number
      >;

      // Initialize counts for all entity types
      const allEntityTypes: EntityType[] = [
        "concepts",
        "topics",
        "keywords",
        "works",
        "authors",
        "sources",
        "institutions",
        "publishers",
        "funders",
      ];
      allEntityTypes.forEach((type) => {
        total[type] = 0;
        visible[type] = 0;
        searchResults[type] = (state.lastSearchStats[type] as number) || 0;
      });

      // Count nodes
      nodes.forEach((node) => {
        total[node.entityType]++;
        if (state.visibleEntityTypes[node.entityType]) {
          visible[node.entityType]++;
        }
      });

      return { total, visible, searchResults };
    },

    // Missing node depth and traversal methods
    calculateNodeDepths: () => {
      const state = get() as GraphState;
      const { nodes } = state;
      const { edges } = state;

      // Simple BFS implementation to calculate depths
      const depths: Record<string, number> = {};
      const visited = new Set<string>();
      const queue: Array<{ id: string; depth: number }> = [];

      // Find the first pinned node or first node as root
      const pinnedNodeIds = Object.keys(state.pinnedNodes).filter(
        (id) => state.pinnedNodes[id],
      );
      const rootNode = pinnedNodeIds[0] || Object.keys(nodes)[0];

      if (rootNode) {
        queue.push({ id: rootNode, depth: 0 });
        depths[rootNode] = 0;
        visited.add(rootNode);

        while (queue.length > 0) {
          const current = queue.shift();
          if (!current) break;
          const { id: currentId, depth } = current;

          // Find connected nodes
          Object.values(edges).forEach((edge) => {
            const connectedId =
              edge.source === currentId
                ? edge.target
                : edge.target === currentId
                  ? edge.source
                  : null;

            if (connectedId && !visited.has(connectedId)) {
              visited.add(connectedId);
              depths[connectedId] = depth + 1;
              queue.push({ id: connectedId, depth: depth + 1 });
            }
          });
        }
      }

      set((draft) => {
        draft.nodeDepths = depths;
      });
    },

    getNodesWithinDepth: (depth) => {
      const state = get() as GraphState;
      const nodes = Object.values(state.nodes);

      // If no depths calculated, return empty array unless depth is Infinity
      if (Object.keys(state.nodeDepths).length === 0) {
        return depth === Infinity ? nodes : [];
      }

      return nodes.filter((node) => {
        const nodeDepth = state.nodeDepths[node.id];
        return nodeDepth <= depth;
      });
    },

    // Graph algorithm implementations
    getNeighbors: (nodeId) => {
      const state = get() as GraphState;
      return getNeighborsForNode(state, nodeId);
    },

    findShortestPath: (sourceId, targetId) => {
      return findShortestPathBFS(get() as GraphState, sourceId, targetId);
    },

    getConnectedEdges: (nodeId) => {
      const state = get() as GraphState;
      return Object.values(state.edges).filter(
        (edge) => edge.source === nodeId || edge.target === nodeId,
      );
    },

    getConnectedComponent: (nodeId) => {
      const state = get() as GraphState;
      const visited = new Set<string>();
      const component: string[] = [];
      const queue = [nodeId];
      const edges = Object.values(state.edges);

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId) break;
        if (visited.has(currentId)) continue;

        visited.add(currentId);
        component.push(currentId);

        // Find connected nodes
        edges.forEach((edge) => {
          const connectedId =
            edge.source === currentId
              ? edge.target
              : edge.target === currentId
                ? edge.source
                : null;

          if (connectedId && !visited.has(connectedId)) {
            queue.push(connectedId);
          }
        });
      }

      return component;
    },

    // Missing state management methods
    markNodeAsLoading: (nodeId) => {
      set((draft) => {
        draft.nodes[nodeId].metadata = {
          ...draft.nodes[nodeId].metadata,
          loading: true,
        };
      });
    },

    markNodeAsLoaded: (nodeId) => {
      set((draft) => {
        draft.nodes[nodeId].metadata = {
          ...draft.nodes[nodeId].metadata,
          loading: false,
        };
      });
    },

    markNodeAsError: (nodeId) => {
      set((draft) => {
        draft.nodes[nodeId].metadata = {
          ...draft.nodes[nodeId].metadata,
          loading: false,
          error: true,
        };
      });
    },

    // Provider methods
    setProvider: (provider) => {
      const state = get();
      set((draft) => {
        draft.provider = provider;
      });

      // Transfer existing data to provider
      const nodes = Object.values(state.nodes);
      const edges = Object.values(state.edges);
      provider.setNodes(nodes);
      provider.setEdges(edges);
    },

    setProviderType: (providerType) => {
      set((draft) => {
        draft.providerType = providerType;
      });
    },

    // Hydration state methods
    hasPlaceholderOrLoadingNodes: () => {
      // Always return false since we no longer have artificial hydration levels
      return false;
    },
  }),
).useStore;
