/**
 * VSCode-style group sidebar component
 * Shows tabs for all tools within the active group, just like VSCode
 */

import React, { Suspense } from "react";
import { Tabs } from "@mantine/core";
import { useLayoutStore } from "@/stores/layout-store";
import { getSectionById } from "@/stores/section-registry";
import { SectionContextMenu } from "@/components/layout/SectionContextMenu";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";

interface VSCodeGroupSidebarProps {
  side: "left" | "right";
}

export const VSCodeGroupSidebar: React.FC<VSCodeGroupSidebarProps> = ({ side }) => {
	const layoutStore = useLayoutStore();
	const getActiveGroup = layoutStore.getActiveGroup;
	const getToolGroupsForSidebar = layoutStore.getToolGroupsForSidebar;
	const setActiveTabInGroup = layoutStore.setActiveTabInGroup;
	const addSectionToGroup = layoutStore.addSectionToGroup;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	const activeGroupId = getActiveGroup(side);
	const toolGroups = getToolGroupsForSidebar(side);
	const activeGroup = activeGroupId ? toolGroups[activeGroupId] : null;

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		event.stopPropagation();

		const draggedSectionId = event.dataTransfer.getData("text/plain");
		if (!draggedSectionId || !activeGroupId) return;

		logger.info("ui", `Adding section ${draggedSectionId} to active group ${activeGroupId} for ${side} sidebar`, {
			draggedSectionId,
			activeGroupId,
			side
		});

		addSectionToGroup(side, activeGroupId, draggedSectionId);
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
	};

	if (!activeGroup) {
		return (
			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				style={{
					padding: "16px",
					textAlign: "center",
					color: colors.text.secondary,
					fontStyle: "italic",
					minHeight: "200px",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					border: `2px dashed ${colors.border.secondary}`,
					borderRadius: "8px",
					margin: "16px",
					transition: "all 0.2s ease",
				}}
			>
        No active group.
				<br />
        Click a ribbon button to activate a group.
				<br />
				<small style={{ marginTop: "8px", opacity: 0.7 }}>
          Or drag a tool here to add it to the active group.
				</small>
			</div>
		);
	}

	const handleTabChange = (value: string | null) => {
		if (value && activeGroupId) {
			logger.info("ui", `Switching to tab ${value} in group ${activeGroupId}`, {
				sectionId: value,
				groupId: activeGroupId,
				side
			});
			setActiveTabInGroup(side, activeGroupId, value);
		}
	};

	const activeSectionId = activeGroup.activeSection;

	return (
		<div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
			{/* Tab bar */}
			<Tabs
				value={activeSectionId}
				onChange={handleTabChange}
				style={{ flex: 1, display: "flex", flexDirection: "column" }}
				styles={{
					root: { height: "100%", display: "flex", flexDirection: "column" },
					panel: { flex: 1, overflow: "auto", position: "relative" }
				}}
			>
				<Tabs.List>
					{activeGroup.sections.map((sectionId) => {
						const section = getSectionById(sectionId);
						if (!section) return null;

						const Icon = section.icon;
						return (
							<Tabs.Tab
								key={sectionId}
								value={sectionId}
								leftSection={<Icon size={16} />}
							>
								{section.title}
							</Tabs.Tab>
						);
					})}
				</Tabs.List>

				{activeGroup.sections.map((sectionId) => {
					const section = getSectionById(sectionId);
					if (!section) return null;

					const SectionComponent = section.component;
					return (
						<Tabs.Panel key={sectionId} value={sectionId}>
							<div style={{
								position: "absolute",
								top: "8px",
								right: "8px",
								zIndex: 10
							}}>
								<SectionContextMenu
									sectionId={sectionId}
									currentSidebar={side}
								/>
							</div>
							<Suspense
								fallback={
									<div
										style={{
											padding: "16px",
											textAlign: "center",
											color: colors.text.secondary,
										}}
									>
                    Loading section...
									</div>
								}
							>
								<SectionComponent />
							</Suspense>
						</Tabs.Panel>
					);
				})}
			</Tabs>
		</div>
	);
};