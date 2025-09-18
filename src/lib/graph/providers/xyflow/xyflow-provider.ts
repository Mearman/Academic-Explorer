/**
 * XYFlow implementation of the GraphProvider interface
 * Provides XYFlow-specific rendering while maintaining provider abstraction
 */

import {
	Node as XYNode,
	Edge as XYEdge,
	ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
	GraphProvider,
	GraphNode,
	GraphEdge,
	GraphLayout,
	GraphEvents,
	GraphSnapshot,
	EntityType
} from "../../types";
import { RelationType } from "../../types";

import { logger } from "@/lib/logger";
import { FIT_VIEW_PRESETS } from "../../constants";

export class XYFlowProvider implements GraphProvider {
	private container: HTMLElement | null = null;
	private nodes: Map<string, GraphNode> = new Map();
	private edges: Map<string, GraphEdge> = new Map();
	private events: GraphEvents = {};
	private reactFlowInstance: ReactFlowInstance | null = null;
	private mounted = false;
	private recalculateTimeout: ReturnType<typeof setTimeout> | null = null;

	// Convert generic GraphNode to XYFlow node
	private toXYNode(node: GraphNode): XYNode {
		// Validate position coordinates and provide safe defaults for NaN values
		const safePosition = {
			x: Number.isFinite(node.position.x) ? node.position.x : 0,
			y: Number.isFinite(node.position.y) ? node.position.y : 0,
		};

		// Log warning if NaN values were detected and corrected
		if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
			logger.warn("graph", "NaN position detected and corrected", {
				nodeId: node.id,
				originalPosition: node.position,
				correctedPosition: safePosition,
			});
		}

		return {
			id: node.id,
			type: "custom",
			position: safePosition,
			zIndex: 1, // Ensure nodes are below edges
			data: {
				label: node.label,
				entityId: node.entityId,
				entityType: node.type,
				externalIds: node.externalIds,
				entityData: node.entityData,
				// Pin state is read directly from store in components, not stored in node data
			},
		};
	}

	// Convert generic GraphEdge to XYFlow edge
	private toXYEdge(edge: GraphEdge): XYEdge {
		// Calculate shortest distance handles based on current node positions
		const { sourceHandle, targetHandle } = this.calculateShortestHandles(edge.source, edge.target);

		return {
			id: edge.id,
			source: edge.source,
			target: edge.target,
			sourceHandle,
			targetHandle,
			type: "smart", // Use smart edge for automatic handle connection
			label: edge.label,
			zIndex: -1, // Edges behind nodes
			data: {
				label: edge.label,
				...(edge.metadata || {})
			},
			style: {
				stroke: this.getEdgeColor(edge.type),
				strokeWidth: edge.weight ? Math.max(1, edge.weight * 3) : 1,
			},
			animated: edge.type === RelationType.REFERENCES,
		};
	}

	// Recalculate all edge handles based on current node positions
	private recalculateEdgeHandles(): void {
		if (!this.reactFlowInstance) return;

		const currentEdges = this.reactFlowInstance.getEdges();
		const updatedEdges = currentEdges.map(edge => {
			// Recalculate handles for this edge
			const { sourceHandle, targetHandle } = this.calculateShortestHandles(edge.source, edge.target);

			// Only update if handles have changed
			if (edge.sourceHandle !== sourceHandle || edge.targetHandle !== targetHandle) {
				return {
					...edge,
					sourceHandle,
					targetHandle
				};
			}
			return edge;
		});

		// Update edges if any changed
		const hasChanges = updatedEdges.some((edge, index) =>
			edge.sourceHandle !== currentEdges[index].sourceHandle ||
			edge.targetHandle !== currentEdges[index].targetHandle
		);

		if (hasChanges) {
			this.reactFlowInstance.setEdges(updatedEdges);
			logger.debug("graph", "DynamicFloatingEdge: Recalculated handles after layout change (legacy fallback)");
		}
	}

	// Throttled version of handle recalculation to avoid excessive calls
	private scheduleHandleRecalculation(): void {
		if (this.recalculateTimeout) {
			clearTimeout(this.recalculateTimeout);
		}

		this.recalculateTimeout = setTimeout(() => {
			this.recalculateEdgeHandles();
			this.recalculateTimeout = null;
		}, 100); // Debounce by 100ms
	}

	// Public method that can be called when nodes change position
	public onNodePositionsChanged(): void {
		this.scheduleHandleRecalculation();
	}

	// Calculate the shortest distance between nodes and return optimal handle IDs
	private calculateShortestHandles(sourceId: string, targetId: string): { sourceHandle: string; targetHandle: string } {
		// Get current node positions from React Flow instance if available
		let sourceNode = this.nodes.get(sourceId);
		let targetNode = this.nodes.get(targetId);

		// Try to get updated positions from React Flow instance
		if (this.reactFlowInstance) {
			const currentNodes = this.reactFlowInstance.getNodes();
			const currentSourceNode = currentNodes.find(n => n.id === sourceId);
			const currentTargetNode = currentNodes.find(n => n.id === targetId);

			if (currentSourceNode && sourceNode) {
				sourceNode = { ...sourceNode, position: currentSourceNode.position };
			}
			if (currentTargetNode && targetNode) {
				targetNode = { ...targetNode, position: currentTargetNode.position };
			}
		}

		if (!sourceNode || !targetNode) {
			logger.debug("graph", "DynamicFloatingEdge: Missing nodes for edge calculation (legacy fallback)", { sourceId, targetId });
			return { sourceHandle: "right-source", targetHandle: "left" };
		}

		// Validate source and target positions, use safe defaults for NaN values
		const safeSourcePosition = {
			x: Number.isFinite(sourceNode.position.x) ? sourceNode.position.x : 0,
			y: Number.isFinite(sourceNode.position.y) ? sourceNode.position.y : 0,
		};
		const safeTargetPosition = {
			x: Number.isFinite(targetNode.position.x) ? targetNode.position.x : 0,
			y: Number.isFinite(targetNode.position.y) ? targetNode.position.y : 0,
		};

		// Log warnings if NaN positions were corrected
		if (!Number.isFinite(sourceNode.position.x) || !Number.isFinite(sourceNode.position.y)) {
			logger.warn("graph", "NaN source position detected in edge calculation", {
				sourceId,
				originalPosition: sourceNode.position,
				correctedPosition: safeSourcePosition,
			});
		}
		if (!Number.isFinite(targetNode.position.x) || !Number.isFinite(targetNode.position.y)) {
			logger.warn("graph", "NaN target position detected in edge calculation", {
				targetId,
				originalPosition: targetNode.position,
				correctedPosition: safeTargetPosition,
			});
		}

		// Estimate node dimensions (these should match the actual rendered sizes)
		const nodeWidth = 160;  // Based on minWidth/maxWidth from custom nodes
		const nodeHeight = 120; // Estimated height including content

		// Calculate handle positions (center of each side) using safe positions
		const sourceHandles = {
			"top-source": { x: safeSourcePosition.x + nodeWidth/2, y: safeSourcePosition.y },
			"right-source": { x: safeSourcePosition.x + nodeWidth, y: safeSourcePosition.y + nodeHeight/2 },
			"bottom-source": { x: safeSourcePosition.x + nodeWidth/2, y: safeSourcePosition.y + nodeHeight },
			"left-source": { x: safeSourcePosition.x, y: safeSourcePosition.y + nodeHeight/2 }
		};

		const targetHandles = {
			"top": { x: safeTargetPosition.x + nodeWidth/2, y: safeTargetPosition.y },
			"right": { x: safeTargetPosition.x + nodeWidth, y: safeTargetPosition.y + nodeHeight/2 },
			"bottom": { x: safeTargetPosition.x + nodeWidth/2, y: safeTargetPosition.y + nodeHeight },
			"left": { x: safeTargetPosition.x, y: safeTargetPosition.y + nodeHeight/2 }
		};

		// Find the shortest distance combination
		let shortestDistance = Infinity;
		let bestSourceHandle = "right-source";
		let bestTargetHandle = "left";

		Object.entries(sourceHandles).forEach(([sourceHandleId, sourcePos]) => {
			Object.entries(targetHandles).forEach(([targetHandleId, targetPos]) => {
				const distance = Math.sqrt(
					Math.pow(targetPos.x - sourcePos.x, 2) +
					Math.pow(targetPos.y - sourcePos.y, 2)
				);

				if (distance < shortestDistance) {
					shortestDistance = distance;
					bestSourceHandle = sourceHandleId;
					bestTargetHandle = targetHandleId;
				}
			});
		});

		return {
			sourceHandle: bestSourceHandle,
			targetHandle: bestTargetHandle
		};
	}

	// Get color for entity type
	private getEntityColor(entityType: EntityType): string {
		switch (entityType) {
			case "works":
				return "#e74c3c";
			case "authors":
				return "#3498db";
			case "sources":
				return "#2ecc71";
			case "institutions":
				return "#f39c12";
			case "topics":
				return "#9b59b6";
			case "publishers":
				return "#1abc9c";
			case "funders":
				return "#e67e22";
			default:
				return "#95a5a6";
		}
	}

	// Get color for edge type
	private getEdgeColor(relationType: string): string {
		// Log all edge types for debugging
		logger.debug("graph", "Edge color mapping", {
			relationType,
			mappedColor: this.getMappedEdgeColor(relationType)
		});

		return this.getMappedEdgeColor(relationType);
	}

	private getMappedEdgeColor(relationType: string): string {
		switch (relationType) {
			case "authored":
				return "#3498db"; // Blue
			case "cited":
				return "#e74c3c"; // Red
			case "affiliated":
				return "#f39c12"; // Orange
			case "published_in":
				return "#2ecc71"; // Green
			case "funded_by":
				return "#e67e22"; // Orange
			case "references": // Additional relationship type
				return "#e74c3c"; // Red (same as cited)
			case "cites": // Alternative citation naming
				return "#e74c3c"; // Red
			case "published_by": // Alternative publishing relationship
				return "#2ecc71"; // Green
			case "part_of": // Institutional hierarchy
				return "#f39c12"; // Orange
			default:
				// Log unmapped relationship types to identify missing mappings
				logger.warn("graph", "Unmapped edge relationship type - using default grey", {
					relationType,
					defaultColor: "#95a5a6"
				});
				return "#95a5a6"; // Grey
		}
	}

	async initialize(container: HTMLElement): Promise<void> {
		this.container = container;
		this.mounted = true;

		// XYFlow will be rendered by the React component
		// This method just sets up the container reference
		return Promise.resolve();
	}

	destroy(): void {
		this.mounted = false;
		this.container = null;
		this.reactFlowInstance = null;
	}

	setNodes(nodes: GraphNode[]): void {
		this.nodes.clear();
		nodes.forEach(node => this.nodes.set(node.id, node));
		this.updateReactFlow();
	}

	setEdges(edges: GraphEdge[]): void {
		this.edges.clear();
		edges.forEach(edge => this.edges.set(edge.id, edge));
		this.updateReactFlow();
	}

	addNode(node: GraphNode): void {
		this.nodes.set(node.id, node);
		this.updateReactFlow();

		// Layout will be applied explicitly by the service layer when needed
		// Automatic re-layout on individual node addition causes cascading effects
	}


	addEdge(edge: GraphEdge): void {
		this.edges.set(edge.id, edge);
		this.updateReactFlow();

		// Layout will be applied explicitly by the service layer when needed
		// Automatic re-layout on individual edge addition causes cascading effects
	}

	// Incremental methods for adding multiple nodes without clearing existing data
	addNodes(nodes: GraphNode[]): void {
		nodes.forEach(node => this.nodes.set(node.id, node));
		// Note: updateReactFlow is a no-op, actual updates handled in React component
	}

	// Incremental methods for adding multiple edges without clearing existing data
	addEdges(edges: GraphEdge[]): void {
		edges.forEach(edge => this.edges.set(edge.id, edge));
		// Note: updateReactFlow is a no-op, actual updates handled in React component
	}

	// Remove multiple nodes and their connected edges
	removeNodes(nodeIds: string[]): void {
		nodeIds.forEach(nodeId => {
			this.nodes.delete(nodeId);
			// Also remove connected edges
			Array.from(this.edges.values()).forEach(edge => {
				if (edge.source === nodeId || edge.target === nodeId) {
					this.edges.delete(edge.id);
				}
			});
		});
	}

	// Remove multiple edges
	removeEdges(edgeIds: string[]): void {
		edgeIds.forEach(edgeId => this.edges.delete(edgeId));
	}

	// Get XYFlow data for specific nodes only
	getXYFlowDataForNodes(nodeIds: string[]): { nodes: XYNode[]; edges: XYEdge[] } {
		const requestedNodes = nodeIds
			.map(id => this.nodes.get(id))
			.filter((node): node is GraphNode => node !== undefined)
			.map(node => this.toXYNode(node));

		// Get edges that connect to any of the requested nodes
		const relevantEdges = Array.from(this.edges.values())
			.filter(edge => nodeIds.includes(edge.source) || nodeIds.includes(edge.target))
			.map(edge => this.toXYEdge(edge));

		return {
			nodes: requestedNodes,
			edges: relevantEdges
		};
	}

	// Get XYFlow data for specific edges only
	getXYFlowDataForEdges(edgeIds: string[]): { nodes: XYNode[]; edges: XYEdge[] } {
		const requestedEdges = edgeIds
			.map(id => this.edges.get(id))
			.filter((edge): edge is GraphEdge => edge !== undefined)
			.map(edge => this.toXYEdge(edge));

		// No nodes needed for edge-only data
		return {
			nodes: [],
			edges: requestedEdges
		};
	}

	removeNode(nodeId: string): void {
		this.nodes.delete(nodeId);
		// Also remove connected edges
		Array.from(this.edges.values()).forEach(edge => {
			if (edge.source === nodeId || edge.target === nodeId) {
				this.edges.delete(edge.id);
			}
		});
		this.updateReactFlow();
	}

	removeEdge(edgeId: string): void {
		this.edges.delete(edgeId);
		this.updateReactFlow();
	}

	updateNode(nodeId: string, updates: Partial<GraphNode>): void {
		const existingNode = this.nodes.get(nodeId);
		if (existingNode) {
			const updatedNode = { ...existingNode, ...updates };
			this.nodes.set(nodeId, updatedNode);
			this.updateReactFlow();
		}
	}

	clear(): void {
		this.nodes.clear();
		this.edges.clear();
		this.updateReactFlow();
	}

	applyLayout(layout: GraphLayout): void {
		// Layout is now handled by the unified useLayout hook in the React component
		// This method is kept for interface compatibility but delegates to the hook
		logger.debug("graph", "Layout application delegated to useLayout hook", { layoutType: layout.type }, "XYFlowProvider");
	}

	fitView(): void {
		if (this.reactFlowInstance) {
			void this.reactFlowInstance.fitView(FIT_VIEW_PRESETS.DEFAULT);
		}
	}

	center(nodeId?: string): void {
		if (!this.reactFlowInstance) return;

		if (nodeId && this.nodes.has(nodeId)) {
			const node = this.nodes.get(nodeId);
			if (node) {
				void this.reactFlowInstance.setCenter(node.position.x, node.position.y, { zoom: 1.5 });
			}
		} else {
			this.fitView();
		}
	}

	setEvents(events: GraphEvents): void {
		this.events = events;
	}

	highlightNode(nodeId: string): void {
		// Implementation would update node styling
		const node = this.nodes.get(nodeId);
		if (node && this.reactFlowInstance) {
			// Update node highlight state
			this.updateReactFlow();
		}
	}

	highlightPath(): void {
		// Implementation would highlight nodes and edges in path
		if (this.reactFlowInstance) {
			// Update highlighting for path
			this.updateReactFlow();
		}
	}

	clearHighlights(): void {
		// Clear all highlights
		if (this.reactFlowInstance) {
			this.updateReactFlow();
		}
	}

	getSnapshot(): GraphSnapshot {
		const viewport = this.reactFlowInstance?.getViewport();

		return {
			nodes: Array.from(this.nodes.values()),
			edges: Array.from(this.edges.values()),
			viewport: viewport ? {
				zoom: viewport.zoom,
				center: { x: viewport.x, y: viewport.y }
			} : undefined,
		};
	}

	loadSnapshot(snapshot: GraphSnapshot): void {
		this.setNodes(snapshot.nodes);
		this.setEdges(snapshot.edges);

		if (snapshot.viewport && this.reactFlowInstance) {
			void this.reactFlowInstance.setViewport({
				x: snapshot.viewport.center.x,
				y: snapshot.viewport.center.y,
				zoom: snapshot.viewport.zoom,
			});
		}
	}


	private updateReactFlow(): void {
		// This will be called by the React component to trigger re-renders
		// The actual update happens through React state management
	}

	// Get current XYFlow-compatible data
	getXYFlowData(): { nodes: XYNode[]; edges: XYEdge[] } {
		return {
			nodes: Array.from(this.nodes.values()).map(node => this.toXYNode(node)),
			edges: Array.from(this.edges.values()).map(edge => this.toXYEdge(edge)),
		};
	}

	// Set ReactFlow instance reference (called by React component)
	setReactFlowInstance(instance: ReactFlowInstance | null): void {
		this.reactFlowInstance = instance;
	}

	// Handle node click (called by React component)
	handleNodeClick = (event: React.MouseEvent, xyNode: XYNode): void => {
		const node = this.nodes.get(xyNode.id);
		if (node && this.events.onNodeClick) {
			this.events.onNodeClick(node);
		}
	};

	// Handle node hover (called by React component)
	handleNodeHover = (event: React.MouseEvent, xyNode: XYNode | null): void => {
		const node = xyNode ? this.nodes.get(xyNode.id) : null;
		if (this.events.onNodeHover) {
			this.events.onNodeHover(node || null);
		}
	};

	// Handle node double click (called by React component)
	handleNodeDoubleClick = (event: React.MouseEvent, xyNode: XYNode): void => {
		const node = this.nodes.get(xyNode.id);
		if (node && this.events.onNodeDoubleClick) {
			this.events.onNodeDoubleClick(node);
		}
	};
}