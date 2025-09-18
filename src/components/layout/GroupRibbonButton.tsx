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
  onDrop?: (draggedSectionId: string, targetGroupId: string, event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onGroupReorder?: (sourceGroupId: string, targetGroupId: string, insertBefore: boolean, event: React.DragEvent) => void;
  onDragStart?: (groupId: string) => void;
  onDragEnd?: () => void;
  side: "left" | "right";
}

export const GroupRibbonButton: React.FC<GroupRibbonButtonProps> = ({
	group,
	isActive = false,
	badge,
	onActivate,
	onDrop,
	onDragOver,
	onGroupReorder,
	onDragStart,
	onDragEnd,
	side,
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	const handleClick = () => {
		logger.debug("ui", `Group ribbon button clicked for ${group.id}`, {
			groupId: group.id,
			side
		});
		onActivate(group.id);
	};

	const handleDragStart = (event: React.DragEvent) => {
		// Ribbon buttons are always for group reordering
		if (onGroupReorder) {
			logger.debug("ui", `Starting group reorder drag for group ${group.id}`, {
				groupId: group.id,
				side
			});
			// Set data for group reordering
			event.dataTransfer.setData("application/group-reorder", group.id);
			event.dataTransfer.setData("text/plain", `group:${group.id}`);
			event.dataTransfer.effectAllowed = "move";

			// Add visual feedback for reordering
			if (event.currentTarget instanceof HTMLElement) {
				const target = event.currentTarget;
				target.style.opacity = "0.7";
				target.style.border = "2px dashed " + colors.primary;
			}

			// Notify parent component about drag start
			onDragStart?.(group.id);
		}
	};

	const handleDragEnd = (event: React.DragEvent) => {
		// Reset visual feedback
		if (event.currentTarget instanceof HTMLElement) {
			const target = event.currentTarget;
			target.style.opacity = "1";
			target.style.border = `1px solid ${colors.border.primary}`;
		}

		// Notify parent component about drag end
		onDragEnd?.();
	};

	const handleDrop = (event: React.DragEvent) => {
		logger.debug("ui", `GroupRibbonButton ${group.id} drop event`, {
			groupId: group.id,
			side,
			types: Array.from(event.dataTransfer.types),
			hasOnDrop: Boolean(onDrop)
		});

		if (onDrop) {
			event.preventDefault();
			const draggedSectionId = event.dataTransfer.getData("text/plain");

			logger.debug("ui", `Got dragged section ID: ${draggedSectionId}`);

			// Reject group-to-group drops - these should only happen via drop zones
			if (draggedSectionId.startsWith("group:")) {
				logger.debug("ui", `Rejecting group drop onto ribbon button`, {
					draggedSectionId,
					targetGroupId: group.id,
					side
				});
				return;
			}

			// Validate that we have a valid section ID and target group
			if (!draggedSectionId || !group.id) {
				logger.warn("ui", `Invalid drop data`, {
					draggedSectionId,
					targetGroupId: group.id,
					side
				});
				return;
			}

			logger.debug("ui", `Dropping section ${draggedSectionId} onto existing group ${group.id}`, {
				draggedSectionId,
				targetGroupId: group.id,
				side,
				groupExists: true // This is an existing group from the ribbon
			});

			onDrop(draggedSectionId, group.id, event);
		} else {
			logger.warn("ui", `No onDrop handler for ribbon button ${group.id}`);
		}
	};

	const handleDragOver = (event: React.DragEvent) => {
		// Reject group reorder drags on ribbon buttons - they should only use drop zones
		const groupReorderData = event.dataTransfer.types.includes("application/group-reorder");

		logger.debug("ui", `GroupRibbonButton ${group.id} dragover`, {
			groupId: group.id,
			side,
			types: Array.from(event.dataTransfer.types),
			isGroupReorder: groupReorderData,
			hasOnDragOver: Boolean(onDragOver)
		});

		if (groupReorderData) {
			// Don't prevent default - reject the drop
			logger.debug("ui", `Rejecting group reorder drag on ribbon button ${group.id}`);
			return;
		}

		// Allow tool/section drags onto ribbon buttons
		if (onDragOver) {
			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			logger.debug("ui", `Allowing tool drag over ribbon button ${group.id}`);
			onDragOver(event);
		} else {
			logger.warn("ui", `No onDragOver handler for ribbon button ${group.id}`);
		}
	};

	const handleDragEnter = (event: React.DragEvent) => {
		event.preventDefault();

		// Don't highlight for group reorder drags - they should only use drop zones
		const groupReorderData = event.dataTransfer.types.includes("application/group-reorder");

		logger.debug("ui", `GroupRibbonButton ${group.id} dragenter`, {
			groupId: group.id,
			side,
			types: Array.from(event.dataTransfer.types),
			isGroupReorder: groupReorderData
		});

		if (groupReorderData) {
			logger.debug("ui", `Ignoring dragenter for group reorder on ribbon button ${group.id}`);
			return;
		}

		// Add visual feedback for valid drop zone (tools only)
		if (event.currentTarget instanceof HTMLElement) {
			const target = event.currentTarget;
			target.style.backgroundColor = colors.primary;
			target.style.borderColor = colors.primary;
			target.style.transform = "scale(1.05)";
		}

		logger.debug("ui", `Applied highlight to ribbon button ${group.id} for tool drag`);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		// Don't process drag leave for group reorder drags - they don't get highlighted anyway
		const groupReorderData = event.dataTransfer.types.includes("application/group-reorder");

		logger.debug("ui", `GroupRibbonButton ${group.id} dragleave`, {
			groupId: group.id,
			side,
			types: Array.from(event.dataTransfer.types),
			isGroupReorder: groupReorderData
		});

		if (groupReorderData) {
			return;
		}

		// Only remove highlight if leaving the element entirely
		if (event.currentTarget instanceof HTMLElement) {
			const target = event.currentTarget;
			const rect = target.getBoundingClientRect();
			const x = event.clientX;
			const y = event.clientY;

			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
				target.style.backgroundColor = isActive ? colors.primary : "transparent";
				target.style.borderColor = colors.border.primary;
				target.style.transform = "scale(1)";

				logger.debug("ui", `Removed highlight from ribbon button ${group.id}`);
			}
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
					draggable={true}
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