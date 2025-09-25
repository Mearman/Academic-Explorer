/**
 * Main graph navigation component - RESTORED with safeguards
 * Implements XYFlow graph with careful state management to prevent infinite loops
 */

import React, { useCallback, useMemo } from "react";
import { ReactFlow, ReactFlowProvider, Node, Edge, Controls, MiniMap, Background } from "@xyflow/react";
import { useGraphStore } from "@/stores/graph-store";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode, GraphEdge } from "@academic-explorer/graph";

import "@xyflow/react/dist/style.css";

interface GraphNavigationProps {
  className?: string;
  style?: React.CSSProperties;
}

// Convert graph store nodes to XYFlow nodes
function convertToXYFlowNodes(graphNodes: GraphNode[]): Node[] {
	return graphNodes.map(node => ({
		id: node.id,
		position: { x: node.x || Math.random() * 500, y: node.y || Math.random() * 500 },
		data: {
			label: node.label || node.id,
			entityType: node.entityType,
			entityId: node.entityId,
		},
		entityType: 'default'
	}));
}

// Convert graph store edges to XYFlow edges
function convertToXYFlowEdges(graphEdges: GraphEdge[]): Edge[] {
	return graphEdges.map(edge => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		entityType: 'default',
		label: edge.label
	}));
}


const GraphNavigationInner: React.FC<GraphNavigationProps> = ({ className, style }) => {
	// CRITICAL: Use stable selectors to prevent infinite re-renders
	const isLoading = useGraphStore((state) => state.isLoading);
	const error = useGraphStore((state) => state.error);

	// CRITICAL: Memoize nodes and edges to prevent object recreation
	const stableNodesMap = useGraphStore((state) => state.nodes);
	const stableEdgesMap = useGraphStore((state) => state.edges);

	const graphNodes = useMemo(() => {
		const nodes = Object.values(stableNodesMap).filter((node): node is NonNullable<typeof node> => node != null);
		logger.debug("graph", `GraphNavigation rendering with ${nodes.length} nodes`);
		return nodes;
	}, [stableNodesMap]);

	const graphEdges = useMemo(() => {
		const edges = Object.values(stableEdgesMap).filter((edge): edge is NonNullable<typeof edge> => edge != null);
		logger.debug("graph", `GraphNavigation rendering with ${edges.length} edges`);
		return edges;
	}, [stableEdgesMap]);

	// Convert to XYFlow format
	const xyflowNodes = useMemo(() => convertToXYFlowNodes(graphNodes), [graphNodes]);
	const xyflowEdges = useMemo(() => convertToXYFlowEdges(graphEdges), [graphEdges]);

	// Show loading state
	if (isLoading) {
		return (
			<div
				className={className}
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#f8f9fa",
					...style
				}}
			>
				<div style={{
					padding: "20px",
					background: "white",
					borderRadius: "8px",
					border: "1px solid #ddd",
					textAlign: "center"
				}}>
					<h3>Loading Graph...</h3>
					<p>Please wait while the graph loads</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div
				className={className}
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#f8f9fa",
					...style
				}}
			>
				<div style={{
					padding: "20px",
					background: "white",
					borderRadius: "8px",
					border: "1px solid #dc3545",
					textAlign: "center",
					color: "#dc3545"
				}}>
					<h3>Graph Error</h3>
					<p>{error}</p>
				</div>
			</div>
		);
	}

	// Show graph
	return (
		<div
			className={className}
			style={{
				width: "100%",
				height: "100%",
				...style
			}}
		>
			<ReactFlowProvider>
				<ReactFlow
					nodes={xyflowNodes}
					edges={xyflowEdges}
					fitView
					attributionPosition="bottom-left"
				>
					<Controls />
					<MiniMap />
					<Background />
				</ReactFlow>
			</ReactFlowProvider>
		</div>
	);
};

// CRITICAL: Simple forwarding component to avoid re-render issues
export const GraphNavigation: React.FC<GraphNavigationProps> = React.memo((props) => {
	return <GraphNavigationInner {...props} />;
});