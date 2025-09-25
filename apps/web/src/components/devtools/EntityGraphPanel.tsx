import React, { useState, useEffect } from "react";
import { Box, Text, Stack, Group, Badge, Button, Divider, ScrollArea, Code, Paper, Tabs, JsonInput, Alert } from "@mantine/core";
import { IconRefresh, IconNetwork, IconArrowRight, IconBug, IconSettings, IconInfoCircle } from "@tabler/icons-react";
import { logger } from "@academic-explorer/utils/logger";

interface GraphStats {
  nodes: {
    total: number;
    byType: Record<string, number>;
    selected: string[];
    hidden: number;
    directlyVisited: number;
  };
  edges: {
    total: number;
    byType: Record<string, number>;
    selected: string[];
    hidden: number;
  };
  layout: {
    algorithm: string;
    isRunning: boolean;
    iterations: number;
    lastUpdate: string;
  };
  performance: {
    renderTime: number;
    lastUpdate: number;
    fps: number;
    memoryUsage: string;
  };
  filterState: {
    directlyVisitedOnly: boolean;
    entityTypes: string[];
    yearRange: [number, number] | null;
  };
}

export function EntityGraphPanel() {
	const [stats, setStats] = useState<GraphStats | null>(null);
	const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("overview");

	const refreshStats = async () => {
		setIsRefreshing(true);

		// Mock graph statistics - in real implementation, this would interface with XYFlow store
		const mockStats: GraphStats = {
			nodes: {
				total: Math.floor(Math.random() * 200) + 50,
				byType: {
					"work": Math.floor(Math.random() * 80) + 20,
					"author": Math.floor(Math.random() * 40) + 10,
					"institution": Math.floor(Math.random() * 20) + 5,
					"source": Math.floor(Math.random() * 15) + 3,
					"concept": Math.floor(Math.random() * 30) + 8,
				},
				selected: [`W${Math.floor(Math.random() * 1000000).toString()}`],
				hidden: Math.floor(Math.random() * 20),
				directlyVisited: Math.floor(Math.random() * 10) + 5,
			},
			edges: {
				total: Math.floor(Math.random() * 300) + 100,
				byType: {
					"authorship": Math.floor(Math.random() * 100) + 30,
					"citation": Math.floor(Math.random() * 80) + 20,
					"affiliation": Math.floor(Math.random() * 50) + 15,
					"publication": Math.floor(Math.random() * 40) + 10,
					"conceptual": Math.floor(Math.random() * 30) + 8,
				},
				selected: [],
				hidden: Math.floor(Math.random() * 15),
			},
			layout: {
				algorithm: "force-directed",
				isRunning: Math.random() > 0.5,
				iterations: Math.floor(Math.random() * 1000) + 200,
				lastUpdate: new Date(Date.now() - Math.random() * 10000).toLocaleTimeString(),
			},
			performance: {
				renderTime: Math.floor(Math.random() * 50) + 10,
				lastUpdate: Date.now(),
				fps: Math.floor(Math.random() * 30) + 45,
				memoryUsage: (Math.random() * 50 + 10).toFixed(1) + "MB",
			},
			filterState: {
				directlyVisitedOnly: Math.random() > 0.5,
				entityTypes: ["work", "author", "institution"],
				yearRange: [2018, 2024],
			},
		};

		await new Promise(resolve => setTimeout(resolve, 500));

		setStats(mockStats);
		setLastUpdate(new Date());
		setIsRefreshing(false);
	};

	const resetGraph = () => {
		logger.debug("ui", "Resetting graph layout", {}, "EntityGraphPanel");
		// In real implementation, this would reset the XYFlow graph
		void refreshStats();
	};

	const recenterGraph = () => {
		logger.debug("ui", "Recentering graph", {}, "EntityGraphPanel");
		// In real implementation, this would recenter the XYFlow viewport
	};

	useEffect(() => {
		void refreshStats();

		// Auto-refresh every 5 seconds
		const interval = setInterval(() => {
			void refreshStats();
		}, 5000);
		return () => {
			clearInterval(interval);
		};
	}, []);

	const getTypeColor = (entityType: string) => {
		const colors = {
			"work": "blue",
			"author": "green",
			"institution": "orange",
			"source": "purple",
			"concept": "pink",
			"authorship": "teal",
			"citation": "cyan",
			"affiliation": "yellow",
			"publication": "indigo",
			"conceptual": "violet",
		} as const;

		const isValidType = (t: string): t is keyof typeof colors => {
			return t in colors;
		};

		return isValidType(entityType) ? colors[entityType] : "gray";
	};

	if (!stats) {
		return (
			<Box p="md">
				<Text>Loading graph statistics...</Text>
			</Box>
		);
	}

	return (
		<ScrollArea h={500} p="md">
			<Stack gap="md">
				{/* Header */}
				<Group justify="space-between">
					<Text size="xl" fw={600}>Entity Graph Debug</Text>
					<Group gap="xs">
						<Text size="sm" c="dimmed">
              Last updated: {lastUpdate.toLocaleTimeString()}
						</Text>
						<Button
							size="xs"
							variant="light"
							leftSection={<IconRefresh size={14} />}
							onClick={() => {
								void refreshStats();
							}}
							loading={isRefreshing}
						>
              Refresh
						</Button>
					</Group>
				</Group>

				<Divider />

				<Tabs value={activeTab} onChange={(value) => {
					setActiveTab(value ?? "overview");
				}}>
					<Tabs.List>
						<Tabs.Tab value="overview" leftSection={<IconInfoCircle size={14} />}>
              Overview
						</Tabs.Tab>
						<Tabs.Tab value="nodes" leftSection={<IconNetwork size={14} />}>
              Nodes
						</Tabs.Tab>
						<Tabs.Tab value="edges" leftSection={<IconArrowRight size={14} />}>
              Edges
						</Tabs.Tab>
						<Tabs.Tab value="performance" leftSection={<IconBug size={14} />}>
              Performance
						</Tabs.Tab>
						<Tabs.Tab value="debug" leftSection={<IconSettings size={14} />}>
              Debug
						</Tabs.Tab>
					</Tabs.List>

					<Tabs.Panel value="overview" pt="md">
						<Stack gap="md">
							<Group gap="xl">
								<Paper p="md" withBorder style={{ flex: 1 }}>
									<Text size="sm" c="dimmed">Total Nodes</Text>
									<Text size="xl" fw={600}>{stats.nodes.total}</Text>
								</Paper>
								<Paper p="md" withBorder style={{ flex: 1 }}>
									<Text size="sm" c="dimmed">Total Edges</Text>
									<Text size="xl" fw={600}>{stats.edges.total}</Text>
								</Paper>
								<Paper p="md" withBorder style={{ flex: 1 }}>
									<Text size="sm" c="dimmed">Visited</Text>
									<Text size="xl" fw={600}>{stats.nodes.directlyVisited}</Text>
								</Paper>
							</Group>

							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Layout Information</Text>
								<Group gap="xl">
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Algorithm</Text>
										<Badge color="blue" variant="light">{stats.layout.algorithm}</Badge>
									</Stack>
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Status</Text>
										<Badge color={stats.layout.isRunning ? "green" : "gray"} variant="light">
											{stats.layout.isRunning ? "Running" : "Idle"}
										</Badge>
									</Stack>
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Iterations</Text>
										<Text fw={500}>{stats.layout.iterations}</Text>
									</Stack>
								</Group>
							</Paper>

							<Group gap="xs">
								<Button
									size="sm"
									variant="light"
									leftSection={<IconRefresh size={14} />}
									onClick={resetGraph}
								>
                  Reset Layout
								</Button>
								<Button
									size="sm"
									variant="light"
									onClick={recenterGraph}
								>
                  Recenter View
								</Button>
							</Group>
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="nodes" pt="md">
						<Stack gap="md">
							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Node Distribution by Type</Text>
								<Stack gap="xs">
									{Object.entries(stats.nodes.byType).map(([type, count]) => (
										<Group key={type} justify="space-between">
											<Group gap="xs">
												<Badge color={getTypeColor(type)} variant="light" size="sm">
													{type}
												</Badge>
											</Group>
											<Text fw={500}>{count}</Text>
										</Group>
									))}
								</Stack>
							</Paper>

							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Node Status</Text>
								<Group gap="xl">
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Selected</Text>
										<Text fw={500}>{stats.nodes.selected.length}</Text>
									</Stack>
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Hidden</Text>
										<Text fw={500}>{stats.nodes.hidden}</Text>
									</Stack>
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Directly Visited</Text>
										<Text fw={500}>{stats.nodes.directlyVisited}</Text>
									</Stack>
								</Group>

								{stats.nodes.selected.length > 0 && (
									<Box mt="sm">
										<Text size="sm" c="dimmed" mb="xs">Selected Nodes:</Text>
										{stats.nodes.selected.map(nodeId => (
											<Code key={nodeId}>{nodeId}</Code>
										))}
									</Box>
								)}
							</Paper>
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="edges" pt="md">
						<Stack gap="md">
							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Edge Distribution by Type</Text>
								<Stack gap="xs">
									{Object.entries(stats.edges.byType).map(([type, count]) => (
										<Group key={type} justify="space-between">
											<Group gap="xs">
												<Badge color={getTypeColor(type)} variant="light" size="sm">
													{type}
												</Badge>
											</Group>
											<Text fw={500}>{count}</Text>
										</Group>
									))}
								</Stack>
							</Paper>

							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Edge Status</Text>
								<Group gap="xl">
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Selected</Text>
										<Text fw={500}>{stats.edges.selected.length}</Text>
									</Stack>
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Hidden</Text>
										<Text fw={500}>{stats.edges.hidden}</Text>
									</Stack>
								</Group>
							</Paper>
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="performance" pt="md">
						<Stack gap="md">
							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Rendering Performance</Text>
								<Group gap="xl">
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Render Time</Text>
										<Text fw={500}>{stats.performance.renderTime}ms</Text>
									</Stack>
									<Stack gap="xs">
										<Text size="sm" c="dimmed">FPS</Text>
										<Text fw={500}>{stats.performance.fps}</Text>
									</Stack>
									<Stack gap="xs">
										<Text size="sm" c="dimmed">Memory Usage</Text>
										<Text fw={500}>{stats.performance.memoryUsage}</Text>
									</Stack>
								</Group>
							</Paper>

							{stats.performance.renderTime > 30 && (
								<Alert color="yellow" icon={<IconBug size={16} />}>
                  High render time detected. Consider reducing node count or optimizing layout algorithm.
								</Alert>
							)}

							{stats.performance.fps < 30 && (
								<Alert color="red" icon={<IconBug size={16} />}>
                  Low FPS detected. Graph performance may be impacted by too many nodes or complex layout calculations.
								</Alert>
							)}
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="debug" pt="md">
						<Stack gap="md">
							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Current Filter State</Text>
								<JsonInput
									value={JSON.stringify(stats.filterState, null, 2)}
									readOnly
									minRows={6}
									maxRows={8}
								/>
							</Paper>

							<Paper p="md" withBorder>
								<Text fw={500} mb="sm">Graph Actions</Text>
								<Group gap="xs">
									<Button size="sm" variant="light" onClick={() => {
										logger.debug("ui", "Export graph data requested", {}, "EntityGraphPanel");
									}}>
                    Export Graph Data
									</Button>
									<Button size="sm" variant="light" onClick={() => {
										logger.debug("ui", "Log node positions requested", {}, "EntityGraphPanel");
									}}>
                    Log Node Positions
									</Button>
									<Button size="sm" variant="light" onClick={() => {
										logger.debug("ui", "Validate graph structure requested", {}, "EntityGraphPanel");
									}}>
                    Validate Structure
									</Button>
								</Group>
							</Paper>

							<Alert color="blue" icon={<IconInfoCircle size={16} />}>
                Use browser console to see detailed debug output from graph actions.
							</Alert>
						</Stack>
					</Tabs.Panel>
				</Tabs>
			</Stack>
		</ScrollArea>
	);
}