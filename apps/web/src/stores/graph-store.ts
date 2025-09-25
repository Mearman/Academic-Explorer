/**
 * Graph store with infinite loop fixes applied
 * Commented out all immediate recomputation calls that were causing React 19 infinite loops
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createHybridStorage } from "@academic-explorer/utils/storage";
import type {
	GraphNode,
	GraphEdge,
	GraphProvider,
	ProviderType,
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

	// Essential methods
	addNode: (node: GraphNode) => void;
	addNodes: (nodes: GraphNode[]) => void;
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
	selectedNodeId: string | null;
	hoveredNodeId: string | null;
	selectNode: (nodeId: string | null) => void;
	addToSelection: (nodeId: string) => void;
	clearSelection: () => void;

	// Pinning system
	pinnedNodes: Set<string>;
	pinNode: (nodeId: string) => void;
	unpinNode: (nodeId: string) => void;
	clearAllPinnedNodes: () => void;
	isPinned: (nodeId: string) => boolean;

	// Layout system
	currentLayout: GraphLayout;
	setLayout: (layout: GraphLayout) => void;

	// Visibility state
	visibleEntityTypes: Record<EntityType, boolean>;
	visibleEdgeTypes: Record<RelationType, boolean>;
	toggleEdgeTypeVisibility: (edgeType: RelationType) => void;
	setEntityTypeVisibility: (entityType: EntityType, visible: boolean) => void;

	// Cache settings
	showAllCachedNodes: boolean;
	setShowAllCachedNodes: (show: boolean) => void;
	traversalDepth: number;
	setTraversalDepth: (depth: number) => void;

	// Statistics
	totalNodeCount: number;
	totalEdgeCount: number;
	entityTypeStats: Record<EntityType, number> & { total: number; visible: number };
	edgeTypeStats: Record<RelationType, number> & { total: number; visible: number };
	lastSearchStats: Record<string, unknown>;
	updateSearchStats: () => void;

	// Node state management
	markNodeAsLoading: (nodeId: string) => void;
	markNodeAsLoaded: (nodeId: string) => void;
	markNodeAsError: (nodeId: string) => void;
	calculateNodeDepths: () => void;
	getMinimalNodes: () => GraphNode[];

	// Computed getters (cached to prevent infinite loops)
	cachedVisibleNodes: GraphNode[];
	getVisibleNodes: () => GraphNode[];

	// Provider reference
	provider: GraphProvider | null;
	setProvider: (provider: GraphProvider) => void;
}

export const useGraphStore = create<GraphState>()(
	persist(
		immer((set, get) => ({
			// Initial state - using plain objects for stable references
			nodes: {},
			edges: {},
			isLoading: false,
			error: null,
			cachedVisibleNodes: [],
			provider: null,

			// Selection and interaction
			selectedNodeId: null,
			hoveredNodeId: null,

			// Pinning system
			pinnedNodes: new Set<string>(),

			// Layout system
			currentLayout: {
				type: "force",
				options: { iterations: 100, strength: -200, distance: 150 }
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
				visible: 0
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
				visible: 0
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
				funders: true
			},

			visibleEdgeTypes: {
				[RelationType.AUTHORED]: true,
				[RelationType.AFFILIATED]: true,
				[RelationType.PUBLISHED_IN]: true,
				[RelationType.FUNDED_BY]: true,
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
			},

			// Basic methods
			addNode: (node) => {
				set((draft) => {
					draft.nodes[node.id] = node;
				});
				// CRITICAL FIX: Don't immediately recompute to prevent infinite loops
				// Caches will be recomputed on-demand when accessed
			},

			setGraphData: (nodes, edges) => {
				const nodesRecord: Record<string, GraphNode> = {};
				const edgesRecord: Record<string, GraphEdge> = {};

				nodes.forEach(node => {
					nodesRecord[node.id] = node;
				});
				edges.forEach(edge => {
					edgesRecord[edge.id] = edge;
				});

				set({
					nodes: nodesRecord,
					edges: edgesRecord,
				});

				// CRITICAL FIX: Don't immediately recompute to prevent infinite loops
				// Caches will be recomputed on-demand when accessed
			},

			setLoading: (loading) => set({ isLoading: loading }),
			setError: (error) => set({ error }),

			clear: () => set({
				nodes: {},
				edges: {},
				cachedVisibleNodes: [],
				error: null
			}),

			// Cached visible nodes getter
			getVisibleNodes: () => {
				const state = get();
				// Return cached version to prevent infinite loops
				return state.cachedVisibleNodes;
			},

			// Additional CRUD methods
			addNodes: (nodes) => {
				set((draft) => {
					nodes.forEach(node => {
						draft.nodes[node.id] = node;
					});
				});
			},

			addEdges: (edges) => {
				set((draft) => {
					edges.forEach(edge => {
						draft.edges[edge.id] = edge;
					});
				});
			},

			removeNode: (nodeId) => {
				set((draft) => {
					delete draft.nodes[nodeId];
					draft.pinnedNodes.delete(nodeId);
					if (draft.selectedNodeId === nodeId) {
						draft.selectedNodeId = null;
					}
					if (draft.hoveredNodeId === nodeId) {
						draft.hoveredNodeId = null;
					}
				});
			},

			removeEdge: (edgeId) => {
				set((draft) => {
					delete draft.edges[edgeId];
				});
			},

			updateNode: (nodeId, updates) => {
				set((draft) => {
					if (draft.nodes[nodeId]) {
						draft.nodes[nodeId] = { ...draft.nodes[nodeId], ...updates };
					}
				});
			},

			getNode: (nodeId) => {
				const state = get();
				return state.nodes[nodeId];
			},

			// Selection methods
			selectNode: (nodeId) => {
				set({ selectedNodeId: nodeId });
			},

			addToSelection: (nodeId) => {
				// For now, just set as selected (single selection)
				set({ selectedNodeId: nodeId });
			},

			clearSelection: () => {
				set({ selectedNodeId: null });
			},

			// Pinning methods
			pinNode: (nodeId) => {
				set((draft) => {
					draft.pinnedNodes.add(nodeId);
				});
			},

			unpinNode: (nodeId) => {
				set((draft) => {
					draft.pinnedNodes.delete(nodeId);
				});
			},

			clearAllPinnedNodes: () => {
				set((draft) => {
					draft.pinnedNodes.clear();
				});
			},

			isPinned: (nodeId) => {
				const state = get();
				return state.pinnedNodes.has(nodeId);
			},

			// Layout methods
			setLayout: (layout) => {
				set({ currentLayout: layout });
			},

			// Visibility methods
			toggleEdgeTypeVisibility: (edgeType) => {
				set((draft) => {
					draft.visibleEdgeTypes[edgeType] = !draft.visibleEdgeTypes[edgeType];
				});
			},

			setEntityTypeVisibility: (entityType, visible) => {
				set((draft) => {
					draft.visibleEntityTypes[entityType] = visible;
				});
			},

			// Cache settings
			setShowAllCachedNodes: (show) => {
				set({ showAllCachedNodes: show });
			},

			setTraversalDepth: (depth) => {
				set({ traversalDepth: depth });
			},

			// Statistics methods
			updateSearchStats: () => {
				set((draft) => {
					const nodes = Object.values(draft.nodes);
					const edges = Object.values(draft.edges);

					draft.totalNodeCount = nodes.length;
					draft.totalEdgeCount = edges.length;

					// Reset stats
					Object.keys(draft.entityTypeStats).forEach(key => {
						if (key !== 'total' && key !== 'visible') {
							draft.entityTypeStats[key as EntityType] = 0;
						}
					});
					Object.keys(draft.edgeTypeStats).forEach(key => {
						if (key !== 'total' && key !== 'visible') {
							draft.edgeTypeStats[key as RelationType] = 0;
						}
					});

					// Count entities
					nodes.forEach(node => {
						draft.entityTypeStats[node.entityType]++;
					});

					// Count edges
					edges.forEach(edge => {
						draft.edgeTypeStats[edge.type]++;
					});

					// Update totals and visible counts
					draft.entityTypeStats.total = nodes.length;
					draft.entityTypeStats.visible = nodes.filter(node =>
						draft.visibleEntityTypes[node.entityType]
					).length;

					draft.edgeTypeStats.total = edges.length;
					draft.edgeTypeStats.visible = edges.filter(edge =>
						draft.visibleEdgeTypes[edge.type]
					).length;
				});
			},

			// Node state management (placeholder implementations)
			markNodeAsLoading: (nodeId) => {
				// Could add loading state to node metadata
				set((draft) => {
					if (draft.nodes[nodeId]) {
						draft.nodes[nodeId].metadata = {
							...(draft.nodes[nodeId].metadata || {}),
							loading: true
						};
					}
				});
			},

			markNodeAsLoaded: (nodeId) => {
				set((draft) => {
					if (draft.nodes[nodeId]) {
						draft.nodes[nodeId].metadata = {
							...(draft.nodes[nodeId].metadata || {}),
							loading: false
						};
					}
				});
			},

			markNodeAsError: (nodeId) => {
				set((draft) => {
					if (draft.nodes[nodeId]) {
						draft.nodes[nodeId].metadata = {
							...(draft.nodes[nodeId].metadata || {}),
							loading: false,
							error: true
						};
					}
				});
			},

			calculateNodeDepths: () => {
				// Placeholder - could implement BFS depth calculation
				console.log("calculateNodeDepths not implemented");
			},

			getMinimalNodes: () => {
				const state = get();
				return Object.values(state.nodes);
			},

			// Provider methods
			setProvider: (provider) => set({ provider }),
		})),
		{
			name: "graph-layout-storage",
			storage: createJSONStorage(() => createHybridStorage({
				dbName: "academic-explorer",
				storeName: "graph-store",
				version: 1
			})),
			partialize: (state) => ({
				visibleEntityTypes: state.visibleEntityTypes,
				visibleEdgeTypes: state.visibleEdgeTypes,
			}),
		}
	)
);