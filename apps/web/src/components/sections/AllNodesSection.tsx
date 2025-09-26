/**
 * All Nodes Section component
 * Displays all nodes in the graph with grouping, filtering, and visibility controls
 */

import React, { useCallback, useMemo, useState } from "react";
import { Stack, Text, TextInput, Checkbox, Group, Button, ScrollArea, Card, Badge, ActionIcon, Tooltip, Divider, Switch } from "@mantine/core";
import { IconSearch, IconEyeOff, IconPin, IconPinnedOff, IconGitBranch, IconTrash, IconSelectAll, IconX } from "@tabler/icons-react";
import { useGraphStore } from "@/stores/graph-store";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode, EntityType } from "@academic-explorer/graph";

import {
	IconFile,
	IconUser,
	IconBook,
	IconBuilding,
	IconTag,
	IconBuildingStore,
	IconCoin,
	IconBulb,
} from "@tabler/icons-react";

const entityTypeOptions = [
	{ type: "works" satisfies EntityType, label: "Works", icon: IconFile },
	{ type: "authors" satisfies EntityType, label: "Authors", icon: IconUser },
	{ type: "sources" satisfies EntityType, label: "Sources", icon: IconBook },
	{ type: "institutions" satisfies EntityType, label: "Institutions", icon: IconBuilding },
	{ type: "topics" satisfies EntityType, label: "Topics", icon: IconTag },
	{ type: "publishers" satisfies EntityType, label: "Publishers", icon: IconBuildingStore },
	{ type: "funders" satisfies EntityType, label: "Funders", icon: IconCoin },
	{ type: "concepts" satisfies EntityType, label: "Concepts", icon: IconBulb },
] as const;

interface NodeItemProps {
  node: GraphNode;
  isSelected: boolean;
  isVisible: boolean;
  onSelect: (nodeId: string, selected: boolean) => void;
  onTogglePin: (nodeId: string) => void;
  onExpand: (nodeId: string) => void;
  onRemove: (nodeId: string) => void;
}

const NodeItem: React.FC<NodeItemProps> = ({
	node,
	isSelected,
	isVisible,
	onSelect,
	onTogglePin,
	onExpand,
	onRemove,
}) => {
	const themeColors = useThemeColors();
	const {colors} = themeColors;
	const pinnedNodes = useGraphStore((state) => state.pinnedNodes);
	const isPinned = pinnedNodes[node.id] ?? false;

	const entityTypeOption = entityTypeOptions.find(opt => opt.type === node.entityType);
	const IconComponent = entityTypeOption?.icon ?? IconFile;

	return (
		<Card
			p="xs"
			radius="sm"
			withBorder
			style={{
				opacity: isVisible ? 1 : 0.5,
				backgroundColor: isSelected ? colors.primary + "20" : colors.background.secondary,
				borderColor: isSelected ? colors.primary : colors.border.primary,
			}}
		>
			<Group justify="space-between" wrap="nowrap">
				<Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
					<Checkbox
						checked={isSelected}
						onChange={(event) => { onSelect(node.id, event.currentTarget.checked); }}
						size="sm"
					/>
					<IconComponent size={16} color={colors.text.secondary} />
					<div style={{ flex: 1, minWidth: 0 }}>
						<Text size="sm" fw={500} truncate title={node.label}>
							{node.label}
						</Text>
						<Group gap="xs">
							<Badge size="xs" variant="light" color="blue">
								{entityTypeOption?.label ?? node.entityType}
							</Badge>
						</Group>
					</div>
				</Group>

				<Group gap="xs">
					<Tooltip label={isPinned ? "Unpin node" : "Pin node"}>
						<ActionIcon
							size="sm"
							variant="subtle"
							color={isPinned ? "orange" : "gray"}
							onClick={() => { onTogglePin(node.id); }}
						>
							{isPinned ? <IconPinnedOff size={14} /> : <IconPin size={14} />}
						</ActionIcon>
					</Tooltip>

					<Tooltip label="Expand node">
						<ActionIcon
							size="sm"
							variant="subtle"
							color="green"
							onClick={() => { onExpand(node.id); }}
						>
							<IconGitBranch size={14} />
						</ActionIcon>
					</Tooltip>

					<Tooltip label="Remove node">
						<ActionIcon
							size="sm"
							variant="subtle"
							color="red"
							onClick={() => { onRemove(node.id); }}
						>
							<IconTrash size={14} />
						</ActionIcon>
					</Tooltip>
				</Group>
			</Group>
		</Card>
	);
};

export const AllNodesSection: React.FC = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [showOnlyVisible, setShowOnlyVisible] = useState(false);
	const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

	// Use stable selectors to avoid React 19 infinite loops
	const nodes = useGraphStore((state) => state.nodes);
	const visibleEntityTypes = useGraphStore((state) => state.visibleEntityTypes);
	const entityTypeStats = useGraphStore((state) => state.entityTypeStats);
	const removeNode = useGraphStore((state) => state.removeNode);
	const pinNode = useGraphStore((state) => state.pinNode);
	const unpinNode = useGraphStore((state) => state.unpinNode);
	const addToSelection = useGraphStore((state) => state.addToSelection);
	const selectNode = useGraphStore((state) => state.selectNode);

	const { expandNode } = useGraphData();

	// Convert nodes record to array
	const nodeArray = useMemo(() => {
		return Object.values(nodes);
	}, [nodes]);

	// Filter and group nodes
	const { filteredNodes, nodesByType } = useMemo(() => {
		let filtered = nodeArray;

		// Apply search filter
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filtered = filtered.filter(node =>
				node.label.toLowerCase().includes(searchLower) ||
        node.id.toLowerCase().includes(searchLower)
			);
		}

		// Apply visibility filter
		if (showOnlyVisible) {
			filtered = filtered.filter(node =>
				visibleEntityTypes[node.entityType]
			);
		}

		// Group by entity type
		const grouped = filtered.reduce<Partial<Record<EntityType, GraphNode[]>>>((acc, node) => {
			const {entityType: type} = node;
			if (!(type in acc)) {
				acc[type] = [];
			}
			const nodeArray = acc[type];
			if (nodeArray) {
				nodeArray.push(node);
			}
			return acc;
		}, {});

		return {
			filteredNodes: filtered,
			nodesByType: grouped
		};
	}, [nodeArray, searchTerm, showOnlyVisible, visibleEntityTypes]);

	const handleSelectNode = useCallback((nodeId: string, selected: boolean) => {
		setSelectedNodeIds(prev => {
			const newSet = new Set(prev);
			if (selected) {
				newSet.add(nodeId);
			} else {
				newSet.delete(nodeId);
			}
			return newSet;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		if (selectedNodeIds.size === filteredNodes.length) {
			setSelectedNodeIds(new Set());
		} else {
			setSelectedNodeIds(new Set(filteredNodes.map(node => node.id)));
		}
	}, [selectedNodeIds.size, filteredNodes]);

	const handleTogglePin = useCallback((nodeId: string) => {
		const {pinnedNodes} = useGraphStore.getState();
		if (pinnedNodes[nodeId]) {
			unpinNode(nodeId);
		} else {
			pinNode(nodeId);
		}
	}, [pinNode, unpinNode]);

	const handleExpandNode = useCallback(async (nodeId: string) => {
		try {
			logger.debug("graph", "Expanding node from AllNodesSection", { nodeId });
			await expandNode(nodeId, {
				depth: 1,
				limit: 10,
				force: false
			});
		} catch (error) {
			logger.error("graph", "Failed to expand node from AllNodesSection", {
				nodeId,
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	}, [expandNode]);

	const handleRemoveNode = useCallback((nodeId: string) => {
		logger.debug("graph", "Removing node from AllNodesSection", { nodeId });
		removeNode(nodeId);
		setSelectedNodeIds(prev => {
			const newSet = new Set(prev);
			newSet.delete(nodeId);
			return newSet;
		});
	}, [removeNode]);

	const handleBatchActions = useCallback((action: "pin" | "unpin" | "expand" | "remove" | "select") => {
		const selectedNodes = filteredNodes.filter(node => selectedNodeIds.has(node.id));

		logger.debug("graph", "Batch action on nodes", {
			action,
			nodeCount: selectedNodes.length,
			nodeIds: selectedNodes.map(n => n.id)
		});

		switch (action) {
			case "pin":
				selectedNodes.forEach(node => { pinNode(node.id); });
				break;
			case "unpin":
				selectedNodes.forEach(node => { unpinNode(node.id); });
				break;
			case "expand":
				selectedNodes.forEach(node => {
					handleExpandNode(node.id).catch((error: unknown) => {
						logger.error("graph", "Batch expand failed for node", {
							nodeId: node.id,
							error: error instanceof Error ? error.message : "Unknown error"
						});
					});
				});
				break;
			case "remove":
				selectedNodes.forEach(node => { removeNode(node.id); });
				setSelectedNodeIds(new Set());
				break;
			case "select":
				selectedNodes.forEach(node => { addToSelection(node.id); });
				if (selectedNodes.length > 0) {
					selectNode(selectedNodes[0]?.id ?? null);
				}
				break;
		}
	}, [selectedNodeIds, filteredNodes, pinNode, unpinNode, removeNode, addToSelection, selectNode, handleExpandNode]);

	return (
		<Stack gap="md" p="md">
			<div>
				<Text fw={600} size="lg">All Nodes</Text>
				<Text size="sm" c="dimmed">
					{filteredNodes.length} of {nodeArray.length} nodes
					{selectedNodeIds.size > 0 && ` (${selectedNodeIds.size.toString()} selected)`}
				</Text>
			</div>

			<Stack gap="sm">
				<TextInput
					placeholder="Search nodes..."
					value={searchTerm}
					onChange={(event) => { setSearchTerm(event.currentTarget.value); }}
					leftSection={<IconSearch size={16} />}
					rightSection={
						searchTerm && (
							<ActionIcon size="sm" variant="subtle" onClick={() => { setSearchTerm(""); }}>
								<IconX size={14} />
							</ActionIcon>
						)
					}
				/>

				<Group justify="space-between">
					<Switch
						label="Show only visible"
						checked={showOnlyVisible}
						onChange={(event) => { setShowOnlyVisible(event.currentTarget.checked); }}
						size="sm"
					/>

					<Button
						size="xs"
						variant="subtle"
						leftSection={<IconSelectAll size={14} />}
						onClick={handleSelectAll}
					>
						{selectedNodeIds.size === filteredNodes.length ? "Deselect All" : "Select All"}
					</Button>
				</Group>

				{selectedNodeIds.size > 0 && (
					<Group gap="xs">
						<Text size="xs" c="dimmed">Batch actions:</Text>
						<Button size="xs" variant="light" onClick={() => { handleBatchActions("pin"); }}>
              Pin
						</Button>
						<Button size="xs" variant="light" onClick={() => { handleBatchActions("unpin"); }}>
              Unpin
						</Button>
						<Button size="xs" variant="light" onClick={() => { handleBatchActions("expand"); }}>
              Expand
						</Button>
						<Button size="xs" variant="light" onClick={() => { handleBatchActions("select"); }}>
              Select in Graph
						</Button>
						<Button size="xs" variant="light" color="red" onClick={() => { handleBatchActions("remove"); }}>
              Remove
						</Button>
					</Group>
				)}
			</Stack>

			<Divider />

			<ScrollArea style={{ height: "calc(100vh - 400px)" }}>
				<Stack gap="md">
					{entityTypeOptions.map(({ type, label, icon: IconComponent }) => {
						const typeNodes = nodesByType[type] ?? [];
						const totalCount = entityTypeStats[type];
						const visibleCount = typeNodes.length; // Use actual visible count from filtered nodes
						const isTypeVisible = visibleEntityTypes[type];

						if (typeNodes.length === 0) return null;

						return (
							<div key={type}>
								<Group justify="space-between" mb="xs">
									<Group gap="xs">
										<IconComponent size={16} />
										<Text fw={500} size="sm">{label}</Text>
										<Badge size="sm" variant="light">
											{typeNodes.length}
										</Badge>
									</Group>
									<Group gap="xs">
										<Text size="xs" c="dimmed">
											{visibleCount}/{totalCount} visible
										</Text>
										{!isTypeVisible && (
											<IconEyeOff size={14} color="gray" />
										)}
									</Group>
								</Group>

								<Stack gap="xs">
									{typeNodes.map(node => (
										<NodeItem
											key={node.id}
											node={node}
											isSelected={selectedNodeIds.has(node.id)}
											isVisible={isTypeVisible}
											onSelect={handleSelectNode}
											onTogglePin={handleTogglePin}
											onExpand={(nodeId: string) => { void handleExpandNode(nodeId); }}
											onRemove={handleRemoveNode}
										/>
									))}
								</Stack>
							</div>
						);
					})}

					{filteredNodes.length === 0 && (
						<Text ta="center" c="dimmed" py="xl">
              No nodes found
						</Text>
					)}
				</Stack>
			</ScrollArea>
		</Stack>
	);
};