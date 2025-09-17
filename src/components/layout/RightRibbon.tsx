/**
 * Right ribbon component for collapsed right sidebar
 * Shows icon-only controls for entity details and information using dynamic section generation
 */

import React, { useMemo } from "react";
import { Stack } from "@mantine/core";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getSectionById, getSectionsSorted } from "@/stores/section-registry";
import { RibbonButton } from "@/components/layout/RibbonButton";
import { logger } from "@/lib/logger";

export const RightRibbon: React.FC = () => {
	const layoutStore = useLayoutStore();
	const previewEntityId = layoutStore.previewEntityId;
	const expandSidebarToSection = layoutStore.expandSidebarToSection;
	const getSectionsForSidebar = layoutStore.getSectionsForSidebar;
	const moveSectionToSidebar = layoutStore.moveSectionToSidebar;
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

	// Get sections for right sidebar
	const rightSectionIds = getSectionsForSidebar("right");
	const rightSections = useMemo(() => {
		const sections = rightSectionIds
			.map(id => getSectionById(id))
			.filter((section): section is NonNullable<typeof section> => section !== undefined);
		return getSectionsSorted(sections);
	}, [rightSectionIds]);

	// Determine which entity to show indicator for
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId;
	const hasEntity = Boolean(displayEntityId);

	const handleSectionActivate = (sectionId: string) => {
		const section = getSectionById(sectionId);
		if (section) {
			logger.info("ui", `Expanding right sidebar to ${section.title} section`, { sectionId });

			// Use the layout store to expand sidebar and section
			expandSidebarToSection("right", sectionId);

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
		}
	};

	const handleDrop = (draggedSectionId: string, targetSectionId: string, _event: React.DragEvent) => {
		// For right ribbon, we want to move the dragged section to the right sidebar
		logger.info("ui", `Moving section ${draggedSectionId} to right sidebar`, {
			draggedSectionId,
			targetSectionId
		});
		moveSectionToSidebar(draggedSectionId, "right");
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
	};

	// Helper function to get badge info for sections that need indicators
	const getSectionBadge = (sectionId: string) => {
		switch (sectionId) {
			case "entity-info":
				return {
					show: hasEntity,
					color: "blue"
				};
			case "graph-stats":
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
			{/* Dynamic sections */}
			<Stack gap="xs" align="center">
				{rightSections.map((section) => {
					const badge = getSectionBadge(section.id);
					const isActive = section.id === "entity-info" && hasEntity;

					return (
						<RibbonButton
							key={section.id}
							section={section}
							isActive={isActive}
							badge={badge}
							onActivate={handleSectionActivate}
							onDragStart={() => {}} // Enable dragging
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							side="right"
						/>
					);
				})}
			</Stack>

			<div style={{ flex: 1 }} />
		</div>
	);
};