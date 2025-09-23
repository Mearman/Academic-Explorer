/**
 * Network Activity Section
 * Displays real-time network requests with filtering and statistics
 */

import React, { useState, useMemo } from "react";
import {
	Stack,
	Group,
	Text,
	TextInput,
	Select,
	Badge,
	Card,
	ScrollArea,
	Progress,
	ActionIcon,
	Tooltip,
	Divider,
	Alert,
	Collapse,
	Code,
	Anchor,
} from "@mantine/core";
import {
	IconSearch,
	IconFilter,
	IconActivity,
	IconClearAll,
	IconRefresh,
	IconChevronDown,
	IconChevronRight,
	IconCopy,
	IconExternalLink,
	IconClock,
	IconFileDatabase,
	IconApi,
	IconCpu,
	IconFile,
} from "@tabler/icons-react";
import { useNetworkActivityStore } from "@/stores/network-activity-store";
import type { NetworkRequest } from "@/stores/network-activity-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/shared-utils/logger";

const NetworkActivitySection: React.FC = () => {
	const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
	const [showFilters, setShowFilters] = useState(false);

	const {
		filteredRequests,
		networkStats,
		filters,
		setStatusFilter,
		setTypeFilter,
		setCategoryFilter,
		setSearchTerm,
		setTimeRange,
		clearFilters,
		clearAllRequests,
		clearOldRequests,
	} = useNetworkActivityStore();

	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	const toggleRequestExpanded = (requestId: string) => {
		setExpandedRequests(prev => {
			const newSet = new Set(prev);
			if (newSet.has(requestId)) {
				newSet.delete(requestId);
			} else {
				newSet.add(requestId);
			}
			return newSet;
		});
	};

	const copyToClipboard = (text: string) => {
		void navigator.clipboard.writeText(text).then(() => {
			logger.debug("ui", "Copied to clipboard", { textLength: text.length }, "NetworkActivitySection");
		});
	};

	const formatDuration = (ms: number) => {
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes.toString()}B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
	};

	const getStatusColor = (status: NetworkRequest["status"]) => {
		switch (status) {
			case "pending": return "blue";
			case "success": return "green";
			case "error": return "red";
			case "cached": return "purple";
			case "deduplicated": return "orange";
			default: return "gray";
		}
	};

	const getTypeIcon = (type: NetworkRequest["type"]) => {
		switch (type) {
			case "api": return IconApi;
			case "cache": return IconFileDatabase;
			case "worker": return IconCpu;
			case "resource": return IconFile;
			default: return IconActivity;
		}
	};

	const requestGroups = useMemo(() => {
		const groups: Record<string, NetworkRequest[]> = {
			pending: [],
			completed: [],
			failed: [],
			cached: [],
		};

		filteredRequests.forEach(request => {
			if (request.status === "pending") {
				groups.pending.push(request);
			} else if (request.status === "error") {
				groups.failed.push(request);
			} else if (request.status === "cached" || request.status === "deduplicated") {
				groups.cached.push(request);
			} else {
				groups.completed.push(request);
			}
		});

		return groups;
	}, [filteredRequests]);

	const statusOptions = [
		{ value: "pending", label: "Pending" },
		{ value: "success", label: "Success" },
		{ value: "error", label: "Error" },
		{ value: "cached", label: "Cached" },
		{ value: "deduplicated", label: "Deduplicated" },
	];

	const typeOptions = [
		{ value: "api", label: "API" },
		{ value: "cache", label: "Cache" },
		{ value: "worker", label: "Worker" },
		{ value: "resource", label: "Resource" },
	];

	const categoryOptions = [
		{ value: "foreground", label: "Foreground" },
		{ value: "background", label: "Background" },
	];

	const timeRangeOptions = [
		{ value: "1", label: "Last hour" },
		{ value: "6", label: "Last 6 hours" },
		{ value: "24", label: "Last 24 hours" },
		{ value: "168", label: "Last week" },
	];

	const renderRequest = (request: NetworkRequest) => {
		const isExpanded = expandedRequests.has(request.id);
		const TypeIcon = getTypeIcon(request.type);

		return (
			<Card key={request.id} padding="sm" withBorder>
				<Group justify="space-between" align="flex-start">
					<Group align="center" style={{ flex: 1, minWidth: 0 }}>
						<ActionIcon
							variant="subtle"
							size="sm"
							onClick={() => { toggleRequestExpanded(request.id); }}
						>
							{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
						</ActionIcon>

						<TypeIcon size={16} color={colors.text.secondary} />

						<div style={{ flex: 1, minWidth: 0 }}>
							<Group gap="xs">
								<Badge color={getStatusColor(request.status)} size="sm">
									{request.status}
								</Badge>
								<Badge variant="light" size="sm">
									{request.type}
								</Badge>
								<Badge variant="outline" size="sm">
									{request.category}
								</Badge>
							</Group>

							<Text size="sm" truncate title={request.url}>
								{request.method} {request.url}
							</Text>

							<Group gap="xs" mt={2}>
								{request.duration && (
									<Text size="xs" c={colors.text.secondary}>
										<IconClock size={12} style={{ display: "inline", marginRight: 2 }} />
										{formatDuration(request.duration)}
									</Text>
								)}
								{request.size && (
									<Text size="xs" c={colors.text.secondary}>
										{formatSize(request.size)}
									</Text>
								)}
								{request.statusCode && (
									<Text size="xs" c={colors.text.secondary}>
										{request.statusCode}
									</Text>
								)}
							</Group>
						</div>
					</Group>

					<Group gap="xs">
						<Tooltip label="Copy URL">
							<ActionIcon
								variant="subtle"
								size="sm"
								onClick={() => { copyToClipboard(request.url); }}
							>
								<IconCopy size={14} />
							</ActionIcon>
						</Tooltip>

						{request.url.startsWith("http") && (
							<Tooltip label="Open in new tab">
								<ActionIcon
									variant="subtle"
									size="sm"
									onClick={() => window.open(request.url, "_blank")}
								>
									<IconExternalLink size={14} />
								</ActionIcon>
							</Tooltip>
						)}
					</Group>
				</Group>

				<Collapse in={isExpanded}>
					<Stack gap="xs" mt="sm" pt="sm" style={{ borderTop: `1px solid ${colors.border.primary}` }}>
						{request.error && (
							<Alert color="red" variant="light">
								<Text size="sm">{request.error}</Text>
							</Alert>
						)}

						<Group>
							<Text size="xs" fw={500}>Started:</Text>
							<Text size="xs" c={colors.text.secondary}>
								{new Date(request.startTime).toLocaleString()}
							</Text>
						</Group>

						{request.endTime && (
							<Group>
								<Text size="xs" fw={500}>Ended:</Text>
								<Text size="xs" c={colors.text.secondary}>
									{new Date(request.endTime).toLocaleString()}
								</Text>
							</Group>
						)}

						{request.metadata && Object.keys(request.metadata).length > 0 && (
							<div>
								<Text size="xs" fw={500} mb={4}>Metadata:</Text>
								<Code block>
									{JSON.stringify(request.metadata, null, 2)}
								</Code>
							</div>
						)}
					</Stack>
				</Collapse>

				{request.status === "pending" && (
					<Progress
						value={100}
						size="xs"
						animated
						color="blue"
						mt="xs"
					/>
				)}
			</Card>
		);
	};

	const renderRequestGroup = (title: string, requests: NetworkRequest[], color: string) => {
		if (requests.length === 0) return null;

		return (
			<div key={title}>
				<Group justify="space-between" mb="xs">
					<Text fw={500} size="sm">
						{title} ({requests.length})
					</Text>
					<Badge color={color} variant="light" size="sm">
						{requests.length}
					</Badge>
				</Group>
				<Stack gap="xs">
					{requests.map(renderRequest)}
				</Stack>
			</div>
		);
	};

	return (
		<Stack gap="md" style={{ height: "100%" }}>
			{/* Statistics Header */}
			<Card padding="sm" withBorder>
				<Stack gap="xs">
					<Group justify="space-between" align="center">
						<Text fw={500} size="sm">Network Activity</Text>
						<Group gap="xs">
							<Tooltip label="Clear old requests">
								<ActionIcon variant="subtle" size="sm" onClick={clearOldRequests}>
									<IconRefresh size={14} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Clear all requests">
								<ActionIcon variant="subtle" size="sm" onClick={clearAllRequests}>
									<IconClearAll size={14} />
								</ActionIcon>
							</Tooltip>
							<ActionIcon
								variant="subtle"
								size="sm"
								onClick={() => { setShowFilters(!showFilters); }}
							>
								<IconFilter size={14} />
							</ActionIcon>
						</Group>
					</Group>

					<Group justify="space-between">
						<Group gap="lg">
							<div>
								<Text size="xs" c={colors.text.secondary}>Active</Text>
								<Text fw={500} size="sm">{networkStats.activeRequests}</Text>
							</div>
							<div>
								<Text size="xs" c={colors.text.secondary}>Total</Text>
								<Text fw={500} size="sm">{networkStats.totalRequests}</Text>
							</div>
							<div>
								<Text size="xs" c={colors.text.secondary}>Success</Text>
								<Text fw={500} size="sm" c="green">{networkStats.successCount}</Text>
							</div>
							<div>
								<Text size="xs" c={colors.text.secondary}>Errors</Text>
								<Text fw={500} size="sm" c="red">{networkStats.errorCount}</Text>
							</div>
						</Group>
					</Group>

					<Group justify="space-between">
						<div>
							<Text size="xs" c={colors.text.secondary}>Cache Hits</Text>
							<Text fw={500} size="sm" c="purple">{networkStats.cacheHits}</Text>
						</div>
						<div>
							<Text size="xs" c={colors.text.secondary}>Avg Time</Text>
							<Text fw={500} size="sm">
								{networkStats.averageResponseTime > 0 ? formatDuration(networkStats.averageResponseTime) : "-"}
							</Text>
						</div>
						<div>
							<Text size="xs" c={colors.text.secondary}>Data</Text>
							<Text fw={500} size="sm">
								{networkStats.totalDataTransferred > 0 ? formatSize(networkStats.totalDataTransferred) : "-"}
							</Text>
						</div>
					</Group>
				</Stack>
			</Card>

			{/* Filters */}
			<Collapse in={showFilters}>
				<Card padding="sm" withBorder>
					<Stack gap="xs">
						<TextInput
							placeholder="Search requests..."
							leftSection={<IconSearch size={14} />}
							value={filters.searchTerm}
							onChange={(e) => { setSearchTerm(e.target.value); }}
							size="sm"
						/>

						<Group grow>
							<Select
								placeholder="Status"
								data={statusOptions}
								value={filters.status.length === 1 ? filters.status[0] : ""}
								onChange={(value) => { setStatusFilter(value ? [value] : []); }}
								clearable
								size="sm"
							/>

							<Select
								placeholder="Type"
								data={typeOptions}
								value={filters.type.length === 1 ? filters.type[0] : ""}
								onChange={(value) => { setTypeFilter(value ? [value] : []); }}
								clearable
								size="sm"
							/>
						</Group>

						<Group grow>
							<Select
								placeholder="Category"
								data={categoryOptions}
								value={filters.category.length === 1 ? filters.category[0] : ""}
								onChange={(value) => { setCategoryFilter(value ? [value] : []); }}
								clearable
								size="sm"
							/>

							<Select
								placeholder="Time Range"
								data={timeRangeOptions}
								value={filters.timeRange.toString()}
								onChange={(value) => { setTimeRange(value ? parseInt(value, 10) : 24); }}
								size="sm"
							/>
						</Group>

						<Group justify="flex-end">
							<Anchor size="sm" onClick={clearFilters}>
                Clear filters
							</Anchor>
						</Group>
					</Stack>
				</Card>
			</Collapse>

			{/* Request List */}
			<ScrollArea style={{ flex: 1 }} scrollbarSize={8}>
				<Stack gap="md">
					{filteredRequests.length === 0 ? (
						<Text ta="center" c={colors.text.secondary} mt="xl">
              No network requests found
						</Text>
					) : (
						<>
							{renderRequestGroup("Active Requests", requestGroups.pending, "blue")}
							{requestGroups.pending.length > 0 && <Divider />}

							{renderRequestGroup("Failed Requests", requestGroups.failed, "red")}
							{requestGroups.failed.length > 0 && <Divider />}

							{renderRequestGroup("Cached Requests", requestGroups.cached, "purple")}
							{requestGroups.cached.length > 0 && <Divider />}

							{renderRequestGroup("Completed Requests", requestGroups.completed, "green")}
						</>
					)}
				</Stack>
			</ScrollArea>
		</Stack>
	);
};

export default NetworkActivitySection;