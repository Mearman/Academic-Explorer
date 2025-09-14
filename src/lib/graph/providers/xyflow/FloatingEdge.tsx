/**
 * FloatingEdge Component for XYFlow React Flow
 *
 * A custom edge that automatically calculates connection points
 * based on the shortest distance between nodes.
 */

import React from "react";
import {
	EdgeProps,
	getStraightPath,
	useReactFlow,
	useStore,
	useUpdateNodeInternals,
	Edge as XYEdge,
	Node as XYNode,
} from "@xyflow/react";

import { getFloatingEdgePositions } from "./floating-edge-utils";
import { logger } from "@/lib/logger";

function FloatingEdge({
	id,
	source,
	target,
	markerEnd,
	style,
	data,
	...edgeProps
}: EdgeProps) {
	const { getNode } = useReactFlow();
	const updateNodeInternals = useUpdateNodeInternals();
	const sourceNode = getNode(source);
	const targetNode = getNode(target);

	// Ensure nodes are measured - use stable IDs instead of object references
	React.useEffect(() => {
		if (sourceNode && targetNode) {
			updateNodeInternals(source);
			updateNodeInternals(target);
		}
	}, [source, target, updateNodeInternals]); // Only depend on stable IDs

	if (!sourceNode || !targetNode) {
		return null;
	}

	// Log node dimensions for debugging - only when dimensions are undefined
	React.useEffect(() => {
		if (!sourceNode.width || !sourceNode.height) {
			logger.info("graph", "FloatingEdge source node dimensions missing", {
				edgeId: id,
				nodeId: sourceNode.id,
				width: sourceNode.width || 'undefined',
				height: sourceNode.height || 'undefined',
				measured: sourceNode.measured
			}, "FloatingEdge");
		}
		if (!targetNode.width || !targetNode.height) {
			logger.info("graph", "FloatingEdge target node dimensions missing", {
				edgeId: id,
				nodeId: targetNode.id,
				width: targetNode.width || 'undefined',
				height: targetNode.height || 'undefined',
				measured: targetNode.measured
			}, "FloatingEdge");
		}
	}, [id, sourceNode.id, sourceNode.width, sourceNode.height, sourceNode.measured, targetNode.id, targetNode.width, targetNode.height, targetNode.measured]);

	// Calculate floating edge positions
	const { sourceX, sourceY, targetX, targetY } = getFloatingEdgePositions(
		sourceNode,
		targetNode
	);

	// Generate the path using React Flow's utility
	const [edgePath] = getStraightPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
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

			<g>
				<path
					id={id}
					className="react-flow__edge-path"
					d={edgePath}
					markerEnd={markerEnd || `url(#arrow-${id})`}
					style={style}
					fill="none"
				/>
				{/* Optional edge label */}
				{data?.label && typeof data.label === "string" ? (
					<text
						x={(sourceX + targetX) / 2}
						y={(sourceY + targetY) / 2}
						className="react-flow__edge-label"
						style={{
							fontSize: "10px",
							fill: "#666",
							textAnchor: "middle",
							dominantBaseline: "middle",
							pointerEvents: "none",
						}}
					>
						{data.label}
					</text>
				) : null}
			</g>
		</>
	);
}

export default React.memo(FloatingEdge);