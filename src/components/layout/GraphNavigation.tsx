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
import type { GraphNode, EntityType, ExternalIdentifier } from "@/lib/graph/types";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { useGraphData } from "@/hooks/use-graph-data";
import { useContextMenu } from "@/hooks/use-context-menu";
import { NodeContextMenu } from "@/components/layout/NodeContextMenu";
import { logger } from "@/lib/logger";
import { GRAPH_ANIMATION, FIT_VIEW_PRESETS } from "@/lib/graph/constants";

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
	const { loadEntityIntoGraph, expandNode } = useGraphData();
	const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();


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
		pinnedNodes: _pinnedNodes,
	} = useGraphStore();

	const { graphProvider: _graphProvider, setPreviewEntity, autoPinOnLayoutStabilization } = useLayoutStore();

	// XYFlow state - synced with store
	const [nodes, setNodes, onNodesChangeOriginal] = useNodesState<XYNode>([]);
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
	const [edges, setEdges, onEdgesChange] = useEdgesState<XYEdge>([]);

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

	// Center the viewport on a node without moving the node's position
	const centerOnNode = useCallback((nodeId: string, currentPosition?: { x: number; y: number }) => {
		let targetX: number;
		let targetY: number;

		if (currentPosition) {
			// Use provided position
			targetX = currentPosition.x;
			targetY = currentPosition.y;
		} else {
			// Fallback to searching for the node
			const currentNodes = reactFlowInstance.getNodes();
			const targetNode = currentNodes.find(n => n.id === nodeId);

			if (!targetNode) {
				logger.info("ui", "Cannot center node - node not found", { nodeId }, "GraphNavigation");
				return;
			}

			targetX = targetNode.position.x;
			targetY = targetNode.position.y;
		}

		// Center the viewport on the node's current position without moving the node
		void reactFlowInstance.setCenter(targetX, targetY, {
			zoom: reactFlowInstance.getZoom(),
			duration: 800 // Smooth viewport animation
		});

		// Optional: Fit view to show the node and its immediate neighbors after centering
		setTimeout(() => {
			const currentNodes = reactFlowInstance.getNodes();
			const currentEdges = reactFlowInstance.getEdges();
			const selectedNode = currentNodes.find(n => n.id === nodeId);

			if (selectedNode) {
				// Find all nodes directly connected to the selected node
				const connectedNodeIds = new Set<string>();
				connectedNodeIds.add(nodeId); // Include the selected node itself

				// Find all edges connected to the selected node
				currentEdges.forEach(edge => {
					if (edge.source === nodeId) {
						connectedNodeIds.add(edge.target);
					} else if (edge.target === nodeId) {
						connectedNodeIds.add(edge.source);
					}
				});

				// Get all connected nodes
				const connectedNodes = currentNodes.filter(node =>
					connectedNodeIds.has(node.id)
				);

				logger.info("ui", "Fitting view to selected node and its neighbors", {
					selectedNodeId: nodeId,
					connectedNodeIds: Array.from(connectedNodeIds),
					totalNodesInView: connectedNodes.length
				}, "GraphNavigation");

				void reactFlowInstance.fitView({
					nodes: connectedNodes,
					...FIT_VIEW_PRESETS.NEIGHBORHOOD
				});
			}
		}, GRAPH_ANIMATION.FIT_VIEW_CONFLICT_DELAY);

		logger.info("ui", "Centered viewport on node at its current position", {
			nodeId: nodeId,
			nodePosition: { x: targetX, y: targetY }
		}, "GraphNavigation");
	}, [reactFlowInstance]);

	const { isRunning: _isLayoutRunning, restartLayout } = useLayout(
		currentLayout,
		{
			enabled: true,
			onLayoutChange,
			containerDimensions,
			// Keep automatic fitView enabled - it's already smooth with 800ms duration
			fitViewAfterLayout: true
		}
	);

	// Ref to capture latest restartLayout function without adding it to dependencies
	const restartLayoutRef = useRef(restartLayout);
	restartLayoutRef.current = restartLayout;

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

				// Select and pin the node first
				const store = useGraphStore.getState();
				store.selectNode(node.id);

				// Only clear pinned nodes if auto-pin is disabled
				// When auto-pin is enabled, preserve all pinned nodes from layout stabilization
				if (!autoPinOnLayoutStabilization) {
					store.clearAllPinnedNodes(); // Clear previous pinned nodes
				}

				store.pinNode(node.id); // Pin the new node at its current position

				// Smoothly animate the pinned node to the center of the viewport
				centerOnNode(node.id, node.position);

				// Expand the node respecting traversal depth setting
				void expandNode(node.id);

				logger.info("ui", "Node clicked - Selecting, pinning, and expanding node", {
					nodeId: node.id,
					entityId: node.entityId,
					entityType: node.type,
					newHashPath,
					selected: true,
					pinned: true, // Now automatically pinned using multi-pin API
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
	}, [reactFlowInstance, navigate, setProvider, setPreviewEntity, loadEntityIntoGraph, expandNode, centerOnNode, autoPinOnLayoutStabilization]);

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

		// Updated nodes are detected by store changes - we trust the store as source of truth
		// No need to compare with current XYFlow nodes, just rebuild them from store data
		const updatedNodeIds = new Set<string>();

		logger.info("graph", "Store data incremental sync effect triggered", {
			totalNodeCount: storeNodes.size,
			totalEdgeCount: storeEdges.size,
			visibleNodeCount: visibleNodes.length,
			visibleEdgeCount: visibleEdges.length,
			newNodes: newNodeIds.size,
			newEdges: newEdgeIds.size,
			updatedNodes: updatedNodeIds.size,
			removedNodes: removedNodeIds.size,
			removedEdges: removedEdgeIds.size,
			hasProvider: !!providerRef.current
		}, "GraphNavigation");

		if (providerRef.current && (newNodeIds.size > 0 || newEdgeIds.size > 0 || updatedNodeIds.size > 0 || removedNodeIds.size > 0 || removedEdgeIds.size > 0)) {
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

				// Note: Node updates will be handled by ReactFlow changes below
				if (updatedNodeIds.size > 0) {
					const updatedNodes = visibleNodes.filter(n => updatedNodeIds.has(n.id));
					logger.info("graph", "Detected existing nodes with updated data", {
						updatedNodeCount: updatedNodes.length,
						updatedNodeIds: Array.from(updatedNodeIds),
						updatedLabels: updatedNodes.map(n => ({ id: n.id, label: n.label }))
					}, "GraphNavigation");
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
				// Incremental update: Get only new and updated data and apply changes
				const { nodes: newXYNodes } = providerRef.current.getXYFlowDataForNodes(Array.from(newNodeIds));
				const { edges: newXYEdges } = providerRef.current.getXYFlowDataForEdges(Array.from(newEdgeIds));
				const { nodes: updatedXYNodes } = providerRef.current.getXYFlowDataForNodes(Array.from(updatedNodeIds));

				// Apply incremental changes using ReactFlow's utilities
				const nodeChanges: NodeChange<XYNode>[] = [
					// Add new nodes (get fresh data from provider)
					...newXYNodes.map((node): NodeChange<XYNode> => ({ type: "add", item: node })),
					// Update existing nodes with new data
					...updatedXYNodes.map((node): NodeChange<XYNode> => ({
						type: "replace",
						id: node.id,
						item: node
					})),
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
				// Add a small delay to ensure React state updates are complete
				setTimeout(() => {
					restartLayoutRef.current(); // Full restart to include new nodes in D3 simulation
					logger.info("graph", "Restarting layout due to new nodes", {
						newNodeCount: newNodeIds.size
					}, "GraphNavigation");
				}, 50); // 50ms delay to allow React state to settle
			}
		}

		// Update refs for next comparison
		previousNodeIdsRef.current = currentNodeIds;
		previousEdgeIdsRef.current = currentEdgeIds;
	}, [storeNodes, storeEdges, visibleEntityTypes, visibleEdgeTypes, setNodes, setEdges, getVisibleNodes, getVisibleEdges]);

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
					// Update selection in store
					const store = useGraphStore.getState();
					store.selectNode(matchingNode.id);

					// Pin the node to the center of the screen
					// Only clear pinned nodes if auto-pin is disabled
					// When auto-pin is enabled, preserve all pinned nodes from layout stabilization
					if (!autoPinOnLayoutStabilization) {
						store.clearAllPinnedNodes(); // Clear previous pinned nodes
					}
					store.pinNode(matchingNode.id);

					// Update preview in sidebar
					setPreviewEntity(matchingNode.entityId);

					// Smoothly animate the selected node to the center of the viewport
					centerOnNode(matchingNode.id, matchingNode.position);

					logger.info("graph", "Selected and auto-centered entity from hash URL", {
						currentHash,
						entityType,
						entityId,
						nodeId: matchingNode.id,
						nodeEntityId: matchingNode.entityId,
						pinned: true
					}, "GraphNavigation");
				}
			}
		}
	}, [storeNodes, setPreviewEntity, centerOnNode, autoPinOnLayoutStabilization]);

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
						// Update selection in store
						const store = useGraphStore.getState();
						store.selectNode(matchingNode.id);

						// Pin the node to the center of the screen
						// Only clear pinned nodes if auto-pin is disabled
						// When auto-pin is enabled, preserve all pinned nodes from layout stabilization
						if (!autoPinOnLayoutStabilization) {
							store.clearAllPinnedNodes(); // Clear previous pinned nodes
						}
						store.pinNode(matchingNode.id);

						// Update preview in sidebar
						setPreviewEntity(matchingNode.entityId);

						// Smoothly animate the selected node to the center of the viewport
						centerOnNode(matchingNode.id, matchingNode.position);

						logger.info("graph", "Selected and auto-centered entity from hash change", {
							currentHash,
							entityType,
							entityId,
							nodeId: matchingNode.id,
							nodeEntityId: matchingNode.entityId,
							pinned: true
						}, "GraphNavigation");
					}
				}
			} else {
				// No entity in hash or root hash, clear selection only
				const store = useGraphStore.getState();
				store.selectNode(null);
				setPreviewEntity(null);
			}
		};

		// Listen for hash changes (browser back/forward, manual hash changes)
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [storeNodes, setPreviewEntity, centerOnNode, autoPinOnLayoutStabilization]);

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

	// Handle node right-click for context menu
	const onNodeContextMenu = useCallback((event: React.MouseEvent, node: XYNode) => {
		event.preventDefault();
		if (providerRef.current) {
			// Convert XYFlow node back to GraphNode for context menu
			const graphNode: GraphNode = {
				id: node.id,
				entityId: node.data.entityId as string,
				type: node.data.entityType as EntityType,
				label: node.data.label as string,
				position: node.position,
				externalIds: node.data.externalIds as ExternalIdentifier[]
			};
			showContextMenu(graphNode, event);
		}
	}, [showContextMenu]);

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
				onNodeContextMenu={onNodeContextMenu}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				elevateEdgesOnSelect={true}
				fitView
				fitViewOptions={FIT_VIEW_PRESETS.DEFAULT}
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

			{/* Context menu */}
			{contextMenu.visible && contextMenu.node && (
				<NodeContextMenu
					node={contextMenu.node}
					x={contextMenu.x}
					y={contextMenu.y}
					onClose={hideContextMenu}
					onViewDetails={(node) => {
						// Update preview in sidebar when viewing details
						setPreviewEntity(node.entityId);
					}}
				/>
			)}
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