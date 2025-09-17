/**
 * Right ribbon component for collapsed right sidebar
 * Shows icon-only controls for tool groups using VSCode-style groups
 */

import React, { useMemo } from "react";
import { Stack } from "@mantine/core";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getGroupDefinition, createNewGroup, updateGroupDefinition } from "@/stores/group-registry";
import { getSectionById } from "@/stores/section-registry";
import { GroupRibbonButton } from "@/components/layout/GroupRibbonButton";
import { logger } from "@/lib/logger";

export const RightRibbon: React.FC = () => {
	const layoutStore = useLayoutStore();
	const previewEntityId = layoutStore.previewEntityId;
	// const expandSidebarToSection = layoutStore.expandSidebarToSection; // Not used in group-based layout
	const getToolGroupsForSidebar = layoutStore.getToolGroupsForSidebar;
	const getActiveGroup = layoutStore.getActiveGroup;
	const setActiveGroup = layoutStore.setActiveGroup;
	const addSectionToGroup = layoutStore.addSectionToGroup;
	const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
	const hoveredNodeId = useGraphStore((state) => state.hoveredNodeId);
	const nodesMap = useGraphStore((state) => state.nodes);
	const nodes = useMemo(() => {
		try {
			// Safe conversion of object values to array with type checking
			const nodeValues = Object.values(nodesMap);
			return Array.isArray(nodeValues) ? nodeValues : [];
		} catch (error) {
			logger.warn("ui", "Failed to convert nodes map to array", { error });
			return [];
		}
	}, [nodesMap]);
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	// Get tool groups for right sidebar
	const toolGroups = getToolGroupsForSidebar("right");
	const activeGroupId = getActiveGroup("right");
	const groupDefinitions = useMemo(() => {
		const definitions = Object.keys(toolGroups)
			.map(groupId => getGroupDefinition(groupId))
			.filter((def): def is NonNullable<typeof def> => def !== undefined)
			.sort((a, b) => (a.order || 999) - (b.order || 999));

		logger.info("ui", "Right ribbon group definitions", {
			toolGroups,
			groupKeys: Object.keys(toolGroups),
			definitions: definitions.map(d => ({ id: d.id, title: d.title })),
			activeGroupId
		});

		return definitions;
	}, [toolGroups, activeGroupId]);

	// Determine which entity to show indicator for
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId;
	const hasEntity = Boolean(displayEntityId);

	const handleGroupActivate = (groupId: string) => {
		logger.info("ui", `Activating group ${groupId} for right sidebar`, { groupId });

		// Activate the group and expand sidebar
		setActiveGroup("right", groupId);
		layoutStore.setRightSidebarOpen(true);

		// Scroll to top after a brief delay to allow sidebar to expand
		setTimeout(() => {
			// Find the right sidebar container and scroll to top
			const sidebarContainer = document.querySelector('[data-mantine-component="AppShell"] > aside');
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
			side: "right"
		});

		layoutStore.reorderGroups("right", sourceGroupId, targetGroupId, insertBefore);
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
		addSectionToGroup("right", targetGroupId, draggedSectionId);
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

		logger.info("ui", `Creating new group ${groupId} for section ${draggedSectionId} on right ribbon`, {
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
		addSectionToGroup("right", groupId, draggedSectionId);
		setActiveGroup("right", groupId);

		// Immediately update the group definition with the section
		updateGroupDefinition(groupId, [draggedSectionId], getSectionById);
	};

	// Helper function to get badge info for groups that need indicators
	const getGroupBadge = (groupId: string) => {
		switch (groupId) {
			case "entity-details":
				return {
					show: hasEntity,
					color: "blue"
				};
			case "analysis":
				return {
					show: nodes.length > 0,
					count: nodes.length,
					color: "gray"
				};
			default:
				return { show: false };
		}
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
				borderLeft: `1px solid ${colors.border.primary}`,
			}}
		>
			{/* Dynamic tool groups */}
			<Stack gap="xs" align="center">
				{groupDefinitions.map((group) => {
					const badge = getGroupBadge(group.id);
					const isActive = activeGroupId === group.id;

					return (
						<GroupRibbonButton
							key={group.id}
							group={group}
							isActive={isActive}
							badge={badge}
							onActivate={handleGroupActivate}
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							onGroupReorder={handleGroupReorder}
							side="right"
						/>
					);
				})}
			</Stack>

			<div style={{ flex: 1 }} />
		</div>
	);
};