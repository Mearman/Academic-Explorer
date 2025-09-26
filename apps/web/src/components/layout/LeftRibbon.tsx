/**
 * Left ribbon component for collapsed left sidebar
 * Shows icon-only navigation with tool groups using VSCode-style groups
 */

import React, { useMemo } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useLayoutStore } from "@/stores/layout-store";
import { getGroupDefinition, createNewGroup, updateGroupDefinition, getRegistryVersion } from "@/stores/group-registry";
import { getSectionById } from "@/stores/section-registry";
import { GroupRibbonButton } from "@/components/layout/GroupRibbonButton";
import { logger } from "@academic-explorer/utils/logger";
import { IconTrash } from "@tabler/icons-react";

export const LeftRibbon: React.FC = () => {
	const graphData = useGraphData();
	const {clearGraph} = graphData;
	const themeColors = useThemeColors();
	const {colors} = themeColors;
	const layoutStore = useLayoutStore();
	// const expandSidebarToSection = layoutStore.expandSidebarToSection; // Not used in group-based layout
	const {getToolGroupsForSidebar} = layoutStore;
	const {getActiveGroup} = layoutStore;
	const {setActiveGroup} = layoutStore;
	const {addSectionToGroup} = layoutStore;

	// State for drag and drop visual feedback
	const [isDragging, setIsDragging] = React.useState(false);
	const [draggedGroupId, setDraggedGroupId] = React.useState<string | null>(null);
	const [dropInsertionIndex, setDropInsertionIndex] = React.useState<number | null>(null);

	// Get tool groups for left sidebar
	const toolGroups = getToolGroupsForSidebar("left");
	const activeGroupId = getActiveGroup("left");
	const registryVersion = getRegistryVersion();
	const groupDefinitions = useMemo(() => {
		const definitions = Object.keys(toolGroups)
			.map(groupId => getGroupDefinition(groupId))
			.filter((def): def is NonNullable<typeof def> => def !== undefined)
			.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

		logger.debug("ui", "Left ribbon group definitions", {
			toolGroups,
			groupKeys: Object.keys(toolGroups),
			definitions: definitions.map(d => ({ id: d.id, title: d.title, order: d.order })),
			activeGroupId,
			registryVersion
		});

		return definitions;
	}, [toolGroups, activeGroupId, registryVersion]);

	const handleClearGraph = () => {
		logger.debug("ui", "Clear graph clicked from left ribbon");
		clearGraph();
	};

	const handleGroupActivate = (groupId: string) => {
		logger.debug("ui", `Activating group ${groupId} for left sidebar`, { groupId });

		// Check if group exists before activating
		const currentToolGroups = getToolGroupsForSidebar("left");
		const groupExists = Boolean(currentToolGroups[groupId]);

		logger.debug("ui", `Group ${groupId} exists: ${groupExists ? "true" : "false"}`, {
			groupId,
			groupExists,
			currentGroups: Object.keys(currentToolGroups)
		});

		if (!groupExists) {
			logger.warn("ui", `Cannot activate group ${groupId} - it does not exist`, {
				groupId,
				availableGroups: Object.keys(currentToolGroups)
			});
			return;
		}

		// Check if this group is already active and sidebar is open - if so, toggle sidebar
		const isCurrentlyActive = activeGroupId === groupId;
		const isCurrentlyOpen = layoutStore.leftSidebarOpen;

		if (isCurrentlyActive && isCurrentlyOpen) {
			logger.debug("ui", `Toggling sidebar closed for active group ${groupId}`);
			layoutStore.setLeftSidebarOpen(false);
			return;
		}

		// Activate the group and expand sidebar
		setActiveGroup("left", groupId);
		layoutStore.setLeftSidebarOpen(true);

		logger.debug("ui", `Sidebar should now be open for group ${groupId}`);

		// Scroll to top after a brief delay to allow sidebar to expand
		setTimeout(() => {
			// Find the left sidebar container and scroll to top
			const sidebarContainer = document.querySelector('[data-mantine-component="AppShell"] > nav');
			if (sidebarContainer) {
				const scrollableElement = sidebarContainer.querySelector('[style*="overflow: auto"]') ?? sidebarContainer;
				if (scrollableElement instanceof HTMLElement) {
					scrollableElement.scrollTop = 0;
				}
			}
		}, 150); // Small delay to allow expansion animation
	};

	const handleGroupReorder = (sourceGroupId: string, targetGroupId: string, insertBefore: boolean, _event: React.DragEvent) => {
		logger.debug("ui", `LeftRibbon: Reordering group ${sourceGroupId} relative to ${targetGroupId}`, {
			sourceGroupId,
			targetGroupId,
			insertBefore,
			side: "left",
			currentOrder: groupDefinitions.map(g => ({ id: g.id, order: g.order }))
		});

		layoutStore.reorderGroups("left", sourceGroupId, targetGroupId, insertBefore);

		// Reset drag state
		setIsDragging(false);
		setDraggedGroupId(null);
		setDropInsertionIndex(null);
	};

	const handleGroupDragStart = (groupId: string) => {
		setIsDragging(true);
		setDraggedGroupId(groupId);
		logger.debug("ui", `Starting group drag for ${groupId}`, { groupId, side: "left" });
	};

	const handleGroupDragEnd = () => {
		setIsDragging(false);
		setDraggedGroupId(null);
		setDropInsertionIndex(null);
	};

	const handleDropZoneHover = (insertionIndex: number, hasGroupDrag: boolean = false) => {
		if (isDragging || hasGroupDrag) {
			setDropInsertionIndex(insertionIndex);
		}
	};

	const handleDropZoneLeave = () => {
		setDropInsertionIndex(null);
	};

	// DropZone component for insertion indicators
	const DropZone: React.FC<{ index: number; isActive: boolean }> = ({ index, isActive }) => {
		const [hasGroupDrag, setHasGroupDrag] = React.useState(false);

		const handleDragOver = (e: React.DragEvent) => {
			e.preventDefault();

			// Check if this is a group reorder drag
			const isGroupReorder = e.dataTransfer.types.includes("application/group-reorder");

			if (isGroupReorder) {
				setHasGroupDrag(true);
				logger.debug("ui", `LeftRibbon DropZone ${String(index)} detected group drag`, {
					index,
					hasGroupDrag,
					isDragging
				});
			}

			handleDropZoneHover(index, isGroupReorder);
		};

		const handleDragLeave = () => {
			// Only reset if we're actually leaving the drop zone
			setHasGroupDrag(false);
			handleDropZoneLeave();
		};

		// Show drop zone if there's a local drag OR if this drop zone detects a group drag AND it's active
		const shouldShowDropZone = (isDragging || hasGroupDrag) && isActive;

		return (
			<div
				role="button"
				tabIndex={0}
				aria-label={`Drop zone ${index} - Drop group here to reorder`}
				style={{
					height: shouldShowDropZone ? "40px" : "0px",
					width: shouldShowDropZone ? "40px" : "40px",
					backgroundColor: shouldShowDropZone ? colors.primary : "transparent",
					transition: "all 0.2s ease",
					borderRadius: "8px",
					margin: shouldShowDropZone ? "2px 0" : "0px",
					opacity: shouldShowDropZone ? 1 : 0,
					border: shouldShowDropZone ? `2px solid ${colors.primary}` : "none",
					pointerEvents: "auto",
					overflow: "hidden",
					// Add invisible padding for hit area when collapsed, offset by negative margin
					padding: shouldShowDropZone ? "0" : "10px 0",
					marginTop: shouldShowDropZone ? "2px" : "-10px",
					marginBottom: shouldShowDropZone ? "2px" : "-10px",
				}}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={(e) => {
					e.preventDefault();
					logger.debug("ui", `LeftRibbon drop zone ${String(index)} received drop`, {
						index,
						types: Array.from(e.dataTransfer.types),
						isDragging,
						draggedGroupId
					});
					const groupReorderData = e.dataTransfer.getData("application/group-reorder");
					if (groupReorderData) {
						logger.debug("ui", `Drop zone ${String(index)} processing reorder/move`, {
							sourceGroupId: groupReorderData,
							insertionIndex: index,
							totalGroups: groupDefinitions.length,
							targetSidebar: "left"
						});

						// Check if this group is from the same sidebar (reorder) or different sidebar (move)
						const leftGroups = getToolGroupsForSidebar("left");
						const isFromSameSidebar = Boolean(leftGroups[groupReorderData]);

						if (index === 0) {
						// Dropping at the beginning
							const firstGroup = groupDefinitions[0];
							if (firstGroup.id !== groupReorderData) {
								if (isFromSameSidebar) {
									handleGroupReorder(groupReorderData, firstGroup.id, true, e);
								} else {
									layoutStore.moveGroupToSidebar(groupReorderData, "left", firstGroup.id, true);
								}
							}
						} else if (index === groupDefinitions.length) {
						// Dropping at the end
							const lastGroup = groupDefinitions[groupDefinitions.length - 1];
							if (lastGroup.id !== groupReorderData) {
								if (isFromSameSidebar) {
									handleGroupReorder(groupReorderData, lastGroup.id, false, e);
								} else {
									layoutStore.moveGroupToSidebar(groupReorderData, "left", lastGroup.id, false);
								}
							} else if (!isFromSameSidebar) {
							// Moving from other sidebar to end when no target group
								layoutStore.moveGroupToSidebar(groupReorderData, "left");
							}
						} else {
						// Dropping between groups
							const targetGroup = groupDefinitions[index - 1];
							if (targetGroup.id !== groupReorderData) {
								if (isFromSameSidebar) {
									handleGroupReorder(groupReorderData, targetGroup.id, false, e);
								} else {
									layoutStore.moveGroupToSidebar(groupReorderData, "left", targetGroup.id, false);
								}
							}
						}
					}
				}}
			/>
		);
	};

	const handleDrop = (draggedSectionId: string, targetGroupId: string, _event: React.DragEvent) => {
		logger.debug("ui", `LeftRibbon handleDrop: Moving section ${draggedSectionId} to group ${targetGroupId}`, {
			draggedSectionId,
			targetGroupId,
			side: "left"
		});

		// First, remove the section from all existing groups on both sides
		const leftGroups = getToolGroupsForSidebar("left");
		const rightGroups = getToolGroupsForSidebar("right");

		logger.debug("ui", `Current groups before removal`, {
			leftGroups: Object.keys(leftGroups),
			rightGroups: Object.keys(rightGroups),
			targetGroupExists: targetGroupId in leftGroups,
			targetGroupSections: leftGroups[targetGroupId].sections
		});

		// Remove from left sidebar groups
		Object.entries(leftGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				logger.debug("ui", `Removing ${draggedSectionId} from left group ${groupId}`);
				layoutStore.removeSectionFromGroup("left", groupId, draggedSectionId);
			}
		});

		// Remove from right sidebar groups
		Object.entries(rightGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				logger.debug("ui", `Removing ${draggedSectionId} from right group ${groupId}`);
				layoutStore.removeSectionFromGroup("right", groupId, draggedSectionId);
			}
		});

		// Check if target group exists after removals
		const updatedLeftGroups = getToolGroupsForSidebar("left");
		logger.debug("ui", `Groups after removal, before addition`, {
			leftGroups: Object.keys(updatedLeftGroups),
			targetGroupExists: Boolean(updatedLeftGroups[targetGroupId]),
			targetGroupId
		});

		// Then add to the target group
		addSectionToGroup("left", targetGroupId, draggedSectionId);
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
	};

	const handleEmptyAreaDrop = (event: React.DragEvent) => {
		event.preventDefault();
		event.stopPropagation();

		// Check if this is a group reorder drag - if so, ignore it
		const isGroupReorder = event.dataTransfer.types.includes("application/group-reorder");
		if (isGroupReorder) {
			logger.debug("ui", "Ignoring group reorder drag in empty area", {
				types: Array.from(event.dataTransfer.types)
			});
			return;
		}

		const draggedSectionId = event.dataTransfer.getData("text/plain");
		if (!draggedSectionId) {
			logger.warn("ui", "No dragged section ID found in dataTransfer");
			return;
		}

		// Get the tool's category - this will be the group type
		const section = getSectionById(draggedSectionId);
		if (!section?.category) {
			logger.warn("ui", `Cannot create group for section ${draggedSectionId} - no category`, {
				draggedSectionId,
				section
			});
			return;
		}

		// Create a new group with unique ID
		const newGroup = createNewGroup(draggedSectionId);
		const groupId = newGroup.id;

		logger.debug("ui", `Creating new group ${groupId} for section ${draggedSectionId} on left ribbon`, {
			draggedSectionId,
			groupId,
			category: section.category,
			groupTitle: newGroup.title
		});

		// First, remove the section from all existing groups
		const leftGroups = getToolGroupsForSidebar("left");
		const rightGroups = getToolGroupsForSidebar("right");

		Object.entries(leftGroups).forEach(([existingGroupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				layoutStore.removeSectionFromGroup("left", existingGroupId, draggedSectionId);
			}
		});

		Object.entries(rightGroups).forEach(([existingGroupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				layoutStore.removeSectionFromGroup("right", existingGroupId, draggedSectionId);
			}
		});

		// Add to the new group (will create the group since it's guaranteed to not exist)
		addSectionToGroup("left", groupId, draggedSectionId);
		setActiveGroup("left", groupId);

		// Immediately update the group definition with the section
		updateGroupDefinition(groupId, [draggedSectionId], getSectionById);
	};

	const ribbonButtonStyle = {
		width: "40px",
		height: "40px",
		borderRadius: "8px",
		backgroundColor: "transparent",
		border: `1px solid ${colors.border.primary}`,
		transition: "all 0.2s ease",
	};


	return (
		<div
			role="region"
			aria-label="Left sidebar - Drop tools here to create new groups"
			onDrop={handleEmptyAreaDrop}
			onDragOver={handleDragOver}
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100%",
				alignItems: "center",
				padding: "16px 8px",
				gap: "12px",
				borderRight: `1px solid ${colors.border.primary}`,
			}}
		>
			{/* Dynamic tool groups */}
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
				{groupDefinitions.map((group, index) => (
					<React.Fragment key={group.id}>
						{/* Drop zone before first item or between items */}
						<DropZone index={index} isActive={dropInsertionIndex === index} />

						<GroupRibbonButton
							group={group}
							isActive={activeGroupId === group.id}
							onActivate={handleGroupActivate}
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							onGroupReorder={handleGroupReorder}
							onDragStart={handleGroupDragStart}
							onDragEnd={handleGroupDragEnd}
							side="left"
						/>
					</React.Fragment>
				))}

				{/* Drop zone after last item */}
				<DropZone
					index={groupDefinitions.length}
					isActive={dropInsertionIndex === groupDefinitions.length}
				/>
			</div>

			<div style={{ flex: 1 }} />

			{/* Clear graph at bottom */}
			<Tooltip label="Clear entire graph" position="right" withArrow>
				<ActionIcon
					variant="subtle"
					size="lg"
					style={{
						...ribbonButtonStyle,
						borderColor: colors.error,
					}}
					onClick={handleClearGraph}
					aria-label="Clear entire graph"
					onMouseEnter={(e) => {
						Object.assign(e.currentTarget.style, {
							backgroundColor: colors.error,
							borderColor: colors.error,
							color: colors.text.inverse,
						});
					}}
					onMouseLeave={(e) => {
						Object.assign(e.currentTarget.style, {
							...ribbonButtonStyle,
							borderColor: colors.error,
							color: "inherit",
						});
					}}
				>
					<IconTrash size={20} />
				</ActionIcon>
			</Tooltip>
		</div>
	);
};