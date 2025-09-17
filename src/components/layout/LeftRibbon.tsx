/**
 * Left ribbon component for collapsed left sidebar
 * Shows icon-only navigation with tool groups using VSCode-style groups
 */

import React, { useMemo } from "react";
import { Stack, ActionIcon, Tooltip } from "@mantine/core";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useLayoutStore } from "@/stores/layout-store";
import { getGroupDefinition, createNewGroup, updateGroupDefinition } from "@/stores/group-registry";
import { getSectionById } from "@/stores/section-registry";
import { GroupRibbonButton } from "@/components/layout/GroupRibbonButton";
import { logger } from "@/lib/logger";
import { IconTrash } from "@tabler/icons-react";

export const LeftRibbon: React.FC = () => {
	const graphData = useGraphData();
	const clearGraph = graphData.clearGraph;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;
	const layoutStore = useLayoutStore();
	// const expandSidebarToSection = layoutStore.expandSidebarToSection; // Not used in group-based layout
	const getToolGroupsForSidebar = layoutStore.getToolGroupsForSidebar;
	const getActiveGroup = layoutStore.getActiveGroup;
	const setActiveGroup = layoutStore.setActiveGroup;
	const addSectionToGroup = layoutStore.addSectionToGroup;

	// Get tool groups for left sidebar
	const toolGroups = getToolGroupsForSidebar("left");
	const activeGroupId = getActiveGroup("left");
	const groupDefinitions = useMemo(() => {
		const definitions = Object.keys(toolGroups)
			.map(groupId => getGroupDefinition(groupId))
			.filter((def): def is NonNullable<typeof def> => def !== undefined)
			.sort((a, b) => (a.order || 999) - (b.order || 999));

		logger.info("ui", "Left ribbon group definitions", {
			toolGroups,
			groupKeys: Object.keys(toolGroups),
			definitions: definitions.map(d => ({ id: d.id, title: d.title })),
			activeGroupId
		});

		return definitions;
	}, [toolGroups, activeGroupId]);

	const handleClearGraph = () => {
		logger.info("ui", "Clear graph clicked from left ribbon");
		clearGraph();
	};

	const handleGroupActivate = (groupId: string) => {
		logger.info("ui", `Activating group ${groupId} for left sidebar`, { groupId });

		// Check if group exists before activating
		const currentToolGroups = getToolGroupsForSidebar("left");
		const groupExists = Boolean(currentToolGroups[groupId]);

		logger.info("ui", `Group ${groupId} exists: ${groupExists ? "true" : "false"}`, {
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

		// Activate the group and expand sidebar
		setActiveGroup("left", groupId);
		layoutStore.setLeftSidebarOpen(true);

		logger.info("ui", `Sidebar should now be open for group ${groupId}`);

		// Scroll to top after a brief delay to allow sidebar to expand
		setTimeout(() => {
			// Find the left sidebar container and scroll to top
			const sidebarContainer = document.querySelector('[data-mantine-component="AppShell"] > nav');
			if (sidebarContainer) {
				const scrollableElement = sidebarContainer.querySelector('[style*="overflow: auto"]') || sidebarContainer;
				if (scrollableElement instanceof HTMLElement) {
					scrollableElement.scrollTop = 0;
				}
			}
		}, 150); // Small delay to allow expansion animation
	};

	const handleGroupReorder = (sourceGroupId: string, targetGroupId: string, insertBefore: boolean, _event: React.DragEvent) => {
		logger.info("ui", `Reordering group ${sourceGroupId} relative to ${targetGroupId}`, {
			sourceGroupId,
			targetGroupId,
			insertBefore,
			side: "left"
		});

		layoutStore.reorderGroups("left", sourceGroupId, targetGroupId, insertBefore);
	};

	const handleDrop = (draggedSectionId: string, targetGroupId: string, _event: React.DragEvent) => {
		logger.info("ui", `Moving section ${draggedSectionId} to group ${targetGroupId}`, {
			draggedSectionId,
			targetGroupId
		});

		// First, remove the section from all existing groups on both sides
		const leftGroups = getToolGroupsForSidebar("left");
		const rightGroups = getToolGroupsForSidebar("right");

		// Remove from left sidebar groups
		Object.entries(leftGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				layoutStore.removeSectionFromGroup("left", groupId, draggedSectionId);
			}
		});

		// Remove from right sidebar groups
		Object.entries(rightGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				layoutStore.removeSectionFromGroup("right", groupId, draggedSectionId);
			}
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

		logger.info("ui", `Creating new group ${groupId} for section ${draggedSectionId} on left ribbon`, {
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
			<Stack gap="xs" align="center">
				{groupDefinitions.map((group) => (
					<GroupRibbonButton
						key={group.id}
						group={group}
						isActive={activeGroupId === group.id}
						onActivate={handleGroupActivate}
						onDragStart={(groupId, _event) => {
							logger.info("ui", `Starting drag from left ribbon for group ${groupId}`, { groupId });
						}}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onGroupReorder={handleGroupReorder}
						side="left"
					/>
				))}
			</Stack>

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