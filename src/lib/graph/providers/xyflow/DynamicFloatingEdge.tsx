/**
 * Dynamic Floating Edge Component for XYFlow React Flow
 *
 * This edge component continuously recalculates the closest attachment points
 * between nodes during force-directed layout simulation, providing smooth
 * dynamic edge routing that adapts as nodes move.
 */

import React from "react";
import {
	EdgeProps,
	getBezierPath,
	EdgeLabelRenderer,
	BaseEdge,
	useReactFlow,
} from "@xyflow/react";

import { calculateClosestAttachment, calculateArrowPosition, type EdgeAttachment } from "../../utils/edge-calculations";
import { logger } from "@/lib/logger";

// Helper function to calculate arrow rotation based on target position
function getArrowRotation(targetPosition: string): number {
	switch (targetPosition) {
		case 'top':
			return 90;  // Point down into top of node
		case 'right':
			return 180; // Point left into right of node
		case 'bottom':
			return 270; // Point up into bottom of node
		case 'left':
			return 0;   // Point right into left of node
		default:
			return 0;
	}
}

function DynamicFloatingEdge({
	id,
	source,
	target,
	style = {},
	markerEnd,
	data,
}: EdgeProps) {
	const { getNode } = useReactFlow();

	// Get current node positions from ReactFlow
	const sourceNode = getNode(source);
	const targetNode = getNode(target);

	// Calculate dynamic attachment points based on current node positions
	const attachment: EdgeAttachment = React.useMemo(() => {
		if (!sourceNode || !targetNode) {
			logger.debug("graph", "Missing nodes for dynamic edge calculation", {
				edgeId: id,
				hasSource: !!sourceNode,
				hasTarget: !!targetNode
			});

			// Return fallback attachment with center positions
			return {
				source: { x: 0, y: 0, position: 'right' as any },
				target: { x: 100, y: 0, position: 'left' as any },
				distance: 100
			};
		}

		// Extract node dimensions - ReactFlow nodes have measured dimensions
		const sourceData = {
			x: sourceNode.position.x,
			y: sourceNode.position.y,
			width: sourceNode.measured?.width || sourceNode.width || 200,
			height: sourceNode.measured?.height || sourceNode.height || 100,
		};

		const targetData = {
			x: targetNode.position.x,
			y: targetNode.position.y,
			width: targetNode.measured?.width || targetNode.width || 200,
			height: targetNode.measured?.height || targetNode.height || 100,
		};

		const result = calculateClosestAttachment(sourceData, targetData);

		// Log every 10th calculation to avoid console flooding
		if (Math.random() < 0.1) {
			logger.debug("graph", "Dynamic edge attachment calculated", {
				edgeId: id,
				sourcePos: sourceData,
				targetPos: targetData,
				attachment: {
					sourceAttachment: result.source.position,
					targetAttachment: result.target.position,
					distance: Math.round(result.distance)
				}
			});
		}

		return result;
	}, [id, sourceNode?.position.x, sourceNode?.position.y, sourceNode?.measured?.width, sourceNode?.measured?.height,
		targetNode?.position.x, targetNode?.position.y, targetNode?.measured?.width, targetNode?.measured?.height]);

	// Calculate bezier path using the dynamic attachment points
	const [edgePath, labelX, labelY] = React.useMemo(() => {
		return getBezierPath({
			sourceX: attachment.source.x,
			sourceY: attachment.source.y,
			sourcePosition: attachment.source.position as any,
			targetX: attachment.target.x,
			targetY: attachment.target.y,
			targetPosition: attachment.target.position as any,
		});
	}, [attachment]);

	// Calculate arrow position with slight offset from edge of node
	const arrowPosition = React.useMemo(() => {
		return calculateArrowPosition(attachment.target,
			targetNode?.measured?.width || 200,
			targetNode?.measured?.height || 100,
			5);
	}, [attachment.target, targetNode?.measured?.width, targetNode?.measured?.height]);

	return (
		<>
			{/* SVG marker definitions for arrows with outlines */}
			<defs>
				{/* Outlined arrow marker */}
				<marker
					id={`dynamic-arrow-outline-${id}`}
					viewBox="0 0 12 12"
					refX="10"
					refY="6"
					markerWidth="6"
					markerHeight="6"
					orient="auto"
					markerUnits="strokeWidth"
				>
					{/* Arrow outline (white/light stroke) */}
					<path
						d="M2,2 L2,10 L10,6 z"
						fill={style?.stroke || "#b1b1b7"}
						stroke="white"
						strokeWidth="1"
						strokeLinejoin="round"
					/>
					{/* Arrow fill */}
					<path
						d="M2,2 L2,10 L10,6 z"
						fill={style?.stroke || "#b1b1b7"}
						stroke="none"
					/>
				</marker>
			</defs>

			{/* Main edge path - NO arrow marker */}
			<BaseEdge
				path={edgePath}
				style={style}
			/>

			{/* Arrow rendered separately at high z-index using EdgeLabelRenderer */}
			<EdgeLabelRenderer>
				<div
					style={{
						position: "absolute",
						transform: `translate(-50%, -50%) translate(${arrowPosition.x}px,${arrowPosition.y}px)`,
						zIndex: 2000, // High z-index to be above nodes
						pointerEvents: "none",
					}}
				>
					<svg
						width="12"
						height="12"
						style={{
							transform: `rotate(${getArrowRotation(attachment.target.position as string)}deg)`,
						}}
					>
						{/* Arrow fill */}
						<path
							d="M2,2 L2,10 L10,6 z"
							fill={style?.stroke || "#b1b1b7"}
							stroke="none"
						/>
					</svg>
				</div>
			</EdgeLabelRenderer>

			{/* Optional edge label */}
			{data?.label && typeof data.label === "string" ? (
				<EdgeLabelRenderer>
					<div
						style={{
							position: "absolute",
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
							fontSize: "10px",
							color: "#666",
							background: "rgba(255, 255, 255, 0.8)",
							padding: "2px 4px",
							borderRadius: "3px",
							pointerEvents: "all",
						}}
						className="nodrag nopan"
					>
						{data.label}
					</div>
				</EdgeLabelRenderer>
			) : null}
		</>
	);
}

export default React.memo(DynamicFloatingEdge);