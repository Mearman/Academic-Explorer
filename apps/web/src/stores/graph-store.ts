/**
 * Graph store with infinite loop fixes applied
 * Commented out all immediate recomputation calls that were causing React 19 infinite loops
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { createHybridStorage } from "@academic-explorer/utils/storage";

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
	selectedNodeId: string | null;
	hoveredNodeId: string | null;
	selectedNodes: Record<string, boolean>;
	selectNode: (nodeId: string | null) => void;
	hoverNode: (nodeId: string | null) => void;
	addToSelection: (nodeId: string) => void;
	removeFromSelection: (nodeId: string) => void;
	clearSelection: () => void;

	// Pinning system
	pinnedNodes: Record<string, boolean>;
	pinNode: (nodeId: string) => void;
	unpinNode: (nodeId: string) => void;
	clearAllPinnedNodes: () => void;
	isPinned: (nodeId: string) => boolean;

	// Layout system
	currentLayout: GraphLayout;
	setLayout: (layout: GraphLayout) => void;
	applyCurrentLayout: () => void;

	// Visibility state
	visibleEntityTypes: Record<EntityType, boolean>;
	visibleEdgeTypes: Record<RelationType, boolean>;
	toggleEntityTypeVisibility: (entityType: EntityType) => void;
	toggleEdgeTypeVisibility: (edgeType: RelationType) => void;
	setEntityTypeVisibility: (entityType: EntityType, visible: boolean) => void;
	setEdgeTypeVisibility: (edgeType: RelationType, visible: boolean) => void;
	setAllEntityTypesVisible: (visible: boolean) => void;
	resetEntityTypesToDefaults: () => void;
	getEntityTypeStats: () => Record<string, any>;
	getVisibleNodes: () => GraphNode[];

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
	updateSearchStats: (stats: Record<EntityType, number>) => void;

	// Node state management
	markNodeAsLoading: (nodeId: string) => void;
	markNodeAsLoaded: (nodeId: string) => void;
	markNodeAsError: (nodeId: string) => void;
	calculateNodeDepths: () => void;
	getMinimalNodes: () => GraphNode[];
	getNodesWithinDepth: (depth: number) => GraphNode[];
	nodeDepths: Record<string, number>;

	// Graph algorithms
	getNeighbors: (nodeId: string) => GraphNode[];
	getConnectedEdges: (nodeId: string) => GraphEdge[];
	findShortestPath: (sourceId: string, targetId: string) => string[];
	getConnectedComponent: (nodeId: string) => string[];

	// Computed getters (cached to prevent infinite loops)
	cachedVisibleNodes: GraphNode[];

	// Provider reference
	provider: GraphProvider | null;
	providerType: string | null;
	setProvider: (provider: GraphProvider) => void;
	setProviderType: (providerType: string) => void;
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
			selectedNodes: {},

			// Node depths and traversal
			nodeDepths: {},

			// Pinning system
			pinnedNodes: {},
			providerType: null,

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
				[RelationType.TOPIC_PART_OF_FIELD]: false
			},

			// Basic methods
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
				nodeDepths: {},
				cachedVisibleNodes: [],
				error: null
			}),

			// Cached visible nodes getter
			getVisibleNodes: () => {
				const state = get();
				const nodes = Object.values(state.nodes);
				return nodes.filter(node => state.visibleEntityTypes[node.entityType]);
			},

			// Additional CRUD methods
			addNodes: (nodes) => {
				set((draft) => {
					nodes.forEach(node => {
						draft.nodes[node.id] = node;
					});
				});
				// Notify provider if available
				const state = get();
				if (state.provider) {
					nodes.forEach(node => {
						state.provider!.addNode(node);
					});
				}
			},

			addEdges: (edges) => {
				set((draft) => {
					edges.forEach(edge => {
						draft.edges[edge.id] = edge;
					});
				});
			},

			removeNode: (nodeId) => {
				const state = get();

				// Find connected edges to remove
				const connectedEdges = Object.values(state.edges).filter(edge =>
					edge.source === nodeId || edge.target === nodeId
				);

				set((draft) => {
					// Remove node
					delete draft.nodes[nodeId];

					// Remove connected edges
					connectedEdges.forEach(edge => {
						delete draft.edges[edge.id];
					});

					// Clean up pinning
					delete draft.pinnedNodes[nodeId];

					// Clean up selection
					if (draft.selectedNodeId === nodeId) {
						draft.selectedNodeId = null;
					}
					if (draft.hoveredNodeId === nodeId) {
						draft.hoveredNodeId = null;
					}
					delete draft.selectedNodes[nodeId];
				});

				// Notify provider
				if (state.provider) {
					state.provider.removeNode(nodeId);
					connectedEdges.forEach(edge => {
						state.provider!.removeEdge(edge.id);
					});
				}
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
					delete draft.pinnedNodes[nodeId];
				});
			},

			clearAllPinnedNodes: () => {
				set((draft) => {
					draft.pinnedNodes = {};
				});
			},

			isPinned: (nodeId) => {
				const state = get();
				return !!state.pinnedNodes[nodeId];
			},

			// Layout methods
			setLayout: (layout) => {
				set({ currentLayout: layout });
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
						delete draft.visibleEntityTypes[entityType];
					}
				});
			},

			// Cache settings
			setShowAllCachedNodes: (show) => {
				set({ showAllCachedNodes: show });
			},

			setTraversalDepth: (depth) => {
				set({ traversalDepth: Math.max(1, depth) });
			},

			// Statistics methods
			updateSearchStats: (stats) => {
				set((draft) => {
					draft.lastSearchStats = stats;
				});
			},

			_recomputeStats: () => {
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



			getMinimalNodes: () => {
				const state = get();
				return Object.values(state.nodes);
			},

			// Missing selection methods
			hoverNode: (nodeId) => {
				set({ hoveredNodeId: nodeId });
			},

			removeFromSelection: (nodeId) => {
				set((draft) => {
					delete draft.selectedNodes[nodeId];
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
					if (draft.visibleEntityTypes[entityType]) {
						delete draft.visibleEntityTypes[entityType];
					} else {
						draft.visibleEntityTypes[entityType] = true;
					}
				});
			},

			setEdgeTypeVisibility: (edgeType, visible) => {
				set((draft) => {
					draft.visibleEdgeTypes[edgeType] = visible;
				});
			},

			setAllEntityTypesVisible: (visible) => {
				set((draft) => {
					Object.keys(draft.visibleEntityTypes).forEach(type => {
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
						funders: true
					};
				});
			},

			getEntityTypeStats: () => {
				const state = get();
				const nodes = Object.values(state.nodes);
				const total: Record<EntityType, number> = {} as Record<EntityType, number>;
				const visible: Record<EntityType, number> = {} as Record<EntityType, number>;
				const searchResults: Record<EntityType, number> = {} as Record<EntityType, number>;

				// Initialize counts for all entity types
				const allEntityTypes: EntityType[] = ["concepts", "topics", "keywords", "works", "authors", "sources", "institutions", "publishers", "funders"];
				allEntityTypes.forEach(type => {
					total[type] = 0;
					visible[type] = 0;
					searchResults[type] = state.lastSearchStats[type] as number || 0;
				});

				// Count nodes
				nodes.forEach(node => {
					total[node.entityType]++;
					if (state.visibleEntityTypes[node.entityType]) {
						visible[node.entityType]++;
					}
				});

				return { total, visible, searchResults };
			},

			// Missing node depth and traversal methods
			calculateNodeDepths: () => {
				const state = get();
				const {nodes} = state;
				const {edges} = state;

				// Simple BFS implementation to calculate depths
				const depths: Record<string, number> = {};
				const visited = new Set<string>();
				const queue: Array<{id: string, depth: number}> = [];

				// Find the first pinned node or first node as root
				const pinnedNodeIds = Object.keys(state.pinnedNodes).filter(id => state.pinnedNodes[id]);
				const rootNode = pinnedNodeIds[0] || Object.keys(nodes)[0];

				if (rootNode) {
					queue.push({ id: rootNode, depth: 0 });
					depths[rootNode] = 0;
					visited.add(rootNode);

					while (queue.length > 0) {
						const { id: currentId, depth } = queue.shift()!;

						// Find connected nodes
						Object.values(edges).forEach(edge => {
							const connectedId = edge.source === currentId ? edge.target :
											   edge.target === currentId ? edge.source : null;

							if (connectedId && !visited.has(connectedId) && nodes[connectedId]) {
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
				const state = get();
				const nodes = Object.values(state.nodes);

				// If no depths calculated, return empty array unless depth is Infinity
				if (Object.keys(state.nodeDepths).length === 0) {
					return depth === Infinity ? nodes : [];
				}

				return nodes.filter(node => {
					const nodeDepth = state.nodeDepths[node.id];
					return nodeDepth !== undefined && (depth === Infinity || nodeDepth <= depth);
				});
			},

			// Graph algorithm implementations
			getNeighbors: (nodeId) => {
				const state = get();
				const neighbors: GraphNode[] = [];
				const edges = Object.values(state.edges);

				edges.forEach(edge => {
					if (edge.source === nodeId && state.nodes[edge.target]) {
						neighbors.push(state.nodes[edge.target]);
					} else if (edge.target === nodeId && state.nodes[edge.source]) {
						neighbors.push(state.nodes[edge.source]);
					}
				});

				return neighbors;
			},

			getConnectedEdges: (nodeId) => {
				const state = get();
				return Object.values(state.edges).filter(edge =>
					edge.source === nodeId || edge.target === nodeId
				);
			},

			findShortestPath: (sourceId, targetId) => {
				const state = get();
				if (sourceId === targetId) return [sourceId];
				if (!state.nodes[sourceId] || !state.nodes[targetId]) return [];

				const visited = new Set<string>();
				const queue: Array<{id: string, path: string[]}> = [];
				const edges = Object.values(state.edges);

				queue.push({ id: sourceId, path: [sourceId] });
				visited.add(sourceId);

				while (queue.length > 0) {
					const { id: currentId, path } = queue.shift()!;

					// Find neighbors
					for (const edge of edges) {
						const nextId = edge.source === currentId ? edge.target :
									  edge.target === currentId ? edge.source : null;

						if (nextId && !visited.has(nextId) && state.nodes[nextId]) {
							const newPath = [...path, nextId];

							if (nextId === targetId) {
								return newPath;
							}

							visited.add(nextId);
							queue.push({ id: nextId, path: newPath });
						}
					}
				}

				return []; // No path found
			},

			getConnectedComponent: (nodeId) => {
				const state = get();
				const visited = new Set<string>();
				const component: string[] = [];
				const queue = [nodeId];
				const edges = Object.values(state.edges);

				if (!state.nodes[nodeId]) {
					return [nodeId]; // Return the node ID even if not found
				}

				while (queue.length > 0) {
					const currentId = queue.shift()!;
					if (visited.has(currentId)) continue;

					visited.add(currentId);
					component.push(currentId);

					// Find connected nodes
					edges.forEach(edge => {
						const connectedId = edge.source === currentId ? edge.target :
										   edge.target === currentId ? edge.source : null;

						if (connectedId && !visited.has(connectedId) && state.nodes[connectedId]) {
							queue.push(connectedId);
						}
					});
				}

				return component;
			},

			// Missing state management methods
			markNodeAsLoading: (nodeId) => {
				set((draft) => {
					if (draft.nodes[nodeId]) {
						draft.nodes[nodeId].metadata = {
							...draft.nodes[nodeId].metadata,
							loading: true
						};
					}
				});
			},

			markNodeAsLoaded: (nodeId) => {
				set((draft) => {
					if (draft.nodes[nodeId]) {
						draft.nodes[nodeId].metadata = {
							...draft.nodes[nodeId].metadata,
							loading: false
						};
					}
				});
			},

			markNodeAsError: (nodeId) => {
				set((draft) => {
					if (draft.nodes[nodeId]) {
						draft.nodes[nodeId].metadata = {
							...draft.nodes[nodeId].metadata,
							loading: false,
							error: true
						};
					}
				});
			},

			// Provider methods
			setProvider: (provider) => {
				const state = get();
				set({ provider });

				// Transfer existing data to provider
				if (provider) {
					const nodes = Object.values(state.nodes);
					const edges = Object.values(state.edges);
					provider.setNodes(nodes);
					provider.setEdges(edges);
				}
			},

			setProviderType: (providerType) => {
				set({ providerType });
			},
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