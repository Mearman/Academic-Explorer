/**
 * Left ribbon component for collapsed left sidebar
 * Shows icon-only navigation with tooltips
 */

import React from "react";
import { Stack, ActionIcon, Tooltip, Divider } from "@mantine/core";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useLayoutStore } from "@/stores/layout-store";
import { logger } from "@/lib/logger";
import {
	IconSearch,
	IconFilter,
	IconGraph,
	IconDatabase,
	IconTrash,
	IconAdjustments,
	IconLink,
} from "@tabler/icons-react";

export const LeftRibbon: React.FC = () => {
	const { clearGraph, loadAllCachedNodes } = useGraphData();
	const { colors } = useThemeColors();
	const { setLeftSidebarOpen } = useLayoutStore();

	const handleClearGraph = () => {
		logger.info("ui", "Clear graph clicked from left ribbon");
		clearGraph();
	};

	const handleLoadCachedNodes = () => {
		logger.info("ui", "Load cached nodes clicked from left ribbon");
		try {
			loadAllCachedNodes();
		} catch (error) {
			logger.error("ui", "Failed to load cached nodes from ribbon", error);
		}
	};

	const handleExpandSidebarToSection = (sectionKey: string, sectionName: string) => {
		logger.info("ui", `Expanding sidebar to ${sectionName} section`, { sectionKey });

		// Expand the sidebar
		setLeftSidebarOpen(true);

		// Expand the corresponding section in localStorage
		localStorage.setItem(`sidebar-section-${sectionKey}`, JSON.stringify(true));

		// Scroll to top after a brief delay to allow sidebar to expand
		// The sidebar scrolls to the top to show the expanded section
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

	const ribbonButtonStyle = {
		width: "40px",
		height: "40px",
		borderRadius: "8px",
		backgroundColor: "transparent",
		border: `1px solid ${colors.border.primary}`,
		transition: "all 0.2s ease",
	};

	const ribbonButtonHoverStyle = {
		backgroundColor: colors.background.tertiary,
		borderColor: colors.primary,
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
			{/* Search section */}
			<Stack gap="xs" align="center">
				<Tooltip label="Search academic entities" position="right" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => handleExpandSidebarToSection("search", "Search Academic Entities")}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconSearch size={20} />
					</ActionIcon>
				</Tooltip>

				<Tooltip label="Entity & edge filters" position="right" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => handleExpandSidebarToSection("entity-filters", "Entity Types & Visibility")}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconFilter size={20} />
					</ActionIcon>
				</Tooltip>
			</Stack>

			<Divider
				orientation="horizontal"
				style={{ width: "32px", borderColor: colors.border.primary }}
			/>

			{/* Graph controls */}
			<Stack gap="xs" align="center">
				<Tooltip label="Graph layout controls" position="right" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => handleExpandSidebarToSection("graph-actions", "Graph Actions")}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconGraph size={20} />
					</ActionIcon>
				</Tooltip>

				<Tooltip label="Cache & traversal settings" position="right" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => handleExpandSidebarToSection("cache-settings", "Cache & Traversal Settings")}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconDatabase size={20} />
					</ActionIcon>
				</Tooltip>

				<Tooltip label="Edge types & visibility" position="right" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => handleExpandSidebarToSection("edge-filters", "Edge Types & Visibility")}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconLink size={20} />
					</ActionIcon>
				</Tooltip>
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