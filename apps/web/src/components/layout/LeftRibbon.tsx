/**
 * Left ribbon component for collapsed left sidebar
 * Shows icon-only navigation with tool groups using VSCode-style groups
 */

import { GroupRibbonButton } from "@/components/layout/GroupRibbonButton";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  createNewGroup,
  getGroupDefinition,
  getRegistryVersion,
  updateGroupDefinition,
  type ToolGroupDefinition,
} from "@/stores/group-registry";
import { useLayoutStore } from "@/stores/layout-store";
import { getSectionById } from "@/stores/section-registry";
import { logger } from "@academic-explorer/utils/logger";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import React, { useMemo } from "react";

const GROUP_REORDER_DRAG_TYPE = "application/group-reorder";

type ThemeColors = ReturnType<typeof useThemeColors>["colors"];

export const LeftRibbon: React.FC = () => {
  const graphData = useGraphData();
  const { clearGraph } = graphData;
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const layoutStore = useLayoutStore();
  // const expandSidebarToSection = layoutStore.expandSidebarToSection; // Not used in group-based layout
  const getToolGroupsForSidebar = layoutStore.getToolGroupsForSidebar;
  const getActiveGroup = layoutStore.getActiveGroup;
  const setActiveGroup = layoutStore.setActiveGroup;
  const addSectionToGroup = layoutStore.addSectionToGroup;

  // State for drag and drop visual feedback
  const [isDragging, setIsDragging] = React.useState(false);
  const [draggedGroupId, setDraggedGroupId] = React.useState<string | null>(
    null,
  );
  const [dropInsertionIndex, setDropInsertionIndex] = React.useState<
    number | null
  >(null);

  // Get tool groups for left sidebar
  const toolGroupsList = getToolGroupsForSidebar("left");
  const activeGroup = getActiveGroup("left");

  // Convert tool groups list to record format for easier access
  const toolGroups = toolGroupsList.reduce((acc, group) => {
    acc[group.id] = {
      id: group.id,
      sections: group.sections,
      activeSection: group.isActive ? group.sections.find(s => s === group.sections[0]) || null : null
    };
    return acc;
  }, {} as Record<string, { id: string; sections: string[]; activeSection: string | null }>);
  const activeGroupId = activeGroup ?? null;
  const registryVersion = getRegistryVersion();
  const groupDefinitions = useMemo(() => {
    const definitions = Object.keys(toolGroups)
      .map((groupId) => getGroupDefinition(groupId))
      .filter((def): def is NonNullable<typeof def> => def !== undefined)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    logger.debug("ui", "Left ribbon group definitions", {
      toolGroups,
      groupKeys: Object.keys(toolGroups),
      definitions: definitions.map((d) => ({
        id: d.id,
        title: d.title,
        order: d.order,
      })),
      activeGroupId,
      registryVersion,
    });

    return definitions;
  }, [toolGroups, activeGroupId, registryVersion]);

  const handleClearGraph = () => {
    logger.debug("ui", "Clear graph clicked from left ribbon");
    clearGraph();
  };

  const handleGroupActivate = (groupId: string) => {
    logger.debug("ui", `Activating group ${groupId} for left sidebar`, {
      groupId,
    });

    // Check if group exists before activating
    const currentToolGroupsList = getToolGroupsForSidebar("left");
    const groupExists = currentToolGroupsList.some(g => g.id === groupId);

    logger.debug(
      "ui",
      `Group ${groupId} exists: ${groupExists ? "true" : "false"}`,
      {
        groupId,
        groupExists,
        currentGroups: currentToolGroupsList.map(g => g.id),
      },
    );

    if (!groupExists) {
      logger.warn(
        "ui",
        `Cannot activate group ${groupId} - it does not exist`,
        {
          groupId,
          availableGroups: currentToolGroupsList.map(g => g.id),
        },
      );
      return;
    }

    // Check if this group is already active and sidebar is open - if so, toggle sidebar
    const isCurrentlyActive = activeGroupId === groupId;
    const isCurrentlyOpen = layoutStore.leftSidebarOpen;

    if (isCurrentlyActive && isCurrentlyOpen) {
      logger.debug("ui", `Toggling sidebar closed for active group ${groupId}`);
      layoutStore.setLeftSidebarOpen(false);
      return;
    }

    // Activate the group and expand sidebar
    setActiveGroup({ sidebar: "left", groupId });
    layoutStore.setLeftSidebarOpen(true);

    logger.debug("ui", `Sidebar should now be open for group ${groupId}`);

    // Scroll to top after a brief delay to allow sidebar to expand
    setTimeout(() => {
      // Find the left sidebar container and scroll to top
      const sidebarContainer = document.querySelector(
        '[data-mantine-component="AppShell"] > nav',
      );
      if (sidebarContainer) {
        const scrollableElement =
          sidebarContainer.querySelector('[style*="overflow: auto"]') ??
          sidebarContainer;
        if (scrollableElement instanceof HTMLElement) {
          scrollableElement.scrollTop = 0;
        }
      }
    }, 150); // Small delay to allow expansion animation
  };

  const handleGroupReorder = ({
    sourceGroupId,
    targetGroupId,
    insertBefore,
  }: {
    sourceGroupId: string;
    targetGroupId: string;
    insertBefore: boolean;
  }) => {
    logger.debug(
      "ui",
      `LeftRibbon: Reordering group ${sourceGroupId} relative to ${targetGroupId}`,
      {
        sourceGroupId,
        targetGroupId,
        insertBefore,
        side: "left",
        currentOrder: groupDefinitions.map((g) => ({
          id: g.id,
          order: g.order,
        })),
      },
    );

    // Get current groups and reorder them
    const currentGroupsList = getToolGroupsForSidebar("left");
    const currentOrder = currentGroupsList.map(g => g.id);
    const sourceIndex = currentOrder.indexOf(sourceGroupId);
    const targetIndex = currentOrder.indexOf(targetGroupId);

    if (sourceIndex === -1 || targetIndex === -1) {
      logger.warn("ui", "Cannot reorder - group not found", {
        sourceGroupId,
        targetGroupId,
        currentOrder,
        sourceIndex,
        targetIndex,
      });
      return;
    }

    // Remove source from current position
    const newOrder = currentOrder.filter(id => id !== sourceGroupId);

    // Insert source at target position
    const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
    newOrder.splice(insertIndex, 0, sourceGroupId);

    layoutStore.reorderGroups({
      sidebar: "left",
      groupIds: newOrder,
    });

    // Reset drag state
    setIsDragging(false);
    setDraggedGroupId(null);
    setDropInsertionIndex(null);
  };

  const handleGroupDragStart = (groupId: string) => {
    setIsDragging(true);
    setDraggedGroupId(groupId);
    logger.debug("ui", `Starting group drag for ${groupId}`, {
      groupId,
      side: "left",
    });
  };

  const handleGroupDragEnd = () => {
    setIsDragging(false);
    setDraggedGroupId(null);
    setDropInsertionIndex(null);
  };

  const handleDropZoneHover = ({
    insertionIndex,
    hasGroupDrag = false,
  }: {
    insertionIndex: number;
    hasGroupDrag?: boolean;
  }) => {
    if (isDragging || hasGroupDrag) {
      setDropInsertionIndex(insertionIndex);
    }
  };

  const handleDropZoneLeave = () => {
    setDropInsertionIndex(null);
  };

  // Helper function to check if drag is a group reorder
  const isGroupReorderDrag = (dataTransfer: DataTransfer): boolean => {
    return dataTransfer.types.includes(GROUP_REORDER_DRAG_TYPE);
  };

  // Helper function to determine if drop zone should be shown
  const shouldShowDropZone = ({
    isDragging,
    hasGroupDrag,
    isActive,
  }: {
    isDragging: boolean;
    hasGroupDrag: boolean;
    isActive: boolean;
  }): boolean => {
    return (isDragging || hasGroupDrag) && isActive;
  };

  // Helper function to get drop zone style
  const getDropZoneStyle = ({
    shouldShow,
    colors,
  }: {
    shouldShow: boolean;
    colors: ThemeColors;
  }) => ({
    height: shouldShow ? "40px" : "0px",
    width: shouldShow ? "40px" : "40px",
    backgroundColor: shouldShow ? colors.primary : "transparent",
    transition: "all 0.2s ease",
    borderRadius: "8px",
    margin: shouldShow ? "2px 0" : "0px",
    opacity: shouldShow ? 1 : 0,
    border: shouldShow ? `2px solid ${colors.primary}` : "none",
    pointerEvents: "auto" as const,
    overflow: "hidden",
    padding: shouldShow ? "0" : "10px 0",
    marginTop: shouldShow ? "2px" : "-10px",
    marginBottom: shouldShow ? "2px" : "-10px",
  });

  // Helper function to handle drop logic
  const handleDropLogic = ({
    e,
    index,
    groupDefinitions,
  }: {
    e: React.DragEvent;
    index: number;
    groupDefinitions: ToolGroupDefinition[];
  }) => {
    const groupReorderData = e.dataTransfer.getData(GROUP_REORDER_DRAG_TYPE);
    if (!groupReorderData) return;

    logger.debug("ui", `Drop zone ${String(index)} processing reorder/move`, {
      sourceGroupId: groupReorderData,
      insertionIndex: index,
      totalGroups: groupDefinitions.length,
      targetSidebar: "left",
    });

    const leftGroupsList = getToolGroupsForSidebar("left");
    const isFromSameSidebar = leftGroupsList.some(g => g.id === groupReorderData);

    if (index === 0) {
      handleDropAtBeginning({
        groupReorderData,
        groupDefinitions,
        isFromSameSidebar,
      });
    } else if (index === groupDefinitions.length) {
      handleDropAtEnd({
        groupReorderData,
        groupDefinitions,
        isFromSameSidebar,
      });
    } else {
      handleDropBetweenGroups({
        groupReorderData,
        index,
        groupDefinitions,
        isFromSameSidebar,
      });
    }
  };

  // Helper functions for different drop positions
  const handleDropAtBeginning = ({
    groupReorderData,
    groupDefinitions,
    isFromSameSidebar,
  }: {
    groupReorderData: string;
    groupDefinitions: ToolGroupDefinition[];
    isFromSameSidebar: boolean;
  }) => {
    const firstGroup = groupDefinitions[0];
    if (firstGroup.id !== groupReorderData) {
      if (isFromSameSidebar) {
        handleGroupReorder({
          sourceGroupId: groupReorderData,
          targetGroupId: firstGroup.id,
          insertBefore: true,
        });
      } else {
        // Determine source sidebar - check if group exists in left or right
        const leftGroupsList = getToolGroupsForSidebar("left");
        const fromSidebar = leftGroupsList.some(g => g.id === groupReorderData) ? "left" : "right";

        layoutStore.moveGroupToSidebar({
          fromSidebar,
          toSidebar: "left",
          groupId: groupReorderData,
        });

        // After moving, need to reorder to position at beginning
        setTimeout(() => {
          const updatedLeftGroupsList = getToolGroupsForSidebar("left");
          const currentOrder = updatedLeftGroupsList.map(g => g.id);
          const newOrder = [groupReorderData, ...currentOrder.filter(id => id !== groupReorderData)];

          layoutStore.reorderGroups({
            sidebar: "left",
            groupIds: newOrder,
          });
        }, 0);
      }
    }
  };

  const handleDropAtEnd = ({
    groupReorderData,
    groupDefinitions,
    isFromSameSidebar,
  }: {
    groupReorderData: string;
    groupDefinitions: ToolGroupDefinition[];
    isFromSameSidebar: boolean;
  }) => {
    const lastGroup = groupDefinitions[groupDefinitions.length - 1];
    if (lastGroup.id !== groupReorderData) {
      if (isFromSameSidebar) {
        handleGroupReorder({
          sourceGroupId: groupReorderData,
          targetGroupId: lastGroup.id,
          insertBefore: false,
        });
      } else {
        // Determine source sidebar - check if group exists in left or right
        const leftGroupsList = getToolGroupsForSidebar("left");
        const fromSidebar = leftGroupsList.some(g => g.id === groupReorderData) ? "left" : "right";

        layoutStore.moveGroupToSidebar({
          fromSidebar,
          toSidebar: "left",
          groupId: groupReorderData,
        });

        // After moving, need to reorder to position at end
        setTimeout(() => {
          const updatedLeftGroupsList = getToolGroupsForSidebar("left");
          const currentOrder = updatedLeftGroupsList.map(g => g.id);
          const newOrder = [...currentOrder.filter(id => id !== groupReorderData), groupReorderData];

          layoutStore.reorderGroups({
            sidebar: "left",
            groupIds: newOrder,
          });
        }, 0);
      }
    } else if (!isFromSameSidebar) {
      // Determine source sidebar
      const leftGroupsList = getToolGroupsForSidebar("left");
      const fromSidebar = leftGroupsList.some(g => g.id === groupReorderData) ? "left" : "right";

      layoutStore.moveGroupToSidebar({
        fromSidebar,
        toSidebar: "left",
        groupId: groupReorderData,
      });
    }
  };

  const handleDropBetweenGroups = ({
    groupReorderData,
    index,
    groupDefinitions,
    isFromSameSidebar,
  }: {
    groupReorderData: string;
    index: number;
    groupDefinitions: ToolGroupDefinition[];
    isFromSameSidebar: boolean;
  }) => {
    const targetGroup = groupDefinitions[index - 1];
    if (targetGroup.id !== groupReorderData) {
      if (isFromSameSidebar) {
        handleGroupReorder({
          sourceGroupId: groupReorderData,
          targetGroupId: targetGroup.id,
          insertBefore: false,
        });
      } else {
        // Determine source sidebar - check if group exists in left or right
        const leftGroupsList = getToolGroupsForSidebar("left");
        const fromSidebar = leftGroupsList.some(g => g.id === groupReorderData) ? "left" : "right";

        layoutStore.moveGroupToSidebar({
          fromSidebar,
          toSidebar: "left",
          groupId: groupReorderData,
        });

        // After moving, need to reorder to position after target group
        setTimeout(() => {
          const updatedLeftGroupsList = getToolGroupsForSidebar("left");
          const currentOrder = updatedLeftGroupsList.map(g => g.id);
          const targetIndex = currentOrder.indexOf(targetGroup.id);
          const newOrder = [
            ...currentOrder.filter(id => id !== groupReorderData).slice(0, targetIndex + 1),
            groupReorderData,
            ...currentOrder.filter(id => id !== groupReorderData).slice(targetIndex + 1),
          ];

          layoutStore.reorderGroups({
            sidebar: "left",
            groupIds: newOrder,
          });
        }, 0);
      }
    }
  };

  // DropZone component for insertion indicators
  const DropZone: React.FC<{ index: number; isActive: boolean }> = ({
    index,
    isActive,
  }) => {
    const [hasGroupDrag, setHasGroupDrag] = React.useState(false);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();

      const isGroupReorder = isGroupReorderDrag(e.dataTransfer);
      if (isGroupReorder) {
        setHasGroupDrag(true);
        logger.debug(
          "ui",
          `LeftRibbon DropZone ${String(index)} detected group drag`,
          {
            index,
            hasGroupDrag,
            isDragging,
          },
        );
      }

      handleDropZoneHover({
        insertionIndex: index,
        hasGroupDrag: isGroupReorder,
      });
    };

    const handleDragLeave = () => {
      setHasGroupDrag(false);
      handleDropZoneLeave();
    };

    const showDropZone = shouldShowDropZone({
      isDragging,
      hasGroupDrag,
      isActive,
    });

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Drop zone ${index} - Drop group here to reorder`}
        style={getDropZoneStyle({ shouldShow: showDropZone, colors })}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          logger.debug(
            "ui",
            `LeftRibbon drop zone ${String(index)} received drop`,
            {
              index,
              types: Array.from(e.dataTransfer.types),
              isDragging,
              draggedGroupId,
            },
          );
          handleDropLogic({ e, index, groupDefinitions });
        }}
      />
    );
  };

  const handleDrop = ({
    draggedSectionId,
    targetGroupId,
  }: {
    draggedSectionId: string;
    targetGroupId: string;
  }) => {
    logger.debug(
      "ui",
      `LeftRibbon handleDrop: Moving section ${draggedSectionId} to group ${targetGroupId}`,
      {
        draggedSectionId,
        targetGroupId,
        side: "left",
      },
    );

    // First, remove the section from all existing groups on both sides
    const leftGroups = getToolGroupsForSidebar("left");
    const rightGroups = getToolGroupsForSidebar("right");

    logger.debug("ui", `Current groups before removal`, {
      leftGroups: Object.keys(leftGroups),
      rightGroups: Object.keys(rightGroups),
      targetGroupExists: targetGroupId in leftGroups,
      targetGroupSections: leftGroups[targetGroupId].sections,
    });

    // Remove from left sidebar groups
    Object.entries(leftGroups).forEach(([groupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        logger.debug(
          "ui",
          `Removing ${draggedSectionId} from left group ${groupId}`,
        );
        layoutStore.removeSectionFromGroup({
          sidebar: "left",
          groupId,
          sectionKey: draggedSectionId,
        });
      }
    });

    // Remove from right sidebar groups
    Object.entries(rightGroups).forEach(([groupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        logger.debug(
          "ui",
          `Removing ${draggedSectionId} from right group ${groupId}`,
        );
        layoutStore.removeSectionFromGroup({
          sidebar: "right",
          groupId,
          sectionKey: draggedSectionId,
        });
      }
    });

    // Check if target group exists after removals
    const updatedLeftGroups = getToolGroupsForSidebar("left");
    logger.debug("ui", `Groups after removal, before addition`, {
      leftGroups: Object.keys(updatedLeftGroups),
      targetGroupExists: Boolean(updatedLeftGroups[targetGroupId]),
      targetGroupId,
    });

    // Then add to the target group
    addSectionToGroup({
      sidebar: "left",
      groupId: targetGroupId,
      sectionKey: draggedSectionId,
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleEmptyAreaDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if this is a group reorder drag - if so, ignore it
    const isGroupReorder = event.dataTransfer.types.includes(
      GROUP_REORDER_DRAG_TYPE,
    );
    if (isGroupReorder) {
      logger.debug("ui", "Ignoring group reorder drag in empty area", {
        types: Array.from(event.dataTransfer.types),
      });
      return;
    }

    const draggedSectionId = event.dataTransfer.getData("text/plain");
    if (!draggedSectionId) {
      logger.warn("ui", "No dragged section ID found in dataTransfer");
      return;
    }

    // Get the tool's category - this will be the group type
    const section = getSectionById(draggedSectionId);
    if (!section?.category) {
      logger.warn(
        "ui",
        `Cannot create group for section ${draggedSectionId} - no category`,
        {
          draggedSectionId,
          section,
        },
      );
      return;
    }

    // Create a new group with unique ID
    const newGroup = createNewGroup(draggedSectionId);
    const groupId = newGroup.id;

    logger.debug(
      "ui",
      `Creating new group ${groupId} for section ${draggedSectionId} on left ribbon`,
      {
        draggedSectionId,
        groupId,
        category: section.category,
        groupTitle: newGroup.title,
      },
    );

    // First, remove the section from all existing groups
    const leftGroups = getToolGroupsForSidebar("left");
    const rightGroups = getToolGroupsForSidebar("right");

    Object.entries(leftGroups).forEach(([existingGroupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        layoutStore.removeSectionFromGroup({
          sidebar: "left",
          groupId: existingGroupId,
          sectionKey: draggedSectionId,
        });
      }
    });

    Object.entries(rightGroups).forEach(([existingGroupId, group]) => {
      if (group.sections.includes(draggedSectionId)) {
        layoutStore.removeSectionFromGroup({
          sidebar: "right",
          groupId: existingGroupId,
          sectionKey: draggedSectionId,
        });
      }
    });

    // Add to the new group (will create the group since it's guaranteed to not exist)
    addSectionToGroup({
      sidebar: "left",
      groupId,
      sectionKey: draggedSectionId,
    });
    setActiveGroup({ sidebar: "left", groupId });

    // Immediately update the group definition with the section
    updateGroupDefinition(groupId, [draggedSectionId], getSectionById);
  };

  const ribbonButtonStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "transparent",
    border: `1px solid ${colors.border.primary}`,
    transition: "all 0.2s ease",
  };

  return (
    <div
      role="region"
      aria-label="Left sidebar - Drop tools here to create new groups"
      onDrop={handleEmptyAreaDrop}
      onDragOver={handleDragOver}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        alignItems: "center",
        padding: "16px 8px",
        gap: "12px",
        borderRight: `1px solid ${colors.border.primary}`,
      }}
    >
      {/* Dynamic tool groups */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {groupDefinitions.map((group, index) => (
          <React.Fragment key={group.id}>
            {/* Drop zone before first item or between items */}
            <DropZone index={index} isActive={dropInsertionIndex === index} />

            <GroupRibbonButton
              group={group}
              isActive={activeGroupId === group.id}
              onActivate={handleGroupActivate}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onGroupReorder={handleGroupReorder}
              onDragStart={handleGroupDragStart}
              onDragEnd={handleGroupDragEnd}
              side="left"
            />
          </React.Fragment>
        ))}

        {/* Drop zone after last item */}
        <DropZone
          index={groupDefinitions.length}
          isActive={dropInsertionIndex === groupDefinitions.length}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Clear graph at bottom */}
      <Tooltip label="Clear entire graph" position="right" withArrow>
        <ActionIcon
          variant="subtle"
          size="lg"
          style={{
            ...ribbonButtonStyle,
            borderColor: colors.error,
          }}
          onClick={handleClearGraph}
          aria-label="Clear entire graph"
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, {
              backgroundColor: colors.error,
              borderColor: colors.error,
              color: colors.text.inverse,
            });
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, {
              ...ribbonButtonStyle,
              borderColor: colors.error,
              color: "inherit",
            });
          }}
        >
          <IconTrash size={20} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
};
