/**
 * Graph store for provider-agnostic graph state management
 * Uses Zustand with Immer for immutable state updates that maintain stable references
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
// Using plain objects instead of Maps/Sets for stable references
// No need for enableMapSet() with plain objects
import type {
	GraphNode,
	GraphEdge,
	GraphProvider,
	ProviderType,
	GraphLayout,
	EntityType,
} from "@/lib/graph/types";
import { RelationType } from "@/lib/graph/types";
import { DEFAULT_FORCE_PARAMS } from "@/lib/graph/force-params";
import { graphEventSystem, entityEventSystem } from "@/lib/graph/events";
import { logger } from "@/lib/logger";

// Helper function to create initial edge type stats
const createInitialEdgeTypeStats = () => ({
	visible: {
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
		[RelationType.TOPIC_PART_OF_FIELD]: 0
	},
	total: {
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
		[RelationType.TOPIC_PART_OF_FIELD]: 0
	}
});

interface GraphState {
  // Data (library agnostic) - using plain objects for stable references
  nodes: Record<string, GraphNode | undefined>;
  edges: Record<string, GraphEdge | undefined>;

  // Selection and interaction - using arrays/objects for stable references
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedNodes: Record<string, boolean>; // object instead of Set
  pinnedNodes: Record<string, boolean>; // object instead of Set


  // Cache visibility and traversal control
  showAllCachedNodes: boolean;
  traversalDepth: number;
  nodeDepths: Record<string, number>; // object instead of Map

  // Provider (can be swapped)
  provider: GraphProvider | null;
  providerType: ProviderType;

  // Layout state
  currentLayout: GraphLayout;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Entity type visibility and statistics - using objects for stable references
  visibleEntityTypes: Record<EntityType, boolean>; // object instead of Set
  lastSearchStats: Record<EntityType, number>; // object instead of Map

  // Pre-computed statistics (cached to avoid getSnapshot infinite loops)
  totalNodeCount: number;
  totalEdgeCount: number;
  entityTypeStats: {
    visible: Record<EntityType, number>;
    total: Record<EntityType, number>;
    searchResults: Record<EntityType, number>;
  };
  edgeTypeStats: {
    visible: Record<RelationType, number>;
    total: Record<RelationType, number>;
  };

  // Edge type visibility
  visibleEdgeTypes: Record<RelationType, boolean>; // object instead of Set

  // Cached computed results (stable references for React 19 compatibility)
  cachedVisibleNodes: GraphNode[];
  cachedLoadingNodes: GraphNode[];
  nodeNeighborsCache: Record<string, GraphNode[]>;
  nodeEdgesCache: Record<string, GraphEdge[]>;

  // Actions (work with any provider)
  setProvider: (provider: GraphProvider) => void;
  setProviderType: (type: ProviderType) => void;

  // Layout management
  setLayout: (layout: GraphLayout) => void;
  applyCurrentLayout: () => void;

  // Node management
  addNode: (node: GraphNode) => void;
  addNodes: (nodes: GraphNode[]) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  getNode: (nodeId: string) => GraphNode | undefined;

  // Edge management
  addEdge: (edge: GraphEdge) => void;
  addEdges: (edges: GraphEdge[]) => void;
  removeEdge: (edgeId: string) => void;
  updateEdge: (edgeId: string, updates: Partial<GraphEdge>) => void;
  getEdge: (edgeId: string) => GraphEdge | undefined;

  // Selection
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;

  // Pinned node management - new multi-pin API
  pinNode: (nodeId: string) => void;
  unpinNode: (nodeId: string) => void;
  clearAllPinnedNodes: () => void;
  isPinned: (nodeId: string) => boolean;


  // Cache visibility and traversal control
  setShowAllCachedNodes: (show: boolean) => void;
  setTraversalDepth: (depth: number) => void;
  calculateNodeDepths: (originId: string) => void;
  getNodesWithinDepth: (depth: number) => GraphNode[];

  // Bulk operations
  clear: () => void;
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;

  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Entity type management
  toggleEntityTypeVisibility: (entityType: EntityType) => void;
  setEntityTypeVisibility: (entityType: EntityType, visible: boolean) => void;
  setAllEntityTypesVisible: (visible: boolean) => void;
  updateSearchStats: (stats: Record<EntityType, number>) => void;
  recomputeEntityTypeStats: () => void;
  recomputeEdgeTypeStats: () => void;
  recomputeVisibleNodes: () => void;
  recomputeLoadingNodes: () => void;
  recomputeNodeCaches: () => void;
  getEntityTypeStats: () => {
    visible: Record<EntityType, number>;
    total: Record<EntityType, number>;
    searchResults: Record<EntityType, number>;
  };
  getVisibleNodes: () => GraphNode[];

  // Edge type management
  toggleEdgeTypeVisibility: (edgeType: RelationType) => void;
  setEdgeTypeVisibility: (edgeType: RelationType, visible: boolean) => void;
  setAllEdgeTypesVisible: (visible: boolean) => void;

  // Loading state management
  markNodeAsLoading: (nodeId: string, loading?: boolean) => void;
  clearNodeLoading: (nodeId: string) => void;

  // Graph queries (provider agnostic)
  getNeighbors: (nodeId: string) => GraphNode[];
  getConnectedEdges: (nodeId: string) => GraphEdge[];
  findShortestPath: (sourceId: string, targetId: string) => string[];
  getConnectedComponent: (nodeId: string) => string[];

  // Incremental hydration support
  markNodeAsLoaded: (nodeId: string, fullData: Partial<GraphNode>) => void;
  markNodeAsError: (nodeId: string) => void;
  getPlaceholderNodes: () => GraphNode[]; // Legacy - returns minimal nodes
  getMinimalNodes: () => GraphNode[];
  getFullyHydratedNodes: () => GraphNode[];
  getLoadingNodes: () => GraphNode[];
  hasPlaceholderOrLoadingNodes: () => boolean;
}

export const useGraphStore = create<GraphState>()(
	persist(
		immer((set, get) => ({
			// Initial state - using plain objects for stable references
			nodes: {},
			edges: {},
			selectedNodeId: null,
			hoveredNodeId: null,
			selectedNodes: {},
			pinnedNodes: {},
			showAllCachedNodes: false,
			traversalDepth: 1,
			nodeDepths: {},
			provider: null,
			providerType: "xyflow",
			visibleEntityTypes: {
				works: true,
				authors: true,
				sources: true,
				institutions: true,
				topics: true,
				concepts: true,
				publishers: true,
				funders: true,
				keywords: true
			},
			lastSearchStats: {
				concepts: 0,
				topics: 0,
				keywords: 0,
				works: 0,
				authors: 0,
				sources: 0,
				institutions: 0,
				publishers: 0,
				funders: 0
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
				[RelationType.TOPIC_PART_OF_FIELD]: true
			},

			// Cached computed results (stable references for React 19 compatibility)
			cachedVisibleNodes: [],
			cachedLoadingNodes: [],
			nodeNeighborsCache: {},
			nodeEdgesCache: {},

			currentLayout: {
				type: "d3-force",
				options: {
					seed: 42,
					iterations: 300,
					...DEFAULT_FORCE_PARAMS,
					alpha: 1,
				}
			},
			isLoading: false,
			error: null,

			// Pre-computed statistics (cached to avoid getSnapshot infinite loops)
			totalNodeCount: 0,
			totalEdgeCount: 0,
			entityTypeStats: {
				visible: {
					concepts: 0,
					topics: 0,
					keywords: 0,
					works: 0,
					authors: 0,
					sources: 0,
					institutions: 0,
					publishers: 0,
					funders: 0
				},
				total: {
					concepts: 0,
					topics: 0,
					keywords: 0,
					works: 0,
					authors: 0,
					sources: 0,
					institutions: 0,
					publishers: 0,
					funders: 0
				},
				searchResults: {
					concepts: 0,
					topics: 0,
					keywords: 0,
					works: 0,
					authors: 0,
					sources: 0,
					institutions: 0,
					publishers: 0,
					funders: 0
				}
			},
			edgeTypeStats: createInitialEdgeTypeStats(),

			// Provider management
			setProvider: (provider) => {
				const state = get();

				// Don't update if it's the same provider instance
				if (state.provider === provider) {
					return;
				}

				// Set nodes and edges on the new provider outside of the Zustand set call
				// Type guard for filtering out undefined nodes
				function isValidNode(node: GraphNode | undefined): node is GraphNode {
					return node !== undefined;
				}

				// Type guard for filtering out undefined edges
				function isValidEdge(edge: GraphEdge | undefined): edge is GraphEdge {
					return edge !== undefined;
				}

				provider.setNodes(Object.values(state.nodes).filter(isValidNode));
				provider.setEdges(Object.values(state.edges).filter(isValidEdge));

				// Only update the provider in the store
				set({ provider });
			},

			setProviderType: (type) => set({ providerType: type }),

			// Layout management
			setLayout: (layout) => {
				set({ currentLayout: layout });
				const state = get();
				state.provider?.applyLayout(layout);
			},

			applyCurrentLayout: () => {
				const state = get();
				state.provider?.applyLayout(state.currentLayout);
			},

			// Node management
			addNode: (node) => {
				set((draft) => {
					draft.nodes[node.id] = node;
					draft.provider?.addNode(node);
				});
				// Recompute caches after single node addition
				const state = get();
				state.recomputeEntityTypeStats();
				state.recomputeVisibleNodes();
				state.recomputeLoadingNodes();
				state.recomputeNodeCaches();

				// Emit cross-context events
				graphEventSystem.emitNodeAdded(node).catch((err: unknown) => {
					const errorMessage = err instanceof Error ? err.message : "Unknown error";
					logger.error("graph", "Failed to emit node added event", {
						error: errorMessage,
						nodeId: node.id
					});
				});
			},

			addNodes: (nodes) => {
				set((draft) => {
					nodes.forEach(node => {
						draft.nodes[node.id] = node;
						draft.provider?.addNode(node);
					});
				});
				// Recompute cached statistics after data change
				const state = get();
				state.recomputeEntityTypeStats();
				state.recomputeVisibleNodes();
				state.recomputeLoadingNodes();
				state.recomputeNodeCaches();

				// Emit cross-context events
				if (nodes.length > 0) {
					graphEventSystem.emitBulkNodesAdded(nodes).catch((err: unknown) => {
						const errorMessage = err instanceof Error ? err.message : "Unknown error";
						logger.error("graph", "Failed to emit bulk nodes added event", {
							error: errorMessage,
							nodeCount: nodes.length
						});
					});
				}
			},

			removeNode: (nodeId) => {
				let removedNode: GraphNode | undefined;

				set((draft) => {
					// Store removed node for event emission
					removedNode = draft.nodes[nodeId];

					// Remove node
					const { [nodeId]: removed, ...remainingNodes } = draft.nodes;
					draft.nodes = remainingNodes;
					draft.provider?.removeNode(nodeId);

					// Remove connected edges
					const edgeEntries = Object.entries(draft.edges).filter((entry): entry is [string, GraphEdge] => entry[1] != null);
					const remainingEdges: Record<string, GraphEdge> = {};
					edgeEntries.forEach(([edgeId, edge]) => {
						if (edge.source === nodeId || edge.target === nodeId) {
							draft.provider?.removeEdge(edge.id);
						} else {
							remainingEdges[edgeId] = edge;
						}
					});
					draft.edges = remainingEdges;

					// Clear selection if removed
					const { [nodeId]: removedFromSelection, ...remainingSelection } = draft.selectedNodes;
					draft.selectedNodes = remainingSelection;
					if (draft.selectedNodeId === nodeId) {
						draft.selectedNodeId = null;
					}
					if (draft.hoveredNodeId === nodeId) {
						draft.hoveredNodeId = null;
					}
				});

				// Recompute cached statistics after data change
				const state = get();
				state.recomputeEntityTypeStats();
				state.recomputeEdgeTypeStats();
				state.recomputeVisibleNodes();
				state.recomputeLoadingNodes();
				state.recomputeNodeCaches();

				// Emit cross-context events
				if (removedNode) {
					const node = removedNode; // Type narrowing
					graphEventSystem.emitNodeRemoved(nodeId, node.entityId, node.type).catch((err: unknown) => {
						const errorMessage = err instanceof Error ? err.message : "Unknown error";
						logger.error("graph", "Failed to emit node removed event", {
							error: errorMessage,
							nodeId, entityId: node.entityId
						});
					});

					entityEventSystem.emitEntityRemoved(node.entityId, node.type, nodeId).catch((err: unknown) => {
						const errorMessage = err instanceof Error ? err.message : "Unknown error";
						logger.error("graph", "Failed to emit entity removed event", {
							error: errorMessage,
							entityId: node.entityId, nodeId
						});
					});
				}
			},

			updateNode: (nodeId, updates) => {
				set((draft) => {
					const existingNode = draft.nodes[nodeId];
					if (existingNode) {
						const updatedNode = { ...existingNode, ...updates };
						draft.nodes[nodeId] = updatedNode;
						// Note: Provider update would need to be handled by provider
					}
				});
			},

			getNode: (nodeId) => {
				return get().nodes[nodeId];
			},

			// Edge management
			addEdge: (edge) => {
				set((draft) => {
					draft.edges[edge.id] = edge;
					draft.provider?.addEdge(edge);
				});
				// Recompute node caches after single edge addition
				const state = get();
				state.recomputeEdgeTypeStats();
				state.recomputeNodeCaches();
			},

			addEdges: (edges) => {
				set((draft) => {
					edges.forEach(edge => {
						draft.edges[edge.id] = edge;
						draft.provider?.addEdge(edge);
					});
				});
				// Recompute cached statistics after data change
				const state = get();
				state.recomputeEdgeTypeStats();
				state.recomputeNodeCaches();
			},

			removeEdge: (edgeId) => {
				set((draft) => {
					const { [edgeId]: removed, ...remaining } = draft.edges;
					draft.edges = remaining;
					draft.provider?.removeEdge(edgeId);
				});
				// Recompute cached statistics after data change
				const state = get();
				state.recomputeEdgeTypeStats();
				state.recomputeNodeCaches();
			},

			updateEdge: (edgeId, updates) => {
				set((draft) => {
					const existingEdge = draft.edges[edgeId];
					if (existingEdge) {
						const updatedEdge = { ...existingEdge, ...updates };
						draft.edges[edgeId] = updatedEdge;
					}
				});
				// Recompute cached statistics after data change
				const state = get();
				state.recomputeEdgeTypeStats();
				state.recomputeNodeCaches();
			},

			getEdge: (edgeId) => {
				return get().edges[edgeId];
			},

			// Selection
			selectNode: (nodeId) => {
				const currentState = get();
				if (currentState.selectedNodeId !== nodeId) {
					set({ selectedNodeId: nodeId });
				}
			},

			hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

			addToSelection: (nodeId) => {
				set((draft) => {
					draft.selectedNodes[nodeId] = true;
				});
			},

			removeFromSelection: (nodeId) => {
				set((draft) => {
					const { [nodeId]: removed, ...remaining } = draft.selectedNodes;
					draft.selectedNodes = remaining;
				});
			},

			clearSelection: () => {
				set((draft) => {
					draft.selectedNodeId = null;
					draft.selectedNodes = {};
				});
			},

			// Multi-pin node management (new API)
			pinNode: (nodeId) => {
				set((draft) => {
					draft.pinnedNodes[nodeId] = true;
				});
			},

			unpinNode: (nodeId) => {
				set((draft) => {
					const { [nodeId]: removed, ...remaining } = draft.pinnedNodes;
					draft.pinnedNodes = remaining;
				});
			},

			clearAllPinnedNodes: () => {
				set((draft) => {
					draft.pinnedNodes = {};
				});
			},

			isPinned: (nodeId) => {
				const state = get();
				return state.pinnedNodes[nodeId] ?? false;
			},


			// Cache visibility and traversal control
			setShowAllCachedNodes: (show) => {
				set((draft) => {
					draft.showAllCachedNodes = show;
				});
			},

			setTraversalDepth: (depth) => {
				set((draft) => {
					// Ensure valid depth (minimum 1, allow Infinity)
					const validDepth = Math.max(1, depth);
					draft.traversalDepth = validDepth;
				});
			},

			calculateNodeDepths: (originId) => {
				set((draft) => {
					const { edges } = draft;
					const depths: Record<string, number> = {};

					// BFS to calculate distances from origin
					const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: originId, depth: 0 }];
					const visited: Record<string, boolean> = {};

					while (queue.length > 0) {
						const current = queue.shift();
						if (!current) continue;

						const { nodeId, depth } = current;
						if (visited[nodeId]) continue;

						visited[nodeId] = true;
						depths[nodeId] = depth;

						// Find connected nodes
						Object.values(edges).filter((edge): edge is NonNullable<typeof edge> => edge != null).forEach(edge => {
							let neighbor: string | null = null;
							if (edge.source === nodeId && !visited[edge.target]) {
								neighbor = edge.target;
							} else if (edge.target === nodeId && !visited[edge.source]) {
								neighbor = edge.source;
							}

							if (neighbor) {
								queue.push({ nodeId: neighbor, depth: depth + 1 });
							}
						});
					}

					draft.nodeDepths = depths;
				});
			},

			getNodesWithinDepth: (depth) => {
				const { nodes, nodeDepths } = get();
				const nodeValues = Object.values(nodes).filter((node): node is NonNullable<typeof node> => node != null);
				if (depth === Infinity) {
					return nodeValues;
				}

				return nodeValues.filter(node => {
					const nodeDepth = nodeDepths[node.id];
					return nodeDepth <= depth;
				});
			},

			// Bulk operations
			clear: () => {
				const { provider } = get();
				provider?.clear();
				set({
					nodes: {},
					edges: {},
					selectedNodeId: null,
					hoveredNodeId: null,
					selectedNodes: {},
					pinnedNodes: {},
					nodeDepths: {},
					// Clear cached state
					cachedVisibleNodes: [],
					cachedLoadingNodes: [],
					nodeNeighborsCache: {},
					nodeEdgesCache: {},
					edgeTypeStats: createInitialEdgeTypeStats(),
				});
			},

			setGraphData: (nodes, edges) => {
				const { provider } = get();
				const nodesRecord: Record<string, GraphNode> = {};
				const edgesRecord: Record<string, GraphEdge> = {};

				nodes.forEach(node => {
					nodesRecord[node.id] = node;
				});
				edges.forEach(edge => {
					edgesRecord[edge.id] = edge;
				});

				if (provider) {
					provider.setNodes(nodes);
					provider.setEdges(edges);
				}

				set({
					nodes: nodesRecord,
					edges: edgesRecord,
					selectedNodeId: null,
					hoveredNodeId: null,
					selectedNodes: {}, // Clear selected nodes on data change
					pinnedNodes: {}, // Clear pinned nodes on data change
					nodeDepths: {}, // Clear depths, will be recalculated when needed
					// Clear cached state as data has changed
					cachedVisibleNodes: [],
					cachedLoadingNodes: [],
					nodeNeighborsCache: {},
					nodeEdgesCache: {},
					edgeTypeStats: createInitialEdgeTypeStats(),
				});
				// Recompute all caches after setting new data
				const state = get();
				state.recomputeVisibleNodes();
				state.recomputeNodeCaches();
				state.recomputeEdgeTypeStats();
			},

			// Loading states
			setLoading: (loading) => set({ isLoading: loading }),
			setError: (error) => set({ error }),

			// Entity type management
			toggleEntityTypeVisibility: (entityType) => {
				set((state) => {
					const newVisibleTypes: Record<EntityType, boolean> = { ...state.visibleEntityTypes };
					if (newVisibleTypes[entityType]) {
						const { [entityType]: removed, ...remaining } = newVisibleTypes;
						return { visibleEntityTypes: remaining };
					} else {
						newVisibleTypes[entityType] = true;
						return { visibleEntityTypes: newVisibleTypes };
					}
				});
				// Recompute cached statistics after visibility change
				const state = get();
				state.recomputeEntityTypeStats();
				state.recomputeVisibleNodes();
			},

			setEntityTypeVisibility: (entityType, visible) => {
				set((state) => {
					const newVisibleTypes: Record<EntityType, boolean> = { ...state.visibleEntityTypes };
					if (visible) {
						newVisibleTypes[entityType] = true;
						return { visibleEntityTypes: newVisibleTypes };
					} else {
						const { [entityType]: removed, ...remaining } = newVisibleTypes;
						return { visibleEntityTypes: remaining };
					}
				});
				// Recompute cached statistics after visibility change
				const state = get();
				state.recomputeEntityTypeStats();
				state.recomputeVisibleNodes();
			},

			setAllEntityTypesVisible: (visible) => {
				const visibleTypes: Record<EntityType, boolean> = {
					concepts: visible,
					topics: visible,
					keywords: visible,
					works: visible,
					authors: visible,
					sources: visible,
					institutions: visible,
					publishers: visible,
					funders: visible
				};
				set({
					visibleEntityTypes: visibleTypes
				});
				// Recompute cached statistics after visibility change
				const state = get();
				state.recomputeEntityTypeStats();
				state.recomputeVisibleNodes();
			},

			updateSearchStats: (stats) => {
				set((state) => {
					state.lastSearchStats = stats;
					// Also update the cached search results in entityTypeStats
					state.entityTypeStats.searchResults = stats;
				});
			},

			recomputeVisibleNodes: () => {
				set((state) => {
					const { nodes, visibleEntityTypes } = state;
					state.cachedVisibleNodes = Object.values(nodes).filter((node): node is GraphNode =>
						node !== undefined && visibleEntityTypes[node.type]
					);
				});
			},

			recomputeLoadingNodes: () => {
				set((state) => {
					const { nodes } = state;
					state.cachedLoadingNodes = Object.values(nodes).filter((node): node is GraphNode =>
						node !== undefined && typeof node.label === "string" && node.label.includes("Loading")
					);
				});
			},

			recomputeNodeCaches: () => {
				set((state) => {
					const { nodes, edges } = state;
					const newNeighborsCache: Record<string, GraphNode[]> = {};
					const newEdgesCache: Record<string, GraphEdge[]> = {};

					// Clear and rebuild node-specific caches
					Object.keys(nodes).forEach(nodeId => {
						const neighbors: GraphNode[] = [];
						const connectedEdges: GraphEdge[] = [];

						Object.values(edges).forEach(edge => {
							if (!edge) return;

							// Collect connected edges
							if (edge.source === nodeId || edge.target === nodeId) {
								connectedEdges.push(edge);
							}

							// Collect neighbor nodes
							if (edge.source === nodeId) {
								const neighbor = nodes[edge.target];
								if (neighbor) neighbors.push(neighbor);
							} else if (edge.target === nodeId) {
								const neighbor = nodes[edge.source];
								if (neighbor) neighbors.push(neighbor);
							}
						});

						newNeighborsCache[nodeId] = neighbors;
						newEdgesCache[nodeId] = connectedEdges;
					});

					state.nodeNeighborsCache = newNeighborsCache;
					state.nodeEdgesCache = newEdgesCache;
				});
			},

			recomputeEntityTypeStats: () => {
				set((state) => {
					// Initialize with all entity types set to 0
					const total: Record<EntityType, number> = {
						concepts: 0,
						topics: 0,
						keywords: 0,
						works: 0,
						authors: 0,
						sources: 0,
						institutions: 0,
						publishers: 0,
						funders: 0
					};
					const visible: Record<EntityType, number> = {
						concepts: 0,
						topics: 0,
						keywords: 0,
						works: 0,
						authors: 0,
						sources: 0,
						institutions: 0,
						publishers: 0,
						funders: 0
					};

					// Count total and visible nodes by type
					const nodeValues = Object.values(state.nodes).filter((node): node is GraphNode => node !== undefined);
					nodeValues.forEach(node => {
						total[node.type] = (total[node.type] || 0) + 1;

						if (state.visibleEntityTypes[node.type]) {
							visible[node.type] = (visible[node.type] || 0) + 1;
						}
					});

					// Update cached statistics including total counts
					state.totalNodeCount = nodeValues.length;
					state.entityTypeStats = {
						total,
						visible,
						searchResults: state.lastSearchStats
					};
				});
			},

			getEntityTypeStats: () => {
				const state = get();
				return state.entityTypeStats;
			},

			getVisibleNodes: () => {
				const state = get();
				return state.cachedVisibleNodes;
			},

			// Edge type management
			toggleEdgeTypeVisibility: (edgeType) => {
				set((state) => {
					const newVisibleTypes: Record<RelationType, boolean> = { ...state.visibleEdgeTypes };
					if (newVisibleTypes[edgeType]) {
						const { [edgeType]: removed, ...remaining } = newVisibleTypes;
						return { visibleEdgeTypes: remaining };
					} else {
						newVisibleTypes[edgeType] = true;
						return { visibleEdgeTypes: newVisibleTypes };
					}
				});
			},

			setEdgeTypeVisibility: (edgeType, visible) => {
				set((state) => {
					const newVisibleTypes: Record<RelationType, boolean> = { ...state.visibleEdgeTypes };
					if (visible) {
						newVisibleTypes[edgeType] = true;
						return { visibleEdgeTypes: newVisibleTypes };
					} else {
						const { [edgeType]: removed, ...remaining } = newVisibleTypes;
						return { visibleEdgeTypes: remaining };
					}
				});
			},

			setAllEdgeTypesVisible: (visible) => {
				const visibleTypes: Record<RelationType, boolean> = {
					[RelationType.AUTHORED]: visible,
					[RelationType.AFFILIATED]: visible,
					[RelationType.PUBLISHED_IN]: visible,
					[RelationType.FUNDED_BY]: visible,
					[RelationType.REFERENCES]: visible,
					[RelationType.RELATED_TO]: visible,
					[RelationType.SOURCE_PUBLISHED_BY]: visible,
					[RelationType.INSTITUTION_CHILD_OF]: visible,
					[RelationType.PUBLISHER_CHILD_OF]: visible,
					[RelationType.WORK_HAS_TOPIC]: visible,
					[RelationType.WORK_HAS_KEYWORD]: visible,
					[RelationType.AUTHOR_RESEARCHES]: visible,
					[RelationType.INSTITUTION_LOCATED_IN]: visible,
					[RelationType.FUNDER_LOCATED_IN]: visible,
					[RelationType.TOPIC_PART_OF_FIELD]: visible
				};
				set({
					visibleEdgeTypes: visibleTypes
				});
			},

			recomputeEdgeTypeStats: () => {
				set((state) => {
					// Initialize with all relation types set to 0
					const total: Record<RelationType, number> = {
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
						[RelationType.TOPIC_PART_OF_FIELD]: 0
					};
					const visible: Record<RelationType, number> = {
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
						[RelationType.TOPIC_PART_OF_FIELD]: 0
					};

					// Count total and visible edges by type
					const edgeValues = Object.values(state.edges).filter((edge): edge is GraphEdge => edge !== undefined);
					edgeValues.forEach(edge => {
						const edgeType = edge.type;
						const currentTotal = total[edgeType];
						total[edgeType] = (typeof currentTotal === "number" ? currentTotal : 0) + 1;

						if (state.visibleEdgeTypes[edgeType]) {
							const currentVisible = visible[edgeType];
							visible[edgeType] = (typeof currentVisible === "number" ? currentVisible : 0) + 1;
						}
					});

					// Update cached statistics including total counts
					state.totalEdgeCount = edgeValues.length;
					state.edgeTypeStats = {
						total,
						visible
					};
				});
			},

			// Graph algorithms (work with generic data)
			getNeighbors: (nodeId) => {
				const state = get();
				return state.nodeNeighborsCache[nodeId] ?? [];
			},

			getConnectedEdges: (nodeId) => {
				const state = get();
				return state.nodeEdgesCache[nodeId] ?? [];
			},

			findShortestPath: (sourceId, targetId) => {
				const { nodes, edges } = get();

				// Simple BFS implementation
				const queue: string[] = [sourceId];
				const visited: Record<string, boolean> = { [sourceId]: true };
				const parent: Record<string, string> = {};

				while (queue.length > 0) {
					const current = queue.shift();
					if (!current) continue;

					if (current === targetId) {
						// Reconstruct path
						const path: string[] = [];
						let node: string | undefined = targetId;
						while (node) {
							path.unshift(node);
							node = parent[node];
						}
						return path;
					}

					// Check all connected nodes
					Object.values(edges).filter((edge): edge is NonNullable<typeof edge> => edge != null).forEach(edge => {
						let neighbor: string | null = null;
						if (edge.source === current && !visited[edge.target]) {
							neighbor = edge.target;
						} else if (edge.target === current && !visited[edge.source]) {
							neighbor = edge.source;
						}

						if (neighbor && nodes[neighbor]) {
							visited[neighbor] = true;
							parent[neighbor] = current;
							queue.push(neighbor);
						}
					});
				}

				return []; // No path found
			},

			getConnectedComponent: (nodeId) => {
				const { edges } = get();
				const visited: Record<string, boolean> = {};
				const stack: string[] = [nodeId];

				while (stack.length > 0) {
					const current = stack.pop();
					if (!current) continue;
					if (visited[current]) continue;

					visited[current] = true;

					// Add all connected nodes
					Object.values(edges).filter((edge): edge is NonNullable<typeof edge> => edge != null).forEach(edge => {
						if (edge.source === current && !visited[edge.target]) {
							stack.push(edge.target);
						} else if (edge.target === current && !visited[edge.source]) {
							stack.push(edge.source);
						}
					});
				}

				// Return array of visited node IDs for consistency
				return Object.keys(visited);
			},

			// Incremental hydration support

			markNodeAsLoading: (nodeId, loading = true) => {
				set((draft) => {
					const node = draft.nodes[nodeId];
					if (node) {
						if (loading) {
							node.label = (node.label && node.label.includes("Loading")) ? node.label : `Loading ${node.label || "Node"}...`;
						} else {
							// Remove "Loading " prefix when clearing loading state
							node.label = (node.label || "").replace(/^Loading /, "").replace(/\.\.\.$/, "");
						}
					}
				});
			},

			markNodeAsLoaded: (nodeId, fullData) => {
				set((draft) => {
					const node = draft.nodes[nodeId];
					if (node) {
						// Update node with data - no artificial metadata
						Object.assign(node, fullData);
						// Remove "Loading..." from label if present
						if (node.label.startsWith("Loading ")) {
							node.label = node.label.replace("Loading ", "").replace("...", "");
						}
					}
				});
			},

			markNodeAsError: (nodeId) => {
				set((draft) => {
					const node = draft.nodes[nodeId];
					if (node) {
						// Update label to show error - no artificial metadata needed
						node.label = `Error: ${node.label.replace("Loading ", "").replace("...", "")}`;
					}
				});
			},

			clearNodeLoading: (nodeId) => {
				set((draft) => {
					const node = draft.nodes[nodeId];
					if (node) {
						// Remove "Loading " prefix and "..." suffix from label
						node.label = node.label.replace(/^Loading /, "").replace(/\.\.\.$/, "");
					}
				});
			},

			getPlaceholderNodes: () => {
				// Legacy method - return empty array (no artificial distinctions)
				return [];
			},
			getMinimalNodes: () => {
				// No artificial distinctions - return empty array
				return [];
			},
			getFullyHydratedNodes: () => {
				const { nodes } = get();
				// All nodes are considered equal - return all nodes
				return Object.values(nodes).filter((node): node is NonNullable<typeof node> => node != null);
			},

			getLoadingNodes: () => {
				const state = get();
				return state.cachedLoadingNodes;
			},

			hasPlaceholderOrLoadingNodes: () => {
				// No artificial distinctions - always return false
				return false;
			},
		})),
		{
			name: "graph-layout-storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				currentLayout: state.currentLayout,
				providerType: state.providerType,
				visibleEntityTypes: Object.keys(state.visibleEntityTypes),
				visibleEdgeTypes: Object.keys(state.visibleEdgeTypes),
				showAllCachedNodes: state.showAllCachedNodes,
				traversalDepth: state.traversalDepth,
			}),
			onRehydrateStorage: () => (state) => {
				// Type guard for state object
				const isStateObject = (value: unknown): value is Record<string, unknown> => {
					return typeof value === "object" && value !== null;
				};

				if (!isStateObject(state)) return;

				// Type guard for visibleEntityTypes array
				if ("visibleEntityTypes" in state && Array.isArray(state.visibleEntityTypes)) {
					// Type guard: only valid EntityType values
					const validEntityTypes = state.visibleEntityTypes.filter((type): type is EntityType =>
						typeof type === "string" &&
						["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"].includes(type)
					);
					const visibleTypesRecord: Record<EntityType, boolean> = {
						concepts: false,
						topics: false,
						keywords: false,
						works: false,
						authors: false,
						sources: false,
						institutions: false,
						publishers: false,
						funders: false
					};
					validEntityTypes.forEach(type => {
						visibleTypesRecord[type] = true;
					});
					state.visibleEntityTypes = visibleTypesRecord;
				}

				// Type guard for visibleEdgeTypes array
				if ("visibleEdgeTypes" in state && Array.isArray(state.visibleEdgeTypes)) {
					// Type guard: only valid RelationType values
					const isValidRelationType = (type: unknown): type is RelationType => {
						if (typeof type !== "string") return false;
						return Object.values(RelationType).some((validType: string) => validType === type);
					};

					const validEdgeTypes = state.visibleEdgeTypes.filter(isValidRelationType);
					const visibleEdgeTypesRecord: Record<RelationType, boolean> = {
						[RelationType.AUTHORED]: false,
						[RelationType.AFFILIATED]: false,
						[RelationType.PUBLISHED_IN]: false,
						[RelationType.FUNDED_BY]: false,
						[RelationType.REFERENCES]: false,
						[RelationType.RELATED_TO]: false,
						[RelationType.SOURCE_PUBLISHED_BY]: false,
						[RelationType.INSTITUTION_CHILD_OF]: false,
						[RelationType.PUBLISHER_CHILD_OF]: false,
						[RelationType.WORK_HAS_TOPIC]: false,
						[RelationType.WORK_HAS_KEYWORD]: false,
						[RelationType.AUTHOR_RESEARCHES]: false,
						[RelationType.INSTITUTION_LOCATED_IN]: false,
						[RelationType.FUNDER_LOCATED_IN]: false,
						[RelationType.TOPIC_PART_OF_FIELD]: false
					};
					validEdgeTypes.forEach(type => {
						visibleEdgeTypesRecord[type] = true;
					});
					state.visibleEdgeTypes = visibleEdgeTypesRecord;
				}
			},
		}
	)
);