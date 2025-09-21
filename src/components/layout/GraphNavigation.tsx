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
import { IconSearch } from "@tabler/icons-react";

import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { createGraphProvider } from "@/lib/graph/provider-factory";
import { XYFlowProvider } from "@/lib/graph/providers/xyflow/xyflow-provider";
import { nodeTypes } from "@/lib/graph/providers/xyflow/node-types";
import { edgeTypes } from "@/lib/graph/providers/xyflow/edge-types";
import { useAnimatedLayoutContext } from "@/components/graph/animated-layout-context";
import { AnimatedLayoutProvider } from "@/components/graph/AnimatedLayoutProvider";
import type { GraphNode, GraphEdge, EntityType, ExternalIdentifier } from "@/lib/graph/types";
import { EntityDetector } from "@/lib/graph/utils/entity-detection";
import { useEntityInteraction } from "@/hooks/use-entity-interaction";
import { useContextMenu } from "@/hooks/use-context-menu";
import { NodeContextMenu } from "@/components/layout/NodeContextMenu";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { AnimatedGraphControls } from "@/components/graph/AnimatedGraphControls";
import { logger } from "@/lib/logger";
import { workerEventBus } from "@/lib/graph/events/broadcast-event-bus";
import { WorkerEventType } from "@/lib/graph/events/types";
import { FIT_VIEW_PRESETS } from "@/lib/graph/constants";
import { z } from "zod";

import "@xyflow/react/dist/style.css";

interface GraphNavigationProps {
  className?: string;
  style?: React.CSSProperties;
}

// Inner component that uses ReactFlow hooks
const GraphNavigationInner: React.FC<GraphNavigationProps> = ({ className, style }) => {
	const reactFlowInstance = useReactFlow();
	const containerRef = useRef<HTMLDivElement>(null);
	const contextMenuData = useContextMenu();
	const contextMenu = contextMenuData.contextMenu;
	const showContextMenu = contextMenuData.showContextMenu;
	const hideContextMenu = contextMenuData.hideContextMenu;


	// Store state
	const graphStore = useGraphStore();
	const setProvider = useCallback((provider: XYFlowProvider) => {
		graphStore.setProvider(provider);
	}, [graphStore]);
	const storeNodes = graphStore.nodes;
	const storeEdges = graphStore.edges;
	const isLoading = graphStore.isLoading;
	const error = graphStore.error;
	const visibleEntityTypes = graphStore.visibleEntityTypes;
	const visibleEdgeTypes = graphStore.visibleEdgeTypes;

	// Use direct selectors for raw store data to avoid computed array dependencies
	const rawNodesMap = useGraphStore((state) => state.nodes);
	const rawEdgesMap = useGraphStore((state) => state.edges);

	const layoutStore = useLayoutStore();
	const setPreviewEntity = useCallback((entityId: string | null) => {
		layoutStore.setPreviewEntity(entityId);
	}, [layoutStore]);
	const autoPinOnLayoutStabilization = layoutStore.autoPinOnLayoutStabilization;


	// XYFlow state - synced with store
	const [nodes, setNodes, onNodesChangeOriginal] = useNodesState<XYNode>([]);
	const initialEdges: XYEdge[] = [];
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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

	// Layout hook integration - throttled to reduce log spam
	const lastLogRef = useRef<number>(0);
	const onLayoutChange = useCallback(() => {
		// Layout positions have changed, re-sync if needed
		const now = Date.now();
		// Only log every 500ms to reduce spam
		if (now - lastLogRef.current > 500) {
			logger.debug("graph", "Layout positions updated", undefined, "GraphNavigation");
			lastLogRef.current = now;
		}

		// Notify provider to recalculate edge handles based on new positions
		if (providerRef.current) {
			providerRef.current.onNodePositionsChanged();
		}
	}, []);

	// Center the viewport on a node without moving the node's position
	const lastCenterOperationRef = useRef<{ nodeId: string; timestamp: number }>({ nodeId: "", timestamp: 0 });

	const centerOnNode = useCallback((nodeId: string, currentPosition?: { x: number; y: number }) => {
		// Throttle centering operations to prevent spam
		const now = Date.now();
		if (lastCenterOperationRef.current.nodeId === nodeId &&
		    (now - lastCenterOperationRef.current.timestamp) < 500) {
			return; // Skip if same node centered within last 500ms
		}

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
				logger.debug("ui", "Cannot center node - node not found", { nodeId }, "GraphNavigation");
				return;
			}

			targetX = targetNode.position.x;
			targetY = targetNode.position.y;
		}

		// Center the viewport on the node's current position without moving the node
		void reactFlowInstance.setCenter(targetX, targetY, {
			zoom: reactFlowInstance.getZoom(),
			duration: 400 // Reduced duration to prevent conflicts
		});

		// Update throttling tracker
		lastCenterOperationRef.current = { nodeId, timestamp: now };

		logger.debug("ui", "Centered viewport on node at its current position", {
			nodeId: nodeId,
			nodePosition: { x: targetX, y: targetY }
		}, "GraphNavigation");
	}, [reactFlowInstance]);

	// Use shared entity interaction logic with centerOnNode function
	const entityInteraction = useEntityInteraction(centerOnNode);
	const baseHandleGraphNodeClick = entityInteraction.handleGraphNodeClick;
	const handleGraphNodeDoubleClick = entityInteraction.handleGraphNodeDoubleClick;

	// Custom graph node single click handler that includes URL hash updates
	const handleGraphNodeClick = useCallback(async (node: GraphNode) => {
		// Use shared entity interaction logic for single click (no expansion)
		await baseHandleGraphNodeClick(node);

		// Handle URL hash update locally (not in shared hook)
		const cleanId = EntityDetector.extractOpenAlexId(node.entityId);
		const newHashPath = `#/${node.type}/${cleanId}`;

		// Set programmatic navigation flag to prevent hashchange handler loops
		isProgrammaticNavigationRef.current = true;
		window.history.pushState(null, "", newHashPath);

		setTimeout(() => {
			isProgrammaticNavigationRef.current = false;
		}, 10);

		logger.debug("graph", "Node single click completed - no expansion", {
			nodeId: node.id,
			entityId: node.entityId,
			type: node.type
		});
	}, [baseHandleGraphNodeClick]);

	// Custom graph node double click handler for expansion
	const handleGraphNodeDoubleClickWithHash = useCallback(async (node: GraphNode) => {
		// Use shared entity interaction logic for double click (with expansion)
		await handleGraphNodeDoubleClick(node);

		// Handle URL hash update locally (not in shared hook)
		const cleanId = EntityDetector.extractOpenAlexId(node.entityId);
		const newHashPath = `#/${node.type}/${cleanId}`;

		// Set programmatic navigation flag to prevent hashchange handler loops
		isProgrammaticNavigationRef.current = true;
		window.history.pushState(null, "", newHashPath);

		setTimeout(() => {
			isProgrammaticNavigationRef.current = false;
		}, 10);

		logger.debug("graph", "Node double click completed - expanded", {
			nodeId: node.id,
			entityId: node.entityId,
			type: node.type
		});
	}, [handleGraphNodeDoubleClick]);

	// Get animation state and functions from context
	const {
		isRunning,
		isAnimating,
		isPaused,
		progress,
		alpha,
		iteration,
		fps,
		performanceStats,
		isWorkerReady,
		restartLayout,
		applyLayout,
		pauseLayout,
		resumeLayout,
		stopLayout,
		canPause,
		canResume,
		canStop,
		canRestart
	} = useAnimatedLayoutContext();

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
				logger.debug("graph", "Container dimensions updated", { width, height }, "GraphNavigation");
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

		// Only create a new provider if we don't have one yet
		if (providerRef.current) {
			// Update existing provider with new event handlers
			const existingProvider = providerRef.current;
			existingProvider.setEvents({
				onNodeClick: (node: GraphNode) => {
					void handleGraphNodeClick(node);
				},
				onNodeDoubleClick: (node: GraphNode) => {
					void handleGraphNodeDoubleClickWithHash(node);
				},
				onNodeHover: (node: GraphNode | null) => {
					setPreviewEntity(node?.entityId || null);
				},
			});
			return;
		}

		const graphProvider = createGraphProvider("xyflow");
		// Type guard: we know createGraphProvider('xyflow') returns XYFlowProvider
		if (!(graphProvider instanceof XYFlowProvider)) {
			throw new Error("Expected XYFlowProvider instance");
		}
		providerRef.current = graphProvider;

		// Set up navigation events
		graphProvider.setEvents({
			onNodeClick: (node: GraphNode) => {
				// Single click: select, pin, center, update preview (no expansion)
				void handleGraphNodeClick(node);
			},

			onNodeDoubleClick: (node: GraphNode) => {
				// Double click: select, pin, center, update preview AND expand
				void handleGraphNodeDoubleClickWithHash(node);
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

		// Set the provider in the store (now safe with fixed selectors)
		const currentProvider = useGraphStore.getState().provider;
		if (currentProvider !== graphProvider) {
			setProvider(graphProvider);
		}

		return () => {
			graphProvider.destroy();
		};
	}, [reactFlowInstance, setPreviewEntity, autoPinOnLayoutStabilization, handleGraphNodeClick, handleGraphNodeDoubleClickWithHash, setProvider]);

	// Sync store data with XYFlow using incremental updates (applying visibility filters)
	useEffect(() => {
		// Compute visible nodes and edges inside effect to avoid dependency cycle
		const nodesList = Object.values(rawNodesMap).filter((node): node is NonNullable<typeof node> => node != null);
		const currentVisibleNodes = nodesList.filter(node => visibleEntityTypes[node.type]);

		const edgesList = Object.values(rawEdgesMap).filter((edge): edge is NonNullable<typeof edge> => edge != null);
		const currentVisibleEdges = edgesList.filter(edge => {
			// Both nodes must exist and be visible
			if (!(edge.source in rawNodesMap) || !(edge.target in rawNodesMap)) {
				return false;
			}
			const sourceNode = rawNodesMap[edge.source];
			const targetNode = rawNodesMap[edge.target];
			return sourceNode && targetNode &&
				visibleEntityTypes[sourceNode.type] &&
				visibleEntityTypes[targetNode.type] &&
				visibleEdgeTypes[edge.type];
		});

		// Get current node and edge IDs
		const currentNodeIds = new Set(currentVisibleNodes.map(n => n.id));
		const currentEdgeIds = new Set(currentVisibleEdges.map(e => e.id));

		// Find new nodes and edges
		const newNodeIds = new Set([...currentNodeIds].filter(id => !previousNodeIdsRef.current.has(id)));
		const newEdgeIds = new Set([...currentEdgeIds].filter(id => !previousEdgeIdsRef.current.has(id)));

		// Find removed nodes and edges
		const removedNodeIds = new Set([...previousNodeIdsRef.current].filter(id => !currentNodeIds.has(id)));
		const removedEdgeIds = new Set([...previousEdgeIdsRef.current].filter(id => !currentEdgeIds.has(id)));

		// Updated nodes are detected by store changes - we trust the store as source of truth
		// No need to compare with current XYFlow nodes, just rebuild them from store data
		const updatedNodeIds = new Set<string>();

		// Only log when there are actual changes to avoid spam
		if (newNodeIds.size || newEdgeIds.size || updatedNodeIds.size || removedNodeIds.size || removedEdgeIds.size) {
			logger.debug("graph", "Store data incremental sync effect triggered", {
				totalNodeCount: Object.keys(storeNodes).length,
				totalEdgeCount: Object.keys(storeEdges).length,
				visibleNodeCount: currentVisibleNodes.length,
				visibleEdgeCount: currentVisibleEdges.length,
				newNodes: newNodeIds.size,
				newEdges: newEdgeIds.size,
				updatedNodes: updatedNodeIds.size,
				removedNodes: removedNodeIds.size,
				removedEdges: removedEdgeIds.size,
				hasProvider: !!providerRef.current
			}, "GraphNavigation");
		}

		if (providerRef.current && (newNodeIds.size || newEdgeIds.size || updatedNodeIds.size || removedNodeIds.size || removedEdgeIds.size)) {
			// Special case: If we have no previous nodes, this is initial load - use setNodes/setEdges
			if (previousNodeIdsRef.current.size === 0 && previousEdgeIdsRef.current.size === 0) {
				providerRef.current.setNodes(currentVisibleNodes);
				providerRef.current.setEdges(currentVisibleEdges);
			} else {
				// Use incremental provider methods for updates
				if (newNodeIds.size) {
					const newNodes = currentVisibleNodes.filter(n => newNodeIds.has(n.id));
					providerRef.current.addNodes(newNodes);
				}

				if (newEdgeIds.size) {
					const newEdges = currentVisibleEdges.filter(e => newEdgeIds.has(e.id));
					providerRef.current.addEdges(newEdges);
				}

				if (removedNodeIds.size) {
					providerRef.current.removeNodes(Array.from(removedNodeIds));
				}

				// Note: Node updates will be handled by ReactFlow changes below
				if (updatedNodeIds.size) {
					const updatedNodes = currentVisibleNodes.filter(n => updatedNodeIds.has(n.id));
					logger.debug("graph", "Detected existing nodes with updated data", {
						updatedNodeCount: updatedNodes.length,
						updatedNodeIds: Array.from(updatedNodeIds),
						updatedLabels: updatedNodes.map(n => ({ id: n.id, label: n.label }))
					}, "GraphNavigation");
				}

				if (removedNodeIds.size) {
					providerRef.current.removeNodes(Array.from(removedNodeIds));
				}

				if (removedEdgeIds.size) {
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
				if (nodeChanges.length) {
					setNodes(prevNodes => applyNodeChanges(nodeChanges, prevNodes));
				}

				if (edgeChanges.length) {
					setEdges(prevEdges => applyEdgeChanges(edgeChanges, prevEdges));
				}
			}

			logger.debug("graph", "Applied incremental XYFlow changes", {
				addedNodes: Array.from(newNodeIds),
				addedEdges: Array.from(newEdgeIds),
				removedNodes: Array.from(removedNodeIds),
				removedEdges: Array.from(removedEdgeIds)
			}, "GraphNavigation");

			// Sync full state to ensure positions are updated in UI
			const { nodes: xyNodes, edges: xyEdges } = providerRef.current.getXYFlowData();
			setNodes(xyNodes);
			setEdges(xyEdges);

			// Restart layout simulation when new nodes are added to include them in positioning
			if (newNodeIds.size) {
				// Add a small delay to ensure React state updates are complete
				setTimeout(() => {
					restartLayoutRef.current(); // Full restart to include new nodes in D3 simulation
					logger.debug("graph", "Restarting layout due to new nodes", {
						newNodeCount: newNodeIds.size
					}, "GraphNavigation");
				}, 50); // 50ms delay to allow React state to settle
			}
		}

		// Sync positions from store to XYFlow nodes
		const positionChanges: NodeChange<XYNode>[] = currentVisibleNodes.map((node): NodeChange<XYNode> => ({
			id: node.id,
			type: "position" as const,
			position: node.position,
		}));

		if (positionChanges.length > 0) {
			setNodes(nds => applyNodeChanges(positionChanges, nds));
			logger.debug("graph", "Synced positions from store to XYFlow", { syncedCount: positionChanges.length }, "GraphNavigation");
		}

		// Update refs for next comparison
		previousNodeIdsRef.current = currentNodeIds;
		previousEdgeIdsRef.current = currentEdgeIds;
	}, [rawNodesMap, rawEdgesMap, visibleEntityTypes, visibleEdgeTypes, setNodes, setEdges, storeNodes, storeEdges]);

	// Consolidated listener for worker position updates: apply to both XYFlow and store
	useEffect(() => {
		// Register listener for worker position updates

		const handleProgress = (message: unknown) => {
			logger.debug("graph", "FORCE_SIMULATION_PROGRESS received", { message }); // Log payload for validation

			if (
				typeof message === "object" &&
				message !== null &&
				"eventType" in message &&
				message.eventType === WorkerEventType.FORCE_SIMULATION_PROGRESS &&
				"payload" in message &&
				message.payload !== null &&
				typeof message.payload === "object" &&
				"messageType" in message.payload &&
				message.payload.messageType === "tick" &&
				"positions" in message.payload &&
				Array.isArray(message.payload.positions)
			) {
				const positions = message.payload.positions;
				if (!Array.isArray(positions)) return;
				logger.debug("graph", "Valid tick payload", { count: positions.length, sample: positions.slice(0, 3) });

				// Zod schema for position validation
				const PositionSchema = z.object({
					id: z.string().min(1),
					x: z.number(),
					y: z.number(),
				});

				// Validate positions using zod
				const validPositions = positions.filter((pos) => {
					const result = PositionSchema.safeParse(pos);
					return result.success;
				}).map((pos) => PositionSchema.parse(pos));

				if (validPositions.length !== positions.length) {
					logger.warn("graph", "Invalid positions filtered", {
						original: positions.length,
						valid: validPositions.length
					});
				}

				if (validPositions.length > 0) {
					// Update XYFlow nodes
					const positionChanges: NodeChange<XYNode>[] = validPositions.map(pos => ({
						id: pos.id,
						type: "position" as const,
						position: { x: pos.x, y: pos.y },
					}));

					const newNodes = applyNodeChanges(positionChanges, nodes);
					setNodes(newNodes);
					logger.debug("graph", "Applied position changes to XYFlow", {
						applied: positionChanges.length,
						newNodesLength: newNodes.length
					});

					// Update graph store
					const store = useGraphStore.getState();
					validPositions.forEach((pos) => {
						if (store.nodes[pos.id]) {
							store.updateNode(pos.id, { position: { x: pos.x, y: pos.y } });
						}
					});
					logger.debug("graph", "Updated positions in graph store", { count: validPositions.length });
				}
			} else {
				logger.warn("graph", "Invalid FORCE_SIMULATION_PROGRESS payload", { message });
			}
		};

		const listenerId = workerEventBus.listen(WorkerEventType.FORCE_SIMULATION_PROGRESS, handleProgress);
		logger.debug("graph", "Registered consolidated FORCE_SIMULATION_PROGRESS handler", { listenerId });

		return () => {
			workerEventBus.removeListener(listenerId);
			logger.debug("graph", "Unregistered FORCE_SIMULATION_PROGRESS handler", { listenerId });
		};
	}, [setNodes, nodes]); // Depend on nodes to re-apply if needed

	// Combined URL state synchronization and browser history navigation
	const lastHashProcessedRef = useRef<string>("");
	const nodeCountRef = useRef<number>(0);

	// Stable reference to node count to avoid dependency array issues
	const storeNodeCount = Object.keys(storeNodes).length;

	useEffect(() => {
		// Only process when nodes are available and hash has changed
		const currentNodeCount = storeNodeCount;
		const currentHash = window.location.hash;

		// Skip if no nodes or same hash already processed
		if (currentNodeCount === 0 || lastHashProcessedRef.current === currentHash) {
			return;
		}

		// Skip if this is a programmatic navigation to avoid duplicate processing
		if (isProgrammaticNavigationRef.current) {
			return;
		}

		const processHashChange = () => {
			if (currentHash && currentHash !== "#/") {
				// Parse hash (format: "#/entityType/entityId")
				const hashPath = currentHash.substring(1); // Remove the '#'
				const pathParts = hashPath.split("/").filter(part => part.length > 0);

				if (pathParts.length >= 2) {
					const [entityType, entityId] = pathParts;

					// Find the corresponding node in the graph
					const matchingNode = Object.values(storeNodes).filter((node): node is NonNullable<typeof node> => node != null).find(node => {
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
						if (!autoPinOnLayoutStabilization) {
							store.clearAllPinnedNodes(); // Clear previous pinned nodes
						}
						store.pinNode(matchingNode.id);

						// Update preview in sidebar
						setPreviewEntity(matchingNode.entityId);

						// Smoothly animate the selected node to the center of the viewport
						centerOnNode(matchingNode.id, matchingNode.position);

						logger.debug("graph", "Selected and auto-centered entity from hash URL", {
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

		// Only run on initial load or when node count increases (new nodes added)
		if (nodeCountRef.current === 0 || currentNodeCount > nodeCountRef.current) {
			processHashChange();
		}

		lastHashProcessedRef.current = currentHash;
		nodeCountRef.current = currentNodeCount;
	}, [storeNodeCount, storeNodes, setPreviewEntity, centerOnNode, autoPinOnLayoutStabilization]);

	// Browser history navigation (back/forward button support for hash routing)
	useEffect(() => {
		const handleHashChange = () => {
			// Skip if this is a programmatic navigation to avoid duplicate processing
			if (isProgrammaticNavigationRef.current) {
				return;
			}

			lastHashProcessedRef.current = ""; // Reset to force processing
		};

		// Listen for hash changes (browser back/forward, manual hash changes)
		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	// Handle node clicks
	const onNodeClick = useCallback((event: React.MouseEvent, node: XYNode) => {
		if (providerRef.current) {
			providerRef.current.handleNodeClick(event, node);
		}
	}, []);

	// Handle node double clicks
	const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: XYNode) => {
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

	// Handle node right-click for context menu
	const onNodeContextMenu = useCallback((event: React.MouseEvent, node: XYNode) => {
		event.preventDefault();
		if (providerRef.current) {
			// Type guards for node data properties
			const isValidString = (value: unknown): value is string =>
				typeof value === "string" && value.length > 0;

			const isValidEntityType = (value: unknown): value is EntityType =>
				typeof value === "string" &&
				["works", "authors", "sources", "institutions", "topics", "concepts", "publishers", "funders", "keywords"].includes(value);

			const isExternalIdentifier = (item: unknown): item is ExternalIdentifier => {
				if (!item || typeof item !== "object" || item === null) return false;

				// Check for required properties using type predicate approach
				if (!("type" in item) || !("value" in item) || !("url" in item)) return false;

				// Type narrowing with safe property access
				const hasRequiredProps = (obj: object): obj is Record<"type" | "value" | "url", unknown> => {
					return "type" in obj && "value" in obj && "url" in obj;
				};

				if (!hasRequiredProps(item)) return false;

				if (typeof item.type !== "string" || typeof item.value !== "string" || typeof item.url !== "string") {
					return false;
				}

				// Validate specific enum values for type
				return ["doi", "orcid", "issn_l", "ror", "wikidata"].includes(item.type);
			};

			const isValidExternalIds = (value: unknown): value is ExternalIdentifier[] =>
				Array.isArray(value) && value.every(isExternalIdentifier);

			// Validate all required properties
			if (isValidString(node.data.entityId) &&
			    isValidEntityType(node.data.entityType) &&
			    isValidString(node.data.label)) {

				const externalIds = isValidExternalIds(node.data.externalIds)
					? node.data.externalIds
					: [];

				// Convert XYFlow node back to GraphNode for context menu
				const graphNode: GraphNode = {
					id: node.id,
					entityId: node.data.entityId,
					type: node.data.entityType,
					label: node.data.label,
					position: node.position,
					externalIds
				};
				showContextMenu(graphNode, event);
			}
		}
	}, [showContextMenu]);

	// Repository drag and drop handlers

	const handleDrop = useCallback((event: React.DragEvent) => {
		event.preventDefault();

		try {
			const transferData = event.dataTransfer.getData("application/json");
			if (!transferData) {
				logger.warn("graph", "No data in drop event", {}, "GraphNavigation");
				return;
			}

			const parsed: unknown = JSON.parse(transferData);

			const isGraphNode = (value: unknown): value is GraphNode => {
				if (!value || typeof value !== "object" || value === null) return false;

				const requiredProps = ["id", "type", "label", "entityId", "position", "externalIds"];
				for (const prop of requiredProps) {
					if (!(prop in value)) return false;
				}

				// Type narrowing with safe property access
				const hasGraphNodeProps = (obj: object): obj is Record<"id" | "type" | "label" | "entityId" | "position" | "externalIds", unknown> => {
					return "id" in obj && "type" in obj && "label" in obj && "entityId" in obj && "position" in obj && "externalIds" in obj;
				};

				if (!hasGraphNodeProps(value)) return false;

				return typeof value.id === "string" &&
					typeof value.type === "string" &&
					typeof value.label === "string" &&
					typeof value.entityId === "string" &&
					typeof value.position === "object" && value.position !== null &&
					Array.isArray(value.externalIds);
			};

			const isGraphEdge = (value: unknown): value is GraphEdge => {
				if (!value || typeof value !== "object" || value === null) return false;

				const requiredProps = ["id", "source", "target", "type"];
				for (const prop of requiredProps) {
					if (!(prop in value)) return false;
				}

				// Type narrowing with safe property access
				const hasGraphEdgeProps = (obj: object): obj is Record<"id" | "source" | "target" | "type", unknown> => {
					return "id" in obj && "source" in obj && "target" in obj && "type" in obj;
				};

				if (!hasGraphEdgeProps(value)) return false;

				return typeof value.id === "string" &&
					typeof value.source === "string" &&
					typeof value.target === "string" &&
					typeof value.type === "string";
			};

			// Type guard for drop data structure
			const isValidDropData = (value: unknown): value is { type: string; node?: GraphNode; edge?: GraphEdge } => {
				if (!value || typeof value !== "object" || value === null) return false;
				if (!("type" in value)) return false;

				// Type narrowing with safe property access
				const hasDropDataProps = (obj: object): obj is Record<"type" | "node" | "edge", unknown> => {
					return "type" in obj;
				};

				if (!hasDropDataProps(value)) return false;

				if (typeof value.type !== "string") return false;

				// Check optional node property
				if ("node" in value && value.node !== undefined && !isGraphNode(value.node)) {
					return false;
				}

				// Check optional edge property
				if ("edge" in value && value.edge !== undefined && !isGraphEdge(value.edge)) {
					return false;
				}

				return true;
			};

			if (!isValidDropData(parsed)) {
				logger.warn("graph", "Invalid drop data format", { data: typeof parsed }, "GraphNavigation");
				return;
			}

			const dropData = parsed;
			const { type } = dropData;

			if (type === "repository-node" && dropData.node) {
				const node = dropData.node;

				// Get drop position relative to the flow
				const reactFlowBounds = containerRef.current?.getBoundingClientRect();
				if (!reactFlowBounds) {
					logger.warn("graph", "Could not get ReactFlow bounds for drop", {}, "GraphNavigation");
					return;
				}

				const position = reactFlowInstance.screenToFlowPosition({
					x: event.clientX - reactFlowBounds.left,
					y: event.clientY - reactFlowBounds.top,
				});

				// Update node position and add to graph
				const updatedNode = {
					...node,
					position
				};

				// Add to main graph
				const store = useGraphStore.getState();
				store.addNodes([updatedNode]);

				logger.debug("graph", "Added repository node to graph via drag-drop", {
					nodeId: node.id,
					nodeType: node.type,
					position
				});

			} else if (type === "repository-edge" && dropData.edge) {
				const edge = dropData.edge;

				// Add to main graph
				const store = useGraphStore.getState();
				store.addEdges([edge]);

				logger.debug("graph", "Added repository edge to graph via drag-drop", {
					edgeId: edge.id,
					edgeType: edge.type,
					source: edge.source,
					target: edge.target
				});
			}

		} catch (error) {
			logger.error("graph", "Failed to handle repository drop", {
				error: error instanceof Error ? error.message : "Unknown error"
			}, "GraphNavigation");
		}
	}, [reactFlowInstance]);

	const handleDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	}, []);

	// Loading state - only show full loading screen if there are no existing nodes
	// This prevents the loading screen from showing during incremental expansions
	if (isLoading && !Object.keys(storeNodes).length) {
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
		const errorMessage: string = error;

		return (
			<div className={className} style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				height: "100%",
				background: "#f8f9fa",
				color: "#e74c3c"
			}}>
				<div>Error loading graph: {errorMessage}</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={className}
			style={{ width: "100%", height: "100%", ...style }}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
		>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onNodeClick={onNodeClick}
				onNodeDoubleClick={onNodeDoubleClick}
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
				{nodes.length > 0 && (
					<Panel position="top-right">
						<GraphToolbar />
					</Panel>
				)}

				{/* RE-ENABLED with infinite loop fix */}
				{nodes.length > 0 && (
					<Panel position="bottom-left">
						<AnimatedGraphControls
							enabled={true}
							onLayoutChange={onLayoutChange}
							fitViewAfterLayout={true}
							containerDimensions={containerDimensions}
							// Pass animation state and actions from context
							isRunning={isRunning}
							isAnimating={isAnimating}
							isPaused={isPaused}
							progress={progress}
							alpha={alpha}
							iteration={iteration}
							fps={fps}
							performanceStats={performanceStats}
							isWorkerReady={isWorkerReady}
							applyLayout={applyLayout}
							stopLayout={stopLayout}
							pauseLayout={pauseLayout}
							resumeLayout={resumeLayout}
							restartLayout={restartLayout}
							canPause={canPause}
							canResume={canResume}
							canStop={canStop}
							canRestart={canRestart}
						/>
					</Panel>
				)}


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

			{/* Data fetching progress indicators */}
			{/* Temporarily disabled to fix infinite loop */}
			{/* <DataFetchingProgress
				activeRequests={activeRequests}
				workerReady={workerReady}
			/> */}

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

// Main component wrapped in ReactFlowProvider and AnimatedLayoutProvider
export const GraphNavigation: React.FC<GraphNavigationProps> = (props) => {
	return (
		<ReactFlowProvider>
			<AnimatedLayoutProvider
				enabled={true}
				fitViewAfterLayout={true}
				autoStartOnNodeChange={true}
			>
				<GraphNavigationInner {...props} />
			</AnimatedLayoutProvider>
		</ReactFlowProvider>
	);
};
