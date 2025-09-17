/**
 * SmartEdge Component for XYFlow React Flow
 *
 * Uses XYFlow's built-in handle connection logic to automatically
 * connect to the nearest handle on each node, eliminating the need
 * for manual intersection calculations.
 */

import React from "react";
import {
	EdgeProps,
	getBezierPath,
	EdgeLabelRenderer,
	BaseEdge,
	Position,
} from "@xyflow/react";

// Helper function to calculate arrow rotation based on target position
function getArrowRotation(targetPosition: Position): number {
	switch (targetPosition) {
		case Position.Top:
			return 90;  // Point down into top of node
		case Position.Right:
			return 180; // Point left into right of node
		case Position.Bottom:
			return 270; // Point up into bottom of node
		case Position.Left:
			return 0;   // Point right into left of node
		default:
			return 0;
	}
}

function SmartEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	style = {},
	data,
}: EdgeProps) {
	// Use bezier curves for smooth curved edges
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	return (
		<>
			{/* SVG marker definitions for arrows with outlines */}
			<defs>
				{/* Outlined arrow marker - will be rendered above nodes separately */}
				<marker
					id={`arrow-outline-${id}`}
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
						fill={style.stroke || "#b1b1b7"}
						stroke="white"
						strokeWidth="1"
						strokeLinejoin="round"
					/>
					{/* Arrow fill */}
					<path
						d="M2,2 L2,10 L10,6 z"
						fill={style.stroke || "#b1b1b7"}
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
						transform: `translate(-50%, -50%) translate(${String(targetX)}px,${String(targetY)}px)`,
						zIndex: 2000, // High z-index to be above nodes
						pointerEvents: "none",
					}}
				>
					<svg
						width="12"
						height="12"
						style={{
							transform: `rotate(${String(getArrowRotation(targetPosition))}deg)`,
						}}
					>
						{/* Arrow fill */}
						<path
							d="M2,2 L2,10 L10,6 z"
							fill={style.stroke || "#b1b1b7"}
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
							transform: `translate(-50%, -50%) translate(${String(labelX)}px,${String(labelY)}px)`,
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

export default React.memo(SmartEdge);