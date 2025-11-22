import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Paper, Group, ActionIcon, Text, Loader, Stack, Center } from '@mantine/core';
import { IconZoomIn, IconZoomOut, IconFocus, IconRefresh } from '@tabler/icons-react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import { useGraphData } from '@/hooks/use-graph-data';
import { useGraphStore } from '@/stores/graph-store';
import { getConditionalNodeStyle } from '@/components/graph/node-styles';
import type { GraphNode, GraphEdge } from '@academic-explorer/graph';

interface EntityGraphViewProps {
	entityId: string;
	height?: number;
}

export function EntityGraphView({ entityId, height = 600 }: EntityGraphViewProps) {
	const graphRef = useRef<ForceGraphMethods>(null);
	const [isInitializing, setIsInitializing] = useState(true);
	const { loadEntity, expandNode, isLoading } = useGraphData();
	const graphStore = useGraphStore();
	const { nodes, edges } = graphStore;

	// Convert graph store data to force-graph format
	const graphData = {
		nodes: Object.values(nodes) as GraphNode[],
		links: Object.values(edges).map((edge: GraphEdge) => ({
			...edge,
			source: edge.source,
			target: edge.target,
		})),
	};

	// Load the entity and expand it on mount
	useEffect(() => {
		const initializeGraph = async () => {
			setIsInitializing(true);
			try {
				// Load the entity into the graph
				await loadEntity(entityId);

				// Expand the entity to show 1-degree connections
				await expandNode({
					nodeId: entityId,
					options: {
						depth: 1,
						limit: 50, // Limit to 50 connected nodes
					},
				});

				// Center the graph on the main entity after a short delay
				setTimeout(() => {
					if (graphRef.current) {
						const entityNode = nodes[entityId];
						if (entityNode) {
							graphRef.current.centerAt(entityNode.x, entityNode.y, 1000);
							graphRef.current.zoom(2, 1000);
						}
					}
				}, 500);
			} catch (error) {
				console.error('Failed to initialize entity graph:', error);
			} finally {
				setIsInitializing(false);
			}
		};

		initializeGraph();
	}, [entityId, loadEntity, expandNode]);

	// Node color based on conditional styling
	const nodeColor = useCallback((node: NodeObject) => {
		const style = getConditionalNodeStyle(node as GraphNode);
		return style.fill || '#3b82f6';
	}, []);

	// Zoom controls
	const handleZoomIn = () => {
		if (graphRef.current) {
			const currentZoom = graphRef.current.zoom();
			graphRef.current.zoom(currentZoom * 1.5, 500);
		}
	};

	const handleZoomOut = () => {
		if (graphRef.current) {
			const currentZoom = graphRef.current.zoom();
			graphRef.current.zoom(currentZoom / 1.5, 500);
		}
	};

	const handleResetView = () => {
		if (graphRef.current) {
			const entityNode = nodes[entityId];
			if (entityNode) {
				graphRef.current.centerAt(entityNode.x, entityNode.y, 1000);
				graphRef.current.zoom(2, 1000);
			}
		}
	};

	const handleRefresh = async () => {
		setIsInitializing(true);
		try {
			await loadEntity(entityId);
			await expandNode({
				nodeId: entityId,
				options: {
					depth: 1,
					limit: 50,
				},
			});
		} finally {
			setIsInitializing(false);
		}
	};

	if (isInitializing || isLoading) {
		return (
			<Paper p="xl" withBorder radius="xl">
				<Center h={height}>
					<Stack align="center" gap="md">
						<Loader size="lg" />
						<Text c="dimmed">Loading network graph...</Text>
					</Stack>
				</Center>
			</Paper>
		);
	}

	if (!graphData.nodes.length) {
		return (
			<Paper p="xl" withBorder radius="xl">
				<Center h={height}>
					<Stack align="center" gap="md">
						<Text c="dimmed">No graph data available</Text>
					</Stack>
				</Center>
			</Paper>
		);
	}

	return (
		<Paper p="md" withBorder radius="xl" style={{ position: 'relative' }}>
			{/* Graph Controls */}
			<Group justify="space-between" mb="sm">
				<Group gap="xs">
					<Text size="sm" fw={600}>
						Network Graph
					</Text>
					<Text size="xs" c="dimmed">
						{graphData.nodes.length} nodes, {graphData.links.length} edges
					</Text>
				</Group>
				<Group gap="xs">
					<ActionIcon variant="light" onClick={handleZoomIn} title="Zoom in">
						<IconZoomIn size={18} />
					</ActionIcon>
					<ActionIcon variant="light" onClick={handleZoomOut} title="Zoom out">
						<IconZoomOut size={18} />
					</ActionIcon>
					<ActionIcon variant="light" onClick={handleResetView} title="Reset view">
						<IconFocus size={18} />
					</ActionIcon>
					<ActionIcon variant="light" onClick={handleRefresh} title="Refresh">
						<IconRefresh size={18} />
					</ActionIcon>
				</Group>
			</Group>

			{/* Graph Visualization */}
			<Box style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '8px', overflow: 'hidden' }}>
				<ForceGraph2D
					ref={graphRef as any}
					graphData={graphData}
					width={undefined} // Auto-size to container
					height={height}
					nodeColor={nodeColor}
					nodeRelSize={6}
					linkDirectionalArrowLength={3}
					linkDirectionalArrowRelPos={1}
					linkCurvature={0.2}
					enableNodeDrag={true}
					enablePanInteraction={true}
					enableZoomInteraction={true}
					cooldownTicks={100}
					onNodeClick={(node) => {
						console.log('Node clicked:', node);
						// Could expand the node or navigate to its detail page
					}}
					nodeLabel={(node) => (node as GraphNode).label || (node as GraphNode).id}
				/>
			</Box>
		</Paper>
	);
}
