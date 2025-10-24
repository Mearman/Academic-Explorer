/**
 * Dynamic right sidebar component
 * Replaces the hardcoded RightSidebar with VSCode-style section management
 */

import React from "react";
import { DynamicSidebar } from "@/components/layout/DynamicSidebar";

export const RightSidebarDynamic: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Dynamic sections */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
        }}
      >
        <DynamicSidebar side="right" />
      </div>
    </div>
  );
};
