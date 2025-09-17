/**
 * VSCode-style tool header component for sidebar sections
 * Combines collapsible functionality with drag-and-drop capabilities
 */

import React from "react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useLayoutStore } from "@/stores/layout-store";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { logger } from "@/lib/logger";

interface ToolHeaderProps {
	sectionId: string;
	title: string;
	icon: React.ComponentType<{ size?: number }>;
	children: React.ReactNode;
	defaultCollapsed?: boolean;
	onDragStart?: (sectionId: string, event: React.DragEvent) => void;
	onDrop?: (draggedSectionId: string, targetSectionId: string, event: React.DragEvent) => void;
	onDragOver?: (event: React.DragEvent) => void;
	className?: string;
	style?: React.CSSProperties;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
	sectionId,
	title,
	icon: Icon,
	children,
	defaultCollapsed = false,
	onDragStart,
	onDrop,
	onDragOver,
	className,
	style,
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;
	const layoutStore = useLayoutStore();
	const collapsedSections = layoutStore.collapsedSections;
	const setSectionCollapsed = layoutStore.setSectionCollapsed;

	// Get current collapsed state from store or default
	const isCollapsed = collapsedSections[sectionId] ?? defaultCollapsed;

	const toggleCollapsed = () => {
		logger.info("ui", `Toggling section collapse for ${sectionId}`, {
			sectionId,
			fromCollapsed: isCollapsed,
			toCollapsed: !isCollapsed
		});
		setSectionCollapsed(sectionId, !isCollapsed);
	};

	const handleDragStart = (event: React.DragEvent) => {
		logger.info("ui", `Starting drag for tool header ${sectionId}`, {
			sectionId,
			title
		});

		// Set drag data
		event.dataTransfer.setData("text/plain", sectionId);
		event.dataTransfer.effectAllowed = "move";

		// Add visual feedback
		const target = event.currentTarget as HTMLElement;
		target.style.opacity = "0.5";

		// Call parent handler
		if (onDragStart) {
			onDragStart(sectionId, event);
		}
	};

	const handleDragEnd = (event: React.DragEvent) => {
		// Reset visual feedback
		const target = event.currentTarget as HTMLElement;
		target.style.opacity = "1";

		logger.info("ui", `Drag ended for tool header ${sectionId}`, {
			sectionId
		});
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		event.stopPropagation();

		const draggedSectionId = event.dataTransfer.getData("text/plain");

		logger.info("ui", `Dropping section ${draggedSectionId} onto tool header ${sectionId}`, {
			draggedSectionId,
			targetSectionId: sectionId
		});

		// Call parent handler
		if (onDrop && draggedSectionId !== sectionId) {
			onDrop(draggedSectionId, sectionId, event);
		}
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		event.stopPropagation();

		// Set drop effect
		event.dataTransfer.dropEffect = "move";

		// Call parent handler
		if (onDragOver) {
			onDragOver(event);
		}
	};

	const handleDragEnter = (event: React.DragEvent) => {
		event.preventDefault();

		// Add visual feedback for valid drop zone
		const target = event.currentTarget;
		if (target instanceof HTMLElement) {
			const header = target.querySelector('[data-tool-header="true"]');
			if (header instanceof HTMLElement) {
				header.style.backgroundColor = colors.background.tertiary;
				header.style.borderColor = colors.primary;
			}
		}
	};

	const handleDragLeave = (event: React.DragEvent) => {
		// Only remove highlight if leaving the element entirely
		const target = event.currentTarget;
		if (target instanceof HTMLElement) {
			const rect = target.getBoundingClientRect();
			const x = event.clientX;
			const y = event.clientY;

			if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
				const header = target.querySelector('[data-tool-header="true"]');
				if (header instanceof HTMLElement) {
					header.style.backgroundColor = "";
					header.style.borderColor = "";
				}
			}
		}
	};

	const containerStyle: React.CSSProperties = {
		width: "100%",
		transition: "background-color 0.2s ease, border-color 0.2s ease",
		border: "1px solid transparent",
		...style,
	};

	const headerStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		width: "100%",
		padding: "8px 12px",
		backgroundColor: colors.background.secondary,
		border: `1px solid ${colors.border.primary}`,
		borderBottom: isCollapsed ? `1px solid ${colors.border.primary}` : "none",
		fontSize: "11px",
		fontWeight: 600,
		color: colors.text.primary,
		cursor: "move",
		transition: "all 0.2s ease",
		textTransform: "uppercase" as const,
		letterSpacing: "0.5px",
	};

	return (
		<div
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			className={className}
			style={containerStyle}
		>
			{/* Tool Header Bar */}
			<div
				data-tool-header="true"
				draggable
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				style={headerStyle}
				title={`Drag to move "${title}" section`}
			>
				{/* Expand/collapse chevron */}
				<button
					onClick={toggleCollapsed}
					onMouseDown={(e) => { e.stopPropagation(); }} // Prevent drag when clicking button
					onDragStart={(e) => { e.preventDefault(); }} // Prevent drag from button
					style={{
						display: "flex",
						alignItems: "center",
						backgroundColor: "transparent",
						border: "none",
						padding: "2px",
						cursor: "pointer",
						color: colors.text.secondary,
						transition: "color 0.2s ease",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = colors.text.primary;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = colors.text.secondary;
					}}
				>
					{isCollapsed ? (
						<IconChevronRight size={12} />
					) : (
						<IconChevronDown size={12} />
					)}
				</button>

				{/* Section icon */}
				<span style={{
					display: "flex",
					alignItems: "center",
					color: colors.text.secondary
				}}>
					<Icon size={14} />
				</span>

				{/* Section title */}
				<span style={{
					flex: 1,
					fontSize: "11px",
					fontWeight: 600,
					color: colors.text.primary
				}}>
					{title}
				</span>
			</div>

			{/* Section Content */}
			{!isCollapsed && (
				<div style={{
					padding: "16px",
					backgroundColor: colors.background.primary,
					border: `1px solid ${colors.border.primary}`,
					borderTop: "none",
					animation: "fadeIn 0.2s ease-in-out",
				}}>
					{children}
				</div>
			)}

			{/* CSS for fade-in animation */}
			<style>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(-8px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</div>
	);
};