/**
 * Repository store for managing nodes and edges that can be dragged into the graph
 * Provides separate space for search results and filtered content before adding to main graph
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { GraphNode, GraphEdge, EntityType } from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";
import { createHybridStorage } from "@academic-explorer/shared-utils/storage";
import { logger } from "@academic-explorer/shared-utils/logger";

interface RepositoryState {
  // Repository mode toggle
  repositoryMode: boolean;

  // Repository nodes/edges (not in main graph yet)
  repositoryNodes: Record<string, GraphNode>;
  repositoryEdges: Record<string, GraphEdge>;

  // Search and filter state
  searchQuery: string;
  nodeTypeFilter: Record<EntityType, boolean>;
  edgeTypeFilter: Record<RelationType, boolean>;

  // Selection state for batch operations
  selectedRepositoryNodes: Record<string, boolean>;
  selectedRepositoryEdges: Record<string, boolean>;

  // Computed state (cached to avoid getSnapshot issues)
  filteredNodes: GraphNode[];
  filteredEdges: GraphEdge[];
  totalNodeCount: number;
  totalEdgeCount: number;
  selectedNodeCount: number;
  selectedEdgeCount: number;

  // Actions
  setRepositoryMode: (enabled: boolean) => void;
  addToRepository: (nodes: GraphNode[], edges?: GraphEdge[]) => void;
  removeFromRepository: (nodeIds: string[], edgeIds?: string[]) => void;
  clearRepository: () => void;

  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setNodeTypeFilter: (entityType: EntityType, enabled: boolean) => void;
  setEdgeTypeFilter: (relationType: RelationType, enabled: boolean) => void;
  resetFilters: () => void;

  // Selection actions
  selectRepositoryNode: (nodeId: string, selected: boolean) => void;
  selectRepositoryEdge: (edgeId: string, selected: boolean) => void;
  selectAllNodes: () => void;
  selectAllEdges: () => void;
  clearAllSelections: () => void;

  // Computed getters (stable references)
  getFilteredNodes: () => GraphNode[];
  getFilteredEdges: () => GraphEdge[];
  getSelectedNodes: () => GraphNode[];
  getSelectedEdges: () => GraphEdge[];

  // Cache update functions
  recomputeFilteredNodes: () => void;
  recomputeFilteredEdges: () => void;
  recomputeCounts: () => void;
}

// Helper function to create initial node type filter state
const createInitialNodeTypeFilter = (): Record<EntityType, boolean> => ({
	works: true,
	authors: true,
	sources: true,
	institutions: true,
	topics: true,
	concepts: true,
	publishers: true,
	funders: true,
	keywords: true,
});

// Helper function to create initial edge type filter state
const createInitialEdgeTypeFilter = (): Record<RelationType, boolean> => ({
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
});

export const useRepositoryStore = create<RepositoryState>()(
	persist(
		immer((set, get) => ({
			// Initial state
			repositoryMode: false,
			repositoryNodes: {},
			repositoryEdges: {},
			searchQuery: "",
			nodeTypeFilter: createInitialNodeTypeFilter(),
			edgeTypeFilter: createInitialEdgeTypeFilter(),
			selectedRepositoryNodes: {},
			selectedRepositoryEdges: {},

			// Cached computed state
			filteredNodes: [],
			filteredEdges: [],
			totalNodeCount: 0,
			totalEdgeCount: 0,
			selectedNodeCount: 0,
			selectedEdgeCount: 0,

			// Repository mode actions
			setRepositoryMode: (enabled: boolean) => {
				set(state => {
					state.repositoryMode = enabled;
					logger.debug("repository", `Repository mode ${enabled ? "enabled" : "disabled"}`, {
						nodeCount: Object.keys(state.repositoryNodes).length,
						edgeCount: Object.keys(state.repositoryEdges).length
					});
				});
			},

			addToRepository: (nodes: GraphNode[], edges: GraphEdge[] = []) => {
				set(state => {
					let addedNodes = 0;
					let addedEdges = 0;

					// Add nodes
					for (const node of nodes) {
						if (!(node.id in state.repositoryNodes)) {
							state.repositoryNodes[node.id] = node;
							addedNodes++;
						}
					}

					// Add edges
					for (const edge of edges) {
						if (!(edge.id in state.repositoryEdges)) {
							state.repositoryEdges[edge.id] = edge;
							addedEdges++;
						}
					}

					logger.debug("repository", "Added items to repository", {
						addedNodes,
						addedEdges,
						totalNodes: Object.keys(state.repositoryNodes).length,
						totalEdges: Object.keys(state.repositoryEdges).length
					});
				});

				// Recompute cached state
				get().recomputeFilteredNodes();
				get().recomputeFilteredEdges();
				get().recomputeCounts();
			},

			removeFromRepository: (nodeIds: string[], edgeIds: string[] = []) => {
				set(state => {
					// Remove nodes
					for (const nodeId of nodeIds) {
						const { [nodeId]: _, ...remainingNodes } = state.repositoryNodes;
						state.repositoryNodes = remainingNodes;
						state.selectedRepositoryNodes[nodeId] = false;
					}

					// Remove edges
					for (const edgeId of edgeIds) {
						const { [edgeId]: _, ...remainingEdges } = state.repositoryEdges;
						state.repositoryEdges = remainingEdges;
						state.selectedRepositoryEdges[edgeId] = false;
					}

					logger.debug("repository", "Removed items from repository", {
						removedNodes: nodeIds.length,
						removedEdges: edgeIds.length,
						remainingNodes: Object.keys(state.repositoryNodes).length,
						remainingEdges: Object.keys(state.repositoryEdges).length
					});
				});

				// Recompute cached state
				get().recomputeFilteredNodes();
				get().recomputeFilteredEdges();
				get().recomputeCounts();
			},

			clearRepository: () => {
				set(state => {
					const nodeCount = Object.keys(state.repositoryNodes).length;
					const edgeCount = Object.keys(state.repositoryEdges).length;

					state.repositoryNodes = {};
					state.repositoryEdges = {};
					state.selectedRepositoryNodes = {};
					state.selectedRepositoryEdges = {};

					logger.debug("repository", "Cleared repository", {
						clearedNodes: nodeCount,
						clearedEdges: edgeCount
					});
				});

				// Recompute cached state
				get().recomputeFilteredNodes();
				get().recomputeFilteredEdges();
				get().recomputeCounts();
			},

			// Search and filter actions
			setSearchQuery: (query: string) => {
				set(state => {
					state.searchQuery = query;
				});
				get().recomputeFilteredNodes();
				get().recomputeFilteredEdges();
			},

			setNodeTypeFilter: (entityType: EntityType, enabled: boolean) => {
				set(state => {
					state.nodeTypeFilter[entityType] = enabled;
				});
				get().recomputeFilteredNodes();
			},

			setEdgeTypeFilter: (relationType: RelationType, enabled: boolean) => {
				set(state => {
					state.edgeTypeFilter[relationType] = enabled;
				});
				get().recomputeFilteredEdges();
			},

			resetFilters: () => {
				set(state => {
					state.searchQuery = "";
					state.nodeTypeFilter = createInitialNodeTypeFilter();
					state.edgeTypeFilter = createInitialEdgeTypeFilter();
				});
				get().recomputeFilteredNodes();
				get().recomputeFilteredEdges();
			},

			// Selection actions
			selectRepositoryNode: (nodeId: string, selected: boolean) => {
				set(state => {
					if (selected) {
						state.selectedRepositoryNodes[nodeId] = true;
					} else {
						state.selectedRepositoryNodes[nodeId] = false;
					}
				});
				get().recomputeCounts();
			},

			selectRepositoryEdge: (edgeId: string, selected: boolean) => {
				set(state => {
					if (selected) {
						state.selectedRepositoryEdges[edgeId] = true;
					} else {
						state.selectedRepositoryEdges[edgeId] = false;
					}
				});
				get().recomputeCounts();
			},

			selectAllNodes: () => {
				set(state => {
					const filteredNodes = get().getFilteredNodes();
					for (const node of filteredNodes) {
						state.selectedRepositoryNodes[node.id] = true;
					}
				});
				get().recomputeCounts();
			},

			selectAllEdges: () => {
				set(state => {
					const filteredEdges = get().getFilteredEdges();
					for (const edge of filteredEdges) {
						state.selectedRepositoryEdges[edge.id] = true;
					}
				});
				get().recomputeCounts();
			},

			clearAllSelections: () => {
				set(state => {
					state.selectedRepositoryNodes = {};
					state.selectedRepositoryEdges = {};
				});
				get().recomputeCounts();
			},

			// Computed getters (stable references)
			getFilteredNodes: () => {
				return get().filteredNodes;
			},

			getFilteredEdges: () => {
				return get().filteredEdges;
			},

			getSelectedNodes: () => {
				const state = get();
				return state.filteredNodes.filter(node => state.selectedRepositoryNodes[node.id]);
			},

			getSelectedEdges: () => {
				const state = get();
				return state.filteredEdges.filter(edge => state.selectedRepositoryEdges[edge.id]);
			},

			// Cache update functions
			recomputeFilteredNodes: () => {
				set(state => {
					const nodes = Object.values(state.repositoryNodes);
					const query = state.searchQuery.toLowerCase();

					state.filteredNodes = nodes.filter(node => {
						// Type filter
						if (!state.nodeTypeFilter[node.type]) {
							return false;
						}

						// Search query filter
						if (query && !node.label.toLowerCase().includes(query)) {
							return false;
						}

						return true;
					});
				});
			},

			recomputeFilteredEdges: () => {
				set(state => {
					const edges = Object.values(state.repositoryEdges);

					state.filteredEdges = edges.filter(edge => {
						// Type filter
						if (!state.edgeTypeFilter[edge.type]) {
							return false;
						}

						return true;
					});
				});
			},

			recomputeCounts: () => {
				set(state => {
					state.totalNodeCount = Object.keys(state.repositoryNodes).length;
					state.totalEdgeCount = Object.keys(state.repositoryEdges).length;
					state.selectedNodeCount = Object.keys(state.selectedRepositoryNodes).length;
					state.selectedEdgeCount = Object.keys(state.selectedRepositoryEdges).length;
				});
			},
		})),
		{
			name: "repository-storage",
			storage: createJSONStorage(() => createHybridStorage()),
			partialize: (state) => ({
				repositoryMode: state.repositoryMode,
				nodeTypeFilter: state.nodeTypeFilter,
				edgeTypeFilter: state.edgeTypeFilter,
			}),
		}
	)
);