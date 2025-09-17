/**
 * Graph actions section component
 * Extracted from LeftSidebar for dynamic section system
 */

import React from "react";
import { LayoutControls } from "@/components/molecules/LayoutControls";
import { ForceControls } from "@/components/molecules/ForceControls";

export const GraphActionsSection: React.FC = () => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<LayoutControls />
			<ForceControls />
		</div>
	);
};