/**
 * Dynamic left sidebar component
 * Replaces the hardcoded LeftSidebar with VSCode-style section management
 */

import React from "react";
import { DynamicSidebar } from "@/components/layout/DynamicSidebar";
import { BuildInfo } from "@/components/molecules/BuildInfo";
import { Stack } from "@mantine/core";

export const LeftSidebarDynamic: React.FC = () => {

  return (
    <Stack
      h="100%"
      gap={0}
      style={{ overflow: "hidden" }}
    >
      {/* Dynamic sections */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <DynamicSidebar side="left" />
      </div>

      {/* Footer with build info */}
      <BuildInfo />
    </Stack>
  );
};
