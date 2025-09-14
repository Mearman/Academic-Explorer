/**
 * Graph store for provider-agnostic graph state management
 * Uses Zustand with Immer for immutable state updates that maintain stable references
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

// Enable Immer MapSet plugin for Map and Set support
enableMapSet();
import type {
	GraphNode,
	GraphEdge,
	GraphProvider,
	ProviderType,
	GraphLayout,
	EntityType,
} from "@/lib/graph/types";
import { RelationType } from "@/lib/graph/types";

interface GraphState {
  // Data (library agnostic)
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;

  // Selection and interaction
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedNodes: Set<string>;
  pinnedNodeId: string | null;

  // Cache visibility and traversal control
  showAllCachedNodes: boolean;
  traversalDepth: number;
  nodeDepths: Map<string, number>;

  // Provider (can be swapped)
  provider: GraphProvider | null;
  providerType: ProviderType;

  // Layout state
  currentLayout: GraphLayout;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Entity type visibility and statistics
  visibleEntityTypes: Set<EntityType>;
  lastSearchStats: Map<EntityType, number>;

  // Edge type visibility
  visibleEdgeTypes: Set<RelationType>;

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

  // Pinned node management
  setPinnedNode: (nodeId: string | null) => void;
  clearPinnedNode: () => void;

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
  updateSearchStats: (stats: Map<EntityType, number>) => void;
  getEntityTypeStats: () => { visible: Map<EntityType, number>; total: Map<EntityType, number>; searchResults: Map<EntityType, number> };
  getVisibleNodes: () => GraphNode[];
  getVisibleEdges: () => GraphEdge[];

  // Edge type management
  toggleEdgeTypeVisibility: (edgeType: RelationType) => void;
  setEdgeTypeVisibility: (edgeType: RelationType, visible: boolean) => void;
  setAllEdgeTypesVisible: (visible: boolean) => void;
  getEdgeTypeStats: () => { visible: Map<RelationType, number>; total: Map<RelationType, number> };
  getVisibleEdgesByType: () => GraphEdge[];

  // Graph queries (provider agnostic)
  getNeighbors: (nodeId: string) => GraphNode[];
  getConnectedEdges: (nodeId: string) => GraphEdge[];
  findShortestPath: (sourceId: string, targetId: string) => string[];
  getConnectedComponent: (nodeId: string) => Set<string>;
}

export const useGraphStore = create<GraphState>()(
	persist(
		immer((set, get) => ({
			// Initial state
			nodes: new Map(),
			edges: new Map(),
			selectedNodeId: null,
			hoveredNodeId: null,
			selectedNodes: new Set(),
			pinnedNodeId: null,
			showAllCachedNodes: false,
			traversalDepth: 1,
			nodeDepths: new Map(),
			provider: null,
			providerType: "xyflow",
			visibleEntityTypes: new Set(["works", "authors", "sources", "institutions", "topics", "publishers", "funders", "keywords", "geo"]),
			lastSearchStats: new Map(),
			visibleEdgeTypes: new Set(["authored", "cited", "affiliated", "published_in", "funded_by", "related_to", "references"] as RelationType[]),
			currentLayout: {
				type: "d3-force",
				options: {
					seed: 42,
					iterations: 300,
					linkDistance: 220,      // Increased for more spacing between connected nodes
					linkStrength: 0.7,      // Weaker link forces to allow more collision separation
					chargeStrength: -600,   // Stronger repulsion for better separation
					centerStrength: 0.03,   // Even weaker centering for more spread
					collisionRadius: 100,   // Larger collision radius to prevent overlaps
					velocityDecay: 0.4,     // Higher decay for faster stabilization
					alpha: 1,
					alphaDecay: 0.03,       // Faster decay to reach stability quicker
					collisionStrength: 0.8  // Strong but not maximum to allow settling
				}
			},
			isLoading: false,
			error: null,

			// Provider management
			setProvider: (provider) => {
				const state = get();
				// Transfer existing data to new provider
				provider.setNodes(Array.from(state.nodes.values()));
				provider.setEdges(Array.from(state.edges.values()));
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
					draft.nodes.set(node.id, node);
					draft.provider?.addNode(node);
				});
			},

			addNodes: (nodes) => {
				set((draft) => {
					nodes.forEach(node => {
						draft.nodes.set(node.id, node);
						draft.provider?.addNode(node);
					});
				});
			},

			removeNode: (nodeId) => {
				set((draft) => {
					// Remove node
					draft.nodes.delete(nodeId);
					draft.provider?.removeNode(nodeId);

					// Remove connected edges
					Array.from(draft.edges.values()).forEach(edge => {
						if (edge.source === nodeId || edge.target === nodeId) {
							draft.edges.delete(edge.id);
							draft.provider?.removeEdge(edge.id);
						}
					});

					// Clear selection if removed
					draft.selectedNodes.delete(nodeId);
					if (draft.selectedNodeId === nodeId) {
						draft.selectedNodeId = null;
					}
					if (draft.hoveredNodeId === nodeId) {
						draft.hoveredNodeId = null;
					}
				});
			},

			updateNode: (nodeId, updates) => {
				set((draft) => {
					const existingNode = draft.nodes.get(nodeId);
					if (existingNode) {
						const updatedNode = { ...existingNode, ...updates };
						draft.nodes.set(nodeId, updatedNode);
						// Note: Provider update would need to be handled by provider
					}
				});
			},

			getNode: (nodeId) => {
				return get().nodes.get(nodeId);
			},

			// Edge management
			addEdge: (edge) => {
				set((draft) => {
					draft.edges.set(edge.id, edge);
					draft.provider?.addEdge(edge);
				});
			},

			addEdges: (edges) => {
				set((draft) => {
					edges.forEach(edge => {
						draft.edges.set(edge.id, edge);
						draft.provider?.addEdge(edge);
					});
				});
			},

			removeEdge: (edgeId) => {
				set((draft) => {
					draft.edges.delete(edgeId);
					draft.provider?.removeEdge(edgeId);
				});
			},

			updateEdge: (edgeId, updates) => {
				set((draft) => {
					const existingEdge = draft.edges.get(edgeId);
					if (existingEdge) {
						const updatedEdge = { ...existingEdge, ...updates };
						draft.edges.set(edgeId, updatedEdge);
					}
				});
			},

			getEdge: (edgeId) => {
				return get().edges.get(edgeId);
			},

			// Selection
			selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

			hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),

			addToSelection: (nodeId) => {
				set((draft) => {
					draft.selectedNodes.add(nodeId);
				});
			},

			removeFromSelection: (nodeId) => {
				set((draft) => {
					draft.selectedNodes.delete(nodeId);
				});
			},

			clearSelection: () => {
				set((draft) => {
					draft.selectedNodeId = null;
					draft.selectedNodes.clear();
				});
			},

			// Pinned node management
			setPinnedNode: (nodeId) => {
				set((draft) => {
					draft.pinnedNodeId = nodeId;
				});
			},

			clearPinnedNode: () => {
				set((draft) => {
					draft.pinnedNodeId = null;
				});
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
					const { nodes, edges } = draft;
					const depths = new Map<string, number>();

					// BFS to calculate distances from origin
					const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: originId, depth: 0 }];
					const visited = new Set<string>();

					while (queue.length > 0) {
						const current = queue.shift();
						if (!current) continue;

						const { nodeId, depth } = current;
						if (visited.has(nodeId)) continue;

						visited.add(nodeId);
						depths.set(nodeId, depth);

						// Find connected nodes
						edges.forEach(edge => {
							let neighbor: string | null = null;
							if (edge.source === nodeId && !visited.has(edge.target)) {
								neighbor = edge.target;
							} else if (edge.target === nodeId && !visited.has(edge.source)) {
								neighbor = edge.source;
							}

							if (neighbor && nodes.has(neighbor)) {
								queue.push({ nodeId: neighbor, depth: depth + 1 });
							}
						});
					}

					draft.nodeDepths = depths;
				});
			},

			getNodesWithinDepth: (depth) => {
				const { nodes, nodeDepths } = get();
				if (depth === Infinity) {
					return Array.from(nodes.values());
				}

				return Array.from(nodes.values()).filter(node => {
					const nodeDepth = nodeDepths.get(node.id);
					return nodeDepth !== undefined && nodeDepth <= depth;
				});
			},

			// Bulk operations
			clear: () => {
				const { provider } = get();
				provider?.clear();
				set({
					nodes: new Map(),
					edges: new Map(),
					selectedNodeId: null,
					hoveredNodeId: null,
					selectedNodes: new Set(),
					pinnedNodeId: null,
					nodeDepths: new Map(),
				});
			},

			setGraphData: (nodes, edges) => {
				const { provider } = get();
				const nodesMap = new Map(nodes.map(node => [node.id, node]));
				const edgesMap = new Map(edges.map(edge => [edge.id, edge]));

				if (provider) {
					provider.setNodes(nodes);
					provider.setEdges(edges);
				}

				set({
					nodes: nodesMap,
					edges: edgesMap,
					selectedNodeId: null,
					hoveredNodeId: null,
					selectedNodes: new Set(),
					nodeDepths: new Map(), // Clear depths, will be recalculated when needed
				});
			},

			// Loading states
			setLoading: (loading) => set({ isLoading: loading }),
			setError: (error) => set({ error }),

			// Entity type management
			toggleEntityTypeVisibility: (entityType) => {
				set((state) => {
					const newVisibleTypes = new Set(state.visibleEntityTypes);
					if (newVisibleTypes.has(entityType)) {
						newVisibleTypes.delete(entityType);
					} else {
						newVisibleTypes.add(entityType);
					}
					return { visibleEntityTypes: newVisibleTypes };
				});
			},

			setEntityTypeVisibility: (entityType, visible) => {
				set((state) => {
					const newVisibleTypes = new Set(state.visibleEntityTypes);
					if (visible) {
						newVisibleTypes.add(entityType);
					} else {
						newVisibleTypes.delete(entityType);
					}
					return { visibleEntityTypes: newVisibleTypes };
				});
			},

			setAllEntityTypesVisible: (visible) => {
				const allTypes: EntityType[] = ["works", "authors", "sources", "institutions", "topics", "publishers", "funders", "keywords", "geo"];
				set({
					visibleEntityTypes: visible ? new Set(allTypes) : new Set()
				});
			},

			updateSearchStats: (stats) => {
				set({ lastSearchStats: new Map(stats) });
			},

			getEntityTypeStats: () => {
				const { nodes, visibleEntityTypes, lastSearchStats } = get();
				const total = new Map<EntityType, number>();
				const visible = new Map<EntityType, number>();

				// Count total and visible nodes by type
				nodes.forEach(node => {
					const currentTotal = total.get(node.type) || 0;
					total.set(node.type, currentTotal + 1);

					if (visibleEntityTypes.has(node.type)) {
						const currentVisible = visible.get(node.type) || 0;
						visible.set(node.type, currentVisible + 1);
					}
				});

				return {
					total,
					visible,
					searchResults: lastSearchStats
				};
			},

			getVisibleNodes: () => {
				const { nodes, visibleEntityTypes } = get();
				return Array.from(nodes.values()).filter(node => visibleEntityTypes.has(node.type));
			},

			getVisibleEdges: () => {
				const { edges, nodes, visibleEntityTypes, visibleEdgeTypes } = get();
				return Array.from(edges.values()).filter(edge => {
					const sourceNode = nodes.get(edge.source);
					const targetNode = nodes.get(edge.target);
					return sourceNode && targetNode &&
						visibleEntityTypes.has(sourceNode.type) &&
						visibleEntityTypes.has(targetNode.type) &&
						visibleEdgeTypes.has(edge.type);
				});
			},

			// Edge type management
			toggleEdgeTypeVisibility: (edgeType) => {
				set((state) => {
					const newVisibleTypes = new Set(state.visibleEdgeTypes);
					if (newVisibleTypes.has(edgeType)) {
						newVisibleTypes.delete(edgeType);
					} else {
						newVisibleTypes.add(edgeType);
					}
					return { visibleEdgeTypes: newVisibleTypes };
				});
			},

			setEdgeTypeVisibility: (edgeType, visible) => {
				set((state) => {
					const newVisibleTypes = new Set(state.visibleEdgeTypes);
					if (visible) {
						newVisibleTypes.add(edgeType);
					} else {
						newVisibleTypes.delete(edgeType);
					}
					return { visibleEdgeTypes: newVisibleTypes };
				});
			},

			setAllEdgeTypesVisible: (visible) => {
				const allTypes: RelationType[] = ["authored", "cited", "affiliated", "published_in", "funded_by", "related_to", "references"] as RelationType[];
				set({
					visibleEdgeTypes: visible ? new Set(allTypes) : new Set()
				});
			},

			getEdgeTypeStats: () => {
				const { edges, visibleEdgeTypes } = get();
				const total = new Map<RelationType, number>();
				const visible = new Map<RelationType, number>();

				// Count total and visible edges by type
				edges.forEach(edge => {
					const currentTotal = total.get(edge.type) || 0;
					total.set(edge.type, currentTotal + 1);

					if (visibleEdgeTypes.has(edge.type)) {
						const currentVisible = visible.get(edge.type) || 0;
						visible.set(edge.type, currentVisible + 1);
					}
				});

				return {
					total,
					visible
				};
			},

			getVisibleEdgesByType: () => {
				const { edges, visibleEdgeTypes } = get();
				return Array.from(edges.values()).filter(edge => visibleEdgeTypes.has(edge.type));
			},

			// Graph algorithms (work with generic data)
			getNeighbors: (nodeId) => {
				const { edges, nodes } = get();
				const neighbors: GraphNode[] = [];

				edges.forEach(edge => {
					if (edge.source === nodeId) {
						const neighbor = nodes.get(edge.target);
						if (neighbor) neighbors.push(neighbor);
					} else if (edge.target === nodeId) {
						const neighbor = nodes.get(edge.source);
						if (neighbor) neighbors.push(neighbor);
					}
				});

				return neighbors;
			},

			getConnectedEdges: (nodeId) => {
				const { edges } = get();
				const connectedEdges: GraphEdge[] = [];

				edges.forEach(edge => {
					if (edge.source === nodeId || edge.target === nodeId) {
						connectedEdges.push(edge);
					}
				});

				return connectedEdges;
			},

			findShortestPath: (sourceId, targetId) => {
				const { nodes, edges } = get();

				// Simple BFS implementation
				const queue: string[] = [sourceId];
				const visited = new Set<string>([sourceId]);
				const parent = new Map<string, string>();

				while (queue.length > 0) {
					const current = queue.shift();
					if (!current) continue;

					if (current === targetId) {
						// Reconstruct path
						const path: string[] = [];
						let node: string | undefined = targetId;
						while (node) {
							path.unshift(node);
							node = parent.get(node);
						}
						return path;
					}

					// Check all connected nodes
					edges.forEach(edge => {
						let neighbor: string | null = null;
						if (edge.source === current && !visited.has(edge.target)) {
							neighbor = edge.target;
						} else if (edge.target === current && !visited.has(edge.source)) {
							neighbor = edge.source;
						}

						if (neighbor && nodes.has(neighbor)) {
							visited.add(neighbor);
							parent.set(neighbor, current);
							queue.push(neighbor);
						}
					});
				}

				return []; // No path found
			},

			getConnectedComponent: (nodeId) => {
				const { edges } = get();
				const visited = new Set<string>();
				const stack: string[] = [nodeId];

				while (stack.length > 0) {
					const current = stack.pop();
					if (!current) continue;
					if (visited.has(current)) continue;

					visited.add(current);

					// Add all connected nodes
					edges.forEach(edge => {
						if (edge.source === current && !visited.has(edge.target)) {
							stack.push(edge.target);
						} else if (edge.target === current && !visited.has(edge.source)) {
							stack.push(edge.source);
						}
					});
				}

				return visited;
			},
		})),
		{
			name: "graph-layout-storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				currentLayout: state.currentLayout,
				providerType: state.providerType,
				visibleEntityTypes: Array.from(state.visibleEntityTypes),
				visibleEdgeTypes: Array.from(state.visibleEdgeTypes),
				showAllCachedNodes: state.showAllCachedNodes,
				traversalDepth: state.traversalDepth,
			}),
			onRehydrateStorage: () => (state) => {
				if (state && Array.isArray(state.visibleEntityTypes)) {
					state.visibleEntityTypes = new Set(state.visibleEntityTypes as EntityType[]);
				}
				if (state && Array.isArray(state.visibleEdgeTypes)) {
					state.visibleEdgeTypes = new Set(state.visibleEdgeTypes as RelationType[]);
				}
			},
		}
	)
);