/**
 * Node Repository Section component
 * Displays repository nodes that can be dragged into the graph
 */

import React, { useCallback, useMemo } from "react";
import { Stack, Text, TextInput, Checkbox, Group, Button, ScrollArea, Card, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { IconSearch, IconTrash, IconDragDrop, IconSelectAll, IconX } from "@tabler/icons-react";
import { useRepositoryStore } from "@/stores/repository-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/shared-utils/logger";
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

// Properly typed entity options without type assertions
const entityTypeOptions: Array<{ type: EntityType; label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = [
	{ type: "works", label: "Works", icon: IconFile },
	{ type: "authors", label: "Authors", icon: IconUser },
	{ type: "sources", label: "Sources", icon: IconBook },
	{ type: "institutions", label: "Institutions", icon: IconBuilding },
	{ type: "topics", label: "Topics", icon: IconTag },
	{ type: "publishers", label: "Publishers", icon: IconBuildingStore },
	{ type: "funders", label: "Funders", icon: IconCoin },
	{ type: "concepts", label: "Concepts", icon: IconBulb },
];

interface NodeRepositoryItemProps {
  node: GraphNode;
  isSelected: boolean;
  onSelect: (nodeId: string, selected: boolean) => void;
  onRemove: (nodeId: string) => void;
}

const NodeRepositoryItem: React.FC<NodeRepositoryItemProps> = ({
	node,
	isSelected,
	onSelect,
	onRemove,
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	// Get icon for entity type
	const entityOption = entityTypeOptions.find(option => option.type === node.type);
	const Icon = entityOption?.icon || IconFile;

	const handleDragStart = useCallback((event: React.DragEvent) => {
		// Store node data for drop handler
		event.dataTransfer.setData("application/json", JSON.stringify({
			type: "repository-node",
			node: node
		}));
		event.dataTransfer.effectAllowed = "copy";

		logger.debug("repository", "Started dragging repository node", {
			nodeId: node.id,
			nodeType: node.type,
			nodeLabel: node.label
		});
	}, [node]);

	const handleCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		onSelect(node.id, event.currentTarget.checked);
	}, [node.id, onSelect]);

	const handleRemove = useCallback(() => {
		onRemove(node.id);
	}, [node.id, onRemove]);

	return (
		<Card
			padding="xs"
			withBorder
			style={{
				cursor: "grab",
				backgroundColor: isSelected ? colors.primary + "20" : colors.background.primary,
				borderColor: isSelected ? colors.primary : colors.border.primary,
				marginBottom: "4px",
			}}
			draggable="true"
			onDragStart={handleDragStart}
		>
			<Group gap="xs" wrap="nowrap">
				<Checkbox
					checked={isSelected}
					onChange={handleCheckboxChange}
					size="sm"
				/>

				<Icon size={16} style={{ color: colors.text.secondary, flexShrink: 0 }} />

				<div style={{ flex: 1, minWidth: 0 }}>
					<Text size="sm" style={{ fontWeight: 500, color: colors.text.primary }} truncate>
						{node.label}
					</Text>
					<Text size="xs" style={{ color: colors.text.secondary }}>
						{entityOption?.label || node.type}
					</Text>
				</div>

				<Group gap="xs">
					<Tooltip label="Drag to graph">
						<div style={{ color: colors.text.tertiary }}>
							<IconDragDrop size={14} />
						</div>
					</Tooltip>

					<Tooltip label="Remove from repository">
						<ActionIcon
							size="sm"
							variant="subtle"
							color="red"
							onClick={handleRemove}
						>
							<IconTrash size={12} />
						</ActionIcon>
					</Tooltip>
				</Group>
			</Group>
		</Card>
	);
};

export const NodeRepositorySection: React.FC = () => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	// Repository store
	const repositoryStore = useRepositoryStore();
	const searchQuery = repositoryStore.searchQuery;
	const nodeTypeFilter = repositoryStore.nodeTypeFilter;
	const selectedRepositoryNodes = repositoryStore.selectedRepositoryNodes;
	const setSearchQuery = repositoryStore.setSearchQuery;
	const setNodeTypeFilter = repositoryStore.setNodeTypeFilter;
	const selectRepositoryNode = repositoryStore.selectRepositoryNode;
	const selectAllNodes = repositoryStore.selectAllNodes;
	const clearAllSelections = repositoryStore.clearAllSelections;
	const removeFromRepository = repositoryStore.removeFromRepository;
	const getFilteredNodes = repositoryStore.getFilteredNodes;
	const getSelectedNodes = repositoryStore.getSelectedNodes;
	const recomputeFilteredNodes = repositoryStore.recomputeFilteredNodes;

	// Get filtered nodes (stable reference from store)
	const filteredNodes = useMemo(() => {
		// Trigger recomputation to ensure cache is fresh
		recomputeFilteredNodes();
		return getFilteredNodes();
	}, [getFilteredNodes, recomputeFilteredNodes]);

	const selectedNodes = useMemo(() => {
		return getSelectedNodes();
	}, [getSelectedNodes]);

	const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(event.currentTarget.value);
	}, [setSearchQuery]);

	const handleTypeFilterChange = useCallback((entityType: EntityType, checked: boolean) => {
		setNodeTypeFilter(entityType, checked);
	}, [setNodeTypeFilter]);

	const handleSelectAll = useCallback(() => {
		selectAllNodes();
	}, [selectAllNodes]);

	const handleClearSelection = useCallback(() => {
		clearAllSelections();
	}, [clearAllSelections]);

	const handleRemoveSelected = useCallback(() => {
		const selectedNodeIds = Object.keys(selectedRepositoryNodes);
		if (selectedNodeIds.length > 0) {
			removeFromRepository(selectedNodeIds);
			logger.debug("repository", "Removed selected nodes from repository", {
				removedCount: selectedNodeIds.length
			});
		}
	}, [selectedRepositoryNodes, removeFromRepository]);

	const handleRemoveNode = useCallback((nodeId: string) => {
		removeFromRepository([nodeId]);
		logger.debug("repository", "Removed single node from repository", { nodeId });
	}, [removeFromRepository]);

	return (
		<Stack gap="sm" style={{ height: "100%", overflow: "hidden" }}>
			{/* Search */}
			<TextInput
				placeholder="Search repository nodes..."
				leftSection={<IconSearch size={16} />}
				value={searchQuery}
				onChange={handleSearchChange}
				size="sm"
			/>

			{/* Type filters */}
			<Stack gap="xs">
				<Text size="sm" style={{ fontWeight: 500, color: colors.text.primary }}>
          Filter by type:
				</Text>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
					{entityTypeOptions.map(option => {
						const Icon = option.icon;
						const isChecked = nodeTypeFilter[option.type];

						return (
							<Checkbox
								key={option.type}
								checked={isChecked}
								onChange={(event) => { handleTypeFilterChange(option.type, event.currentTarget.checked); }}
								label={
									<Group gap="xs">
										<Icon size={14} />
										<Text size="xs">{option.label}</Text>
									</Group>
								}
								size="xs"
							/>
						);
					})}
				</div>
			</Stack>

			{/* Selection controls */}
			<Group gap="xs">
				<Button
					size="xs"
					variant="subtle"
					leftSection={<IconSelectAll size={14} />}
					onClick={handleSelectAll}
					disabled={filteredNodes.length === 0}
				>
          All
				</Button>

				<Button
					size="xs"
					variant="subtle"
					leftSection={<IconX size={14} />}
					onClick={handleClearSelection}
					disabled={selectedNodes.length === 0}
				>
          None
				</Button>

				<Button
					size="xs"
					variant="subtle"
					color="red"
					leftSection={<IconTrash size={14} />}
					onClick={handleRemoveSelected}
					disabled={selectedNodes.length === 0}
				>
          Remove
				</Button>
			</Group>

			{/* Results summary */}
			<Group gap="xs" justify="space-between">
				<Text size="xs" style={{ color: colors.text.secondary }}>
					{filteredNodes.length} node{filteredNodes.length !== 1 ? "s" : ""}
				</Text>
				{selectedNodes.length > 0 && (
					<Badge size="xs" color="blue">
						{selectedNodes.length} selected
					</Badge>
				)}
			</Group>

			{/* Node list */}
			<ScrollArea style={{ flex: 1 }}>
				<Stack gap="xs">
					{filteredNodes.length === 0 ? (
						<Text size="sm" style={{ color: colors.text.tertiary, textAlign: "center", padding: "20px" }}>
              No nodes in repository.
              Search for entities to add them here.
						</Text>
					) : (
						filteredNodes.map(node => (
							<NodeRepositoryItem
								key={node.id}
								node={node}
								isSelected={selectedRepositoryNodes[node.id] ?? false}
								onSelect={selectRepositoryNode}
								onRemove={handleRemoveNode}
							/>
						))
					)}
				</Stack>
			</ScrollArea>

			{/* Drag instructions */}
			{filteredNodes.length > 0 && (
				<Group justify="center" gap="xs" style={{ padding: "8px" }}>
					<IconBulb size={12} style={{ color: colors.text.tertiary }} />
					<Text size="xs" style={{ color: colors.text.tertiary }}>
            Drag nodes to the graph to add them
					</Text>
				</Group>
			)}
		</Stack>
	);
};