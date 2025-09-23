/**
 * All Edges Section component
 * Displays all edges in the graph with grouping, filtering, and visibility controls
 */

import React, { useCallback, useMemo, useState } from "react";
import { Stack, Text, TextInput, Checkbox, Group, Button, ScrollArea, Card, Badge, ActionIcon, Tooltip, Divider, Switch } from "@mantine/core";
import { IconSearch, IconEyeOff, IconTrash, IconSelectAll, IconX, IconArrowRight, IconTarget } from "@tabler/icons-react";
import { useGraphStore } from "@/stores/graph-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/shared-utils/logger";
import type { GraphEdge } from "@academic-explorer/graph";
import { RelationType } from "@academic-explorer/graph";

import {
	IconPencil,
	IconUsers,
	IconBook,
	IconCoin,
	IconQuote,
	IconLink,
	IconBuilding,
	IconBuildingStore,
	IconTag,
	IconMapPin,
	IconBulb,
} from "@tabler/icons-react";

const relationTypeOptions = [
	{ type: RelationType.AUTHORED, label: "Authored", icon: IconPencil, description: "Author → Work" },
	{ type: RelationType.AFFILIATED, label: "Affiliated", icon: IconUsers, description: "Author → Institution" },
	{ type: RelationType.PUBLISHED_IN, label: "Published In", icon: IconBook, description: "Work → Source" },
	{ type: RelationType.FUNDED_BY, label: "Funded By", icon: IconCoin, description: "Work → Funder" },
	{ type: RelationType.REFERENCES, label: "References", icon: IconQuote, description: "Work → Work" },
	{ type: RelationType.SOURCE_PUBLISHED_BY, label: "Source Published By", icon: IconBuildingStore, description: "Source → Publisher" },
	{ type: RelationType.INSTITUTION_CHILD_OF, label: "Institution Child Of", icon: IconBuilding, description: "Institution → Parent" },
	{ type: RelationType.PUBLISHER_CHILD_OF, label: "Publisher Child Of", icon: IconBuildingStore, description: "Publisher → Parent" },
	{ type: RelationType.WORK_HAS_TOPIC, label: "Work Has Topic", icon: IconTag, description: "Work → Topic" },
	{ type: RelationType.WORK_HAS_KEYWORD, label: "Work Has Keyword", icon: IconTag, description: "Work → Keyword" },
	{ type: RelationType.AUTHOR_RESEARCHES, label: "Author Researches", icon: IconBulb, description: "Author → Topic" },
	{ type: RelationType.INSTITUTION_LOCATED_IN, label: "Institution Located In", icon: IconMapPin, description: "Institution → Location" },
	{ type: RelationType.FUNDER_LOCATED_IN, label: "Funder Located In", icon: IconMapPin, description: "Funder → Location" },
	{ type: RelationType.TOPIC_PART_OF_FIELD, label: "Topic Part Of Field", icon: IconBulb, description: "Topic → Field" },
	{ type: RelationType.RELATED_TO, label: "Related To", icon: IconLink, description: "General relation" },
];

interface EdgeItemProps {
  edge: GraphEdge;
  isSelected: boolean;
  isVisible: boolean;
  sourceNodeLabel?: string;
  targetNodeLabel?: string;
  onSelect: (edgeId: string, selected: boolean) => void;
  onHighlight: (edgeId: string) => void;
  onRemove: (edgeId: string) => void;
}

const EdgeItem: React.FC<EdgeItemProps> = ({
	edge,
	isSelected,
	isVisible,
	sourceNodeLabel,
	targetNodeLabel,
	onSelect,
	onHighlight,
	onRemove,
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	const relationTypeOption = relationTypeOptions.find(opt => opt.type === edge.type);
	const IconComponent = relationTypeOption?.icon || IconLink;

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
						onChange={(event) => { onSelect(edge.id, event.currentTarget.checked); }}
						size="sm"
					/>
					<IconComponent size={16} color={colors.text.secondary} />
					<div style={{ flex: 1, minWidth: 0 }}>
						<Group gap="xs" mb="xs">
							<Text size="sm" fw={500}>
								{relationTypeOption?.label || edge.type}
							</Text>
							{edge.weight && (
								<Badge size="xs" variant="light" color="blue">
                  Weight: {edge.weight.toFixed(2)}
								</Badge>
							)}
						</Group>
						<Group gap="xs" align="center">
							<Text size="xs" c="dimmed" truncate style={{ maxWidth: "80px" }} title={sourceNodeLabel}>
								{sourceNodeLabel || edge.source}
							</Text>
							<IconArrowRight size={12} color={colors.text.secondary} />
							<Text size="xs" c="dimmed" truncate style={{ maxWidth: "80px" }} title={targetNodeLabel}>
								{targetNodeLabel || edge.target}
							</Text>
						</Group>
						{relationTypeOption?.description && (
							<Text size="xs" c="dimmed" fs="italic">
								{relationTypeOption.description}
							</Text>
						)}
					</div>
				</Group>

				<Group gap="xs">
					<Tooltip label="Highlight endpoints">
						<ActionIcon
							size="sm"
							variant="subtle"
							color="blue"
							onClick={() => { onHighlight(edge.id); }}
						>
							<IconTarget size={14} />
						</ActionIcon>
					</Tooltip>

					<Tooltip label="Remove edge">
						<ActionIcon
							size="sm"
							variant="subtle"
							color="red"
							onClick={() => { onRemove(edge.id); }}
						>
							<IconTrash size={14} />
						</ActionIcon>
					</Tooltip>
				</Group>
			</Group>
		</Card>
	);
};

export const AllEdgesSection: React.FC = () => {
	const [searchTerm, setSearchTerm] = useState("");
	const [showOnlyVisible, setShowOnlyVisible] = useState(false);
	const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

	// Use stable selectors to avoid React 19 infinite loops
	const edges = useGraphStore((state) => state.edges);
	const nodes = useGraphStore((state) => state.nodes);
	const edgeTypeStats = useGraphStore((state) => state.edgeTypeStats);
	const removeEdge = useGraphStore((state) => state.removeEdge);
	const selectNode = useGraphStore((state) => state.selectNode);
	const addToSelection = useGraphStore((state) => state.addToSelection);
	const clearSelection = useGraphStore((state) => state.clearSelection);

	// Convert edges record to array
	const edgeArray = useMemo(() => {
		return Object.values(edges).filter((edge): edge is GraphEdge => edge !== undefined);
	}, [edges]);

	// Get node labels for display
	const getNodeLabel = useCallback((nodeId: string) => {
		const node = nodes[nodeId];
		return node?.label || nodeId;
	}, [nodes]);

	// Filter and group edges
	const { filteredEdges, edgesByType } = useMemo(() => {
		let filtered = edgeArray;

		// Apply search filter
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filtered = filtered.filter(edge => {
				const sourceLabel = getNodeLabel(edge.source).toLowerCase();
				const targetLabel = getNodeLabel(edge.target).toLowerCase();
				const edgeType = edge.type.toLowerCase();
				const edgeLabel = edge.label?.toLowerCase() || "";

				return sourceLabel.includes(searchLower) ||
               targetLabel.includes(searchLower) ||
               edgeType.includes(searchLower) ||
               edgeLabel.includes(searchLower) ||
               edge.id.toLowerCase().includes(searchLower);
			});
		}

		// Apply visibility filter
		if (showOnlyVisible) {
			filtered = filtered.filter(edge => {
				const visibleCount = edgeTypeStats.visible[edge.type] || 0;
				return visibleCount > 0;
			});
		}

		// Group by edge type
		const grouped = filtered.reduce<Partial<Record<RelationType, GraphEdge[]>>>((acc, edge) => {
			const type = edge.type;
			if (!(type in acc)) {
				acc[type] = [];
			}
			const edgeArray = acc[type];
			if (edgeArray) {
				edgeArray.push(edge);
			}
			return acc;
		}, {});

		return {
			filteredEdges: filtered,
			edgesByType: grouped
		};
	}, [edgeArray, searchTerm, showOnlyVisible, edgeTypeStats, getNodeLabel]);

	const handleSelectEdge = useCallback((edgeId: string, selected: boolean) => {
		setSelectedEdgeIds(prev => {
			const newSet = new Set(prev);
			if (selected) {
				newSet.add(edgeId);
			} else {
				newSet.delete(edgeId);
			}
			return newSet;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		if (selectedEdgeIds.size === filteredEdges.length) {
			setSelectedEdgeIds(new Set());
		} else {
			setSelectedEdgeIds(new Set(filteredEdges.map(edge => edge.id)));
		}
	}, [selectedEdgeIds.size, filteredEdges]);

	const handleHighlightEdge = useCallback((edgeId: string) => {
		const edge = edges[edgeId];
		if (edge) {
			logger.debug("graph", "Highlighting edge endpoints", {
				edgeId,
				source: edge.source,
				target: edge.target
			});

			// Clear previous selection and select both endpoints
			clearSelection();
			addToSelection(edge.source);
			addToSelection(edge.target);

			// Set primary selection to source node
			selectNode(edge.source);
		}
	}, [edges, clearSelection, addToSelection, selectNode]);

	const handleRemoveEdge = useCallback((edgeId: string) => {
		logger.debug("graph", "Removing edge from AllEdgesSection", { edgeId });
		removeEdge(edgeId);
		setSelectedEdgeIds(prev => {
			const newSet = new Set(prev);
			newSet.delete(edgeId);
			return newSet;
		});
	}, [removeEdge]);

	const handleBatchActions = useCallback((action: "highlight" | "remove") => {
		const selectedEdges = filteredEdges.filter(edge => selectedEdgeIds.has(edge.id));

		logger.debug("graph", "Batch action on edges", {
			action,
			edgeCount: selectedEdges.length,
			edgeIds: selectedEdges.map(e => e.id)
		});

		switch (action) {
			case "highlight": {
				// Collect all unique nodes from selected edges
				const nodeIds = new Set<string>();
				selectedEdges.forEach(edge => {
					nodeIds.add(edge.source);
					nodeIds.add(edge.target);
				});

				clearSelection();
				Array.from(nodeIds).forEach(id => { addToSelection(id); });
				if (nodeIds.size > 0) {
					selectNode(Array.from(nodeIds)[0]);
				}
				break;
			}
			case "remove":
				selectedEdges.forEach(edge => { removeEdge(edge.id); });
				setSelectedEdgeIds(new Set());
				break;
		}
	}, [selectedEdgeIds, filteredEdges, removeEdge, clearSelection, addToSelection, selectNode]);

	return (
		<Stack gap="md" p="md">
			<div>
				<Text fw={600} size="lg">All Edges</Text>
				<Text size="sm" c="dimmed">
					{filteredEdges.length} of {edgeArray.length} edges
					{selectedEdgeIds.size > 0 && ` (${selectedEdgeIds.size.toString()} selected)`}
				</Text>
			</div>

			<Stack gap="sm">
				<TextInput
					placeholder="Search edges, nodes, or types..."
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
						{selectedEdgeIds.size === filteredEdges.length ? "Deselect All" : "Select All"}
					</Button>
				</Group>

				{selectedEdgeIds.size > 0 && (
					<Group gap="xs">
						<Text size="xs" c="dimmed">Batch actions:</Text>
						<Button size="xs" variant="light" onClick={() => { handleBatchActions("highlight"); }}>
              Highlight Endpoints
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
					{relationTypeOptions.map(({ type, label, icon: IconComponent, description }) => {
						const typeEdges = edgesByType[type] || [];
						const totalCount = edgeTypeStats.total[type] || 0;
						const visibleCount = edgeTypeStats.visible[type] || 0;
						const isTypeVisible = visibleCount > 0;

						if (typeEdges.length === 0) return null;

						return (
							<div key={type}>
								<Group justify="space-between" mb="xs">
									<Group gap="xs">
										<IconComponent size={16} />
										<Text fw={500} size="sm">{label}</Text>
										<Badge size="sm" variant="light">
											{typeEdges.length}
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

								<Text size="xs" c="dimmed" mb="xs" fs="italic">
									{description}
								</Text>

								<Stack gap="xs">
									{typeEdges.map(edge => (
										<EdgeItem
											key={edge.id}
											edge={edge}
											isSelected={selectedEdgeIds.has(edge.id)}
											isVisible={isTypeVisible}
											sourceNodeLabel={getNodeLabel(edge.source)}
											targetNodeLabel={getNodeLabel(edge.target)}
											onSelect={handleSelectEdge}
											onHighlight={handleHighlightEdge}
											onRemove={handleRemoveEdge}
										/>
									))}
								</Stack>
							</div>
						);
					})}

					{filteredEdges.length === 0 && (
						<Text ta="center" c="dimmed" py="xl">
              No edges found
						</Text>
					)}
				</Stack>
			</ScrollArea>
		</Stack>
	);
};