/**
 * Dynamic right sidebar component
 * Replaces the hardcoded RightSidebar with VSCode-style section management
 */

import React from "react";
import { DynamicSidebar } from "@/components/layout/DynamicSidebar";
import { useThemeColors } from "@/hooks/use-theme-colors";

export const RightSidebarDynamic: React.FC = () => {
	const themeColors = useThemeColors();
	const colors = themeColors.colors;

	return (
		<div style={{
			display: "flex",
			flexDirection: "column",
			height: "100%",
			overflow: "hidden",
		}}>
			{/* Header */}
			<div
				style={{
					padding: "12px 16px",
					borderBottom: `1px solid ${colors.border.primary}`,
					backgroundColor: colors.background.secondary,
				}}
			>
				<div style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					fontSize: "14px",
					fontWeight: 600,
					color: colors.text.primary,
				}}>
          Entity Details & Analysis
				</div>
			</div>

			{/* Dynamic sections */}
			<div style={{
				flex: 1,
				overflow: "auto",
				padding: "8px",
			}}>
				<DynamicSidebar side="right" />
			</div>
		</div>
	);
};