/**
 * Floating Edge Utilities for XYFlow React Flow
 * Based on https://reactflow.dev/examples/edges/floating-edges
 *
 * These utilities calculate intersection points and edge positions
 * to automatically connect edges to the closest points on node boundaries.
 */

import { Node as XYNode, Position } from "@xyflow/react";

// Node dimensions - can be customized based on your node size
const DEFAULT_NODE_WIDTH = 120;
const DEFAULT_NODE_HEIGHT = 80; // Increased to match actual node height with metadata

/**
 * Get the intersection point of the line between the center of the intersectionNode and the target node
 */
export function getNodeIntersection(intersectionNode: XYNode, targetNode: XYNode): { x: number; y: number } {
	// Node dimensions - use from node data if available, otherwise defaults
	const intersectionNodeWidth = intersectionNode.width || DEFAULT_NODE_WIDTH;
	const intersectionNodeHeight = intersectionNode.height || DEFAULT_NODE_HEIGHT;

	const targetNodeWidth = targetNode.width || DEFAULT_NODE_WIDTH;
	const targetNodeHeight = targetNode.height || DEFAULT_NODE_HEIGHT;

	// Calculate centers of both nodes
	const intersectionNodeCenter = {
		x: intersectionNode.position.x + intersectionNodeWidth / 2,
		y: intersectionNode.position.y + intersectionNodeHeight / 2,
	};

	const targetNodeCenter = {
		x: targetNode.position.x + targetNodeWidth / 2,
		y: targetNode.position.y + targetNodeHeight / 2,
	};

	// Calculate the direction vector from intersection node to target node
	const directionX = targetNodeCenter.x - intersectionNodeCenter.x;
	const directionY = targetNodeCenter.y - intersectionNodeCenter.y;

	// Calculate the distance between centers
	const distance = Math.sqrt(directionX * directionX + directionY * directionY);

	if (distance === 0) {
		// Nodes are at the same position, return center
		return intersectionNodeCenter;
	}

	// Normalize the direction vector
	const normalizedX = directionX / distance;
	const normalizedY = directionY / distance;

	// Calculate the intersection point on the target node boundary
	const halfWidth = targetNodeWidth / 2;
	const halfHeight = targetNodeHeight / 2;

	// Calculate intersection with rectangle boundary
	// We need to find where the line from intersection center to target center hits the target rectangle
	let t: number;

	// Calculate t for intersection with each edge
	const tRight = Math.abs(normalizedX) > 1e-10 ? halfWidth / Math.abs(normalizedX) : Infinity;
	const tTop = Math.abs(normalizedY) > 1e-10 ? halfHeight / Math.abs(normalizedY) : Infinity;

	// Take the minimum t (closest intersection to target center)
	t = Math.min(tRight, tTop);

	// Calculate intersection point - move from target center outward to edge
	const intersectionX = targetNodeCenter.x - normalizedX * t;
	const intersectionY = targetNodeCenter.y - normalizedY * t;

	return {
		x: intersectionX,
		y: intersectionY,
	};
}

/**
 * Get the position (top, right, bottom, left) of where an edge connects to a node
 * based on the intersection point
 */
export function getEdgePosition(node: XYNode, intersectionPoint: { x: number; y: number }): Position {
	const nodeWidth = node.width || DEFAULT_NODE_WIDTH;
	const nodeHeight = node.height || DEFAULT_NODE_HEIGHT;

	const nodeCenter = {
		x: node.position.x + nodeWidth / 2,
		y: node.position.y + nodeHeight / 2,
	};

	// Calculate relative position of intersection point to node center
	const relativeX = intersectionPoint.x - nodeCenter.x;
	const relativeY = intersectionPoint.y - nodeCenter.y;

	// Determine which edge is closest based on the intersection point
	const halfWidth = nodeWidth / 2;
	const halfHeight = nodeHeight / 2;

	// Calculate distances to each edge
	const distanceToLeft = Math.abs(relativeX + halfWidth);
	const distanceToRight = Math.abs(relativeX - halfWidth);
	const distanceToTop = Math.abs(relativeY + halfHeight);
	const distanceToBottom = Math.abs(relativeY - halfHeight);

	// Find the minimum distance
	const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);

	// Return the position corresponding to the closest edge
	if (minDistance === distanceToLeft) {
		return Position.Left;
	} else if (minDistance === distanceToRight) {
		return Position.Right;
	} else if (minDistance === distanceToTop) {
		return Position.Top;
	} else {
		return Position.Bottom;
	}
}

/**
 * Calculate source and target positions for a floating edge
 */
export function getFloatingEdgePositions(
	sourceNode: XYNode,
	targetNode: XYNode
): {
  sourcePosition: Position;
  targetPosition: Position;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
} {
	// Calculate intersection points
	const sourceIntersectionPoint = getNodeIntersection(sourceNode, targetNode);
	const targetIntersectionPoint = getNodeIntersection(targetNode, sourceNode);

	// Determine edge positions
	const sourcePosition = getEdgePosition(sourceNode, sourceIntersectionPoint);
	const targetPosition = getEdgePosition(targetNode, targetIntersectionPoint);

	return {
		sourcePosition,
		targetPosition,
		sourceX: sourceIntersectionPoint.x,
		sourceY: sourceIntersectionPoint.y,
		targetX: targetIntersectionPoint.x,
		targetY: targetIntersectionPoint.y,
	};
}