/**
 * Right ribbon component for collapsed right sidebar
 * Shows icon-only controls for entity details and information
 */

import React, { useMemo } from "react";
import { Stack, ActionIcon, Tooltip, Badge, Divider } from "@mantine/core";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";
import {
	IconInfoCircle,
	IconExternalLink,
	IconUsers,
	IconEye,
	IconTarget,
	IconStar,
} from "@tabler/icons-react";

export const RightRibbon: React.FC = () => {
	const layoutStore = useLayoutStore();
	const previewEntityId = layoutStore.previewEntityId;
	const expandSidebarToSection = layoutStore.expandSidebarToSection;
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

	// Determine which entity to show indicator for
	const displayEntityId = hoveredNodeId || selectedNodeId || previewEntityId;
	const hasEntity = Boolean(displayEntityId);

	const handleExpandSidebarToSection = (sectionKey: string, sectionName: string) => {
		logger.info("ui", `Expanding right sidebar to ${sectionName} section`, { sectionKey });

		// Use the layout store to expand sidebar and section
		expandSidebarToSection("right", sectionKey);

		// Scroll to top after a brief delay to allow sidebar to expand
		// The sidebar scrolls to the top to show the expanded section
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

	const activeButtonStyle = {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
		color: colors.text.inverse,
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
			{/* Entity details indicator */}
			<Stack gap="xs" align="center">
				<div style={{ position: "relative" }}>
					<Tooltip label="Entity details" position="left" withArrow>
						<ActionIcon
							variant="subtle"
							size="lg"
							style={hasEntity ? { ...ribbonButtonStyle, ...activeButtonStyle } : ribbonButtonStyle}
							onClick={() => { handleExpandSidebarToSection("entity-info", "Entity Information"); }}
							onMouseEnter={(e) => {
								if (!hasEntity) {
									Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
								}
							}}
							onMouseLeave={(e) => {
								if (!hasEntity) {
									Object.assign(e.currentTarget.style, ribbonButtonStyle);
								}
							}}
						>
							<IconInfoCircle size={20} />
						</ActionIcon>
					</Tooltip>
					{hasEntity && (
						<Badge
							size="xs"
							variant="filled"
							color="blue"
							style={{
								position: "absolute",
								top: "-4px",
								right: "-4px",
								minWidth: "8px",
								height: "8px",
								padding: 0,
								borderRadius: "50%",
							}}
						/>
					)}
				</div>

				<Tooltip label="External links" position="left" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => { handleExpandSidebarToSection("external-links", "External Links"); }}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconExternalLink size={20} />
					</ActionIcon>
				</Tooltip>
			</Stack>

			<Divider
				orientation="horizontal"
				style={{ width: "32px", borderColor: colors.border.primary }}
			/>

			{/* View controls */}
			<Stack gap="xs" align="center">
				<Tooltip label="View options" position="left" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => { handleExpandSidebarToSection("view-options", "View Options"); }}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconStar size={20} />
					</ActionIcon>
				</Tooltip>

				<Tooltip label="Raw API data" position="left" withArrow>
					<ActionIcon
						variant="subtle"
						size="lg"
						style={ribbonButtonStyle}
						onClick={() => { handleExpandSidebarToSection("raw-api-data", "Raw API Data"); }}
						onMouseEnter={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}}
						onMouseLeave={(e) => {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}}
					>
						<IconEye size={20} />
					</ActionIcon>
				</Tooltip>
			</Stack>

			<Divider
				orientation="horizontal"
				style={{ width: "32px", borderColor: colors.border.primary }}
			/>

			{/* Graph statistics */}
			<Stack gap="xs" align="center">
				<div style={{ position: "relative" }}>
					<Tooltip label={`Graph statistics (${String(nodes.length)} nodes)`} position="left" withArrow>
						<ActionIcon
							variant="subtle"
							size="lg"
							style={ribbonButtonStyle}
							onClick={() => { handleExpandSidebarToSection("graph-stats", "Graph Statistics"); }}
							onMouseEnter={(e) => {
								Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
							}}
							onMouseLeave={(e) => {
								Object.assign(e.currentTarget.style, ribbonButtonStyle);
							}}
						>
							<IconUsers size={20} />
						</ActionIcon>
					</Tooltip>
					{nodes.length > 0 && (
						<Badge
							size="xs"
							variant="filled"
							color="gray"
							style={{
								position: "absolute",
								top: "-8px",
								right: "-8px",
								fontSize: "9px",
								minWidth: "16px",
								height: "16px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{nodes.length > 99 ? "99+" : nodes.length}
						</Badge>
					)}
				</div>

				<div style={{ position: "relative" }}>
					<Tooltip label="Selected/hovered entity" position="left" withArrow>
						<ActionIcon
							variant="subtle"
							size="lg"
							style={hasEntity ? { ...ribbonButtonStyle, ...activeButtonStyle } : ribbonButtonStyle}
							onClick={() => { handleExpandSidebarToSection("entity-info", "Entity Information"); }}
							onMouseEnter={(e) => {
								if (!hasEntity) {
									Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
								}
							}}
							onMouseLeave={(e) => {
								if (!hasEntity) {
									Object.assign(e.currentTarget.style, ribbonButtonStyle);
								}
							}}
						>
							<IconTarget size={20} />
						</ActionIcon>
					</Tooltip>
					{hasEntity && (
						<Badge
							size="xs"
							variant="filled"
							color="green"
							style={{
								position: "absolute",
								top: "-4px",
								right: "-4px",
								minWidth: "8px",
								height: "8px",
								padding: 0,
								borderRadius: "50%",
							}}
						/>
					)}
				</div>
			</Stack>

			<div style={{ flex: 1 }} />
		</div>
	);
};