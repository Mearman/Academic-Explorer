/**
 * Application Activity Section
 * Displays real-time application events with filtering and statistics
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
	ActionIcon,
	Tooltip,
	Divider,
	Collapse,
	Code,
	RingProgress,
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
	IconClock,
	IconUser,
	IconRoute,
	IconCpu,
	IconAlertTriangle,
	IconBug,
	IconInfoCircle,
	IconEye,
	IconBuildingBank,
	IconTrendingUp,
	IconClipboard,
} from "@tabler/icons-react";
import { useAppActivityStore } from "@/stores/app-activity-store";
import type { AppActivityEvent } from "@/stores/app-activity-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";

const AppActivitySection: React.FC = () => {
	const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
	const [showFilters, setShowFilters] = useState(false);

	const {
		filteredEvents,
		activityStats,
		filters,
		setTypeFilter,
		setCategoryFilter,
		setSeverityFilter,
		setSearchTerm,
		setTimeRange,
		clearFilters,
		clearAllEvents,
		clearOldEvents,
	} = useAppActivityStore();

	const themeColors = useThemeColors();
	const {colors} = themeColors;

	const toggleEventExpanded = (eventId: string) => {
		setExpandedEvents(prev => {
			const newSet = new Set(prev);
			if (newSet.has(eventId)) {
				newSet.delete(eventId);
			} else {
				newSet.add(eventId);
			}
			return newSet;
		});
	};

	const copyToClipboard = (text: string) => {
		void navigator.clipboard.writeText(text).then(() => {
			logger.debug("ui", "Copied to clipboard", { textLength: text.length }, "AppActivitySection");
		});
	};

	const copyAllEvents = () => {
		const allEventsData = filteredEvents.map(event => ({
			timestamp: new Date(event.timestamp).toLocaleString(),
			type: event.metadata?.entityType ?? event.type,
			category: event.category,
			severity: event.severity,
			event: event.event,
			description: event.description,
			duration: event.duration,
			metadata: event.metadata
		}));

		const jsonData = JSON.stringify(allEventsData, null, 2);
		copyToClipboard(jsonData);
		logger.debug("ui", "Copied all events to clipboard", { eventCount: allEventsData.length }, "AppActivitySection");
	};

	const formatTimestamp = (timestamp: number) => {
		return new Date(timestamp).toLocaleTimeString();
	};

	const formatDuration = (ms: number) => {
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	};

	const formatMemory = (mb: number) => {
		if (mb < 1024) return `${mb.toFixed(1)}MB`;
		return `${(mb / 1024).toFixed(1)}GB`;
	};

	const getSeverityColor = (severity: AppActivityEvent["severity"]) => {
		switch (severity) {
			case "error": return "red";
			case "warning": return "orange";
			case "info": return "blue";
			case "debug": return "gray";
			default: return "gray";
		}
	};

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "user": return IconUser;
			case "navigation": return IconRoute;
			case "component": return IconActivity;
			case "performance": return IconCpu;
			case "error": return IconBug;
			case "system": return IconActivity;
			default: return IconActivity;
		}
	};

	const getSeverityIcon = (severity: AppActivityEvent["severity"]) => {
		switch (severity) {
			case "error": return IconBug;
			case "warning": return IconAlertTriangle;
			case "info": return IconInfoCircle;
			case "debug": return IconEye;
			default: return IconActivity;
		}
	};

	const eventGroups = useMemo(() => {
		const groups: Record<string, AppActivityEvent[]> = {
			errors: [],
			warnings: [],
			interactions: [],
			performance: [],
			system: [],
		};

		filteredEvents.forEach(event => {
			if (event.severity === "error") {
				groups["errors"]?.push(event);
			} else if (event.severity === "warning") {
				groups["warnings"]?.push(event);
			} else if (event.metadata?.entityType === "user") {
				groups["interactions"]?.push(event);
			} else if (event.metadata?.entityType === "performance") {
				groups["performance"]?.push(event);
			} else {
				groups["system"]?.push(event);
			}
		});

		return groups;
	}, [filteredEvents]);

	const typeOptions = [
		{ value: "user", label: "User" },
		{ value: "system", label: "System" },
		{ value: "navigation", label: "Navigation" },
		{ value: "component", label: "Component" },
		{ value: "performance", label: "Performance" },
		{ value: "error", label: "Error" },
	];

	const categoryOptions = [
		{ value: "interaction", label: "Interaction" },
		{ value: "lifecycle", label: "Lifecycle" },
		{ value: "data", label: "Data" },
		{ value: "ui", label: "UI" },
		{ value: "background", label: "Background" },
	];

	const severityOptions = [
		{ value: "error", label: "Error" },
		{ value: "warning", label: "Warning" },
		{ value: "info", label: "Info" },
		{ value: "debug", label: "Debug" },
	];

	const timeRangeOptions = [
		{ value: "5", label: "Last 5 minutes" },
		{ value: "15", label: "Last 15 minutes" },
		{ value: "30", label: "Last 30 minutes" },
		{ value: "60", label: "Last hour" },
		{ value: "360", label: "Last 6 hours" },
	];

	const renderEvent = (event: AppActivityEvent) => {
		const isExpanded = expandedEvents.has(event.id);
		const TypeIcon = getTypeIcon(event.metadata?.entityType ?? event.type);
		const SeverityIcon = getSeverityIcon(event.severity);

		return (
			<Card key={event.id} padding="sm" withBorder>
				<Group justify="space-between" align="flex-start">
					<Group align="center" style={{ flex: 1, minWidth: 0 }}>
						<ActionIcon
							variant="subtle"
							size="sm"
							onClick={() => { toggleEventExpanded(event.id); }}
						>
							{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
						</ActionIcon>

						<TypeIcon size={16} color={colors.text.secondary} />
						<SeverityIcon size={14} color={getSeverityColor(event.severity)} />

						<div style={{ flex: 1, minWidth: 0 }}>
							<Group gap="xs">
								<Badge color={getSeverityColor(event.severity)} size="sm">
									{event.severity}
								</Badge>
								<Badge variant="light" size="sm">
									{event.metadata?.entityType ?? event.type}
								</Badge>
								<Badge variant="outline" size="sm">
									{event.category}
								</Badge>
							</Group>

							<Text size="sm" fw={500} truncate title={event.event}>
								{event.event}
							</Text>

							<Text size="xs" c={colors.text.secondary} truncate title={event.description}>
								{event.description}
							</Text>

							<Group gap="xs" mt={2}>
								<Text size="xs" c={colors.text.secondary}>
									<IconClock size={12} style={{ display: "inline", marginRight: 2 }} />
									{formatTimestamp(event.timestamp)}
								</Text>
								{event.duration && (
									<Text size="xs" c={colors.text.secondary}>
										{formatDuration(event.duration)}
									</Text>
								)}
								{event.metadata?.component && (
									<Text size="xs" c={colors.text.secondary}>
										{event.metadata.component}
									</Text>
								)}
							</Group>
						</div>
					</Group>

					<Group gap="xs">
						<Tooltip label="Copy event details">
							<ActionIcon
								variant="subtle"
								size="sm"
								onClick={() => { copyToClipboard(JSON.stringify(event, null, 2)); }}
							>
								<IconCopy size={14} />
							</ActionIcon>
						</Tooltip>
					</Group>
				</Group>

				<Collapse in={isExpanded}>
					<Stack gap="xs" mt="sm" pt="sm" style={{ borderTop: `1px solid ${colors.border.primary}` }}>
						<Group>
							<Text size="xs" fw={500}>Event:</Text>
							<Text size="xs" c={colors.text.secondary}>
								{event.event}
							</Text>
						</Group>

						<Group>
							<Text size="xs" fw={500}>Timestamp:</Text>
							<Text size="xs" c={colors.text.secondary}>
								{new Date(event.timestamp).toLocaleString()}
							</Text>
						</Group>

						{event.duration && (
							<Group>
								<Text size="xs" fw={500}>Duration:</Text>
								<Text size="xs" c={colors.text.secondary}>
									{formatDuration(event.duration)}
								</Text>
							</Group>
						)}

						{event.metadata && Object.keys(event.metadata).length > 0 && (
							<div>
								<Text size="xs" fw={500} mb={4}>Metadata:</Text>
								<Code block>
									{JSON.stringify(event.metadata, null, 2)}
								</Code>
							</div>
						)}
					</Stack>
				</Collapse>
			</Card>
		);
	};

	const renderEventGroup = ({ title, events, color }: { title: string; events: AppActivityEvent[]; color: string }) => {
		if (events.length === 0) return null;

		return (
			<div key={title}>
				<Group justify="space-between" mb="xs">
					<Text fw={500} size="sm">
						{title} ({events.length})
					</Text>
					<Badge color={color} variant="light" size="sm">
						{events.length}
					</Badge>
				</Group>
				<Stack gap="xs">
					{events.map(renderEvent)}
				</Stack>
			</div>
		);
	};

	const getPerformanceColor = () => {
		if (!activityStats.performanceScore) return "gray";
		if (activityStats.performanceScore >= 80) return "green";
		if (activityStats.performanceScore >= 60) return "yellow";
		return "red";
	};

	return (
		<Stack gap="md" style={{ height: "100%" }}>
			{/* Statistics Header */}
			<Card padding="sm" withBorder>
				<Stack gap="xs">
					<Group justify="space-between" align="center">
						<Text fw={500} size="sm">Application Activity</Text>
						<Group gap="xs">
							<Tooltip label="Clear old events">
								<ActionIcon variant="subtle" size="sm" onClick={clearOldEvents}>
									<IconRefresh size={14} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Clear all events">
								<ActionIcon variant="subtle" size="sm" onClick={clearAllEvents}>
									<IconClearAll size={14} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Copy all events to clipboard">
								<ActionIcon variant="subtle" size="sm" onClick={copyAllEvents}>
									<IconClipboard size={14} />
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

					{/* Activity Statistics */}
					<Group justify="space-between">
						<Group gap="lg">
							<div>
								<Text size="xs" c={colors.text.secondary}>Events (5m)</Text>
								<Text fw={500} size="sm">{activityStats.eventsLast5Min}</Text>
							</div>
							<div>
								<Text size="xs" c={colors.text.secondary}>Per Min</Text>
								<Text fw={500} size="sm">{activityStats.eventsPerMinute}</Text>
							</div>
							<div>
								<Text size="xs" c={colors.text.secondary}>Errors</Text>
								<Text fw={500} size="sm" c="red">{activityStats.errorCount}</Text>
							</div>
							<div>
								<Text size="xs" c={colors.text.secondary}>Warnings</Text>
								<Text fw={500} size="sm" c="orange">{activityStats.warningCount}</Text>
							</div>
						</Group>
					</Group>

					<Group justify="space-between">
						<div>
							<Text size="xs" c={colors.text.secondary}>User Actions</Text>
							<Text fw={500} size="sm" c="blue">{activityStats.userInteractions}</Text>
						</div>
						<div>
							<Text size="xs" c={colors.text.secondary}>Navigation</Text>
							<Text fw={500} size="sm">{activityStats.navigationEvents}</Text>
						</div>
						<div>
							<Text size="xs" c={colors.text.secondary}>Components</Text>
							<Text fw={500} size="sm">{activityStats.componentLifecycleEvents}</Text>
						</div>
						<div>
							<Text size="xs" c={colors.text.secondary}>Total</Text>
							<Text fw={500} size="sm">{activityStats.totalEvents}</Text>
						</div>
					</Group>

					{/* Performance Indicators */}
					<Group justify="space-between" align="center">
						{activityStats.memoryUsage && (
							<Group gap="xs">
								<IconBuildingBank size={16} color={colors.text.secondary} />
								<div>
									<Text size="xs" c={colors.text.secondary}>Memory</Text>
									<Text fw={500} size="sm">{formatMemory(activityStats.memoryUsage)}</Text>
								</div>
							</Group>
						)}

						{activityStats.performanceScore && (
							<Group gap="xs">
								<IconTrendingUp size={16} color={colors.text.secondary} />
								<div>
									<Text size="xs" c={colors.text.secondary}>Performance</Text>
									<Group gap="xs" align="center">
										<RingProgress
											size={24}
											thickness={3}
											sections={[{ value: activityStats.performanceScore, color: getPerformanceColor() }]}
										/>
										<Text fw={500} size="sm">{Math.round(activityStats.performanceScore)}</Text>
									</Group>
								</div>
							</Group>
						)}

						<div>
							<Text size="xs" c={colors.text.secondary}>Avg Frequency</Text>
							<Text fw={500} size="sm">{activityStats.averageEventFrequency.toFixed(1)}/min</Text>
						</div>
					</Group>
				</Stack>
			</Card>

			{/* Filters */}
			<Collapse in={showFilters}>
				<Card padding="sm" withBorder>
					<Stack gap="xs">
						<TextInput
							placeholder="Search events..."
							leftSection={<IconSearch size={14} />}
							value={filters.searchTerm}
							onChange={(e) => { setSearchTerm(e.target.value); }}
							size="sm"
						/>

						<Group grow>
							<Select
								placeholder="Type"
								data={typeOptions}
								{...(filters.type.length === 1 ? { value: filters.type[0] } : {})}
								onChange={(value) => { setTypeFilter(value ? [value] : []); }}
								clearable
								size="sm"
							/>

							<Select
								placeholder="Category"
								data={categoryOptions}
								{...(filters.category.length === 1 ? { value: filters.category[0] } : {})}
								onChange={(value) => { setCategoryFilter(value ? [value] : []); }}
								clearable
								size="sm"
							/>
						</Group>

						<Group grow>
							<Select
								placeholder="Severity"
								data={severityOptions}
								{...(filters.severity.length === 1 ? { value: filters.severity[0] } : {})}
								onChange={(value) => { setSeverityFilter(value ? [value] : []); }}
								clearable
								size="sm"
							/>

							<Select
								placeholder="Time Range"
								data={timeRangeOptions}
								value={filters.timeRange.toString()}
								onChange={(value) => { setTimeRange(value ? parseInt(value, 10) : 30); }}
								size="sm"
							/>
						</Group>

						<Group justify="flex-end">
							<Text size="sm" c="blue" style={{ cursor: "pointer" }} onClick={clearFilters}>
								Clear filters
							</Text>
						</Group>
					</Stack>
				</Card>
			</Collapse>

			{/* Event List */}
			<ScrollArea style={{ flex: 1 }} scrollbarSize={8}>
				<Stack gap="md">
					{filteredEvents.length === 0 ? (
						<Text ta="center" c={colors.text.secondary} mt="xl">
							No application events found
						</Text>
					) : (
						<>
							{renderEventGroup({ title: "Errors", events: eventGroups["errors"] ?? [], color: "red" })}
							{(eventGroups["errors"]?.length ?? 0) > 0 && <Divider />}

							{renderEventGroup({ title: "Warnings", events: eventGroups["warnings"] ?? [], color: "orange" })}
							{(eventGroups["warnings"]?.length ?? 0) > 0 && <Divider />}

							{renderEventGroup({ title: "User Interactions", events: eventGroups["interactions"] ?? [], color: "blue" })}
							{(eventGroups["interactions"]?.length ?? 0) > 0 && <Divider />}

							{renderEventGroup({ title: "Performance", events: eventGroups["performance"] ?? [], color: "yellow" })}
							{(eventGroups["performance"]?.length ?? 0) > 0 && <Divider />}

							{renderEventGroup({ title: "System Events", events: eventGroups["system"] ?? [], color: "gray" })}
						</>
					)}
				</Stack>
			</ScrollArea>
		</Stack>
	);
};

export default AppActivitySection;