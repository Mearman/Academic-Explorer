/**
 * Dynamic left sidebar component
 * Replaces the hardcoded LeftSidebar with VSCode-style section management
 */

import React from "react";
import { DynamicSidebar } from "@/components/layout/DynamicSidebar";
import { BuildInfo } from "@/components/molecules/BuildInfo";
import { useThemeColors } from "@/hooks/use-theme-colors";

export const LeftSidebarDynamic: React.FC = () => {
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
          Search & Controls
				</div>
			</div>

			{/* Dynamic sections */}
			<div style={{
				flex: 1,
				overflow: "auto",
				padding: "8px",
			}}>
				<DynamicSidebar side="left" />
			</div>

			{/* Footer with build info */}
			<div style={{
				padding: "8px 16px",
				borderTop: `1px solid ${colors.border.primary}`,
				backgroundColor: colors.background.secondary,
			}}>
				<BuildInfo />
			</div>
		</div>
	);
};