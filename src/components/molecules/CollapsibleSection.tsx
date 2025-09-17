/**
 * Collapsible section component for sidebar organization
 * Provides expandable sections with icons and state persistence
 */

import React from "react";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useLayoutStore } from "@/stores/layout-store";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

interface CollapsibleSectionProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	defaultExpanded?: boolean;
	storageKey?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
	title,
	icon,
	children,
	defaultExpanded = true,
	storageKey,
}) => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;
	const layoutStore = useLayoutStore();
	const collapsedSections = layoutStore.collapsedSections;
	const setSectionCollapsed = layoutStore.setSectionCollapsed;

	// Get current expanded state from store or default (inverted from collapsed)
	const isExpanded = storageKey
		? !(collapsedSections[storageKey] ?? !defaultExpanded)
		: defaultExpanded;

	const toggleExpanded = () => {
		if (storageKey) {
			setSectionCollapsed(storageKey, isExpanded);
		}
	};

	return (
		<div style={{ width: "100%" }}>
			{/* Section Header */}
			<button
				onClick={toggleExpanded}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					width: "100%",
					padding: "8px 0",
					backgroundColor: "transparent",
					border: "none",
					borderBottom: `1px solid ${colors.border.primary}`,
					fontSize: "13px",
					fontWeight: 600,
					color: colors.text.primary,
					cursor: "pointer",
					transition: "color 0.2s ease",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.color = colors.primary;
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.color = colors.text.primary;
				}}
			>
				{/* Expand/collapse chevron */}
				<span style={{ display: "flex", alignItems: "center" }}>
					{isExpanded ? (
						<IconChevronDown size={14} />
					) : (
						<IconChevronRight size={14} />
					)}
				</span>

				{/* Section icon */}
				<span style={{ display: "flex", alignItems: "center" }}>
					{icon}
				</span>

				{/* Section title */}
				<span>{title}</span>
			</button>

			{/* Section Content */}
			{isExpanded && (
				<div style={{
					paddingTop: "12px",
					paddingBottom: "20px",
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