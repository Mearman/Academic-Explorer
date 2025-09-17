/**
 * Draggable section header component for sidebar sections
 * Enables VSCode-style drag and drop functionality for moving sections between sidebars
 */

import React from "react";
import { logger } from "@/lib/logger";

interface DraggableSectionHeaderProps {
  sectionId: string;
  title: string;
  children: React.ReactNode;
  onDragStart?: (sectionId: string, event: React.DragEvent) => void;
  onDrop?: (draggedSectionId: string, targetSectionId: string, event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const DraggableSectionHeader: React.FC<DraggableSectionHeaderProps> = ({
	sectionId,
	title,
	children,
	onDragStart,
	onDrop,
	onDragOver,
	className,
	style,
}) => {
	const handleDragStart = (event: React.DragEvent) => {
		logger.info("ui", `Starting drag for section header ${sectionId}`, {
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

		logger.info("ui", `Drag ended for section header ${sectionId}`, {
			sectionId
		});
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		event.stopPropagation();

		const draggedSectionId = event.dataTransfer.getData("text/plain");

		logger.info("ui", `Dropping section ${draggedSectionId} onto section header ${sectionId}`, {
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
		const target = event.currentTarget as HTMLElement;
		target.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
		target.style.borderColor = "rgba(0, 123, 255, 0.3)";
	};

	const handleDragLeave = (event: React.DragEvent) => {
		// Only remove highlight if leaving the element entirely
		const target = event.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;

		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			target.style.backgroundColor = "";
			target.style.borderColor = "";
		}
	};

	const defaultStyle: React.CSSProperties = {
		cursor: "move",
		transition: "background-color 0.2s ease, border-color 0.2s ease",
		border: "1px solid transparent",
		...style,
	};

	return (
		<div
			draggable
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			className={className}
			style={defaultStyle}
			title={`Drag to move "${title}" section`}
		>
			{children}
		</div>
	);
};