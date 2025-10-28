/**
 * Graph store with React Context and useReducer
 * Replaces Zustand with built-in React patterns
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import type {
  GraphNode,
  GraphEdge,
  GraphLayout,
  EntityType,
} from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";

export interface GraphState {
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
  entityTypeStats: Record<EntityType, { total: number; visible: number }> & {
    total: number;
    visible: number;
  };
  edgeTypeStats: Record<RelationType, { total: number; visible: number }> & {
    total: number;
    visible: number;
  };
  lastSearchStats: Record<string, unknown>;

  // Node state management
  nodeDepths: Record<string, number>;

  // Provider reference
  provider: string | null;
  providerType: string | null;
}

// Initial state
const getInitialState = (): GraphState => ({
  nodes: {},
  edges: {},
  isLoading: false,
  error: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  selectedNodes: {},
  pinnedNodes: {},
  currentLayout: { type: "force", options: {} },
  visibleEntityTypes: {
    works: true,
    authors: true,
    sources: true,
    institutions: true,
    topics: true,
    concepts: true,
    publishers: true,
    funders: true,
    keywords: true,
  },
  visibleEdgeTypes: {
    [RelationType.AUTHORED]: true,
    [RelationType.AFFILIATED]: true,
    [RelationType.PUBLISHED_IN]: true,
    [RelationType.FUNDED_BY]: true,
    [RelationType.REFERENCES]: true,
    [RelationType.RELATED_TO]: true,
    [RelationType.SOURCE_PUBLISHED_BY]: true,
    [RelationType.INSTITUTION_CHILD_OF]: true,
    [RelationType.PUBLISHER_CHILD_OF]: true,
    [RelationType.WORK_HAS_TOPIC]: true,
    [RelationType.WORK_HAS_KEYWORD]: true,
    [RelationType.AUTHOR_RESEARCHES]: true,
    [RelationType.INSTITUTION_LOCATED_IN]: true,
    [RelationType.FUNDER_LOCATED_IN]: true,
    [RelationType.TOPIC_PART_OF_FIELD]: true,
  },
  showAllCachedNodes: false,
  traversalDepth: 3,
  totalNodeCount: 0,
  totalEdgeCount: 0,
  entityTypeStats: {
    works: { total: 0, visible: 0 },
    authors: { total: 0, visible: 0 },
    sources: { total: 0, visible: 0 },
    institutions: { total: 0, visible: 0 },
    topics: { total: 0, visible: 0 },
    concepts: { total: 0, visible: 0 },
    publishers: { total: 0, visible: 0 },
    funders: { total: 0, visible: 0 },
    keywords: { total: 0, visible: 0 },
    total: 0,
    visible: 0,
  },
  edgeTypeStats: {
    [RelationType.AUTHORED]: { total: 0, visible: 0 },
    [RelationType.AFFILIATED]: { total: 0, visible: 0 },
    [RelationType.PUBLISHED_IN]: { total: 0, visible: 0 },
    [RelationType.FUNDED_BY]: { total: 0, visible: 0 },
    [RelationType.REFERENCES]: { total: 0, visible: 0 },
    [RelationType.RELATED_TO]: { total: 0, visible: 0 },
    [RelationType.SOURCE_PUBLISHED_BY]: { total: 0, visible: 0 },
    [RelationType.INSTITUTION_CHILD_OF]: { total: 0, visible: 0 },
    [RelationType.PUBLISHER_CHILD_OF]: { total: 0, visible: 0 },
    [RelationType.WORK_HAS_TOPIC]: { total: 0, visible: 0 },
    [RelationType.WORK_HAS_KEYWORD]: { total: 0, visible: 0 },
    [RelationType.AUTHOR_RESEARCHES]: { total: 0, visible: 0 },
    [RelationType.INSTITUTION_LOCATED_IN]: { total: 0, visible: 0 },
    [RelationType.FUNDER_LOCATED_IN]: { total: 0, visible: 0 },
    [RelationType.TOPIC_PART_OF_FIELD]: { total: 0, visible: 0 },
    total: 0,
    visible: 0,
  },
  lastSearchStats: {},
  nodeDepths: {},
  provider: null,
  providerType: null,
});

// Action types
type GraphAction =
  | { type: "ADD_NODE"; payload: GraphNode }
  | { type: "ADD_NODES"; payload: GraphNode[] }
  | { type: "ADD_EDGE"; payload: GraphEdge }
  | { type: "ADD_EDGES"; payload: GraphEdge[] }
  | { type: "REMOVE_NODE"; payload: string }
  | { type: "REMOVE_EDGE"; payload: string }
  | { type: "UPDATE_NODE"; payload: { nodeId: string; updates: Partial<GraphNode> } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR" }
  | { type: "SET_GRAPH_DATA"; payload: { nodes: GraphNode[]; edges: GraphEdge[] } }
  | { type: "SELECT_NODE"; payload: string | null }
  | { type: "HOVER_NODE"; payload: string | null }
  | { type: "ADD_TO_SELECTION"; payload: string }
  | { type: "REMOVE_FROM_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "PIN_NODE"; payload: string }
  | { type: "UNPIN_NODE"; payload: string }
  | { type: "CLEAR_ALL_PINNED_NODES" }
  | { type: "SET_LAYOUT"; payload: GraphLayout }
  | { type: "TOGGLE_ENTITY_TYPE_VISIBILITY"; payload: EntityType }
  | { type: "TOGGLE_EDGE_TYPE_VISIBILITY"; payload: RelationType }
  | { type: "SET_ENTITY_TYPE_VISIBILITY"; payload: { entityType: EntityType; visible: boolean } }
  | { type: "SET_EDGE_TYPE_VISIBILITY"; payload: { edgeType: RelationType; visible: boolean } }
  | { type: "SET_ALL_ENTITY_TYPES_VISIBLE"; payload: boolean }
  | { type: "RESET_ENTITY_TYPES_TO_DEFAULTS" }
  | { type: "SET_SHOW_ALL_CACHED_NODES"; payload: boolean }
  | { type: "SET_TRAVERSAL_DEPTH"; payload: number }
  | { type: "UPDATE_SEARCH_STATS"; payload: Record<EntityType, number> }
  | { type: "MARK_NODE_AS_LOADING"; payload: string }
  | { type: "MARK_NODE_AS_LOADED"; payload: string }
  | { type: "MARK_NODE_AS_ERROR"; payload: string }
  | { type: "CALCULATE_NODE_DEPTHS" }
  | { type: "SET_PROVIDER"; payload: string }
  | { type: "SET_PROVIDER_TYPE"; payload: string };

// Reducer
const graphReducer = (state: GraphState, action: GraphAction): GraphState => {
  switch (action.type) {
    case "ADD_NODE":
      return {
        ...state,
        nodes: { ...state.nodes, [action.payload.id]: action.payload },
        totalNodeCount: state.totalNodeCount + 1,
      };

    case "ADD_NODES": {
      const newNodes = action.payload.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {} as Record<string, GraphNode>);
      return {
        ...state,
        nodes: { ...state.nodes, ...newNodes },
        totalNodeCount: state.totalNodeCount + action.payload.length,
      };
    }

    case "ADD_EDGE":
      return {
        ...state,
        edges: { ...state.edges, [action.payload.id]: action.payload },
        totalEdgeCount: state.totalEdgeCount + 1,
      };

    case "ADD_EDGES": {
      const newEdges = action.payload.reduce((acc, edge) => {
        acc[edge.id] = edge;
        return acc;
      }, {} as Record<string, GraphEdge>);
      return {
        ...state,
        edges: { ...state.edges, ...newEdges },
        totalEdgeCount: state.totalEdgeCount + action.payload.length,
      };
    }

    case "REMOVE_NODE": {
      const { [action.payload]: _removedNode, ...remainingNodes } = state.nodes;
      return {
        ...state,
        nodes: remainingNodes,
        totalNodeCount: Math.max(0, state.totalNodeCount - 1),
      };
    }

    case "REMOVE_EDGE": {
      const { [action.payload]: _removedEdge, ...remainingEdges } = state.edges;
      return {
        ...state,
        edges: remainingEdges,
        totalEdgeCount: Math.max(0, state.totalEdgeCount - 1),
      };
    }

    case "UPDATE_NODE":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload.nodeId]: {
            ...state.nodes[action.payload.nodeId],
            ...action.payload.updates,
          },
        },
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "CLEAR":
      return getInitialState();

    case "SET_GRAPH_DATA": {
      const nodes = action.payload.nodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {} as Record<string, GraphNode>);
      const edges = action.payload.edges.reduce((acc, edge) => {
        acc[edge.id] = edge;
        return acc;
      }, {} as Record<string, GraphEdge>);
      return {
        ...state,
        nodes,
        edges,
        totalNodeCount: action.payload.nodes.length,
        totalEdgeCount: action.payload.edges.length,
      };
    }

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.payload };

    case "HOVER_NODE":
      return { ...state, hoveredNodeId: action.payload };

    case "ADD_TO_SELECTION":
      return {
        ...state,
        selectedNodes: { ...state.selectedNodes, [action.payload]: true },
      };

    case "REMOVE_FROM_SELECTION": {
      const { [action.payload]: _removed, ...rest } = state.selectedNodes;
      return { ...state, selectedNodes: rest };
    }

    case "CLEAR_SELECTION":
      return { ...state, selectedNodes: {}, selectedNodeId: null };

    case "PIN_NODE":
      return { ...state, pinnedNodes: { ...state.pinnedNodes, [action.payload]: true } };

    case "UNPIN_NODE": {
      const { [action.payload]: _removedPin, ...remainingPins } = state.pinnedNodes;
      return { ...state, pinnedNodes: remainingPins };
    }

    case "CLEAR_ALL_PINNED_NODES":
      return { ...state, pinnedNodes: {} };

    case "SET_LAYOUT":
      return { ...state, currentLayout: action.payload };

    case "TOGGLE_ENTITY_TYPE_VISIBILITY":
      return {
        ...state,
        visibleEntityTypes: {
          ...state.visibleEntityTypes,
          [action.payload]: !state.visibleEntityTypes[action.payload],
        },
      };

    case "TOGGLE_EDGE_TYPE_VISIBILITY":
      return {
        ...state,
        visibleEdgeTypes: {
          ...state.visibleEdgeTypes,
          [action.payload]: !state.visibleEdgeTypes[action.payload],
        },
      };

    case "SET_ENTITY_TYPE_VISIBILITY":
      return {
        ...state,
        visibleEntityTypes: {
          ...state.visibleEntityTypes,
          [action.payload.entityType]: action.payload.visible,
        },
      };

    case "SET_EDGE_TYPE_VISIBILITY":
      return {
        ...state,
        visibleEdgeTypes: {
          ...state.visibleEdgeTypes,
          [action.payload.edgeType]: action.payload.visible,
        },
      };

    case "SET_ALL_ENTITY_TYPES_VISIBLE": {
      const updatedEntityTypes = Object.keys(state.visibleEntityTypes).reduce(
        (acc, key) => ({ ...acc, [key]: action.payload }),
        {} as Record<EntityType, boolean>
      );
      return { ...state, visibleEntityTypes: updatedEntityTypes };
    }

    case "RESET_ENTITY_TYPES_TO_DEFAULTS":
      return {
        ...state,
        visibleEntityTypes: getInitialState().visibleEntityTypes,
      };

    case "SET_SHOW_ALL_CACHED_NODES":
      return { ...state, showAllCachedNodes: action.payload };

    case "SET_TRAVERSAL_DEPTH":
      return { ...state, traversalDepth: action.payload };

    case "UPDATE_SEARCH_STATS":
      return { ...state, lastSearchStats: action.payload };

    case "MARK_NODE_AS_LOADING":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload]: {
            ...state.nodes[action.payload],
            loading: true,
            error: undefined,
          },
        },
      };

    case "MARK_NODE_AS_LOADED":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload]: {
            ...state.nodes[action.payload],
            loading: false,
            error: undefined,
          },
        },
      };

    case "MARK_NODE_AS_ERROR":
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [action.payload]: {
            ...state.nodes[action.payload],
            loading: false,
            error: "Failed to load",
          },
        },
      };

    case "CALCULATE_NODE_DEPTHS": {
      const depths = calculateNodeDepths(state.nodes, state.edges);
      return { ...state, nodeDepths: depths };
    }

    case "SET_PROVIDER":
      return { ...state, provider: action.payload };

    case "SET_PROVIDER_TYPE":
      return { ...state, providerType: action.payload };

    default:
      return state;
  }
};

// Helper functions
function calculateNodeDepths(
  nodes: Record<string, GraphNode>,
  edges: Record<string, GraphEdge>
): Record<string, number> {
  const depths: Record<string, number> = {};
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; depth: number }> = [];

  // Find root nodes (nodes with no incoming edges)
  const edgeArray = Object.values(edges);
  const nodesWithIncomingEdges = new Set(
    edgeArray.map((edge) => edge.target)
  );
  const rootNodes = Object.keys(nodes).filter(
    (nodeId) => !nodesWithIncomingEdges.has(nodeId)
  );

  // Start BFS from root nodes
  rootNodes.forEach((rootId) => {
    queue.push({ nodeId: rootId, depth: 0 });
    visited.add(rootId);
  });

  while (queue.length > 0) {
    const shifted = queue.shift();
    if (!shifted) break;
    const { nodeId, depth } = shifted;
    depths[nodeId] = depth;

    // Find neighbors
    const neighbors = edgeArray
      .filter((edge) => edge.source === nodeId)
      .map((edge) => edge.target);

    neighbors.forEach((neighborId) => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ nodeId: neighborId, depth: depth + 1 });
      }
    });
  }

  return depths;
}

function findNeighborIds({
  edges,
  nodeId,
}: {
  edges: GraphEdge[];
  nodeId: string;
}): string[] {
  return edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => (edge.source === nodeId ? edge.target : edge.source));
}

// Context
const GraphContext = createContext<{
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
} | null>(null);

// Provider component
export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(graphReducer, getInitialState());

  const value = { state, dispatch };
  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
};

// Hook for using graph state
export const useGraphState = () => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error("useGraphState must be used within GraphProvider");
  }
  return context.state;
};

// Hook for using graph actions
export const useGraphActions = () => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error("useGraphActions must be used within GraphProvider");
  }

  return {
    // Essential methods
    addNode: (node: GraphNode) => context.dispatch({ type: "ADD_NODE", payload: node }),
    addNodes: (nodes: GraphNode[]) => context.dispatch({ type: "ADD_NODES", payload: nodes }),
    addEdge: (edge: GraphEdge) => context.dispatch({ type: "ADD_EDGE", payload: edge }),
    addEdges: (edges: GraphEdge[]) => context.dispatch({ type: "ADD_EDGES", payload: edges }),
    removeNode: (nodeId: string) => context.dispatch({ type: "REMOVE_NODE", payload: nodeId }),
    removeEdge: (edgeId: string) => context.dispatch({ type: "REMOVE_EDGE", payload: edgeId }),
    updateNode: (nodeId: string, updates: Partial<GraphNode>) =>
      context.dispatch({ type: "UPDATE_NODE", payload: { nodeId, updates } }),
    setLoading: (loading: boolean) => context.dispatch({ type: "SET_LOADING", payload: loading }),
    setError: (error: string | null) => context.dispatch({ type: "SET_ERROR", payload: error }),
    clear: () => context.dispatch({ type: "CLEAR" }),
    setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) =>
      context.dispatch({ type: "SET_GRAPH_DATA", payload: { nodes, edges } }),

    // Selection and interaction
    selectNode: (nodeId: string | null) => context.dispatch({ type: "SELECT_NODE", payload: nodeId }),
    hoverNode: (nodeId: string | null) => context.dispatch({ type: "HOVER_NODE", payload: nodeId }),
    addToSelection: (nodeId: string) => context.dispatch({ type: "ADD_TO_SELECTION", payload: nodeId }),
    removeFromSelection: (nodeId: string) => context.dispatch({ type: "REMOVE_FROM_SELECTION", payload: nodeId }),
    clearSelection: () => context.dispatch({ type: "CLEAR_SELECTION" }),

    // Pinning system
    pinNode: (nodeId: string) => context.dispatch({ type: "PIN_NODE", payload: nodeId }),
    unpinNode: (nodeId: string) => context.dispatch({ type: "UNPIN_NODE", payload: nodeId }),
    clearAllPinnedNodes: () => context.dispatch({ type: "CLEAR_ALL_PINNED_NODES" }),

    // Layout system
    setLayout: (layout: GraphLayout) => context.dispatch({ type: "SET_LAYOUT", payload: layout }),

    // Visibility state
    toggleEntityTypeVisibility: (entityType: EntityType) =>
      context.dispatch({ type: "TOGGLE_ENTITY_TYPE_VISIBILITY", payload: entityType }),
    toggleEdgeTypeVisibility: (edgeType: RelationType) =>
      context.dispatch({ type: "TOGGLE_EDGE_TYPE_VISIBILITY", payload: edgeType }),
    setEntityTypeVisibility: (entityType: EntityType, visible: boolean) =>
      context.dispatch({ type: "SET_ENTITY_TYPE_VISIBILITY", payload: { entityType, visible } }),
    setEdgeTypeVisibility: (edgeType: RelationType, visible: boolean) =>
      context.dispatch({ type: "SET_EDGE_TYPE_VISIBILITY", payload: { edgeType, visible } }),
    setAllEntityTypesVisible: (visible: boolean) =>
      context.dispatch({ type: "SET_ALL_ENTITY_TYPES_VISIBLE", payload: visible }),
    resetEntityTypesToDefaults: () => context.dispatch({ type: "RESET_ENTITY_TYPES_TO_DEFAULTS" }),

    // Cache settings
    setShowAllCachedNodes: (show: boolean) => context.dispatch({ type: "SET_SHOW_ALL_CACHED_NODES", payload: show }),
    setTraversalDepth: (depth: number) => context.dispatch({ type: "SET_TRAVERSAL_DEPTH", payload: depth }),

    // Statistics
    updateSearchStats: (stats: Record<EntityType, number>) =>
      context.dispatch({ type: "UPDATE_SEARCH_STATS", payload: stats }),

    // Node state management
    markNodeAsLoading: (nodeId: string) => context.dispatch({ type: "MARK_NODE_AS_LOADING", payload: nodeId }),
    markNodeAsLoaded: (nodeId: string) => context.dispatch({ type: "MARK_NODE_AS_LOADED", payload: nodeId }),
    markNodeAsError: (nodeId: string) => context.dispatch({ type: "MARK_NODE_AS_ERROR", payload: nodeId }),
    calculateNodeDepths: () => context.dispatch({ type: "CALCULATE_NODE_DEPTHS" }),

    // Provider reference
    setProvider: (provider: string) => context.dispatch({ type: "SET_PROVIDER", payload: provider }),
    setProviderType: (providerType: string) => context.dispatch({ type: "SET_PROVIDER_TYPE", payload: providerType }),
  };
};

// Combined hook for both state and actions
export const useGraphStore = () => {
  const state = useGraphState();
  const actions = useGraphActions();

  // Move all useCallback hooks to top level - cannot be inside useMemo!
  const getNeighbors = useCallback((nodeId: string): GraphNode[] => {
    const edges = Object.values(state.edges);
    const neighbors: GraphNode[] = [];

    edges.forEach((edge) => {
      if (edge.source === nodeId) {
        neighbors.push(state.nodes[edge.target]);
      } else if (edge.target === nodeId) {
        neighbors.push(state.nodes[edge.source]);
      }
    });

    return neighbors;
  }, [state.nodes, state.edges]);

  const getConnectedEdges = useCallback((nodeId: string): GraphEdge[] => {
    return Object.values(state.edges).filter(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );
  }, [state.edges]);

  const getVisibleNodes = useCallback((): GraphNode[] => {
    return Object.values(state.nodes).filter((node) =>
      state.visibleEntityTypes[node.entityType]
    );
  }, [state.nodes, state.visibleEntityTypes]);

  const getEntityTypeStats = useCallback(() => {
    const stats = {
      total: {} as Record<EntityType, number>,
      visible: {} as Record<EntityType, number>,
      searchResults: {} as Record<EntityType, number>,
    };

    Object.values(state.nodes).forEach((node) => {
      stats.total[node.entityType] = (stats.total[node.entityType] || 0) + 1;
      if (state.visibleEntityTypes[node.entityType]) {
        stats.visible[node.entityType] = (stats.visible[node.entityType] || 0) + 1;
      }
    });

    return stats;
  }, [state.nodes, state.visibleEntityTypes]);

  const getNode = useCallback((nodeId: string): GraphNode | undefined => {
    return state.nodes[nodeId];
  }, [state.nodes]);

  const isPinned = useCallback((nodeId: string): boolean => {
    return Boolean(state.pinnedNodes[nodeId]);
  }, [state.pinnedNodes]);

  const hasPlaceholderOrLoadingNodes = useCallback((): boolean => {
    return Object.values(state.nodes).some(
      (node) => node.loading || node.error
    );
  }, [state.nodes]);

  const getMinimalNodes = useCallback((): GraphNode[] => {
    // Return nodes with depth 0 (root nodes)
    return Object.values(state.nodes).filter(
      (node) => state.nodeDepths[node.id] === 0
    );
  }, [state.nodes, state.nodeDepths]);

  const getNodesWithinDepth = useCallback((depth: number): GraphNode[] => {
    return Object.values(state.nodes).filter(
      (node) => state.nodeDepths[node.id] !== undefined && state.nodeDepths[node.id] <= depth
    );
  }, [state.nodes, state.nodeDepths]);

  const findShortestPath = useCallback((sourceId: string, targetId: string): string[] => {
    if (sourceId === targetId) return [sourceId];
    if (!state.nodes[sourceId] || !state.nodes[targetId]) return [];

    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [];
    const edges = Object.values(state.edges);

    queue.push({ id: sourceId, path: [sourceId] });
    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      const nextIds = findNeighborIds({ edges, nodeId: current.id });
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

    return [];
  }, [state.nodes, state.edges]);

  const getConnectedComponent = useCallback((nodeId: string): string[] => {
    if (!state.nodes[nodeId]) return [];

    const visited = new Set<string>();
    const stack = [nodeId];
    const edges = Object.values(state.edges);

    while (stack.length > 0) {
      const popped = stack.pop();
      if (!popped) break;
      const current = popped;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = findNeighborIds({ edges, nodeId: current });
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor) && state.nodes[neighbor]) {
          stack.push(neighbor);
        }
      });
    }

    return Array.from(visited);
  }, [state.nodes, state.edges]);

  // Simple object with already-memoized functions - no hooks inside useMemo
  const computedValues = useMemo(() => ({
    getNeighbors,
    getConnectedEdges,
    getVisibleNodes,
    getEntityTypeStats,
    getNode,
    isPinned,
    hasPlaceholderOrLoadingNodes,
    getMinimalNodes,
    getNodesWithinDepth,
    findShortestPath,
    getConnectedComponent,
  }), [getNeighbors, getConnectedEdges, getVisibleNodes, getEntityTypeStats, getNode, isPinned, hasPlaceholderOrLoadingNodes, getMinimalNodes, getNodesWithinDepth, findShortestPath, getConnectedComponent]);

  return {
    ...state,
    ...actions,
    ...computedValues,
  };
};

// Selector hook for optimized re-renders
export const useGraphSelector = <T,>(selector: (state: GraphState) => T): T => {
  const state = useGraphState();
  return selector(state);
};

// Store object for non-react usage (provides getState method)
// This creates a store interface that can be used outside of React components
export const graphStore = (() => {
  let currentState: GraphState;
  let listeners: Array<(state: GraphState) => void> = [];

  const notifyListeners = () => {
    listeners.forEach(listener => listener(currentState));
  };

  const getState = (): GraphState => ({ ...currentState });

  const setState = (updater: GraphState | ((state: GraphState) => GraphState)) => {
    const newState = typeof updater === 'function' ? updater(currentState) : updater;
    currentState = newState;
    notifyListeners();
  };

  const subscribe = (listener: (state: GraphState) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  // Initialize state
  currentState = getInitialState();

  // Create actions object once
  const actions = {
      addNode: (node: GraphNode) => setState(state => graphReducer(state, { type: "ADD_NODE", payload: node })),
      addNodes: (nodes: GraphNode[]) => setState(state => graphReducer(state, { type: "ADD_NODES", payload: nodes })),
      addEdge: (edge: GraphEdge) => setState(state => graphReducer(state, { type: "ADD_EDGE", payload: edge })),
      addEdges: (edges: GraphEdge[]) => setState(state => graphReducer(state, { type: "ADD_EDGES", payload: edges })),
      removeNode: (nodeId: string) => setState(state => graphReducer(state, { type: "REMOVE_NODE", payload: nodeId })),
      removeEdge: (edgeId: string) => setState(state => graphReducer(state, { type: "REMOVE_EDGE", payload: edgeId })),
      updateNode: (nodeId: string, updates: Partial<GraphNode>) =>
        setState(state => graphReducer(state, { type: "UPDATE_NODE", payload: { nodeId, updates } })),
      setLoading: (loading: boolean) => setState(state => graphReducer(state, { type: "SET_LOADING", payload: loading })),
      setError: (error: string | null) => setState(state => graphReducer(state, { type: "SET_ERROR", payload: error })),
      clear: () => setState(getInitialState()),
      setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) =>
        setState(state => graphReducer(state, { type: "SET_GRAPH_DATA", payload: { nodes, edges } })),

      // Selection and interaction
      selectNode: (nodeId: string | null) => setState(state => graphReducer(state, { type: "SELECT_NODE", payload: nodeId })),
      hoverNode: (nodeId: string | null) => setState(state => graphReducer(state, { type: "HOVER_NODE", payload: nodeId })),
      addToSelection: (nodeId: string) => setState(state => graphReducer(state, { type: "ADD_TO_SELECTION", payload: nodeId })),
      removeFromSelection: (nodeId: string) => setState(state => graphReducer(state, { type: "REMOVE_FROM_SELECTION", payload: nodeId })),
      clearSelection: () => setState(state => graphReducer(state, { type: "CLEAR_SELECTION" })),

      // Pinning system
      pinNode: (nodeId: string) => setState(state => graphReducer(state, { type: "PIN_NODE", payload: nodeId })),
      unpinNode: (nodeId: string) => setState(state => graphReducer(state, { type: "UNPIN_NODE", payload: nodeId })),
      clearAllPinnedNodes: () => setState(state => graphReducer(state, { type: "CLEAR_ALL_PINNED_NODES" })),

      // Layout system
      setLayout: (layout: GraphLayout) => setState(state => graphReducer(state, { type: "SET_LAYOUT", payload: layout })),

      // Visibility state
      toggleEntityTypeVisibility: (entityType: EntityType) =>
        setState(state => graphReducer(state, { type: "TOGGLE_ENTITY_TYPE_VISIBILITY", payload: entityType })),
      toggleEdgeTypeVisibility: (edgeType: RelationType) =>
        setState(state => graphReducer(state, { type: "TOGGLE_EDGE_TYPE_VISIBILITY", payload: edgeType })),
      setEntityTypeVisibility: (entityType: EntityType, visible: boolean) =>
        setState(state => graphReducer(state, { type: "SET_ENTITY_TYPE_VISIBILITY", payload: { entityType, visible } })),
      setEdgeTypeVisibility: (edgeType: RelationType, visible: boolean) =>
        setState(state => graphReducer(state, { type: "SET_EDGE_TYPE_VISIBILITY", payload: { edgeType, visible } })),
      setAllEntityTypesVisible: (visible: boolean) =>
        setState(state => graphReducer(state, { type: "SET_ALL_ENTITY_TYPES_VISIBLE", payload: visible })),
      resetEntityTypesToDefaults: () => setState(state => graphReducer(state, { type: "RESET_ENTITY_TYPES_TO_DEFAULTS" })),

      // Cache settings
      setShowAllCachedNodes: (show: boolean) => setState(state => graphReducer(state, { type: "SET_SHOW_ALL_CACHED_NODES", payload: show })),
      setTraversalDepth: (depth: number) => setState(state => graphReducer(state, { type: "SET_TRAVERSAL_DEPTH", payload: depth })),

      // Statistics
      updateSearchStats: (stats: Record<EntityType, number>) =>
        setState(state => graphReducer(state, { type: "UPDATE_SEARCH_STATS", payload: stats })),

      // Node state management
      markNodeAsLoading: (nodeId: string) => setState(state => graphReducer(state, { type: "MARK_NODE_AS_LOADING", payload: nodeId })),
      markNodeAsLoaded: (nodeId: string) => setState(state => graphReducer(state, { type: "MARK_NODE_AS_LOADED", payload: nodeId })),
      markNodeAsError: (nodeId: string) => setState(state => graphReducer(state, { type: "MARK_NODE_AS_ERROR", payload: nodeId })),
      calculateNodeDepths: () => setState(state => graphReducer(state, { type: "CALCULATE_NODE_DEPTHS" })),

      // Provider reference
      setProvider: (provider: string) => setState(state => graphReducer(state, { type: "SET_PROVIDER", payload: provider })),
      setProviderType: (providerType: string) => setState(state => graphReducer(state, { type: "SET_PROVIDER_TYPE", payload: providerType })),
  };

  return {
    getState,
    setState,
    subscribe,
    // Expose all actions directly on the store
    ...actions,
    getActions: () => actions,
    // Getter methods for computed values
    getNode: (nodeId: string): GraphNode | undefined => {
      const state = getState();
      return state.nodes[nodeId];
    },
    getMinimalNodes: (): GraphNode[] => {
      const state = getState();
      return Object.values(state.nodes);
    },
    // Graph query methods
    getNeighbors: (nodeId: string): GraphNode[] => {
      const state = getState();
      const edges = Object.values(state.edges);
      const neighbors: GraphNode[] = [];

      edges.forEach((edge) => {
        if (edge.source === nodeId && state.nodes[edge.target]) {
          neighbors.push(state.nodes[edge.target]);
        } else if (edge.target === nodeId && state.nodes[edge.source]) {
          neighbors.push(state.nodes[edge.source]);
        }
      });

      return neighbors;
    },
    getConnectedEdges: (nodeId: string): GraphEdge[] => {
      const state = getState();
      return Object.values(state.edges).filter(
        (edge) => edge.source === nodeId || edge.target === nodeId
      );
    },
    getVisibleNodes: (): GraphNode[] => {
      const state = getState();
      return Object.values(state.nodes).filter((node) =>
        state.visibleEntityTypes[node.entityType]
      );
    },
    getEntityTypeStats: () => {
      const state = getState();
      const stats = {
        total: {} as Record<EntityType, number>,
        visible: {} as Record<EntityType, number>,
        searchResults: {} as Record<EntityType, number>,
      };

      Object.values(state.nodes).forEach((node) => {
        stats.total[node.entityType] = (stats.total[node.entityType] || 0) + 1;
        if (state.visibleEntityTypes[node.entityType]) {
          stats.visible[node.entityType] = (stats.visible[node.entityType] || 0) + 1;
        }
      });

      return stats;
    },
    isPinned: (nodeId: string): boolean => {
      const state = getState();
      return Boolean(state.pinnedNodes[nodeId]);
    },
    getNodesWithinDepth: (depth: number): GraphNode[] => {
      const state = getState();
      return Object.values(state.nodes).filter(
        (node) => state.nodeDepths[node.id] !== undefined && state.nodeDepths[node.id] <= depth
      );
    },
    findShortestPath: (sourceId: string, targetId: string): string[] => {
      const state = getState();
      if (sourceId === targetId) return [sourceId];
      if (!state.nodes[sourceId] || !state.nodes[targetId]) return [];

      const visited = new Set<string>();
      const queue: Array<{ id: string; path: string[] }> = [];
      const edges = Object.values(state.edges);

      queue.push({ id: sourceId, path: [sourceId] });
      visited.add(sourceId);

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;

        const nextIds = findNeighborIds({ edges, nodeId: current.id });
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

      return [];
    },
    getConnectedComponent: (nodeId: string): string[] => {
      const state = getState();
      if (!state.nodes[nodeId]) return [nodeId];

      const visited = new Set<string>();
      const stack = [nodeId];
      const edges = Object.values(state.edges);

      while (stack.length > 0) {
        const popped = stack.pop();
        if (!popped) break;
        const current = popped;
        if (visited.has(current)) continue;
        visited.add(current);

        const neighbors = findNeighborIds({ edges, nodeId: current });
        neighbors.forEach((neighbor) => {
          if (!visited.has(neighbor) && state.nodes[neighbor]) {
            stack.push(neighbor);
          }
        });
      }

      return Array.from(visited);
    },
    // Property getter for nodes
    get nodes(): Record<string, GraphNode> {
      return getState().nodes;
    },
  };
})();

// Export internal hook for animated graph store
export const _useGraphStore = useGraphStore;