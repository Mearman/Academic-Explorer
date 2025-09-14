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
} from "@xyflow/react";

function SmartEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	style = {},
	markerEnd,
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
			{/* SVG marker definitions for arrows */}
			<defs>
				<marker
					id={`arrow-${id}`}
					viewBox="0 0 12 12"
					refX="10"
					refY="6"
					markerWidth="6"
					markerHeight="6"
					orient="auto"
					markerUnits="strokeWidth"
				>
					<path
						d="M2,2 L2,10 L10,6 z"
						fill={style?.stroke || "#b1b1b7"}
						stroke="none"
					/>
				</marker>
			</defs>

			{/* Base edge path */}
			<BaseEdge
				path={edgePath}
				markerEnd={markerEnd || `url(#arrow-${id})`}
				style={style}
			/>

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

export default React.memo(SmartEdge);