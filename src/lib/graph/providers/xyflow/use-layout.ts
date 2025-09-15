/**
 * Unified Layout Hook for ReactFlow
 * Handles all layout algorithms (D3 force, hierarchical, circular, grid) through a consistent interface
 */

import { useCallback, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import {
	forceSimulation,
	forceLink,
	forceManyBody,
	forceCenter,
	forceCollide,
	type Simulation,
	type SimulationNodeDatum,
	type SimulationLinkDatum,
} from "d3-force";
import { randomLcg } from "d3-random";

import type { GraphLayout, EntityType } from "../../types";
import { logger } from "@/lib/logger";
import { useGraphStore } from "@/stores/graph-store";
import { FIT_VIEW_PRESETS } from "../../constants";

// Extended node interface for D3 simulation
interface D3Node extends SimulationNodeDatum {
  id: string;
  type?: EntityType;
  [key: string]: unknown;
}

interface D3Link extends SimulationLinkDatum<D3Node> {
  id: string;
  source: string | D3Node;
  target: string | D3Node;
}

interface UseLayoutOptions {
  enabled?: boolean;
  onLayoutChange?: () => void;
  fitViewAfterLayout?: boolean;
  containerDimensions?: { width: number; height: number };
}

export function useLayout(
	layout: GraphLayout | null,
	options: UseLayoutOptions = {},
) {
	const { enabled = true, onLayoutChange, fitViewAfterLayout = true, containerDimensions } = options;
	const { getNodes, getEdges, setNodes, fitView, getViewport } = useReactFlow();
	const pinnedNodes = useGraphStore((state) => state.pinnedNodes);
	const simulationRef = useRef<Simulation<D3Node, D3Link> | null>(null);
	const isRunningRef = useRef(false);
	const timeoutRef = useRef<number | null>(null);

	// Stop any existing simulation or timeout
	const stopLayout = useCallback(() => {
		if (simulationRef.current) {
			simulationRef.current.stop();
			simulationRef.current = null;
			isRunningRef.current = false;
			logger.info("graph", "Layout simulation stopped", undefined, "useLayout");
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	// Apply D3 force simulation layout
	const applyD3ForceLayout = useCallback(() => {
		logger.info(
			"graph",
			"applyD3ForceLayout called",
			{
				hasLayout: !!layout,
				enabled: true,
			},
			"useLayout",
		);

		const nodes = getNodes();
		const edges = getEdges();

		logger.info(
			"graph",
			"applyD3ForceLayout proceeding",
			{
				nodeCount: nodes.length,
				edgeCount: edges.length,
			},
			"useLayout",
		);

		if (nodes.length === 0) {
			logger.info(
				"graph",
				"No nodes to layout with D3 force",
				undefined,
				"useLayout",
			);
			return;
		}

		// Stop existing simulation
		logger.info(
			"graph",
			"About to stop existing simulation before starting D3 force",
			{
				hadSimulation: !!simulationRef.current,
				currentAlpha: simulationRef.current?.alpha(),
				timestamp: Date.now(),
			},
			"useLayout",
		);
		stopLayout();

		// Using fixed D3 force parameters

		// Fixed D3 force parameters - consistent regardless of pinned nodes
		const seed = 42;
		const hasPinnedNodes = pinnedNodes.size > 0;
		const pinnedNodeCount = pinnedNodes.size;

		// Consistent force parameters (pinning only affects node position fixing, not forces)
		const linkDistance = 100; // Reduced from 300 for stronger edges
		const linkStrength = 0.5; // Increased from 0.3 for stronger edges
		const chargeStrength = -10_000; // Increased from -2000 for stronger node repulsion
		const centerStrength = 0.05;
		const collisionRadius = 150; // Keep collision radius consistent
		const collisionStrength = 1.0; // Keep collision strength consistent
		const velocityDecay = 0.1; // Very low decay for maximum movement
		const alpha = 1;
		const alphaDecay = 0.02; // Faster decay for reasonable simulation time
		const minAlpha = 0.1; // Higher threshold for quicker stability

		logger.info(
			"graph",
			"Starting D3 Force simulation",
			{
				nodeCount: nodes.length,
				edgeCount: edges.length,
				hasPinnedNodes,
				pinnedNodeCount,
				pinnedNodeIds: Array.from(pinnedNodes),
				linkDistance,
				linkStrength,
				chargeStrength,
				centerStrength,
				collisionRadius,
				collisionStrength,
				velocityDecay,
				alphaDecay,
				initialAlpha: alpha,
				calculatedMinSpacing: collisionRadius * 4,
				calculatedBaseRadius: Math.max(
					800,
					(Math.sqrt(nodes.length) * (collisionRadius * 4)) / 2,
				),
			},
			"useLayout",
		);

		// Get current viewport information to calculate where nodes should center
		const viewport = getViewport();

		// Keep (0,0) as the fixed center point regardless of viewport position
		// This ensures the graph origin remains stable during panning and zooming
		const centerX = 0;
		const centerY = 0;

		// Calculate viewport center for logging purposes only
		const viewportCenterX = containerDimensions ? -viewport.x + (containerDimensions.width / 2) / viewport.zoom : 800;
		const viewportCenterY = containerDimensions ? -viewport.y + (containerDimensions.height / 2) / viewport.zoom : 400;

		// Create deterministic random source
		const random = randomLcg(seed);

		// Convert ReactFlow nodes to D3 nodes with multiple pinned nodes support
		const d3Nodes: D3Node[] = nodes.map((node, index) => {
			const isPinned = pinnedNodes.has(node.id);

			if (isPinned) {
				logger.info(
					"graph",
					"Pinning node at current position",
					{
						nodeId: node.id,
						index,
						position: { x: node.position.x, y: node.position.y },
						pinned: true,
					},
					"useLayout",
				);
			} else {
				logger.info(
					"graph",
					"Node free to move during simulation",
					{
						nodeId: node.id,
						index,
						existingPosition: node.position,
						pinned: false,
					},
					"useLayout",
				);
			}

			return {
				id: node.id,
				x: node.position.x, // Always preserve existing position
				y: node.position.y, // Always preserve existing position
				fx: isPinned ? node.position.x : undefined, // Fix pinned nodes at their current position
				fy: isPinned ? node.position.y : undefined, // Fix pinned nodes at their current position
				...node.data,
			};
		});

		// Convert ReactFlow edges to D3 links
		const d3Links: D3Link[] = edges
			.filter((edge) => {
				const sourceExists = d3Nodes.find((n) => n.id === edge.source);
				const targetExists = d3Nodes.find((n) => n.id === edge.target);
				return sourceExists && targetExists;
			})
			.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
			}));

		// Create simulation with safety timeout
		simulationRef.current = forceSimulation<D3Node>(d3Nodes)
			.randomSource(random)
			.velocityDecay(velocityDecay)
			.alpha(alpha)
			.alphaDecay(alphaDecay)
			.alphaTarget(0); // Standard D3 target for proper stopping

		logger.info(
			"graph",
			"D3 simulation created",
			{
				simulationAlpha: simulationRef.current.alpha(),
				simulationNodes: simulationRef.current.nodes().length,
			},
			"useLayout",
		);

		logger.info("graph", "Using fixed center coordinates (0,0) for force simulation", {
			centerX,
			centerY,
			viewportCenterX,
			viewportCenterY,
			containerDimensions,
			viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
			reason: "Using fixed (0,0) center for stable graph origin"
		}, "useLayout");

		// Configure forces
		simulationRef.current
			.force(
				"link",
				forceLink<D3Node, D3Link>(d3Links)
					.id((d) => d.id)
					.distance(linkDistance)
					.strength(linkStrength),
			)
			.force("charge", forceManyBody<D3Node>().strength(chargeStrength))
			.force("center", forceCenter<D3Node>(centerX, centerY).strength(centerStrength))
			.force(
				"collision",
				forceCollide<D3Node>()
					.radius(collisionRadius)
					.strength(collisionStrength),
			);

		isRunningRef.current = true;

		// Set up tick handler for continuous position updates with safety timeout
		let tickCount = 0;
		const maxTicks = 500; // Safety limit to prevent infinite simulation
		simulationRef.current.on("tick", () => {
			tickCount++;

			// Safety check to prevent infinite simulation
			if (tickCount >= maxTicks) {
				logger.info(
					"graph",
					"Force simulation reached maximum tick limit, stopping",
					{
						maxTicks,
						finalAlpha: simulationRef.current?.alpha(),
					},
					"useLayout",
				);
				simulationRef.current?.stop();

				// Fit view after forced stop if enabled
				if (fitViewAfterLayout) {
					setTimeout(() => {
						void fitView(FIT_VIEW_PRESETS.DEFAULT);
						logger.info(
							"graph",
							"Auto-fitted view after simulation timeout",
							undefined,
							"useLayout",
						);
					}, 100);
				}
				return;
			}

			// Update node positions - this triggers edge recalculation in DynamicFloatingEdge components
			setNodes((currentNodes) =>
				currentNodes.map((node) => {
					const d3Node = d3Nodes.find((d) => d.id === node.id);
					if (
						d3Node &&
            typeof d3Node.x === "number" &&
            typeof d3Node.y === "number"
					) {
						return {
							...node,
							position: { x: d3Node.x, y: d3Node.y },
						};
					}
					return node;
				}),
			);

			// Log alpha progression and collision detection every 10 ticks
			if (tickCount % 10 === 0) {
				const currentAlpha = simulationRef.current?.alpha() ?? 0;

				// Check for overlapping nodes to debug collision detection
				const overlaps = [];
				for (let i = 0; i < d3Nodes.length; i++) {
					for (let j = i + 1; j < d3Nodes.length; j++) {
						const nodeA = d3Nodes[i];
						const nodeB = d3Nodes[j];
						if (
							nodeA.x != null &&
              nodeA.y != null &&
              nodeB.x != null &&
              nodeB.y != null
						) {
							const distance = Math.sqrt(
								Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2),
							);
							if (distance < collisionRadius * 2) {
								overlaps.push({
									nodeA: nodeA.id,
									nodeB: nodeB.id,
									distance: Math.round(distance),
									minDistance: collisionRadius * 2,
								});
							}
						}
					}
				}

				logger.info(
					"graph",
					"D3 Force simulation progress",
					{
						tick: tickCount,
						alpha: currentAlpha,
						alphaTarget: 0,
						minAlpha,
						isRunning: currentAlpha > minAlpha,
						stabilityProgress: `${((1 - currentAlpha) * 100).toFixed(1)}%`,
						overlappingPairs: overlaps.length,
						overlaps: overlaps.slice(0, 3), // Show first 3 overlaps only
					},
					"useLayout",
				);
			}

			onLayoutChange?.();
		});

		// Set up end handler
		simulationRef.current.on("end", () => {
			logger.info(
				"graph",
				"D3 Force simulation completed",
				{
					finalAlpha: simulationRef.current?.alpha(),
					samplePositions: d3Nodes.slice(0, 3).map((n) => ({
						id: n.id,
						x: Math.round(n.x || 0),
						y: Math.round(n.y || 0),
					})),
				},
				"useLayout",
			);
			isRunningRef.current = false;

			// Auto-fit view after layout stabilizes if enabled
			if (fitViewAfterLayout) {
				setTimeout(() => {
					void fitView(FIT_VIEW_PRESETS.DEFAULT);
					logger.info(
						"graph",
						"Auto-fitted view after simulation completion",
						undefined,
						"useLayout",
					);
				}, 100);
			}
		});
	}, [layout, onLayoutChange, stopLayout, fitView, fitViewAfterLayout, getViewport, containerDimensions, getNodes, getEdges, pinnedNodes, setNodes]);

	// Main layout application function - D3 force only
	const applyLayout = useCallback(() => {
		if (!enabled || !layout) {
			logger.info(
				"graph",
				"Layout application skipped",
				{ enabled, hasLayout: !!layout },
				"useLayout",
			);
			return;
		}

		const nodes = getNodes();
		logger.info(
			"graph",
			"Layout application started",
			{
				layoutType: layout.type,
				nodeCount: nodes.length,
				nodeIds: nodes.map((n) => n.id),
				nodePositions: nodes.map((n) => ({ id: n.id, position: n.position })),
			},
			"useLayout",
		);

		if (nodes.length === 0) {
			logger.info("graph", "No nodes to layout", undefined, "useLayout");
			return;
		}

		// Always apply D3 force layout
		logger.info(
			"graph",
			"Applying D3 force layout",
			{ nodeCount: nodes.length },
			"useLayout",
		);
		applyD3ForceLayout();
	}, [enabled, layout, applyD3ForceLayout, getNodes]);

	// Apply layout when layout changes
	useEffect(() => {
		const nodes = getNodes();
		logger.info(
			"graph",
			"Layout useEffect triggered",
			{
				enabled,
				layoutType: layout?.type,
				nodeCount: nodes.length,
				dependencies: { enabled, layoutType: layout?.type },
				timestamp: Date.now(),
			},
			"useLayout",
		);

		if (enabled && layout) {
			if (nodes.length > 0) {
				logger.info(
					"graph",
					"Triggering layout application from useEffect",
					{
						layoutType: layout.type,
						nodeCount: nodes.length,
					},
					"useLayout",
				);
				applyLayout();
			} else {
				logger.info(
					"graph",
					"Layout enabled but no nodes available yet",
					{
						layoutType: layout.type,
					},
					"useLayout",
				);
			}
		} else {
			logger.info(
				"graph",
				"Stopping layout from useEffect",
				{
					enabled,
					hasLayout: !!layout,
					nodeCount: nodes.length,
					reason: !enabled
						? "disabled"
						: !layout
							? "no layout"
							: "layout disabled",
				},
				"useLayout",
			);
			stopLayout();
		}

		// Cleanup on unmount
		return stopLayout;
	}, [enabled, layout, applyLayout, stopLayout, getNodes]);

	// Track previous node count to avoid re-layout on incremental additions
	const previousNodeCountRef = useRef(0);

	// Additional effect to trigger layout when nodes become available (but not on incremental updates)
	useEffect(() => {
		const nodes = getNodes();
		const currentNodeCount = nodes.length;
		const previousNodeCount = previousNodeCountRef.current;

		// Only trigger layout if:
		// 1. Layout is enabled and configured
		// 2. Nodes are available
		// 3. No simulation is running
		// 4. This is initial load (previous count was 0) OR node count significantly changed
		const isInitialLoad = previousNodeCount === 0 && currentNodeCount > 0;
		const isSignificantChange = currentNodeCount > previousNodeCount * 1.5; // 50% increase

		if (enabled && layout && nodes.length > 0 && !simulationRef.current && (isInitialLoad || isSignificantChange)) {
			logger.info(
				"graph",
				"Nodes became available, triggering layout",
				{
					layoutType: layout.type,
					nodeCount: currentNodeCount,
					previousCount: previousNodeCount,
					isInitialLoad,
					isSignificantChange
				},
				"useLayout",
			);
			applyLayout();
		}

		// Update the reference for next comparison
		previousNodeCountRef.current = currentNodeCount;
	});

	// Manual restart function
	const restartLayout = useCallback(() => {
		applyLayout();
	}, [applyLayout]);

	// Reheat simulation (useful when adding new nodes to D3 force)
	const reheatLayout = useCallback(
		(alpha = 0.3) => {
			logger.info(
				"graph",
				"Reheat layout called",
				{
					alpha,
					hasSimulation: !!simulationRef.current,
					isRunning: isRunningRef.current,
					layoutType: layout?.type,
				},
				"useLayout",
			);

			if (
				simulationRef.current &&
        isRunningRef.current &&
        layout?.type === "d3-force"
			) {
				simulationRef.current.alpha(alpha).restart();
				logger.info(
					"graph",
					"D3 Force simulation reheated",
					{ alpha },
					"useLayout",
				);
			} else {
				logger.info(
					"graph",
					"Reheating via restart layout",
					{
						reason: !simulationRef.current
							? "no simulation"
							: !isRunningRef.current
								? "not running"
								: "not d3-force",
					},
					"useLayout",
				);
				// If not running or not D3 force, just restart
				restartLayout();
			}
		},
		[layout, restartLayout],
	);

	return {
		isRunning: isRunningRef.current,
		applyLayout,
		restartLayout,
		reheatLayout,
		stopLayout,
	};
}
