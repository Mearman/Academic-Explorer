/**
 * Unit tests for graph cache functionality
 * Tests TanStack Query integration and graph data caching operations
 */

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import type { GraphNode, GraphEdge } from "@/lib/graph/types";
import type { OpenAlexEntity } from "@/lib/openalex/types";
import {
	graphQueryKeys,
	getCachedOpenAlexEntities,
	getCachedEntitiesByType,
	setCachedGraphNodes,
	setCachedGraphEdges,
	getCachedGraphNodes,
	getCachedGraphEdges,
	setNodeExpanded,
	isNodeExpanded,
	clearGraphCache,
	getGraphCacheStats,
	useGraphCache,
} from "./graph-cache";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@/lib/graph/utils/entity-detection");

// Sample test data
const sampleWorkEntity: OpenAlexEntity = {
	id: "https://openalex.org/W2741809807",
	display_name: "The structure of scientific revolutions",
	type: "work",
} as OpenAlexEntity;

const sampleAuthorEntity: OpenAlexEntity = {
	id: "https://openalex.org/A5017898742",
	display_name: "Thomas Kuhn",
	type: "author",
} as OpenAlexEntity;

const sampleGraphNode: GraphNode = {
	id: "W2741809807",
	entityType: "works",
	label: "The structure of scientific revolutions",
	position: { x: 0, y: 0 },
	data: sampleWorkEntity,
};

const sampleGraphEdge: GraphEdge = {
	id: "edge-1",
	source: "W2741809807",
	target: "A5017898742",
	type: "authored",
	data: { relationshipType: "authored" },
};

describe("Graph Cache", () => {
	let queryClient: QueryClient;
	let mockEntityDetector: vi.Mocked<EntityDetector>;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		vi.clearAllMocks();

		// Mock EntityDetector
		mockEntityDetector = {
			detectEntityIdentifier: vi.fn(),
		} as any;

		(EntityDetector as any).mockImplementation(() => mockEntityDetector);
	});

	describe("graphQueryKeys", () => {
		it("should generate correct query keys for all", () => {
			expect(graphQueryKeys.all).toEqual(["graph"]);
		});

		it("should generate correct query keys for nodes", () => {
			expect(graphQueryKeys.nodes()).toEqual(["graph", "nodes"]);
		});

		it("should generate correct query keys for edges", () => {
			expect(graphQueryKeys.edges()).toEqual(["graph", "edges"]);
		});

		it("should generate correct query keys for expanded", () => {
			expect(graphQueryKeys.expanded()).toEqual(["graph", "expanded"]);
		});

		it("should generate correct query keys for expanded node", () => {
			expect(graphQueryKeys.expandedNode("W123")).toEqual(["graph", "expanded", "W123"]);
		});

		it("should generate correct query keys for cached nodes", () => {
			expect(graphQueryKeys.cachedNodes()).toEqual(["graph", "cached-nodes"]);
		});

		it("should generate correct query keys for cached nodes by type", () => {
			expect(graphQueryKeys.cachedNodesByType("works")).toEqual(["graph", "cached-nodes", "works"]);
		});
	});

	describe("getCachedOpenAlexEntities", () => {
		it("should return empty array when no entities are cached", () => {
			const entities = getCachedOpenAlexEntities(queryClient);

			expect(entities).toEqual([]);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Retrieved cached OpenAlex entities",
				{ count: 0 },
				"GraphCache"
			);
		});

		it("should return cached entities with successful status", () => {
			// Set up cached entity queries
			queryClient.setQueryData(["entity", "works", "W2741809807"], sampleWorkEntity);
			queryClient.setQueryData(["entity", "A5017898742"], sampleAuthorEntity);

			const entities = getCachedOpenAlexEntities(queryClient);

			expect(entities).toHaveLength(2);
			expect(entities).toContainEqual(sampleWorkEntity);
			expect(entities).toContainEqual(sampleAuthorEntity);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Retrieved cached OpenAlex entities",
				{ count: 2 },
				"GraphCache"
			);
		});

		it("should exclude entities without IDs", () => {
			const entityWithoutId = { display_name: "No ID Entity" } as OpenAlexEntity;
			queryClient.setQueryData(["entity", "test"], entityWithoutId);

			const entities = getCachedOpenAlexEntities(queryClient);

			expect(entities).toHaveLength(0);
		});

		it("should handle malformed entity data gracefully", () => {
			// Set up invalid data that will cause property access to fail during type checking
			const invalidData = Object.create(null);
			Object.defineProperty(invalidData, "id", {
				get() { throw new Error("Property access error"); }
			});
			Object.defineProperty(invalidData, "display_name", {
				get() { return "Test Name"; } // Valid display_name to get past existence check
			});

			const invalidQuery = {
				queryKey: ["entity", "invalid"],
				state: {
					status: "success" as const,
					data: invalidData,
				},
			};

			// Mock findAll to return our invalid query
			const mockFindAll = vi.spyOn(queryClient.getQueryCache(), "findAll");
			mockFindAll.mockReturnValue([invalidQuery as any]);

			const entities = getCachedOpenAlexEntities(queryClient);

			expect(entities).toEqual([]);
			expect(logger.warn).toHaveBeenCalledWith(
				"cache",
				"Failed to extract entity from cached query",
				expect.objectContaining({
					queryKey: ["entity", "invalid"],
					error: expect.any(String),
				}),
				"GraphCache"
			);

			mockFindAll.mockRestore();
		});

		it("should only include queries with 'entity' as first key", () => {
			queryClient.setQueryData(["other", "W123"], sampleWorkEntity);
			queryClient.setQueryData(["entity", "W123"], sampleWorkEntity);

			const entities = getCachedOpenAlexEntities(queryClient);

			expect(entities).toHaveLength(1);
			expect(entities[0]).toEqual(sampleWorkEntity);
		});

		it("should only include successful queries", () => {
			queryClient.setQueryData(["entity", "W123"], sampleWorkEntity);
			// Manually set a failed query
			const failedQuery = {
				queryKey: ["entity", "failed"],
				state: { status: "error", data: null },
			};
			const mockFindAll = vi.spyOn(queryClient.getQueryCache(), "findAll");
			mockFindAll.mockReturnValue([
				...queryClient.getQueryCache().findAll(),
				failedQuery as any,
			]);

			const entities = getCachedOpenAlexEntities(queryClient);

			expect(entities).toHaveLength(1);
			expect(entities[0]).toEqual(sampleWorkEntity);

			mockFindAll.mockRestore();
		});
	});

	describe("getCachedEntitiesByType", () => {
		beforeEach(() => {
			mockEntityDetector.detectEntityIdentifier.mockImplementation((id: string) => {
				if (id.includes("W")) return { entityType: "works", id };
				if (id.includes("A")) return { entityType: "authors", id };
				return { entityType: null, id };
			});
		});

		it("should return empty object for each type when no entities cached", () => {
			const result = getCachedEntitiesByType(queryClient, ["works", "authors"]);

			expect(result).toEqual({
				works: [],
				authors: [],
			});
		});

		it("should group entities by type correctly", () => {
			queryClient.setQueryData(["entity", "W123"], sampleWorkEntity);
			queryClient.setQueryData(["entity", "A123"], sampleAuthorEntity);

			const result = getCachedEntitiesByType(queryClient, ["works", "authors"]);

			expect(result.works).toContainEqual(sampleWorkEntity);
			expect(result.authors).toContainEqual(sampleAuthorEntity);
		});

		it("should only include entities of requested types", () => {
			queryClient.setQueryData(["entity", "W123"], sampleWorkEntity);
			queryClient.setQueryData(["entity", "A123"], sampleAuthorEntity);

			const result = getCachedEntitiesByType(queryClient, ["works", "authors"]);

			expect(result.works).toContainEqual(sampleWorkEntity);
			expect(result.authors).toContainEqual(sampleAuthorEntity);

			// Test with only one type requested
			const worksOnlyResult = getCachedEntitiesByType(queryClient, ["works"]);
			expect(worksOnlyResult.works).toContainEqual(sampleWorkEntity);
			expect(worksOnlyResult.authors).toBeUndefined(); // Not requested, so not in result
		});

		it("should handle entities with undetectable types", () => {
			const unknownEntity = { id: "unknown", display_name: "Unknown" } as OpenAlexEntity;
			queryClient.setQueryData(["entity", "unknown"], unknownEntity);

			mockEntityDetector.detectEntityIdentifier.mockReturnValue({ entityType: null, id: "unknown" });

			const result = getCachedEntitiesByType(queryClient, ["works", "authors"]);

			expect(result.works).toEqual([]);
			expect(result.authors).toEqual([]);
		});
	});

	describe("setCachedGraphNodes", () => {
		it("should store graph nodes in cache", () => {
			const nodes = [sampleGraphNode];

			setCachedGraphNodes(queryClient, nodes);

			const cachedNodes = queryClient.getQueryData(graphQueryKeys.nodes());
			expect(cachedNodes).toEqual(nodes);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Stored graph nodes in TanStack Query cache",
				{ count: 1 },
				"GraphCache"
			);
		});

		it("should handle empty nodes array", () => {
			setCachedGraphNodes(queryClient, []);

			const cachedNodes = queryClient.getQueryData(graphQueryKeys.nodes());
			expect(cachedNodes).toEqual([]);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Stored graph nodes in TanStack Query cache",
				{ count: 0 },
				"GraphCache"
			);
		});
	});

	describe("setCachedGraphEdges", () => {
		it("should store graph edges in cache", () => {
			const edges = [sampleGraphEdge];

			setCachedGraphEdges(queryClient, edges);

			const cachedEdges = queryClient.getQueryData(graphQueryKeys.edges());
			expect(cachedEdges).toEqual(edges);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Stored graph edges in TanStack Query cache",
				{ count: 1 },
				"GraphCache"
			);
		});

		it("should handle empty edges array", () => {
			setCachedGraphEdges(queryClient, []);

			const cachedEdges = queryClient.getQueryData(graphQueryKeys.edges());
			expect(cachedEdges).toEqual([]);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Stored graph edges in TanStack Query cache",
				{ count: 0 },
				"GraphCache"
			);
		});
	});

	describe("getCachedGraphNodes", () => {
		it("should return undefined when no nodes are cached", () => {
			const nodes = getCachedGraphNodes(queryClient);
			expect(nodes).toBeUndefined();
		});

		it("should return cached graph nodes", () => {
			const nodes = [sampleGraphNode];
			queryClient.setQueryData(graphQueryKeys.nodes(), nodes);

			const cachedNodes = getCachedGraphNodes(queryClient);
			expect(cachedNodes).toEqual(nodes);
		});
	});

	describe("getCachedGraphEdges", () => {
		it("should return undefined when no edges are cached", () => {
			const edges = getCachedGraphEdges(queryClient);
			expect(edges).toBeUndefined();
		});

		it("should return cached graph edges", () => {
			const edges = [sampleGraphEdge];
			queryClient.setQueryData(graphQueryKeys.edges(), edges);

			const cachedEdges = getCachedGraphEdges(queryClient);
			expect(cachedEdges).toEqual(edges);
		});
	});

	describe("setNodeExpanded", () => {
		it("should mark node as expanded", () => {
			setNodeExpanded(queryClient, "W123", true);

			const expanded = queryClient.getQueryData(graphQueryKeys.expandedNode("W123"));
			expect(expanded).toBe(true);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Updated node expansion status",
				{ nodeId: "W123", expanded: true },
				"GraphCache"
			);
		});

		it("should mark node as collapsed", () => {
			setNodeExpanded(queryClient, "W123", false);

			const expanded = queryClient.getQueryData(graphQueryKeys.expandedNode("W123"));
			expect(expanded).toBe(false);
			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Updated node expansion status",
				{ nodeId: "W123", expanded: false },
				"GraphCache"
			);
		});
	});

	describe("isNodeExpanded", () => {
		it("should return false for non-expanded node", () => {
			const expanded = isNodeExpanded(queryClient, "W123");
			expect(expanded).toBe(false);
		});

		it("should return true for expanded node", () => {
			queryClient.setQueryData(graphQueryKeys.expandedNode("W123"), true);

			const expanded = isNodeExpanded(queryClient, "W123");
			expect(expanded).toBe(true);
		});

		it("should return false for falsy expansion status", () => {
			queryClient.setQueryData(graphQueryKeys.expandedNode("W123"), false);

			const expanded = isNodeExpanded(queryClient, "W123");
			expect(expanded).toBe(false);
		});

		it("should handle null expansion status", () => {
			queryClient.setQueryData(graphQueryKeys.expandedNode("W123"), null);

			const expanded = isNodeExpanded(queryClient, "W123");
			expect(expanded).toBe(false);
		});
	});

	describe("clearGraphCache", () => {
		it("should remove all graph-related queries", () => {
			// Set up various graph cache data
			queryClient.setQueryData(graphQueryKeys.nodes(), [sampleGraphNode]);
			queryClient.setQueryData(graphQueryKeys.edges(), [sampleGraphEdge]);
			queryClient.setQueryData(graphQueryKeys.expandedNode("W123"), true);
			queryClient.setQueryData(["other", "data"], "should remain");

			clearGraphCache(queryClient);

			// Graph data should be cleared
			expect(queryClient.getQueryData(graphQueryKeys.nodes())).toBeUndefined();
			expect(queryClient.getQueryData(graphQueryKeys.edges())).toBeUndefined();
			expect(queryClient.getQueryData(graphQueryKeys.expandedNode("W123"))).toBeUndefined();

			// Non-graph data should remain
			expect(queryClient.getQueryData(["other", "data"])).toBe("should remain");

			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Cleared all graph cache data",
				{},
				"GraphCache"
			);
		});

		it("should handle empty cache gracefully", () => {
			clearGraphCache(queryClient);

			expect(logger.debug).toHaveBeenCalledWith(
				"cache",
				"Cleared all graph cache data",
				{},
				"GraphCache"
			);
		});
	});

	describe("getGraphCacheStats", () => {
		it("should return zero stats for empty cache", () => {
			const stats = getGraphCacheStats(queryClient);

			expect(stats).toEqual({
				cachedEntities: 0,
				cachedNodes: 0,
				cachedEdges: 0,
				expandedNodes: 0,
			});
		});

		it("should return accurate stats for populated cache", () => {
			// Add entities
			queryClient.setQueryData(["entity", "W123"], sampleWorkEntity);
			queryClient.setQueryData(["entity", "A123"], sampleAuthorEntity);

			// Add graph data
			queryClient.setQueryData(graphQueryKeys.nodes(), [sampleGraphNode]);
			queryClient.setQueryData(graphQueryKeys.edges(), [sampleGraphEdge]);

			// Add expanded nodes
			queryClient.setQueryData(graphQueryKeys.expandedNode("W123"), true);
			queryClient.setQueryData(graphQueryKeys.expandedNode("A123"), true);

			const stats = getGraphCacheStats(queryClient);

			expect(stats).toEqual({
				cachedEntities: 2,
				cachedNodes: 1,
				cachedEdges: 1,
				expandedNodes: 2,
			});
		});

		it("should handle missing nodes and edges gracefully", () => {
			// Add only entities
			queryClient.setQueryData(["entity", "W123"], sampleWorkEntity);

			const stats = getGraphCacheStats(queryClient);

			expect(stats.cachedEntities).toBe(1);
			expect(stats.cachedNodes).toBe(0);
			expect(stats.cachedEdges).toBe(0);
		});
	});

	describe("useGraphCache", () => {
		it("should return object with all cache utility functions", () => {
			const cache = useGraphCache();

			expect(cache).toEqual({
				getCachedEntities: getCachedOpenAlexEntities,
				getCachedEntitiesByType,
				setCachedGraphNodes,
				setCachedGraphEdges,
				getCachedGraphNodes,
				getCachedGraphEdges,
				setNodeExpanded,
				isNodeExpanded,
				clearGraphCache,
				getGraphCacheStats,
			});
		});

		it("should return consistent function references", () => {
			const cache1 = useGraphCache();
			const cache2 = useGraphCache();

			expect(cache1.getCachedEntities).toBe(cache2.getCachedEntities);
			expect(cache1.setCachedGraphNodes).toBe(cache2.setCachedGraphNodes);
		});
	});
});