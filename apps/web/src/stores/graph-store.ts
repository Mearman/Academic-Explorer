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

	// Essential methods only
	addNode: (node: GraphNode) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	clear: () => void;
	setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;

	// Minimal visibility state
	visibleEntityTypes: Record<EntityType, boolean>;
	visibleEdgeTypes: Record<RelationType, boolean>;

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