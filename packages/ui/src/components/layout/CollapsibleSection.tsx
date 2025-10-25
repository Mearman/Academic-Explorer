/**
 * Collapsible section component for sidebar organization
 * Provides expandable sections with icons and state persistence
 */

import React, { useState, type ReactNode, type FC } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

export type CollapsibleSectionProps = {
	title: string;
	icon: ReactNode;
	children: ReactNode;
	defaultExpanded?: boolean;
	storageKey?: string;
	onToggle?: (expanded: boolean) => void;
};

export const CollapsibleSection: FC<CollapsibleSectionProps> = ({
	title,
	icon,
	children,
	defaultExpanded = true,
	storageKey,
	onToggle,
}) => {
	const [isExpanded, setIsExpanded] = useState(() => {
		if (storageKey && typeof window !== "undefined") {
			try {
				const stored = localStorage.getItem(`collapsible-section-${storageKey}`);
				return stored ? JSON.parse(stored) : defaultExpanded;
			} catch {
				return defaultExpanded;
			}
		}
		return defaultExpanded;
	});

	const toggleExpanded = () => {
		const newExpanded = !isExpanded;
		setIsExpanded(newExpanded);

		// Persist to localStorage if storageKey is provided
		if (storageKey && typeof window !== "undefined") {
			try {
				localStorage.setItem(`collapsible-section-${storageKey}`, JSON.stringify(newExpanded));
			} catch {
				// Silently fail if localStorage is not available
			}
		}

		// Call external toggle handler
		onToggle?.(newExpanded);
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
					borderBottom: "1px solid var(--mantine-color-gray-3)",
					fontSize: "13px",
					fontWeight: 600,
					color: "var(--mantine-color-gray-7)",
					cursor: "pointer",
					transition: "color 0.2s ease",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.color = "var(--mantine-color-blue-6)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.color = "var(--mantine-color-gray-7)";
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