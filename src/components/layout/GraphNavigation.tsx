/**
 * Main graph navigation component
 * Provider-agnostic graph visualization with XYFlow implementation
 */

import React, { useEffect, useRef, useCallback } from "react";
import {
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
	useNodesState,
	useEdgesState,
	Controls,
	MiniMap,
	Background,
	BackgroundVariant,
	Panel,
	type Node as XYNode,
} from "@xyflow/react";
import { useNavigate } from "@tanstack/react-router";
import { IconSearch } from "@tabler/icons-react";

import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { createGraphProvider } from "@/lib/graph/provider-factory";
import { XYFlowProvider } from "@/lib/graph/providers/xyflow/xyflow-provider";
import { nodeTypes } from "@/lib/graph/providers/xyflow/node-types";
import { edgeTypes } from "@/lib/graph/providers/xyflow/edge-types";
import { useLayout } from "@/lib/graph/providers/xyflow/use-layout";
import type { GraphNode } from "@/lib/graph/types";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { logger } from "@/lib/logger";

import "@xyflow/react/dist/style.css";

interface GraphNavigationProps {
  className?: string;
  style?: React.CSSProperties;
}

// Inner component that uses ReactFlow hooks
const GraphNavigationInner: React.FC<GraphNavigationProps> = ({ className, style }) => {
	const navigate = useNavigate();
	const reactFlowInstance = useReactFlow();
	const containerRef = useRef<HTMLDivElement>(null);

	// Store state
	const {
		provider: _provider,
		setProvider,
		nodes: storeNodes,
		edges: storeEdges,
		currentLayout,
		isLoading,
		error,
	} = useGraphStore();

	const { graphProvider: _graphProvider, setPreviewEntity } = useLayoutStore();

	// XYFlow state - synced with store
	const [nodes, setNodes, onNodesChange] = useNodesState<XYNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	// Provider instance ref
	const providerRef = useRef<XYFlowProvider | null>(null);

	// Container dimensions state
	const [containerDimensions, setContainerDimensions] = React.useState<{ width: number; height: number } | undefined>();

	// Layout hook integration - throttled to reduce log spam
	const lastLogRef = useRef<number>(0);
	const onLayoutChange = useCallback(() => {
		// Layout positions have changed, re-sync if needed
		const now = Date.now();
		// Only log every 500ms to reduce spam
		if (now - lastLogRef.current > 500) {
			logger.info("graph", "Layout positions updated", undefined, "GraphNavigation");
			lastLogRef.current = now;
		}
	}, []);

	const { isRunning: _isLayoutRunning, reheatLayout: _reheatLayout } = useLayout(
		currentLayout,
		{
			enabled: true,
			onLayoutChange,
			containerDimensions
		}
	);

	// Measure container dimensions
	useEffect(() => {
		if (!containerRef.current) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				setContainerDimensions({ width, height });
				logger.info("graph", "Container dimensions updated", { width, height }, "GraphNavigation");
			}
		});

		resizeObserver.observe(containerRef.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	// Initialize provider
	useEffect(() => {
		if (!containerRef.current) return;

		const graphProvider = createGraphProvider("xyflow");
		// Type guard: we know createGraphProvider('xyflow') returns XYFlowProvider
		if (!(graphProvider instanceof XYFlowProvider)) {
			throw new Error("Expected XYFlowProvider instance");
		}
		providerRef.current = graphProvider;

		// Set up navigation events
		graphProvider.setEvents({
			onNodeClick: (node: GraphNode) => {
				// Extract clean OpenAlex ID from potential URL
				const cleanId = EntityDetector.extractOpenAlexId(node.entityId);
				// Navigate to entity page using the new route structure
				void navigate({ to: `/${node.type}/${cleanId}` });
			},

			onNodeDoubleClick: (node: GraphNode) => {
				// TODO: Expand node functionality
				logger.info("ui", "Double clicked node", { nodeId: node.id, entityId: node.entityId, entityType: node.type }, "GraphNavigation");
			},

			onNodeHover: (node: GraphNode | null) => {
				// Update preview in sidebar
				setPreviewEntity(node?.entityId || null);
			},
		});

		// Initialize with container
		void graphProvider.initialize(containerRef.current);

		// Set ReactFlow instance
		graphProvider.setReactFlowInstance(reactFlowInstance);

		// Update store
		setProvider(graphProvider);

		return () => {
			graphProvider.destroy();
		};
	}, [reactFlowInstance, navigate, setProvider, setPreviewEntity]);

	// Sync store data with XYFlow
	useEffect(() => {
		logger.info("graph", "Store data sync effect triggered", {
			storeNodeCount: storeNodes.size,
			storeEdgeCount: storeEdges.size,
			hasProvider: !!providerRef.current
		}, "GraphNavigation");

		if (providerRef.current && (storeNodes.size > 0 || storeEdges.size > 0)) {
			const { nodes: xyNodes, edges: xyEdges } = providerRef.current.getXYFlowData();
			logger.info("graph", "Setting XYFlow data", {
				xyNodeCount: xyNodes.length,
				xyEdgeCount: xyEdges.length,
				nodeIds: xyNodes.map(n => n.id),
				nodePositions: xyNodes.map(n => ({ id: n.id, position: n.position }))
			}, "GraphNavigation");
			setNodes(xyNodes);
			setEdges(xyEdges);
		}
	}, [storeNodes, storeEdges, setNodes, setEdges]);

	// Handle node clicks
	const onNodeClick = useCallback((event: React.MouseEvent, node: XYNode) => {
		if (providerRef.current) {
			providerRef.current.handleNodeClick(event, node);
		}
	}, []);

	// Handle node double clicks
	const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: XYNode) => {
		logger.info("ui", "Node double-click", { nodeId: node.id }, "GraphNavigation");
		if (providerRef.current) {
			providerRef.current.handleNodeDoubleClick(event, node);
		}
	}, []);

	// Handle node mouse enter
	const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: XYNode) => {
		if (providerRef.current) {
			providerRef.current.handleNodeHover(event, node);
		}
	}, []);

	// Handle node mouse leave
	const onNodeMouseLeave = useCallback((event: React.MouseEvent) => {
		if (providerRef.current) {
			providerRef.current.handleNodeHover(event, null);
		}
	}, []);

	// Loading state
	if (isLoading) {
		return (
			<div className={className} style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				height: "100%",
				background: "#f8f9fa"
			}}>
				<div>Loading graph...</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className={className} style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				height: "100%",
				background: "#f8f9fa",
				color: "#e74c3c"
			}}>
				<div>Error loading graph: {error}</div>
			</div>
		);
	}

	return (
		<div ref={containerRef} className={className} style={{ width: "100%", height: "100%", ...style }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onNodeClick={onNodeClick}
				onNodeDoubleClick={onNodeDoubleClick}
				onNodeMouseEnter={onNodeMouseEnter}
				onNodeMouseLeave={onNodeMouseLeave}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				fitView
				fitViewOptions={{ padding: 0.1 }}
				attributionPosition="bottom-left"
			>
				<Controls />
				<MiniMap
					nodeColor={(node) => {
						switch (node.data.entityType) {
							case "work": return "#e74c3c";
							case "author": return "#3498db";
							case "source": return "#2ecc71";
							case "institution": return "#f39c12";
							default: return "#95a5a6";
						}
					}}
					nodeStrokeWidth={3}
					zoomable
					pannable
				/>
				<Background variant={BackgroundVariant.Dots} gap={12} size={1} />

				<Panel position="top-left">
					<div style={{
						background: "rgba(255, 255, 255, 0.9)",
						padding: "8px 12px",
						borderRadius: "6px",
						fontSize: "12px",
						fontWeight: "bold"
					}}>
            Academic Explorer Graph
					</div>
				</Panel>


				{nodes.length === 0 && (
					<Panel position="top-right">
						<div style={{
							background: "rgba(255, 255, 255, 0.9)",
							padding: "20px",
							borderRadius: "8px",
							textAlign: "center",
							fontSize: "14px",
							color: "#666"
						}}>
							<div style={{ marginBottom: "8px" }}>
								<IconSearch size={24} />
							</div>
							<div>No entities to display</div>
							<div style={{ fontSize: "12px", marginTop: "4px" }}>
                Search for entities or navigate to an entity page to see the graph
							</div>
						</div>
					</Panel>
				)}
			</ReactFlow>
		</div>
	);
};

// Main component wrapped in ReactFlowProvider
export const GraphNavigation: React.FC<GraphNavigationProps> = (props) => {
	return (
		<ReactFlowProvider>
			<GraphNavigationInner {...props} />
		</ReactFlowProvider>
	);
};