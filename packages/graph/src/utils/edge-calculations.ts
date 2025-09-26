/**
 * Edge position calculation utilities
 *
 * Calculates optimal attachment points between nodes for dynamic floating edges.
 * This module supports continuous recalculation during force-directed layout simulation.
 */

import { logger } from "@academic-explorer/utils";

// Local Position enum to avoid external dependency
export enum Position {
  Top = "top",
  Right = "right",
  Bottom = "bottom",
  Left = "left"
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttachmentPoint {
  x: number;
  y: number;
  position: Position;
}

export interface EdgeAttachment {
  source: AttachmentPoint;
  target: AttachmentPoint;
  distance: number;
}

// Standard node dimensions (can be made configurable later)
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 100;

/**
 * Calculate the attachment points on each side of a rectangular node
 */
function getNodeAttachmentPoints(bounds: NodeBounds): Record<Position, AttachmentPoint> {
	const { x, y, width, height } = bounds;
	const centerX = x + width / 2;
	const centerY = y + height / 2;

	return {
		[Position.Top]: { x: centerX, y, position: Position.Top },
		[Position.Right]: { x: x + width, y: centerY, position: Position.Right },
		[Position.Bottom]: { x: centerX, y: y + height, position: Position.Bottom },
		[Position.Left]: { x, y: centerY, position: Position.Left },
	};
}

/**
 * Calculate the distance between two points
 */
function getDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
	const dx = point1.x - point2.x;
	const dy = point1.y - point2.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the closest attachment points between two nodes
 */
export function calculateClosestAttachment(
	sourceNode: { x: number; y: number; width?: number; height?: number },
	targetNode: { x: number; y: number; width?: number; height?: number }
): EdgeAttachment {
	// Create node bounds with defaults for missing dimensions
	const sourceBounds: NodeBounds = {
		x: sourceNode.x,
		y: sourceNode.y,
		width: sourceNode.width ?? DEFAULT_NODE_WIDTH,
		height: sourceNode.height ?? DEFAULT_NODE_HEIGHT,
	};

	const targetBounds: NodeBounds = {
		x: targetNode.x,
		y: targetNode.y,
		width: targetNode.width ?? DEFAULT_NODE_WIDTH,
		height: targetNode.height ?? DEFAULT_NODE_HEIGHT,
	};

	// Get all attachment points for both nodes
	const sourcePoints = getNodeAttachmentPoints(sourceBounds);
	const targetPoints = getNodeAttachmentPoints(targetBounds);

	// Find the pair with minimum distance
	let minDistance = Infinity;
	let bestSourcePoint: AttachmentPoint | undefined;
	let bestTargetPoint: AttachmentPoint | undefined;

	const positions: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];

	for (const sourcePos of positions) {
		for (const targetPos of positions) {
			const distance = getDistance(sourcePoints[sourcePos], targetPoints[targetPos]);

			if (distance < minDistance) {
				minDistance = distance;
				bestSourcePoint = sourcePoints[sourcePos];
				bestTargetPoint = targetPoints[targetPos];
			}
		}
	}

	if (!bestSourcePoint || !bestTargetPoint) {
		logger.error("edge-calculations", "Failed to calculate closest attachment points", {
			sourceNode: { x: sourceNode.x, y: sourceNode.y },
			targetNode: { x: targetNode.x, y: targetNode.y }
		});

		// Fallback to center points
		const sourceCenterX = sourceBounds.x + sourceBounds.width / 2;
		const sourceCenterY = sourceBounds.y + sourceBounds.height / 2;
		const targetCenterX = targetBounds.x + targetBounds.width / 2;
		const targetCenterY = targetBounds.y + targetBounds.height / 2;

		return {
			source: { x: sourceCenterX, y: sourceCenterY, position: Position.Right },
			target: { x: targetCenterX, y: targetCenterY, position: Position.Left },
			distance: getDistance({ x: sourceCenterX, y: sourceCenterY }, { x: targetCenterX, y: targetCenterY })
		};
	}

	return {
		source: bestSourcePoint,
		target: bestTargetPoint,
		distance: minDistance,
	};
}

/**
 * Calculate attachment point with offset for arrow positioning
 * This ensures arrows appear at the edge of nodes rather than at the center
 */
export function calculateArrowPosition(
	attachmentPoint: AttachmentPoint,
	_nodeWidth?: number,
	_nodeHeight?: number,
	offset: number = 5
): { x: number; y: number } {
	const { x, y, position } = attachmentPoint;

	switch (position) {
		case Position.Top:
			return { x, y: y - offset };
		case Position.Right:
			return { x: x + offset, y };
		case Position.Bottom:
			return { x, y: y + offset };
		case Position.Left:
			return { x: x - offset, y };
		default:
			return { x, y };
	}
}

/**
 * Batch calculate closest attachments for multiple edges
 * Useful for updating all edges during simulation ticks
 */
export function batchCalculateAttachments(
	edges: Array<{ id: string; source: string; target: string }>,
	nodes: Map<string, { x: number; y: number; width?: number; height?: number }>
): Map<string, EdgeAttachment> {
	const attachments = new Map<string, EdgeAttachment>();

	for (const edge of edges) {
		const sourceNode = nodes.get(edge.source);
		const targetNode = nodes.get(edge.target);

		if (sourceNode && targetNode) {
			const attachment = calculateClosestAttachment(sourceNode, targetNode);
			attachments.set(edge.id, attachment);
		} else {
			logger.warn("edge-calculations", "Missing node for edge calculation", {
				edgeId: edge.id,
				sourceId: edge.source,
				targetId: edge.target,
				hasSource: !!sourceNode,
				hasTarget: !!targetNode
			});
		}
	}

	return attachments;
}