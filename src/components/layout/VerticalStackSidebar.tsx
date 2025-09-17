/**
 * Vertical stack sidebar component for VSCode-style tool groups
 * Shows all tools within the active group in a vertical stack
 */

import React, { Suspense } from "react";
import { Stack, Divider, Text, Collapse, ActionIcon } from "@mantine/core";
import { IconChevronDown, IconGripVertical } from "@tabler/icons-react";
import { useLayoutStore } from "@/stores/layout-store";
import { getSectionById } from "@/stores/section-registry";
import { getGroupDefinition } from "@/stores/group-registry";
import { SectionContextMenu } from "@/components/layout/SectionContextMenu";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";

interface VerticalStackSidebarProps {
  side: "left" | "right";
}

export const VerticalStackSidebar: React.FC<VerticalStackSidebarProps> = ({ side }) => {
	const layoutStore = useLayoutStore();
	const getActiveGroup = layoutStore.getActiveGroup;
	const getToolGroupsForSidebar = layoutStore.getToolGroupsForSidebar;
	const addSectionToGroup = layoutStore.addSectionToGroup;
	const removeSectionFromGroup = layoutStore.removeSectionFromGroup;
	const setSectionCollapsed = layoutStore.setSectionCollapsed;
	const collapsedSections = layoutStore.collapsedSections;
	const setLeftSidebarOpen = layoutStore.setLeftSidebarOpen;
	const setRightSidebarOpen = layoutStore.setRightSidebarOpen;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	const activeGroupId = getActiveGroup(side);
	const toolGroups = getToolGroupsForSidebar(side);
	const activeGroup = activeGroupId ? toolGroups[activeGroupId] : null;

	const groupDefinition = activeGroupId ? getGroupDefinition(activeGroupId) : null;

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		event.stopPropagation();

		const draggedSectionId = event.dataTransfer.getData("text/plain");
		if (!draggedSectionId || !activeGroupId) return;

		logger.info("ui", `Moving section ${draggedSectionId} to active group ${activeGroupId} for ${side} sidebar`, {
			draggedSectionId,
			activeGroupId,
			side
		});

		// First, remove the section from all existing groups on both sides
		const leftGroups = getToolGroupsForSidebar("left");
		const rightGroups = getToolGroupsForSidebar("right");

		// Remove from left sidebar groups
		Object.entries(leftGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				removeSectionFromGroup("left", groupId, draggedSectionId);
			}
		});

		// Remove from right sidebar groups
		Object.entries(rightGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				removeSectionFromGroup("right", groupId, draggedSectionId);
			}
		});

		// Then add to the target group
		addSectionToGroup(side, activeGroupId, draggedSectionId);
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
	};

	const handleToolDragStart = (sectionId: string, event: React.DragEvent) => {
		logger.info("ui", `Starting drag for tool ${sectionId}`, { sectionId, side });
		event.dataTransfer.setData("text/plain", sectionId);
		event.dataTransfer.effectAllowed = "move";
	};

	const handleToolDrop = (targetSectionId: string, event: React.DragEvent) => {
		event.preventDefault();
		event.stopPropagation();

		const draggedSectionId = event.dataTransfer.getData("text/plain");
		if (!draggedSectionId || !activeGroupId || draggedSectionId === targetSectionId) return;

		logger.info("ui", `Moving tool ${draggedSectionId} to group ${activeGroupId}`, {
			draggedSectionId,
			targetGroupId: activeGroupId,
			side
		});

		// First, remove the section from all existing groups on both sides
		const leftGroups = getToolGroupsForSidebar("left");
		const rightGroups = getToolGroupsForSidebar("right");

		// Remove from left sidebar groups
		Object.entries(leftGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				removeSectionFromGroup("left", groupId, draggedSectionId);
			}
		});

		// Remove from right sidebar groups
		Object.entries(rightGroups).forEach(([groupId, group]) => {
			if (group.sections.includes(draggedSectionId)) {
				removeSectionFromGroup("right", groupId, draggedSectionId);
			}
		});

		// Then add to the target group
		addSectionToGroup(side, activeGroupId, draggedSectionId);
	};

	const handleToggleCollapse = (sectionId: string) => {
		const isCollapsed = collapsedSections[sectionId] || false;
		setSectionCollapsed(sectionId, !isCollapsed);
	};

	// Use useEffect to handle sidebar collapse when no active group
	React.useEffect(() => {
		if (!activeGroup || !groupDefinition) {
			// Collapse only the specific sidebar that has no active group
			if (side === "left") {
				setLeftSidebarOpen(false);
			} else {
				setRightSidebarOpen(false);
			}
		}
	}, [activeGroup, groupDefinition, side, setLeftSidebarOpen, setRightSidebarOpen]);

	if (!activeGroup || !groupDefinition) {
		return null;
	}

	return (
		<div
			style={{
				height: "100%",
				overflow: "auto",
				onDrop: handleDrop,
				onDragOver: handleDragOver,
			}}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
		>
			{/* Vertical stack of all tools in the group */}
			<Stack gap={0}>
				{activeGroup.sections.map((sectionId, index) => {
					const section = getSectionById(sectionId);
					if (!section) return null;

					const SectionComponent = section.component;
					const isLast = index === activeGroup.sections.length - 1;
					const isCollapsed = collapsedSections[sectionId] || false;
					const SectionIcon = section.icon;

					return (
						<div key={sectionId}>
							{/* Collapsible tool header */}
							<div
								draggable
								onDragStart={(e) => { handleToolDragStart(sectionId, e); }}
								onDrop={(e) => { handleToolDrop(sectionId, e); }}
								onDragOver={handleDragOver}
								style={{
									display: "flex",
									alignItems: "center",
									padding: "8px 12px",
									backgroundColor: colors.background.tertiary,
									borderBottom: `1px solid ${colors.border.primary}`,
									cursor: "grab",
									userSelect: "none",
									transition: "background-color 0.2s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = colors.background.secondary;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = colors.background.tertiary;
								}}
							>
								{/* Drag handle */}
								<IconGripVertical
									size={14}
									style={{
										color: colors.text.secondary,
										marginRight: "6px",
										cursor: "grab"
									}}
								/>

								{/* Tool icon */}
								<SectionIcon
									size={16}
									style={{
										color: colors.text.primary,
										marginRight: "8px"
									}}
								/>

								{/* Tool title - clickable for collapse */}
								<Text
									size="sm"
									fw={500}
									style={{
										color: colors.text.primary,
										flex: 1,
										cursor: "pointer"
									}}
									onClick={() => { handleToggleCollapse(sectionId); }}
								>
									{section.title}
								</Text>

								{/* Context menu */}
								<SectionContextMenu
									sectionId={sectionId}
									currentSidebar={side}
								/>

								{/* Collapse toggle */}
								<ActionIcon
									variant="subtle"
									size="sm"
									onClick={() => { handleToggleCollapse(sectionId); }}
									style={{
										marginLeft: "4px",
										transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
										transition: "transform 0.2s ease"
									}}
								>
									<IconChevronDown size={14} />
								</ActionIcon>
							</div>

							{/* Collapsible section content */}
							<Collapse in={!isCollapsed}>
								<div style={{
									padding: "16px",
									minHeight: isCollapsed ? 0 : "200px"
								}}>
									<Suspense
										fallback={
											<div
												style={{
													padding: "16px",
													textAlign: "center",
													color: colors.text.secondary,
												}}
											>
                        Loading {section.title}...
											</div>
										}
									>
										<SectionComponent />
									</Suspense>
								</div>
							</Collapse>

							{/* Divider between tools (except for last one) */}
							{!isLast && (
								<Divider
									style={{
										borderColor: colors.border.secondary
									}}
								/>
							)}
						</div>
					);
				})}
			</Stack>
		</div>
	);
};