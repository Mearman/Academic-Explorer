/**
 * Graph Toolbar component with graph utilities
 * Provides academic research focused actions for the entire graph
 */

import React, { useCallback } from "react";
import { IconScissors } from "@tabler/icons-react";

import { useGraphUtilities } from "@/hooks/use-graph-utilities";
import { logger } from "@/lib/logger";

interface GraphToolbarProps {
  className?: string;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
	className = ""
}) => {
	const { trimLeafNodes } = useGraphUtilities();

	// Graph utility action
	const handleTrimLeaves = useCallback(async () => {
		logger.info("graph", "Trim leaves action triggered from graph toolbar");
		try {
			const result = await trimLeafNodes();
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
		</div>
	);
};