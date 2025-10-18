/**
 * Context menu for section management
 * Provides options to move sections between sidebars and reset to defaults
 */

import React from "react";
import { Menu, ActionIcon } from "@mantine/core";
import {
  IconDots,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
} from "@tabler/icons-react";
import { useLayoutStore } from "@/stores/layout-store";
import { getSectionById } from "@/stores/section-registry";
import { logger } from "@academic-explorer/utils/logger";

interface SectionContextMenuProps {
  sectionId: string;
  currentSidebar: "left" | "right";
  trigger?: React.ReactNode;
}

export const SectionContextMenu: React.FC<SectionContextMenuProps> = ({
  sectionId,
  currentSidebar,
  trigger,
}) => {
  const layoutStore = useLayoutStore();
  const { moveSectionToSidebar } = layoutStore;
  const { resetSectionPlacements } = layoutStore;

  const section = getSectionById(sectionId);

  const handleMoveToSidebar = (sidebar: "left" | "right") => {
    logger.debug(
      "ui",
      `Moving section ${sectionId} to ${sidebar} sidebar via context menu`,
      {
        sectionId,
        fromSidebar: currentSidebar,
        toSidebar: sidebar,
      },
    );
    moveSectionToSidebar({ sectionId, targetSidebar: sidebar });
  };

  const handleResetPlacements = () => {
    logger.debug("ui", "Resetting all section placements to defaults", {
      sectionId,
    });
    resetSectionPlacements();
  };

  if (!section) {
    return null;
  }

  const defaultTrigger = (
    <ActionIcon
      variant="subtle"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <IconDots size={14} />
    </ActionIcon>
  );

  return (
    <Menu
      position="bottom-end"
      withArrow
      shadow="md"
      closeOnClickOutside
      closeOnEscape
    >
      <Menu.Target>{trigger ?? defaultTrigger}</Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Move Section</Menu.Label>

        {currentSidebar === "right" && (
          <Menu.Item
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => {
              handleMoveToSidebar("left");
            }}
          >
            Move to Left Sidebar
          </Menu.Item>
        )}

        {currentSidebar === "left" && (
          <Menu.Item
            leftSection={<IconArrowRight size={14} />}
            onClick={() => {
              handleMoveToSidebar("right");
            }}
          >
            Move to Right Sidebar
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Label>Layout</Menu.Label>

        <Menu.Item
          leftSection={<IconRefresh size={14} />}
          onClick={handleResetPlacements}
        >
          Reset All Sections to Default
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
