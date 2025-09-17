/**
 * Group ribbon button component for VSCode-style tool groups
 * Represents a category/group of tools that can be activated
 */

import React from "react";
import { ActionIcon, Tooltip, Badge } from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@/lib/logger";
import type { ToolGroupDefinition } from "@/stores/group-registry";

interface GroupRibbonButtonProps {
  group: ToolGroupDefinition;
  isActive?: boolean;
  badge?: {
    show: boolean;
    count?: number;
    color?: string;
  };
  onActivate: (groupId: string) => void;
  onDragStart?: (groupId: string, event: React.DragEvent) => void;
  onDrop?: (draggedSectionId: string, targetGroupId: string, event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  side: "left" | "right";
}

export const GroupRibbonButton: React.FC<GroupRibbonButtonProps> = ({
	group,
	isActive = false,
	badge,
	onActivate,
	onDragStart,
	onDrop,
	onDragOver,
	side,
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	const handleClick = () => {
		logger.info("ui", `Group ribbon button clicked for ${group.id}`, {
			groupId: group.id,
			side
		});
		onActivate(group.id);
	};

	const handleDragStart = (event: React.DragEvent) => {
		if (onDragStart) {
			logger.info("ui", `Starting drag for group ${group.id}`, {
				groupId: group.id,
				side
			});
			event.dataTransfer.setData("text/plain", group.id);
			event.dataTransfer.effectAllowed = "move";

			// Add visual feedback
			const target = event.currentTarget as HTMLElement;
			target.style.opacity = "0.5";

			onDragStart(group.id, event);
		}
	};

	const handleDragEnd = (event: React.DragEvent) => {
		// Reset visual feedback
		const target = event.currentTarget as HTMLElement;
		target.style.opacity = "1";
	};

	const handleDrop = (event: React.DragEvent) => {
		if (onDrop) {
			event.preventDefault();
			const draggedSectionId = event.dataTransfer.getData("text/plain");

			logger.info("ui", `Dropping section ${draggedSectionId} onto group ${group.id}`, {
				draggedSectionId,
				targetGroupId: group.id,
				side
			});

			onDrop(draggedSectionId, group.id, event);
		}
	};

	const handleDragOver = (event: React.DragEvent) => {
		if (onDragOver) {
			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			onDragOver(event);
		}
	};

	const handleDragEnter = (event: React.DragEvent) => {
		event.preventDefault();

		// Add visual feedback for valid drop zone
		const target = event.currentTarget as HTMLElement;
		target.style.backgroundColor = colors.primary;
		target.style.borderColor = colors.primary;
		target.style.transform = "scale(1.05)";
	};

	const handleDragLeave = (event: React.DragEvent) => {
		// Only remove highlight if leaving the element entirely
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;

		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			target.style.backgroundColor = isActive ? colors.primary : "transparent";
			target.style.borderColor = colors.border.primary;
			target.style.transform = "scale(1)";
		}
	};

	const ribbonButtonStyle = {
		width: "40px",
		height: "40px",
		borderRadius: "8px",
		backgroundColor: "transparent",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: colors.border.primary,
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

	const Icon = group.icon;

	return (
		<div style={{ position: "relative" }}>
			<Tooltip
				label={group.description}
				position={side === "left" ? "right" : "left"}
				withArrow
			>
				<ActionIcon
					variant="subtle"
					size="lg"
					style={isActive ? { ...ribbonButtonStyle, ...activeButtonStyle } : ribbonButtonStyle}
					onClick={handleClick}
					draggable={Boolean(onDragStart)}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onMouseEnter={(e) => {
						if (!isActive) {
							Object.assign(e.currentTarget.style, ribbonButtonHoverStyle);
						}
					}}
					onMouseLeave={(e) => {
						if (!isActive) {
							Object.assign(e.currentTarget.style, ribbonButtonStyle);
						}
					}}
				>
					<Icon size={20} />
				</ActionIcon>
			</Tooltip>

			{badge?.show && (
				<Badge
					size="xs"
					variant="filled"
					color={badge.color || "blue"}
					style={{
						position: "absolute",
						top: badge.count ? "-8px" : "-4px",
						right: badge.count ? "-8px" : "-4px",
						minWidth: badge.count ? "16px" : "8px",
						height: badge.count ? "16px" : "8px",
						padding: badge.count ? undefined : 0,
						borderRadius: badge.count ? undefined : "50%",
						fontSize: badge.count ? "9px" : undefined,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{badge.count && (badge.count > 99 ? "99+" : badge.count)}
				</Badge>
			)}
		</div>
	);
};