/**
 * Dynamic sidebar component that renders tool groups in vertical stacks
 * Shows all tools within the active group stacked vertically
 */

import React from "react";
import { VerticalStackSidebar } from "@/components/layout/VerticalStackSidebar";

interface DynamicSidebarProps {
  side: "left" | "right";
}

export const DynamicSidebar: React.FC<DynamicSidebarProps> = ({ side }) => {
	return <VerticalStackSidebar side={side} />;
};