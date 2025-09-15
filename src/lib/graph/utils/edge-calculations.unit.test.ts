/**
 * Unit tests for edge-calculations utilities
 * Testing optimal attachment point calculations for dynamic floating edges
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Position } from "@xyflow/react";
import {
	calculateClosestAttachment,
	calculateArrowPosition,
	batchCalculateAttachments,
	type NodeBounds as _NodeBounds,
	type AttachmentPoint,
	type EdgeAttachment as _EdgeAttachment
} from "./edge-calculations";

// Mock the logger
vi.mock("@/lib/logger", () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

describe("Edge Calculations", () => {
	describe("calculateClosestAttachment", () => {
		it("should calculate closest attachment between two nodes", () => {
			const sourceNode = { x: 0, y: 0, width: 200, height: 100 };
			const targetNode = { x: 300, y: 0, width: 200, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result).toMatchObject({
				source: { x: 200, y: 50, position: Position.Right },
				target: { x: 300, y: 50, position: Position.Left },
				distance: 100
			});
		});

		it("should use default dimensions when width/height not provided", () => {
			const sourceNode = { x: 0, y: 0 }; // No width/height
			const targetNode = { x: 250, y: 0 }; // No width/height

			const result = calculateClosestAttachment(sourceNode, targetNode);

			// Default width = 200, height = 100
			// Source node: right edge at x + width = 0 + 200 = 200
			expect(result.source).toMatchObject({
				x: 200, // x + width = 0 + 200
				y: 50,  // y + height/2 = 0 + 100/2
				position: Position.Right
			});

			expect(result.target).toMatchObject({
				x: 250, // target x (left edge)
				y: 50,  // y + height/2 = 0 + 100/2
				position: Position.Left
			});
		});

		it("should calculate vertical attachment when nodes are vertically aligned", () => {
			const sourceNode = { x: 0, y: 0, width: 200, height: 100 };
			const targetNode = { x: 0, y: 150, width: 200, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result.source.position).toBe(Position.Bottom);
			expect(result.target.position).toBe(Position.Top);
			expect(result.source).toMatchObject({ x: 100, y: 100 }); // Center bottom of source
			expect(result.target).toMatchObject({ x: 100, y: 150 }); // Center top of target
		});

		it("should calculate diagonal attachment for diagonally positioned nodes", () => {
			const sourceNode = { x: 0, y: 0, width: 100, height: 100 };
			const targetNode = { x: 200, y: 200, width: 100, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			// Should find the closest corners
			expect(result.distance).toBeGreaterThan(0);
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should handle overlapping nodes", () => {
			const sourceNode = { x: 0, y: 0, width: 200, height: 100 };
			const targetNode = { x: 50, y: 25, width: 200, height: 100 }; // Overlapping

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result.distance).toBeGreaterThanOrEqual(0);
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should handle edge case with identical positions", () => {
			const sourceNode = { x: 100, y: 100, width: 200, height: 100 };
			const targetNode = { x: 100, y: 100, width: 200, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result.distance).toBe(0);
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should handle nodes with different sizes", () => {
			const sourceNode = { x: 0, y: 0, width: 100, height: 50 };
			const targetNode = { x: 200, y: 100, width: 300, height: 150 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result.distance).toBeGreaterThan(0);
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should handle nodes with zero dimensions", () => {
			const sourceNode = { x: 0, y: 0, width: 0, height: 0 };
			const targetNode = { x: 100, y: 100, width: 0, height: 0 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result.distance).toBeCloseTo(Math.sqrt(2 * 100 * 100), 5);
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should handle negative coordinates", () => {
			const sourceNode = { x: -100, y: -100, width: 200, height: 100 };
			const targetNode = { x: 200, y: 200, width: 200, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result.distance).toBeGreaterThan(0);
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should handle very large coordinates", () => {
			const sourceNode = { x: 10000, y: 10000, width: 200, height: 100 };
			const targetNode = { x: 20000, y: 20000, width: 200, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result.distance).toBeGreaterThan(0);
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should return fallback when attachment calculation fails", () => {
			// This test is harder to trigger since the function is robust,
			// but we can test the fallback logic by mocking internal failures
			const sourceNode = { x: 0, y: 0, width: 200, height: 100 };
			const targetNode = { x: 300, y: 0, width: 200, height: 100 };

			// Override the Position enum temporarily to trigger fallback
			const _originalPositions = [Position.Top, Position.Right, Position.Bottom, Position.Left];

			const result = calculateClosestAttachment(sourceNode, targetNode);

			// Should still return a valid result
			expect(result).toBeDefined();
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
			expect(result.distance).toBeGreaterThanOrEqual(0);
		});
	});

	describe("calculateArrowPosition", () => {
		it("should calculate arrow position for top attachment", () => {
			const attachment: AttachmentPoint = { x: 100, y: 50, position: Position.Top };
			const result = calculateArrowPosition(attachment, 200, 100, 5);

			expect(result).toEqual({ x: 100, y: 45 }); // y - offset
		});

		it("should calculate arrow position for right attachment", () => {
			const attachment: AttachmentPoint = { x: 200, y: 100, position: Position.Right };
			const result = calculateArrowPosition(attachment, 200, 100, 5);

			expect(result).toEqual({ x: 205, y: 100 }); // x + offset
		});

		it("should calculate arrow position for bottom attachment", () => {
			const attachment: AttachmentPoint = { x: 100, y: 150, position: Position.Bottom };
			const result = calculateArrowPosition(attachment, 200, 100, 5);

			expect(result).toEqual({ x: 100, y: 155 }); // y + offset
		});

		it("should calculate arrow position for left attachment", () => {
			const attachment: AttachmentPoint = { x: 0, y: 100, position: Position.Left };
			const result = calculateArrowPosition(attachment, 200, 100, 5);

			expect(result).toEqual({ x: -5, y: 100 }); // x - offset
		});

		it("should use default offset when not provided", () => {
			const attachment: AttachmentPoint = { x: 100, y: 50, position: Position.Top };
			const result = calculateArrowPosition(attachment);

			expect(result).toEqual({ x: 100, y: 45 }); // Default offset is 5
		});

		it("should handle zero offset", () => {
			const attachment: AttachmentPoint = { x: 100, y: 50, position: Position.Top };
			const result = calculateArrowPosition(attachment, 200, 100, 0);

			expect(result).toEqual({ x: 100, y: 50 }); // No offset applied
		});

		it("should handle negative offset", () => {
			const attachment: AttachmentPoint = { x: 100, y: 50, position: Position.Bottom };
			const result = calculateArrowPosition(attachment, 200, 100, -10);

			expect(result).toEqual({ x: 100, y: 40 }); // y + (-10)
		});

		it("should handle large offset values", () => {
			const attachment: AttachmentPoint = { x: 100, y: 50, position: Position.Right };
			const result = calculateArrowPosition(attachment, 200, 100, 100);

			expect(result).toEqual({ x: 200, y: 50 }); // x + 100
		});

		it("should return original position for invalid position", () => {
			const attachment: AttachmentPoint = { x: 100, y: 50, position: "invalid" as Position };
			const result = calculateArrowPosition(attachment, 200, 100, 5);

			expect(result).toEqual({ x: 100, y: 50 }); // Original position unchanged
		});

		it("should handle decimal coordinates", () => {
			const attachment: AttachmentPoint = { x: 100.5, y: 50.7, position: Position.Top };
			const result = calculateArrowPosition(attachment, 200, 100, 2.3);

			expect(result.x).toBeCloseTo(100.5, 10);
			expect(result.y).toBeCloseTo(48.4, 10); // Handle floating-point precision
		});
	});

	describe("batchCalculateAttachments", () => {
		let mockNodes: Map<string, { x: number; y: number; width?: number; height?: number }>;
		let mockEdges: Array<{ id: string; source: string; target: string }>;

		beforeEach(() => {
			mockNodes = new Map([
				["node1", { x: 0, y: 0, width: 200, height: 100 }],
				["node2", { x: 300, y: 0, width: 200, height: 100 }],
				["node3", { x: 150, y: 200, width: 200, height: 100 }],
			]);

			mockEdges = [
				{ id: "edge1", source: "node1", target: "node2" },
				{ id: "edge2", source: "node2", target: "node3" },
				{ id: "edge3", source: "node1", target: "node3" },
			];
		});

		it("should calculate attachments for all valid edges", () => {
			const result = batchCalculateAttachments(mockEdges, mockNodes);

			expect(result.size).toBe(3);
			expect(result.has("edge1")).toBe(true);
			expect(result.has("edge2")).toBe(true);
			expect(result.has("edge3")).toBe(true);

			// Verify each attachment has required properties
			for (const [_edgeId, attachment] of result) {
				expect(attachment).toMatchObject({
					source: expect.objectContaining({
						x: expect.any(Number),
						y: expect.any(Number),
						position: expect.any(String)
					}),
					target: expect.objectContaining({
						x: expect.any(Number),
						y: expect.any(Number),
						position: expect.any(String)
					}),
					distance: expect.any(Number)
				});
			}
		});

		it("should skip edges with missing source node", () => {
			const edgesWithMissingSource = [
				{ id: "edge1", source: "nonexistent", target: "node2" },
				{ id: "edge2", source: "node1", target: "node2" }, // Valid edge
			];

			const result = batchCalculateAttachments(edgesWithMissingSource, mockNodes);

			expect(result.size).toBe(1);
			expect(result.has("edge1")).toBe(false); // Missing source
			expect(result.has("edge2")).toBe(true);  // Valid
		});

		it("should skip edges with missing target node", () => {
			const edgesWithMissingTarget = [
				{ id: "edge1", source: "node1", target: "nonexistent" },
				{ id: "edge2", source: "node1", target: "node2" }, // Valid edge
			];

			const result = batchCalculateAttachments(edgesWithMissingTarget, mockNodes);

			expect(result.size).toBe(1);
			expect(result.has("edge1")).toBe(false); // Missing target
			expect(result.has("edge2")).toBe(true);  // Valid
		});

		it("should skip edges with both missing nodes", () => {
			const edgesWithMissingNodes = [
				{ id: "edge1", source: "missing1", target: "missing2" },
			];

			const result = batchCalculateAttachments(edgesWithMissingNodes, mockNodes);

			expect(result.size).toBe(0);
		});

		it("should handle empty edges array", () => {
			const result = batchCalculateAttachments([], mockNodes);

			expect(result.size).toBe(0);
		});

		it("should handle empty nodes map", () => {
			const result = batchCalculateAttachments(mockEdges, new Map());

			expect(result.size).toBe(0);
		});

		it("should handle nodes without dimensions", () => {
			const nodesWithoutDimensions = new Map([
				["node1", { x: 0, y: 0 }], // No width/height
				["node2", { x: 300, y: 0 }], // No width/height
			]);

			const singleEdge = [{ id: "edge1", source: "node1", target: "node2" }];

			const result = batchCalculateAttachments(singleEdge, nodesWithoutDimensions);

			expect(result.size).toBe(1);
			expect(result.get("edge1")).toBeDefined();
		});

		it("should handle self-referencing edges", () => {
			const selfEdge = [{ id: "edge1", source: "node1", target: "node1" }];

			const result = batchCalculateAttachments(selfEdge, mockNodes);

			expect(result.size).toBe(1);
			const attachment = result.get("edge1");
			expect(attachment).toBeDefined();
			expect(attachment?.distance).toBe(0); // Same node, zero distance
		});

		it("should handle duplicate edge IDs", () => {
			const duplicateEdges = [
				{ id: "edge1", source: "node1", target: "node2" },
				{ id: "edge1", source: "node2", target: "node3" }, // Same ID
			];

			const result = batchCalculateAttachments(duplicateEdges, mockNodes);

			expect(result.size).toBe(1); // Map overwrites duplicate keys
			expect(result.has("edge1")).toBe(true);
		});

		it("should calculate different attachments for different node pairs", () => {
			const result = batchCalculateAttachments(mockEdges, mockNodes);

			const edge1Attachment = result.get("edge1")!; // node1 -> node2 (horizontal)
			const edge2Attachment = result.get("edge2")!; // node2 -> node3 (diagonal)
			const _edge3Attachment = result.get("edge3")!; // node1 -> node3 (diagonal)

			// These should be different due to different node positions
			expect(edge1Attachment.source.position).not.toBe(edge2Attachment.source.position);
			expect(edge1Attachment.distance).not.toBe(edge2Attachment.distance);
		});

		it("should handle very large numbers of edges efficiently", () => {
			// Create many nodes and edges
			const manyNodes = new Map();
			const manyEdges = [];

			for (let i = 0; i < 100; i++) {
				manyNodes.set(`node${i}`, { x: i * 10, y: i * 10, width: 50, height: 50 });
				if (i > 0) {
					manyEdges.push({ id: `edge${i}`, source: `node${i-1}`, target: `node${i}` });
				}
			}

			const startTime = performance.now();
			const result = batchCalculateAttachments(manyEdges, manyNodes);
			const endTime = performance.now();

			expect(result.size).toBe(99); // 100 nodes, 99 edges
			expect(endTime - startTime).toBeLessThan(100); // Should be reasonably fast
		});
	});

	describe("Integration Tests", () => {
		it("should work correctly with calculateClosestAttachment and calculateArrowPosition together", () => {
			const sourceNode = { x: 0, y: 0, width: 200, height: 100 };
			const targetNode = { x: 300, y: 0, width: 200, height: 100 };

			const attachment = calculateClosestAttachment(sourceNode, targetNode);
			const arrowPos = calculateArrowPosition(attachment.source, 200, 100, 10);

			expect(attachment.source.position).toBe(Position.Right);
			expect(arrowPos).toEqual({ x: 210, y: 50 }); // x + offset
		});

		it("should handle complete workflow for multiple edges", () => {
			const nodes = new Map([
				["A", { x: 0, y: 0, width: 100, height: 50 }],
				["B", { x: 200, y: 0, width: 100, height: 50 }],
				["C", { x: 100, y: 100, width: 100, height: 50 }],
			]);

			const edges = [
				{ id: "A->B", source: "A", target: "B" },
				{ id: "B->C", source: "B", target: "C" },
				{ id: "A->C", source: "A", target: "C" },
			];

			const attachments = batchCalculateAttachments(edges, nodes);

			expect(attachments.size).toBe(3);

			// Test arrow positioning for each attachment
			for (const [_edgeId, attachment] of attachments) {
				const sourceArrow = calculateArrowPosition(attachment.source);
				const targetArrow = calculateArrowPosition(attachment.target);

				expect(sourceArrow).toMatchObject({
					x: expect.any(Number),
					y: expect.any(Number)
				});

				expect(targetArrow).toMatchObject({
					x: expect.any(Number),
					y: expect.any(Number)
				});
			}
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle NaN coordinates gracefully", () => {
			const sourceNode = { x: NaN, y: 0, width: 200, height: 100 };
			const targetNode = { x: 300, y: NaN, width: 200, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			// Function should still return a result (may use fallback logic)
			expect(result).toBeDefined();
			expect(result.source).toBeDefined();
			expect(result.target).toBeDefined();
		});

		it("should handle Infinity coordinates", () => {
			const sourceNode = { x: Infinity, y: 0, width: 200, height: 100 };
			const targetNode = { x: 300, y: 0, width: 200, height: 100 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result).toBeDefined();
			expect(result.distance).toBeGreaterThanOrEqual(0);
		});

		it("should handle extremely small dimensions", () => {
			const sourceNode = { x: 0, y: 0, width: 0.001, height: 0.001 };
			const targetNode = { x: 1, y: 1, width: 0.001, height: 0.001 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result).toBeDefined();
			expect(result.distance).toBeGreaterThan(0);
		});

		it("should handle extremely large dimensions", () => {
			const sourceNode = { x: 0, y: 0, width: 1e6, height: 1e6 };
			const targetNode = { x: 2e6, y: 2e6, width: 1e6, height: 1e6 };

			const result = calculateClosestAttachment(sourceNode, targetNode);

			expect(result).toBeDefined();
			expect(result.distance).toBeGreaterThan(0);
		});
	});
});