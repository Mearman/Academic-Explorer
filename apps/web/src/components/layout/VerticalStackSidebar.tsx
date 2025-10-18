/**
 * Vertical stack sidebar component for VSCode-style tool groups
 * Shows all tools within the active group in a vertical stack
 */

import React, { Suspense } from "react";
import { Stack, Divider, Text, Collapse, ActionIcon } from "@mantine/core";
import { IconChevronDown, IconGripVertical } from "@tabler/icons-react";
import { useLayoutStore } from "@/stores/layout-store";
import { getSectionById } from "@/stores/section-registry";
import { getGroupDefinition } from "@/stores/group-registry";
import { SectionContextMenu } from "@/components/layout/SectionContextMenu";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";

// Constants
const TEXT_PLAIN_DATA_TYPE = "text/plain";

interface VerticalStackSidebarProps {
  side: "left" | "right";
}

export const VerticalStackSidebar: React.FC<VerticalStackSidebarProps> = ({
  side,
}) => {
  const layoutStore = useLayoutStore();
  const { getActiveGroup } = layoutStore;
  const { getToolGroupsForSidebar } = layoutStore;
  const { addSectionToGroup } = layoutStore;
  const { removeSectionFromGroup } = layoutStore;
  const { setSectionCollapsed } = layoutStore;
  const { collapsedSections } = layoutStore;
  const { setLeftSidebarOpen } = layoutStore;
  const { setRightSidebarOpen } = layoutStore;
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  const activeGroupId = getActiveGroup(side);
  const toolGroups = getToolGroupsForSidebar(side);
  const activeGroup = activeGroupId ? toolGroups[activeGroupId] : null;

  const groupDefinition = activeGroupId
    ? getGroupDefinition(activeGroupId)
    : null;

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedSectionId = event.dataTransfer.getData(TEXT_PLAIN_DATA_TYPE);
    if (!draggedSectionId || !activeGroupId) return;

    logger.debug(
      "ui",
      `Moving section ${draggedSectionId} to active group ${activeGroupId} for ${side} sidebar`,
      {
        draggedSectionId,
        activeGroupId,
        side,
      },
    );

    // First, remove the section from all existing groups on both sides
    const leftGroups = getToolGroupsForSidebar("left");
    const rightGroups = getToolGroupsForSidebar("right");

    // Remove from left sidebar groups
    Object.entries(leftGroups).forEach(([groupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        removeSectionFromGroup({
          sidebar: "left",
          groupId,
          sectionId: draggedSectionId,
        });
      }
    });

    // Remove from right sidebar groups
    Object.entries(rightGroups).forEach(([groupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        removeSectionFromGroup({
          sidebar: "right",
          groupId,
          sectionId: draggedSectionId,
        });
      }
    });

    // Then add to the target group
    addSectionToGroup({
      sidebar: side,
      groupId: activeGroupId,
      sectionId: draggedSectionId,
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleToolDragStart = ({ sectionId, event }) => {
    logger.debug("ui", `Starting drag for tool ${sectionId}`, {
      sectionId,
      side,
    });
    event.dataTransfer.setData(TEXT_PLAIN_DATA_TYPE, sectionId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleToolDrop = ({ targetSectionId, event }) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedSectionId = event.dataTransfer.getData(TEXT_PLAIN_DATA_TYPE);
    if (
      !draggedSectionId ||
      !activeGroupId ||
      draggedSectionId === targetSectionId
    )
      return;

    logger.debug(
      "ui",
      `Moving tool ${draggedSectionId} to group ${activeGroupId}`,
      {
        draggedSectionId,
        targetGroupId: activeGroupId,
        side,
      },
    );

    // First, remove the section from all existing groups on both sides
    const leftGroups = getToolGroupsForSidebar("left");
    const rightGroups = getToolGroupsForSidebar("right");

    // Remove from left sidebar groups
    Object.entries(leftGroups).forEach(([groupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        removeSectionFromGroup({
          sidebar: "left",
          groupId,
          sectionId: draggedSectionId,
        });
      }
    });

    // Remove from right sidebar groups
    Object.entries(rightGroups).forEach(([groupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        removeSectionFromGroup({
          sidebar: "right",
          groupId,
          sectionId: draggedSectionId,
        });
      }
    });

    // Then add to the target group
    addSectionToGroup({
      sidebar: side,
      groupId: activeGroupId,
      sectionId: draggedSectionId,
    });
  };

  const handleToggleCollapse = (sectionId: string) => {
    const isCollapsed = collapsedSections[sectionId] || false;
    setSectionCollapsed({ sectionKey: sectionId, collapsed: !isCollapsed });
  };

  // Use useEffect to handle sidebar collapse when no active group
  React.useEffect(() => {
    if (!activeGroup || !groupDefinition) {
      // Collapse only the specific sidebar that has no active group
      if (side === "left") {
        setLeftSidebarOpen(false);
      } else {
        setRightSidebarOpen(false);
      }
    }
  }, [
    activeGroup,
    groupDefinition,
    side,
    setLeftSidebarOpen,
    setRightSidebarOpen,
  ]);

  if (!activeGroup || !groupDefinition) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label={`${side} sidebar content - Drop tools here to add to group`}
      style={{
        height: "100%",
        overflow: "auto",
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Vertical stack of all tools in the group */}
      <Stack gap={0}>
        {activeGroup.sections.map((sectionId, index) => {
          const section = getSectionById(sectionId);
          if (!section) return null;

          const SectionComponent = section.component;
          const isLast = index === activeGroup.sections.length - 1;
          const isCollapsed = collapsedSections[sectionId] || false;
          const SectionIcon = section.icon;

          return (
            <div key={sectionId}>
              {/* Collapsible tool header */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`${section.title} - Drag to reorder or press Enter to toggle collapse`}
                aria-expanded={!isCollapsed}
                draggable
                onDragStart={(e) => {
                  handleToolDragStart({ sectionId, event: e });
                }}
                onDrop={(e) => {
                  handleToolDrop({ targetSectionId: sectionId, event: e });
                }}
                onDragOver={handleDragOver}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggleCollapse(sectionId);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  backgroundColor: colors.background.tertiary,
                  borderBottom: `1px solid ${colors.border.primary}`,
                  cursor: "grab",
                  userSelect: "none",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    colors.background.secondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    colors.background.tertiary;
                }}
              >
                {/* Drag handle */}
                <IconGripVertical
                  size={14}
                  style={{
                    color: colors.text.secondary,
                    marginRight: "6px",
                    cursor: "grab",
                  }}
                />

                {/* Tool icon */}
                <div
                  style={{
                    color: colors.text.primary,
                    marginRight: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <SectionIcon size={16} />
                </div>

                {/* Tool title - clickable for collapse */}
                <Text
                  size="sm"
                  fw={500}
                  style={{
                    color: colors.text.primary,
                    flex: 1,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    handleToggleCollapse(sectionId);
                  }}
                >
                  {section.title}
                </Text>

                {/* Context menu */}
                <SectionContextMenu
                  sectionId={sectionId}
                  currentSidebar={side}
                />

                {/* Collapse toggle */}
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    handleToggleCollapse(sectionId);
                  }}
                  style={{
                    marginLeft: "4px",
                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <IconChevronDown size={14} />
                </ActionIcon>
              </div>

              {/* Collapsible section content */}
              <Collapse in={!isCollapsed}>
                <div
                  style={{
                    padding: "16px",
                    minHeight: isCollapsed ? 0 : "200px",
                  }}
                >
                  <Suspense
                    fallback={
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: colors.text.secondary,
                        }}
                      >
                        Loading {section.title}...
                      </div>
                    }
                  >
                    <SectionComponent />
                  </Suspense>
                </div>
              </Collapse>

              {/* Divider between tools (except for last one) */}
              {!isLast && (
                <Divider
                  style={{
                    borderColor: colors.border.secondary,
                  }}
                />
              )}
            </div>
          );
        })}
      </Stack>
    </div>
  );
};
