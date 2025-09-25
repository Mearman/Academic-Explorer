import React, { useState, useEffect } from "react";
import { Box, Text, Stack, Group, Badge, Button, Divider, ScrollArea, Code, Paper } from "@mantine/core";
import { IconRefresh, IconTrash, IconDatabase, IconClock } from "@tabler/icons-react";
import { logger } from "@academic-explorer/utils/logger";

interface CacheStats {
  memoryCache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: string;
  };
  indexedDB: {
    size: number;
    storageUsed: string;
    databases: string[];
  };
  localStorage: {
    size: number;
    storageUsed: string;
    keys: string[];
  };
  recentRequests: Array<{
    url: string;
    timestamp: string;
    cacheHit: boolean;
    responseTime: number;
    status: "success" | "error" | "cached";
  }>;
}

export function OpenAlexCachePanel() {
	const [stats, setStats] = useState<CacheStats | null>(null);
	const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
	const [isRefreshing, setIsRefreshing] = useState(false);

	const refreshStats = async () => {
		setIsRefreshing(true);

		// Simulate gathering cache statistics
		// In real implementation, this would interface with your cache layers
		const mockStats: CacheStats = {
			memoryCache: {
				size: Math.floor(Math.random() * 1000),
				hits: Math.floor(Math.random() * 5000),
				misses: Math.floor(Math.random() * 1000),
				hitRate: ((Math.random() * 30) + 70).toFixed(1) + "%"
			},
			indexedDB: {
				size: Math.floor(Math.random() * 500),
				storageUsed: (Math.random() * 50).toFixed(1) + "MB",
				databases: ["academic-explorer-cache", "openalex-entities"]
			},
			localStorage: {
				size: Math.floor(Math.random() * 50),
				storageUsed: (Math.random() * 5).toFixed(1) + "MB",
				keys: ["academic-explorer-store", "theme-preference", "user-settings"]
			},
			recentRequests: Array.from({ length: 10 }, (_, i) => ({
				url: `/api/works/${Math.floor(Math.random() * 1000000).toString()}`,
				timestamp: new Date(Date.now() - i * 30000).toLocaleTimeString(),
				cacheHit: Math.random() > 0.3,
				responseTime: Math.floor(Math.random() * 500) + 50,
				status: Math.random() > 0.1 ? (Math.random() > 0.7 ? "cached" : "success") : "error"
			}))
		};

		// Simulate async operation
		await new Promise(resolve => setTimeout(resolve, 500));

		setStats(mockStats);
		setLastUpdate(new Date());
		setIsRefreshing(false);
	};

	const clearCache = async (entityType: "memory" | "indexeddb" | "localstorage" | "all") => {
		// In real implementation, this would clear actual cache layers
		logger.debug("cache", "Clearing cache", { entityType }, "OpenAlexCachePanel");

		// Simulate clearing and refresh stats
		await new Promise(resolve => setTimeout(resolve, 300));
		void refreshStats();
	};

	useEffect(() => {
		void refreshStats();

		// Auto-refresh every 30 seconds
		const interval = setInterval(() => { void refreshStats(); }, 30000);
		return () => { clearInterval(interval); };
	}, []);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "success": return "green";
			case "cached": return "blue";
			case "error": return "red";
			default: return "gray";
		}
	};

	if (!stats) {
		return (
			<Box p="md">
				<Text>Loading cache statistics...</Text>
			</Box>
		);
	}

	return (
		<ScrollArea h={500} p="md">
			<Stack gap="md">
				{/* Header */}
				<Group justify="space-between">
					<Text size="xl" fw={600}>OpenAlex Cache Statistics</Text>
					<Group gap="xs">
						<Text size="sm" c="dimmed">
              Last updated: {lastUpdate.toLocaleTimeString()}
						</Text>
						<Button
							size="xs"
							variant="light"
							leftSection={<IconRefresh size={14} />}
							onClick={() => { void refreshStats(); }}
							loading={isRefreshing}
						>
              Refresh
						</Button>
					</Group>
				</Group>

				<Divider />

				{/* Memory Cache Stats */}
				<Paper p="md" withBorder>
					<Group justify="space-between" mb="sm">
						<Text fw={500}>Memory Cache</Text>
						<Badge color="blue" variant="light">{stats.memoryCache.hitRate}</Badge>
					</Group>
					<Group gap="xl">
						<Stack gap="xs">
							<Text size="sm" c="dimmed">Entries</Text>
							<Text fw={500}>{stats.memoryCache.size}</Text>
						</Stack>
						<Stack gap="xs">
							<Text size="sm" c="dimmed">Hits</Text>
							<Text fw={500}>{stats.memoryCache.hits.toLocaleString()}</Text>
						</Stack>
						<Stack gap="xs">
							<Text size="sm" c="dimmed">Misses</Text>
							<Text fw={500}>{stats.memoryCache.misses.toLocaleString()}</Text>
						</Stack>
					</Group>
					<Button
						size="xs"
						variant="light"
						color="red"
						mt="sm"
						leftSection={<IconTrash size={12} />}
						onClick={() => { void clearCache("memory"); }}
					>
            Clear Memory Cache
					</Button>
				</Paper>

				{/* IndexedDB Stats */}
				<Paper p="md" withBorder>
					<Group justify="space-between" mb="sm">
						<Text fw={500}>IndexedDB Storage</Text>
						<Badge color="green" variant="light">{stats.indexedDB.storageUsed}</Badge>
					</Group>
					<Stack gap="xs">
						<Group gap="xl">
							<Stack gap="xs">
								<Text size="sm" c="dimmed">Databases</Text>
								<Text fw={500}>{stats.indexedDB.databases.length}</Text>
							</Stack>
							<Stack gap="xs">
								<Text size="sm" c="dimmed">Records</Text>
								<Text fw={500}>{stats.indexedDB.size.toLocaleString()}</Text>
							</Stack>
						</Group>
						<Text size="sm" c="dimmed">Database Names:</Text>
						{stats.indexedDB.databases.map(db => (
							<Code key={db}>{db}</Code>
						))}
					</Stack>
					<Button
						size="xs"
						variant="light"
						color="red"
						mt="sm"
						leftSection={<IconDatabase size={12} />}
						onClick={() => { void clearCache("indexeddb"); }}
					>
            Clear IndexedDB
					</Button>
				</Paper>

				{/* LocalStorage Stats */}
				<Paper p="md" withBorder>
					<Group justify="space-between" mb="sm">
						<Text fw={500}>LocalStorage</Text>
						<Badge color="orange" variant="light">{stats.localStorage.storageUsed}</Badge>
					</Group>
					<Stack gap="xs">
						<Group gap="xl">
							<Stack gap="xs">
								<Text size="sm" c="dimmed">Keys</Text>
								<Text fw={500}>{stats.localStorage.keys.length}</Text>
							</Stack>
							<Stack gap="xs">
								<Text size="sm" c="dimmed">Items</Text>
								<Text fw={500}>{stats.localStorage.size.toLocaleString()}</Text>
							</Stack>
						</Group>
						<Text size="sm" c="dimmed">Storage Keys:</Text>
						{stats.localStorage.keys.map(key => (
							<Code key={key}>{key}</Code>
						))}
					</Stack>
					<Button
						size="xs"
						variant="light"
						color="red"
						mt="sm"
						leftSection={<IconTrash size={12} />}
						onClick={() => { void clearCache("localstorage"); }}
					>
            Clear LocalStorage
					</Button>
				</Paper>

				{/* Recent Requests */}
				<Paper p="md" withBorder>
					<Text fw={500} mb="sm">Recent API Requests</Text>
					<Stack gap="xs">
						{stats.recentRequests.map((request) => (
							<Group key={`${request.timestamp}-${request.url.substring(0, 20)}`} justify="space-between" p="xs" style={{ borderRadius: 4, backgroundColor: "var(--mantine-color-gray-0)" }}>
								<Stack gap={2}>
									<Code>{request.url}</Code>
									<Group gap="xs">
										<Badge size="xs" color={getStatusColor(request.status)} variant="light">
											{request.status}
										</Badge>
										{request.cacheHit && (
											<Badge size="xs" color="blue" variant="light">
                        cached
											</Badge>
										)}
									</Group>
								</Stack>
								<Stack gap={2} align="end">
									<Group gap="xs">
										<IconClock size={12} />
										<Text size="xs" c="dimmed">{request.timestamp}</Text>
									</Group>
									<Text size="xs" c="dimmed">{request.responseTime}ms</Text>
								</Stack>
							</Group>
						))}
					</Stack>
				</Paper>

				{/* Clear All */}
				<Button
					color="red"
					variant="filled"
					leftSection={<IconTrash size={16} />}
					onClick={() => { void clearCache("all"); }}
					fullWidth
				>
          Clear All Caches
				</Button>
			</Stack>
		</ScrollArea>
	);
}