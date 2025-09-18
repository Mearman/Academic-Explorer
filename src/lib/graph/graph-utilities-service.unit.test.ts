/**
 * Unit tests for GraphUtilitiesService
 * Tests core graph manipulation algorithms directly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GraphUtilitiesService } from "./graph-utilities-service";
import type { GraphNode, GraphEdge } from "./types";
import { RelationType } from "./types";

// Mock logger
vi.mock("@/lib/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("GraphUtilitiesService", () => {
	let service: GraphUtilitiesService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new GraphUtilitiesService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("trimLeafNodes", () => {
		it("should remove nodes with no outgoing edges", () => {
			const nodes: GraphNode[] = [
				{
					id: "A1",
					type: "authors",
					label: "Author 1",
					entityId: "A1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
				{
					id: "W2", // Leaf node - no outgoing edges
					type: "works",
					label: "Work 2",
					entityId: "W2",
					position: { x: 200, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "A1",
					target: "W1",
					type: RelationType.AUTHORED,
				},
				{
					id: "E2",
					source: "W1",
					target: "W2",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.trimLeafNodes(nodes, edges);

			expect(result.nodes).toHaveLength(2);
			expect(result.edges).toHaveLength(1);
			expect(result.removedCount).toBe(1);
			expect(result.operation).toBe("trimLeafNodes");

			// Should keep nodes that have outgoing edges
			const nodeIds = result.nodes.map(n => n.id);
			expect(nodeIds).toContain("A1");
			expect(nodeIds).toContain("W1");
			expect(nodeIds).not.toContain("W2");

			// Should keep edges between remaining nodes
			expect(result.edges[0]).toEqual(edges[0]);
		});

		it("should handle empty graph", () => {
			const result = service.trimLeafNodes([], []);

			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
			expect(result.removedCount).toBe(0);
			expect(result.operation).toBe("trimLeafNodes");
		});

		it("should handle graph with only isolated nodes", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "W2",
					type: "works",
					label: "Work 2",
					entityId: "W2",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
			];

			const result = service.trimLeafNodes(nodes, []);

			// All nodes should be removed as they have no outgoing edges
			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
			expect(result.removedCount).toBe(2);
		});

		it("should preserve nodes with self-loops", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "W1",
					target: "W1",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.trimLeafNodes(nodes, edges);

			// Node with self-loop should be preserved
			expect(result.nodes).toHaveLength(1);
			expect(result.edges).toHaveLength(1);
			expect(result.removedCount).toBe(0);
		});

		it("should handle complex citation network", () => {
			const nodes: GraphNode[] = [
				{ id: "W1", type: "works", label: "Paper 1", entityId: "W1", position: { x: 0, y: 0 }, externalIds: [] },
				{ id: "W2", type: "works", label: "Paper 2", entityId: "W2", position: { x: 100, y: 0 }, externalIds: [] },
				{ id: "W3", type: "works", label: "Paper 3", entityId: "W3", position: { x: 200, y: 0 }, externalIds: [] }, // Leaf
				{ id: "W4", type: "works", label: "Paper 4", entityId: "W4", position: { x: 300, y: 0 }, externalIds: [] }, // Leaf
			];

			const edges: GraphEdge[] = [
				{ id: "E1", source: "W1", target: "W2", type: RelationType.REFERENCES },
				{ id: "E2", source: "W1", target: "W3", type: RelationType.REFERENCES },
				{ id: "E3", source: "W2", target: "W4", type: RelationType.REFERENCES },
			];

			const result = service.trimLeafNodes(nodes, edges);

			// Should keep W1, W2 (have outgoing edges) and remove W3, W4 (leaf nodes)
			expect(result.nodes).toHaveLength(2);
			expect(result.removedCount).toBe(2);

			const nodeIds = result.nodes.map(n => n.id);
			expect(nodeIds).toContain("W1");
			expect(nodeIds).toContain("W2");
			expect(nodeIds).not.toContain("W3");
			expect(nodeIds).not.toContain("W4");

			// Should only keep edge between remaining nodes
			expect(result.edges).toHaveLength(1);
			expect(result.edges[0].source).toBe("W1");
			expect(result.edges[0].target).toBe("W2");
		});
	});

	describe("trimRootNodes", () => {
		it("should remove nodes with no incoming edges", () => {
			const nodes: GraphNode[] = [
				{
					id: "A1", // Root node - no incoming edges
					type: "authors",
					label: "Author 1",
					entityId: "A1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
				{
					id: "W2",
					type: "works",
					label: "Work 2",
					entityId: "W2",
					position: { x: 200, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "A1",
					target: "W1",
					type: RelationType.AUTHORED,
				},
				{
					id: "E2",
					source: "W1",
					target: "W2",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.trimRootNodes(nodes, edges);

			expect(result.nodes).toHaveLength(2);
			expect(result.edges).toHaveLength(1);
			expect(result.removedCount).toBe(1);
			expect(result.operation).toBe("trimRootNodes");

			// Should keep nodes that have incoming edges
			const nodeIds = result.nodes.map(n => n.id);
			expect(nodeIds).toContain("W1");
			expect(nodeIds).toContain("W2");
			expect(nodeIds).not.toContain("A1");

			// Should keep edges between remaining nodes
			expect(result.edges[0]).toEqual(edges[1]);
		});

		it("should handle empty graph", () => {
			const result = service.trimRootNodes([], []);

			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
			expect(result.removedCount).toBe(0);
			expect(result.operation).toBe("trimRootNodes");
		});

		it("should preserve nodes with self-loops", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "W1",
					target: "W1",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.trimRootNodes(nodes, edges);

			// Node with self-loop should be preserved (has incoming edge to itself)
			expect(result.nodes).toHaveLength(1);
			expect(result.edges).toHaveLength(1);
			expect(result.removedCount).toBe(0);
		});

		it("should handle citation network - keep cited papers", () => {
			const nodes: GraphNode[] = [
				{ id: "W1", type: "works", label: "Recent Paper", entityId: "W1", position: { x: 0, y: 0 }, externalIds: [] }, // Root
				{ id: "W2", type: "works", label: "Cited Paper 1", entityId: "W2", position: { x: 100, y: 0 }, externalIds: [] },
				{ id: "W3", type: "works", label: "Cited Paper 2", entityId: "W3", position: { x: 200, y: 0 }, externalIds: [] },
			];

			const edges: GraphEdge[] = [
				{ id: "E1", source: "W1", target: "W2", type: RelationType.REFERENCES },
				{ id: "E2", source: "W1", target: "W3", type: RelationType.REFERENCES },
			];

			const result = service.trimRootNodes(nodes, edges);

			// Should keep W2, W3 (cited papers) and remove W1 (not cited by anyone)
			expect(result.nodes).toHaveLength(2);
			expect(result.removedCount).toBe(1);

			const nodeIds = result.nodes.map(n => n.id);
			expect(nodeIds).toContain("W2");
			expect(nodeIds).toContain("W3");
			expect(nodeIds).not.toContain("W1");

			// Should remove all edges since source node was removed
			expect(result.edges).toHaveLength(0);
		});
	});

	describe("trimDegree1Nodes", () => {
		it("should remove nodes with exactly one connection", () => {
			const nodes: GraphNode[] = [
				{
					id: "A1",
					type: "authors",
					label: "Author 1",
					entityId: "A1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "W1", // Degree 1 - connected to A1 only
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
				{
					id: "W2",
					type: "works",
					label: "Work 2",
					entityId: "W2",
					position: { x: 200, y: 0 },
					externalIds: [],
				},
				{
					id: "W3",
					type: "works",
					label: "Work 3",
					entityId: "W3",
					position: { x: 300, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "A1",
					target: "W1", // W1 has degree 1
					type: RelationType.AUTHORED,
				},
				{
					id: "E2",
					source: "W2",
					target: "W3",
					type: RelationType.REFERENCES,
				},
				{
					id: "E3",
					source: "W3",
					target: "W2", // Both W2 and W3 have degree 2
					type: RelationType.REFERENCES,
				},
			];

			const result = service.trimDegree1Nodes(nodes, edges);

			expect(result.removedCount).toBe(2); // W1 and A1 both have degree 1
			expect(result.operation).toBe("trimDegree1Nodes");

			// Should keep nodes with degree != 1
			const nodeIds = result.nodes.map(n => n.id);
			expect(nodeIds).toContain("W2");
			expect(nodeIds).toContain("W3");
			expect(nodeIds).not.toContain("A1");
			expect(nodeIds).not.toContain("W1");

			// Should keep edges between remaining nodes
			expect(result.edges).toHaveLength(2);
		});

		it("should handle empty graph", () => {
			const result = service.trimDegree1Nodes([], []);

			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
			expect(result.removedCount).toBe(0);
			expect(result.operation).toBe("trimDegree1Nodes");
		});

		it("should handle isolated nodes (degree 0)", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "W2",
					type: "works",
					label: "Work 2",
					entityId: "W2",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
			];

			const result = service.trimDegree1Nodes(nodes, []);

			// Should keep isolated nodes (degree 0 ≠ 1)
			expect(result.nodes).toHaveLength(2);
			expect(result.edges).toHaveLength(0);
			expect(result.removedCount).toBe(0);
		});

		it("should preserve nodes with self-loops correctly", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "W1",
					target: "W1",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.trimDegree1Nodes(nodes, edges);

			// Node with self-loop has degree 2 (counted as both source and target) and should be preserved
			expect(result.nodes).toHaveLength(1);
			expect(result.edges).toHaveLength(1);
			expect(result.removedCount).toBe(0);
		});

		it("should handle complex degree calculations", () => {
			const nodes: GraphNode[] = [
				{ id: "A", type: "works", label: "A", entityId: "A", position: { x: 0, y: 0 }, externalIds: [] }, // Degree 3
				{ id: "B", type: "works", label: "B", entityId: "B", position: { x: 100, y: 0 }, externalIds: [] }, // Degree 1
				{ id: "C", type: "works", label: "C", entityId: "C", position: { x: 200, y: 0 }, externalIds: [] }, // Degree 2
				{ id: "D", type: "works", label: "D", entityId: "D", position: { x: 300, y: 0 }, externalIds: [] }, // Degree 0
			];

			const edges: GraphEdge[] = [
				{ id: "E1", source: "A", target: "B", type: RelationType.REFERENCES }, // A: +1, B: +1
				{ id: "E2", source: "A", target: "C", type: RelationType.REFERENCES }, // A: +1, C: +1
				{ id: "E3", source: "C", target: "A", type: RelationType.REFERENCES }, // C: +1, A: +1
			];

			const result = service.trimDegree1Nodes(nodes, edges);

			// Should remove B (degree 1) and keep A (degree 3), C (degree 2), D (degree 0)
			expect(result.removedCount).toBe(1);

			const nodeIds = result.nodes.map(n => n.id);
			expect(nodeIds).toContain("A");
			expect(nodeIds).toContain("C");
			expect(nodeIds).toContain("D");
			expect(nodeIds).not.toContain("B");

			// Should keep edges between remaining nodes
			expect(result.edges).toHaveLength(2);
			expect(result.edges.map(e => e.id)).not.toContain("E1");
		});
	});

	describe("removeIsolatedNodes", () => {
		it("should remove nodes with no connections", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1", // Connected
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "W2", // Connected
					type: "works",
					label: "Work 2",
					entityId: "W2",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
				{
					id: "W3", // Isolated
					type: "works",
					label: "Work 3",
					entityId: "W3",
					position: { x: 200, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "W1",
					target: "W2",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.removeIsolatedNodes(nodes, edges);

			expect(result.nodes).toHaveLength(2);
			expect(result.edges).toHaveLength(1); // Edges remain unchanged
			expect(result.removedCount).toBe(1);
			expect(result.operation).toBe("removeIsolatedNodes");

			const nodeIds = result.nodes.map(n => n.id);
			expect(nodeIds).toContain("W1");
			expect(nodeIds).toContain("W2");
			expect(nodeIds).not.toContain("W3");
		});

		it("should handle empty graph", () => {
			const result = service.removeIsolatedNodes([], []);

			expect(result.nodes).toHaveLength(0);
			expect(result.edges).toHaveLength(0);
			expect(result.removedCount).toBe(0);
		});

		it("should handle graph with only isolated nodes", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "W2",
					type: "works",
					label: "Work 2",
					entityId: "W2",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
			];

			const result = service.removeIsolatedNodes(nodes, []);

			expect(result.nodes).toHaveLength(0);
			expect(result.removedCount).toBe(2);
		});

		it("should preserve nodes with self-loops", () => {
			const nodes: GraphNode[] = [
				{
					id: "W1",
					type: "works",
					label: "Work 1",
					entityId: "W1",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "W1",
					target: "W1",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.removeIsolatedNodes(nodes, edges);

			expect(result.nodes).toHaveLength(1);
			expect(result.edges).toHaveLength(1);
			expect(result.removedCount).toBe(0);
		});
	});

	describe("performance and edge cases", () => {
		it("should handle large graphs efficiently", () => {
			const nodeCount = 1000;
			const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, i) => ({
				id: `N${i}`,
				type: "works",
				label: `Node ${i}`,
				entityId: `N${i}`,
				position: { x: i % 100, y: Math.floor(i / 100) },
				externalIds: [],
			}));

			// Create a chain: N0 -> N1 -> N2 -> ... -> N999 (N999 is leaf)
			const edges: GraphEdge[] = Array.from({ length: nodeCount - 1 }, (_, i) => ({
				id: `E${i}`,
				source: `N${i}`,
				target: `N${i + 1}`,
				type: RelationType.REFERENCES,
			}));

			const startTime = performance.now();
			const result = service.trimLeafNodes(nodes, edges);
			const duration = performance.now() - startTime;

			expect(result.removedCount).toBe(1); // Only N999 is a leaf
			expect(result.nodes).toHaveLength(nodeCount - 1);
			expect(duration).toBeLessThan(100); // Should complete in reasonable time
		});

		it("should handle malformed node IDs gracefully", () => {
			const nodes: GraphNode[] = [
				{
					id: "",
					type: "works",
					label: "Empty ID",
					entityId: "",
					position: { x: 0, y: 0 },
					externalIds: [],
				},
				{
					id: "normal",
					type: "works",
					label: "Normal",
					entityId: "normal",
					position: { x: 100, y: 0 },
					externalIds: [],
				},
			];

			const edges: GraphEdge[] = [
				{
					id: "E1",
					source: "",
					target: "normal",
					type: RelationType.REFERENCES,
				},
			];

			const result = service.trimLeafNodes(nodes, edges);

			// Should handle gracefully without errors
			expect(result.operation).toBe("trimLeafNodes");
			expect(result.nodes).toBeDefined();
			expect(result.edges).toBeDefined();
		});

		it("should handle duplicate edge IDs", () => {
			const nodes: GraphNode[] = [
				{ id: "A", type: "works", label: "A", entityId: "A", position: { x: 0, y: 0 }, externalIds: [] },
				{ id: "B", type: "works", label: "B", entityId: "B", position: { x: 100, y: 0 }, externalIds: [] },
			];

			const edges: GraphEdge[] = [
				{ id: "E1", source: "A", target: "B", type: RelationType.REFERENCES },
				{ id: "E1", source: "A", target: "B", type: RelationType.REFERENCES }, // Duplicate ID
			];

			const result = service.trimLeafNodes(nodes, edges);

			// Should handle without errors
			expect(result.operation).toBe("trimLeafNodes");
			expect(result.removedCount).toBe(1); // B is a leaf
		});
	});
});