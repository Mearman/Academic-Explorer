/**
 * Left ribbon component for collapsed left sidebar
 * Shows icon-only navigation with tooltips using dynamic section generation
 */

import React, { useMemo } from "react";
import { Stack, ActionIcon, Tooltip } from "@mantine/core";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useLayoutStore } from "@/stores/layout-store";
import { getSectionById, getSectionsSorted } from "@/stores/section-registry";
import { RibbonButton } from "@/components/layout/RibbonButton";
import { logger } from "@/lib/logger";
import { IconTrash } from "@tabler/icons-react";

export const LeftRibbon: React.FC = () => {
	const graphData = useGraphData();
	const clearGraph = graphData.clearGraph;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;
	const layoutStore = useLayoutStore();
	const expandSidebarToSection = layoutStore.expandSidebarToSection;
	const getSectionsForSidebar = layoutStore.getSectionsForSidebar;
	const moveSectionToSidebar = layoutStore.moveSectionToSidebar;

	// Get sections for left sidebar
	const leftSectionIds = getSectionsForSidebar("left");
	const leftSections = useMemo(() => {
		const sections = leftSectionIds
			.map(id => getSectionById(id))
			.filter((section): section is NonNullable<typeof section> => section !== undefined);
		return getSectionsSorted(sections);
	}, [leftSectionIds]);

	const handleClearGraph = () => {
		logger.info("ui", "Clear graph clicked from left ribbon");
		clearGraph();
	};

	const handleSectionActivate = (sectionId: string) => {
		const section = getSectionById(sectionId);
		if (section) {
			logger.info("ui", `Expanding sidebar to ${section.title} section`, { sectionId });

			// Use the layout store to expand sidebar and section
			expandSidebarToSection("left", sectionId);

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
		}
	};

	const handleDrop = (draggedSectionId: string, targetSectionId: string, _event: React.DragEvent) => {
		// For left ribbon, we want to move the dragged section to the left sidebar
		logger.info("ui", `Moving section ${draggedSectionId} to left sidebar`, {
			draggedSectionId,
			targetSectionId
		});
		moveSectionToSidebar(draggedSectionId, "left");
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
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
			{/* Dynamic sections */}
			<Stack gap="xs" align="center">
				{leftSections.map((section) => (
					<RibbonButton
						key={section.id}
						section={section}
						onActivate={handleSectionActivate}
						onDragStart={() => {}} // Enable dragging
						onDrop={handleDrop}
						onDragOver={handleDragOver}
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