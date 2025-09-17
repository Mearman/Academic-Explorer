/**
 * Dynamic sidebar component that renders sections based on current placement
 * Supports VSCode-style section management with drag and drop
 */

import React, { Suspense } from "react";
import { Stack } from "@mantine/core";
import { useLayoutStore } from "@/stores/layout-store";
import { getSectionById, getSectionsSorted } from "@/stores/section-registry";
import { DraggableSectionHeader } from "@/components/layout/DraggableSectionHeader";
import { SectionContextMenu } from "@/components/layout/SectionContextMenu";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";

interface DynamicSidebarProps {
  side: "left" | "right";
}

export const DynamicSidebar: React.FC<DynamicSidebarProps> = ({ side }) => {
	const layoutStore = useLayoutStore();
	const getSectionsForSidebar = layoutStore.getSectionsForSidebar;
	const moveSectionToSidebar = layoutStore.moveSectionToSidebar;
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	// Get sections for this sidebar
	const sectionIds = getSectionsForSidebar(side);
	const sections = React.useMemo(() => {
		const sectionList = sectionIds
			.map(id => getSectionById(id))
			.filter((section): section is NonNullable<typeof section> => section !== undefined);
		return getSectionsSorted(sectionList);
	}, [sectionIds]);

	const handleDrop = (draggedSectionId: string, targetSectionId: string, _event: React.DragEvent) => {
		logger.info("ui", `Moving section ${draggedSectionId} to ${side} sidebar via section header drop`, {
			draggedSectionId,
			targetSectionId,
			side
		});

		// Move the dragged section to this sidebar
		moveSectionToSidebar(draggedSectionId, side);
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
	};

	if (sections.length === 0) {
		return (
			<div
				style={{
					padding: "16px",
					textAlign: "center",
					color: colors.text.secondary,
					fontStyle: "italic",
				}}
			>
        No sections in this sidebar.
				<br />
        Drag sections here from the other sidebar.
			</div>
		);
	}

	return (
		<Stack gap="md" style={{ height: "100%", overflow: "auto" }}>
			{sections.map((section) => {
				const SectionComponent = section.component;

				return (
					<DraggableSectionHeader
						key={section.id}
						sectionId={section.id}
						title={section.title}
						onDrop={handleDrop}
						onDragOver={handleDragOver}
					>
						<CollapsibleSection
							title={section.title}
							icon={React.createElement(section.icon, { size: 16 })}
							defaultExpanded={true}
							storageKey={section.id}
						>
							<div style={{ position: "relative" }}>
								<div style={{
									position: "absolute",
									top: "8px",
									right: "8px",
									zIndex: 10
								}}>
									<SectionContextMenu
										sectionId={section.id}
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
							</div>
						</CollapsibleSection>
					</DraggableSectionHeader>
				);
			})}
		</Stack>
	);
};