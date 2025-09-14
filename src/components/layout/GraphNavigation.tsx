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
	applyNodeChanges,
	applyEdgeChanges,
	Controls,
	MiniMap,
	Background,
	BackgroundVariant,
	Panel,
	type Node as XYNode,
	type Edge as XYEdge,
	type NodeChange,
	type EdgeChange,
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
import { useGraphData } from "@/hooks/use-graph-data";
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
	const { loadEntityIntoGraph, manualExpandNode } = useGraphData();


	// Store state
	const {
		provider: _provider,
		setProvider,
		nodes: storeNodes,
		edges: storeEdges,
		currentLayout,
		isLoading,
		error,
		getVisibleNodes,
		getVisibleEdges,
		visibleEntityTypes,
		visibleEdgeTypes,
	} = useGraphStore();

	const { graphProvider: _graphProvider, setPreviewEntity } = useLayoutStore();

	// XYFlow state - synced with store
	const [nodes, setNodes, onNodesChangeOriginal] = useNodesState<XYNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	// Wrapped nodes change handler that also triggers handle recalculation
	const onNodesChange = useCallback((changes: NodeChange<XYNode>[]) => {
		onNodesChangeOriginal(changes);

		// Check if any change involves position updates (drag, layout changes)
		const hasPositionChange = changes.some((change: NodeChange<XYNode>) => {
			return change.type === "position" || change.type === "dimensions";
		});

		if (hasPositionChange && providerRef.current) {
			providerRef.current.onNodePositionsChanged();
		}
	}, [onNodesChangeOriginal]);

	// Provider instance ref
	const providerRef = useRef<XYFlowProvider | null>(null);

	// Container dimensions state
	const [containerDimensions, setContainerDimensions] = React.useState<{ width: number; height: number } | undefined>();

	// Track previous node/edge IDs to detect changes
	const previousNodeIdsRef = useRef<Set<string>>(new Set());
	const previousEdgeIdsRef = useRef<Set<string>>(new Set());

	// Flag to prevent handling hashchange events when we programmatically push state
	const isProgrammaticNavigationRef = useRef(false);

	// Flag to disable layout during incremental updates
	const _isIncrementalUpdateRef = useRef(false);

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

		// Notify provider to recalculate edge handles based on new positions
		if (providerRef.current) {
			providerRef.current.onNodePositionsChanged();
		}
	}, []);

	const { isRunning: _isLayoutRunning, restartLayout } = useLayout(
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

				// Update URL to hash-based route structure for bookmarking
				const newHashPath = `#/${node.type}/${cleanId}`;

				// Set flag to prevent hashchange handler from firing
				isProgrammaticNavigationRef.current = true;
				window.history.pushState(null, "", newHashPath);

				// Reset flag after a brief delay to allow for potential hashchange events
				setTimeout(() => {
					isProgrammaticNavigationRef.current = false;
				}, 10);

				// Update preview in sidebar
				setPreviewEntity(node.entityId);

				// Pin the selected node at origin (0,0) for layout
				const store = useGraphStore.getState();
				store.setPinnedNode(node.id);

				// Manually expand the node respecting traversal depth setting
				void manualExpandNode(node.id);

				logger.info("ui", "Node clicked - Manually expanding node with traversal depth", {
					nodeId: node.id,
					entityId: node.entityId,
					entityType: node.type,
					newHashPath,
					pinned: true,
					traversalDepth: store.traversalDepth
				}, "GraphNavigation");
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
	}, [reactFlowInstance, navigate, setProvider, setPreviewEntity, loadEntityIntoGraph, manualExpandNode]);

	// Sync store data with XYFlow using incremental updates (applying visibility filters)
	useEffect(() => {
		const visibleNodes = getVisibleNodes();
		const visibleEdges = getVisibleEdges();

		// Get current node and edge IDs
		const currentNodeIds = new Set(visibleNodes.map(n => n.id));
		const currentEdgeIds = new Set(visibleEdges.map(e => e.id));

		// Find new nodes and edges
		const newNodeIds = new Set([...currentNodeIds].filter(id => !previousNodeIdsRef.current.has(id)));
		const newEdgeIds = new Set([...currentEdgeIds].filter(id => !previousEdgeIdsRef.current.has(id)));

		// Find removed nodes and edges
		const removedNodeIds = new Set([...previousNodeIdsRef.current].filter(id => !currentNodeIds.has(id)));
		const removedEdgeIds = new Set([...previousEdgeIdsRef.current].filter(id => !currentEdgeIds.has(id)));

		logger.info("graph", "Store data incremental sync effect triggered", {
			totalNodeCount: storeNodes.size,
			totalEdgeCount: storeEdges.size,
			visibleNodeCount: visibleNodes.length,
			visibleEdgeCount: visibleEdges.length,
			newNodes: newNodeIds.size,
			newEdges: newEdgeIds.size,
			removedNodes: removedNodeIds.size,
			removedEdges: removedEdgeIds.size,
			hasProvider: !!providerRef.current
		}, "GraphNavigation");

		if (providerRef.current && (newNodeIds.size > 0 || newEdgeIds.size > 0 || removedNodeIds.size > 0 || removedEdgeIds.size > 0)) {
			// Special case: If we have no previous nodes, this is initial load - use setNodes/setEdges
			if (previousNodeIdsRef.current.size === 0 && previousEdgeIdsRef.current.size === 0) {
				providerRef.current.setNodes(visibleNodes);
				providerRef.current.setEdges(visibleEdges);
			} else {
				// Use incremental provider methods for updates
				if (newNodeIds.size > 0) {
					const newNodes = visibleNodes.filter(n => newNodeIds.has(n.id));
					providerRef.current.addNodes(newNodes);
				}

				if (newEdgeIds.size > 0) {
					const newEdges = visibleEdges.filter(e => newEdgeIds.has(e.id));
					providerRef.current.addEdges(newEdges);
				}

				if (removedNodeIds.size > 0) {
					providerRef.current.removeNodes(Array.from(removedNodeIds));
				}

				if (removedEdgeIds.size > 0) {
					providerRef.current.removeEdges(Array.from(removedEdgeIds));
				}
			}

			// Handle data differently for initial load vs incremental updates
			if (previousNodeIdsRef.current.size === 0 && previousEdgeIdsRef.current.size === 0) {
				// Initial load: Get all data and set directly
				const { nodes: xyNodes, edges: xyEdges } = providerRef.current.getXYFlowData();
				setNodes(xyNodes);
				setEdges(xyEdges);
			} else {
				// Incremental update: Get only new data and apply changes
				const { nodes: newXYNodes, edges: newXYEdges } = providerRef.current.getXYFlowDataForNodes(Array.from(newNodeIds));

				// Apply incremental changes using ReactFlow's utilities
				const nodeChanges: NodeChange<XYNode>[] = [
					// Add new nodes (get fresh data from provider)
					...newXYNodes.map((node): NodeChange<XYNode> => ({ type: "add", item: node })),
					// Remove deleted nodes
					...Array.from(removedNodeIds).map((id): NodeChange<XYNode> => ({ type: "remove", id }))
				];

				const edgeChanges: EdgeChange<XYEdge>[] = [
					// Add new edges (get fresh data from provider)
					...newXYEdges.map((edge): EdgeChange<XYEdge> => ({ type: "add", item: edge })),
					// Remove deleted edges
					...Array.from(removedEdgeIds).map((id): EdgeChange<XYEdge> => ({ type: "remove", id }))
				];

				// Apply changes to ReactFlow
				if (nodeChanges.length > 0) {
					setNodes(prevNodes => applyNodeChanges(nodeChanges, prevNodes));
				}

				if (edgeChanges.length > 0) {
					setEdges(prevEdges => applyEdgeChanges(edgeChanges, prevEdges));
				}
			}

			logger.info("graph", "Applied incremental XYFlow changes", {
				addedNodes: Array.from(newNodeIds),
				addedEdges: Array.from(newEdgeIds),
				removedNodes: Array.from(removedNodeIds),
				removedEdges: Array.from(removedEdgeIds)
			}, "GraphNavigation");

			// Restart layout simulation when new nodes are added to include them in positioning
			if (newNodeIds.size > 0) {
				restartLayout(); // Full restart to include new nodes in D3 simulation
				logger.info("graph", "Restarting layout due to new nodes", {
					newNodeCount: newNodeIds.size
				}, "GraphNavigation");
			}
		}

		// Update refs for next comparison
		previousNodeIdsRef.current = currentNodeIds;
		previousEdgeIdsRef.current = currentEdgeIds;
	}, [storeNodes, storeEdges, visibleEntityTypes, visibleEdgeTypes, getVisibleNodes, getVisibleEdges, setNodes, setEdges, restartLayout]);

	// URL state synchronization - read selected entity from hash on mount
	useEffect(() => {
		const currentHash = window.location.hash;

		if (currentHash && currentHash !== "#/" && storeNodes.size > 0) {
			// Parse hash (format: "#/entityType/entityId")
			const hashPath = currentHash.substring(1); // Remove the '#'
			const pathParts = hashPath.split("/").filter(part => part.length > 0);

			if (pathParts.length >= 2) {
				const [entityType, entityId] = pathParts;

				// Find the corresponding node in the graph
				const matchingNode = Array.from(storeNodes.values()).find(node => {
					const cleanNodeId = EntityDetector.extractOpenAlexId(node.entityId);
					const cleanUrlId = EntityDetector.extractOpenAlexId(entityId);
					return node.type === entityType && cleanNodeId === cleanUrlId;
				});

				if (matchingNode) {
					// Update selection in store and pin the node
					const store = useGraphStore.getState();
					store.selectNode(matchingNode.id);
					store.setPinnedNode(matchingNode.id);

					// Update preview in sidebar
					setPreviewEntity(matchingNode.entityId);

					logger.info("graph", "Selected entity from hash URL", {
						currentHash,
						entityType,
						entityId,
						nodeId: matchingNode.id,
						nodeEntityId: matchingNode.entityId
					}, "GraphNavigation");
				}
			}
		}
	}, [storeNodes, setPreviewEntity]);

	// Browser history navigation (back/forward button support for hash routing)
	useEffect(() => {
		const handleHashChange = () => {
			// Skip if this is a programmatic navigation to avoid duplicate processing
			if (isProgrammaticNavigationRef.current) {
				return;
			}

			const currentHash = window.location.hash;

			if (currentHash && currentHash !== "#/" && storeNodes.size > 0) {
				// Parse hash (format: "#/entityType/entityId")
				const hashPath = currentHash.substring(1); // Remove the '#'
				const pathParts = hashPath.split("/").filter(part => part.length > 0);

				if (pathParts.length >= 2) {
					const [entityType, entityId] = pathParts;

					// Find the corresponding node in the graph
					const matchingNode = Array.from(storeNodes.values()).find(node => {
						const cleanNodeId = EntityDetector.extractOpenAlexId(node.entityId);
						const cleanUrlId = EntityDetector.extractOpenAlexId(entityId);
						return node.type === entityType && cleanNodeId === cleanUrlId;
					});

					if (matchingNode) {
						// Update selection in store and pin the node
						const store = useGraphStore.getState();
						store.selectNode(matchingNode.id);
						store.setPinnedNode(matchingNode.id);

						// Update preview in sidebar
						setPreviewEntity(matchingNode.entityId);

						logger.info("graph", "Selected entity from hash change", {
							currentHash,
							entityType,
							entityId,
							nodeId: matchingNode.id,
							nodeEntityId: matchingNode.entityId
						}, "GraphNavigation");
					}
				}
			} else {
				// No entity in hash or root hash, clear selection and pinned node
				const store = useGraphStore.getState();
				store.selectNode(null);
				store.clearPinnedNode();
				setPreviewEntity(null);
			}
		};

		// Listen for hash changes (browser back/forward, manual hash changes)
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [storeNodes, setPreviewEntity]);

	// Handle node clicks
	const onNodeClick = useCallback((event: React.MouseEvent, node: XYNode) => {
		if (providerRef.current) {
			providerRef.current.handleNodeClick(event, node);
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

	// Loading state - only show full loading screen if there are no existing nodes
	// This prevents the loading screen from showing during incremental expansions
	if (isLoading && storeNodes.size === 0) {
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
				onNodeMouseEnter={onNodeMouseEnter}
				onNodeMouseLeave={onNodeMouseLeave}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				elevateEdgesOnSelect={true}
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