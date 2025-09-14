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
	const { getNodes, getEdges, setNodes, fitView, getViewport, setCenter } = useReactFlow();
	const containerRef = useRef<HTMLElement | null>(null);
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

		// Fixed D3 force parameters for closer node spacing with reasonable stability timing
		const seed = 42;
		const linkDistance = 300; // Reduced distance between linked nodes
		const linkStrength = 0.3; // Increased strength to pull connected nodes closer
		const chargeStrength = -2000; // Reduced repulsion for closer spacing
		const centerStrength = 0.003; // Minimal centering to reduce movement during simulation
		const collisionRadius = 150; // Reduced collision zones for closer packing
		const collisionStrength = 2.0; // Reduced collision strength to allow closer spacing
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
				linkDistance,
				chargeStrength,
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

		// Calculate the current viewport center in world coordinates
		const viewportCenterX = containerDimensions ? -viewport.x + (containerDimensions.width / 2) / viewport.zoom : 800;
		const viewportCenterY = containerDimensions ? -viewport.y + (containerDimensions.height / 2) / viewport.zoom : 400;

		// Use viewport center as simulation center so nodes animate around current view
		const centerX = viewportCenterX;
		const centerY = viewportCenterY;

		// Create deterministic random source
		const random = randomLcg(seed);

		// Convert ReactFlow nodes to D3 nodes with deterministic positions
		const d3Nodes: D3Node[] = nodes.map((node, index) => {
			// Always use deterministic positions based on node index and ID for true determinism
			const angle = (index / nodes.length) * 2 * Math.PI;

			// Add deterministic variation based on node ID to prevent all nodes starting at same position
			const nodeHash = node.id
				.split("")
				.reduce((acc, char) => acc + char.charCodeAt(0), 0);
			const hashVariation = (nodeHash % 100) / 100; // 0 to 0.99

			// Ensure minimum spacing based on collision radius * 3 for closer initial spacing
			const minSpacing = collisionRadius * 3;
			const baseRadius = Math.max(
				400, // Reduced base radius for more compact layout
				(Math.sqrt(nodes.length) * minSpacing) / 3, // Reduced divisor for closer packing
			);
			const radius = baseRadius + (index % 3) * minSpacing * 0.5 + hashVariation * minSpacing * 0.5;

			const deterministicPosition = {
				x: Math.cos(angle) * radius + centerX + (nodeHash % 100) - 50, // Reduced deterministic spread
				y: Math.sin(angle) * radius + centerY + ((nodeHash * 17) % 100) - 50,
			};

			logger.info(
				"graph",
				"Initializing deterministic node position",
				{
					nodeId: node.id,
					index,
					nodeHash,
					hashVariation,
					angle: ((angle * 180) / Math.PI).toFixed(1) + "°",
					position: deterministicPosition,
				},
				"useLayout",
			);

			return {
				id: node.id,
				x: deterministicPosition.x,
				y: deterministicPosition.y,
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

		logger.info("graph", "Using center coordinates for force simulation", {
			centerX,
			centerY,
			viewportCenterX,
			viewportCenterY,
			containerDimensions,
			viewport: { x: viewport.x, y: viewport.y, zoom: viewport.zoom },
			reason: containerDimensions ? "Using viewport center for stable animation" : "Using fallback center"
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
						fitView({ padding: 0.1, duration: 800 });
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
					fitView({ padding: 0.1, duration: 800 });
					logger.info(
						"graph",
						"Auto-fitted view after simulation completion",
						undefined,
						"useLayout",
					);
				}, 100);
			}
		});
	}, [layout, onLayoutChange, stopLayout, fitView, fitViewAfterLayout, getViewport, setCenter, containerDimensions]);

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
	}, [enabled, layout, applyD3ForceLayout]);

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
	}, [enabled, layout, applyLayout, stopLayout]);

	// Additional effect to trigger layout when nodes become available
	useEffect(() => {
		const nodes = getNodes();
		if (enabled && layout && nodes.length > 0 && !simulationRef.current) {
			logger.info(
				"graph",
				"Nodes became available, triggering layout",
				{
					layoutType: layout.type,
					nodeCount: nodes.length,
				},
				"useLayout",
			);
			applyLayout();
		}
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
