/**
 * Graph Toolbar component with graph utilities
 * Provides academic research focused actions for the entire graph
 */

import React, { useCallback } from "react";
import { IconScissors, IconTarget } from "@tabler/icons-react";
import { useReactFlow } from "@xyflow/react";

import { useGraphUtilities } from "@/hooks/use-graph-utilities";
import { logger } from "@/lib/logger";

interface GraphToolbarProps {
  className?: string;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
	className = ""
}) => {
	const { trimLeafNodes } = useGraphUtilities();
	const { getNodes, getEdges, setNodes } = useReactFlow();

	// Graph utility action
	const handleTrimLeaves = useCallback(() => {
		logger.info("graph", "Trim leaves action triggered from graph toolbar");
		try {
			const result = trimLeafNodes();
			logger.info("graph", "Trim leaves completed", {
				removedCount: result.removedCount,
				remainingNodes: result.nodes.length
			});
		} catch (error) {
			logger.error("graph", "Trim leaves failed", {
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	}, [trimLeafNodes]);

	// 1-degree selection action
	const handleSelect1Degree = useCallback(() => {
		logger.info("graph", "1-degree selection action triggered from graph toolbar");

		const currentNodes = getNodes();
		const currentEdges = getEdges();

		// Find the currently selected node
		const selectedNode = currentNodes.find(node => node.selected);

		if (!selectedNode) {
			logger.warn("graph", "No node currently selected for 1-degree selection");
			return;
		}

		logger.info("graph", "Finding 1-degree neighbors", {
			selectedNodeId: selectedNode.id,
			totalNodes: currentNodes.length,
			totalEdges: currentEdges.length
		});

		// Find all nodes within 1 degree (directly connected) of the selected node
		const oneDegreeNodeIds = new Set<string>();
		oneDegreeNodeIds.add(selectedNode.id); // Include the selected node itself

		// Find all edges connected to the selected node
		currentEdges.forEach(edge => {
			if (edge.source === selectedNode.id) {
				oneDegreeNodeIds.add(edge.target);
			} else if (edge.target === selectedNode.id) {
				oneDegreeNodeIds.add(edge.source);
			}
		});

		// Update node selection state
		const updatedNodes = currentNodes.map(node => ({
			...node,
			selected: oneDegreeNodeIds.has(node.id)
		}));

		setNodes(updatedNodes);

		logger.info("graph", "1-degree selection completed", {
			selectedNodeId: selectedNode.id,
			neighborCount: oneDegreeNodeIds.size - 1, // Subtract 1 for the original node
			totalSelected: oneDegreeNodeIds.size,
			selectedNodeIds: Array.from(oneDegreeNodeIds)
		});
	}, [getNodes, getEdges, setNodes]);

	return (
		<div className={`flex gap-2 p-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg ${className}`}>
			<button
				onClick={handleTrimLeaves}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
				title="Trim Leaf Nodes - Remove papers with no citations"
			>
				<IconScissors size={16} />
				<span>Trim Leaves</span>
			</button>

			<button
				onClick={handleSelect1Degree}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
				title="Select 1-Degree - Select all nodes directly connected to the selected node"
			>
				<IconTarget size={16} />
				<span>Select 1-Degree</span>
			</button>
		</div>
	);
};