/**
 * Group-based layout store for VSCode-style sidebar state management
 * Ribbon buttons represent tool groups (categories), multiple tools can be in each group
 * Uses shared createTrackedStore abstraction for DRY compliance
 */

import type { ProviderType } from "@academic-explorer/graph";
import {
  getDefaultSectionPlacements,
  getAllSectionIds,
  getSectionById,
} from "./section-registry";
import {
  updateGroupDefinition,
  getGroupDefinition,
  registerGroupDefinition,
} from "./group-registry";
import { logger } from "@academic-explorer/utils/logger";
import { createTrackedStore } from "@academic-explorer/utils/state";

interface ToolGroup {
  id: string;
  sections: string[];
  activeSection: string | null;
}

interface LayoutState {
  // Sidebar states
  leftSidebarOpen: boolean;
  leftSidebarPinned: boolean;
  rightSidebarOpen: boolean;
  rightSidebarPinned: boolean;

  // Autohide states
  leftSidebarAutoHidden: boolean;
  rightSidebarAutoHidden: boolean;

  // Hover states for autohide
  leftSidebarHovered: boolean;
  rightSidebarHovered: boolean;

  // Section collapsed states (for tool headers)
  collapsedSections: Record<string, boolean>;

  // Section placement states (which sidebar each section is in)
  sectionPlacements: Record<string, "left" | "right">;

  // Active group for each sidebar (VSCode-style single active group)
  activeGroups: Record<"left" | "right", string | null>;

  // Tool groups for each sidebar (category-based groups with multiple tools)
  toolGroups: Record<"left" | "right", Record<string, ToolGroup>>;

  // Graph provider selection
  graphProvider: ProviderType;

  // Preview entity (for hover/selection)
  previewEntityId: string | null;

  // Graph behavior preferences
  autoPinOnLayoutStabilization: boolean;
}

interface LayoutActions {
  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  pinLeftSidebar: (pinned: boolean) => void;
  pinRightSidebar: (pinned: boolean) => void;
  setLeftSidebarAutoHidden: (autoHidden: boolean) => void;
  setRightSidebarAutoHidden: (autoHidden: boolean) => void;
  setLeftSidebarHovered: (hovered: boolean) => void;
  setRightSidebarHovered: (hovered: boolean) => void;
  setSectionCollapsed: ({
    sectionKey,
    collapsed,
  }: {
    sectionKey: string;
    collapsed: boolean;
  }) => void;
  expandSidebarToSection: ({
    sidebar,
    sectionKey,
  }: {
    sidebar: "left" | "right";
    sectionKey: string;
  }) => void;
  setActiveGroup: ({
    sidebar,
    groupId,
  }: {
    sidebar: "left" | "right";
    groupId: string | null;
  }) => void;
  addSectionToGroup: ({
    sidebar,
    groupId,
    sectionId,
  }: {
    sidebar: "left" | "right";
    groupId: string;
    sectionId: string;
  }) => void;
  removeSectionFromGroup: ({
    sidebar,
    groupId,
    sectionId,
  }: {
    sidebar: "left" | "right";
    groupId: string;
    sectionId: string;
  }) => void;
  setActiveTabInGroup: ({
    sidebar,
    groupId,
    sectionId,
  }: {
    sidebar: "left" | "right";
    groupId: string;
    sectionId: string;
  }) => void;
  moveSectionToSidebar: ({
    sectionId,
    targetSidebar,
  }: {
    sectionId: string;
    targetSidebar: "left" | "right";
  }) => void;
  resetSectionPlacements: () => void;
  getSectionsForSidebar: (sidebar: "left" | "right") => string[];
  getActiveGroup: (sidebar: "left" | "right") => string | null;
  getToolGroupsForSidebar: (
    sidebar: "left" | "right",
  ) => Record<string, ToolGroup>;
  reorderGroups: ({
    sidebar,
    sourceGroupId,
    targetGroupId,
    insertBefore,
  }: {
    sidebar: "left" | "right";
    sourceGroupId: string;
    targetGroupId: string;
    insertBefore: boolean;
  }) => void;
  moveGroupToSidebar: ({
    sourceGroupId,
    targetSidebar,
    targetGroupId,
    insertBefore,
  }: {
    sourceGroupId: string;
    targetSidebar: "left" | "right";
    targetGroupId?: string;
    insertBefore?: boolean;
  }) => void;
  setGraphProvider: (provider: ProviderType) => void;
  setPreviewEntity: (entityId: string | null) => void;
  setAutoPinOnLayoutStabilization: (enabled: boolean) => void;

  // Index signature to satisfy constraint
  [key: string]: unknown;
}

// Helper function to create default tool groups based on categories
const createDefaultToolGroups = (): Record<
  "left" | "right",
  Record<string, ToolGroup>
> => {
  const placements = getDefaultSectionPlacements();
  const leftSections = getAllSectionIds().filter(
    (id) => placements[id] === "left",
  );
  const rightSections = getAllSectionIds().filter(
    (id) => placements[id] === "right",
  );

  // Get unique categories for each sidebar
  const leftCategories = [
    ...new Set(
      leftSections
        .map((id) => getSectionById(id)?.category)
        .filter((cat): cat is string => Boolean(cat)),
    ),
  ];
  const rightCategories = [
    ...new Set(
      rightSections
        .map((id) => getSectionById(id)?.category)
        .filter((cat): cat is string => Boolean(cat)),
    ),
  ];

  const createGroupsForSide = (sections: string[], categories: string[]) => {
    const groups: Record<string, ToolGroup> = {};
    for (const category of categories) {
      const categorySections = sections.filter((id) => {
        const section = getSectionById(id);
        return section?.category === category;
      });
      if (categorySections.length > 0) {
        groups[category] = {
          id: category,
          sections: categorySections,
          activeSection: categorySections[0] ?? null, // Default to first section
        };
      }
    }
    return groups;
  };

  return {
    left: createGroupsForSide(leftSections, leftCategories),
    right: createGroupsForSide(rightSections, rightCategories),
  };
};

// Helper function to create default active groups (first group in each sidebar)
const createDefaultActiveGroups = (): Record<
  "left" | "right",
  string | null
> => {
  const toolGroups = createDefaultToolGroups();
  const leftGroupIds = Object.keys(toolGroups.left);
  const rightGroupIds = Object.keys(toolGroups.right);

  return {
    left: leftGroupIds[0] ?? null,
    right: rightGroupIds[0] ?? null,
  };
};

type LayoutPersistedState = Partial<
  Pick<
    LayoutState,
    | "leftSidebarOpen"
    | "leftSidebarPinned"
    | "rightSidebarOpen"
    | "rightSidebarPinned"
    | "collapsedSections"
    | "sectionPlacements"
    | "activeGroups"
    | "toolGroups"
    | "graphProvider"
    | "autoPinOnLayoutStabilization"
  >
>;

const { useStore: useLayoutStore } = createTrackedStore<
  LayoutState,
  LayoutActions
>({
  config: {
    name: "layout",
    initialState: {
      // Initial state
      leftSidebarOpen: true,
      leftSidebarPinned: false,
      rightSidebarOpen: true,
      rightSidebarPinned: false,
      leftSidebarAutoHidden: false,
      rightSidebarAutoHidden: false,
      leftSidebarHovered: false,
      rightSidebarHovered: false,
      collapsedSections: {},
      sectionPlacements: getDefaultSectionPlacements(),
      activeGroups: createDefaultActiveGroups(),
      toolGroups: createDefaultToolGroups(),
      graphProvider: "xyflow",
      previewEntityId: null,
      autoPinOnLayoutStabilization: false,
    },
    persist: {
      enabled: true,
      storage: "hybrid",
      config: {
        dbName: "academic-explorer",
        storeName: "layout-store",
        version: 1,
      },
      partialize: (state) => ({
        leftSidebarPinned: state.leftSidebarPinned,
        rightSidebarPinned: state.rightSidebarPinned,
        collapsedSections: state.collapsedSections,
        sectionPlacements: state.sectionPlacements,
        activeGroups: state.activeGroups,
        toolGroups: state.toolGroups,
        graphProvider: state.graphProvider,
        autoPinOnLayoutStabilization: state.autoPinOnLayoutStabilization,
      }),
    },
  },
  actionsFactory: ({ set, get }) => ({
    toggleLeftSidebar: () =>
      set((state) => ({
        leftSidebarOpen: !state.leftSidebarOpen,
      })),

    toggleRightSidebar: () =>
      set((state) => ({
        rightSidebarOpen: !state.rightSidebarOpen,
      })),

    setLeftSidebarOpen: (open) =>
      set((state) => ({ ...state, leftSidebarOpen: open })),

    setRightSidebarOpen: (open) =>
      set((state) => ({ ...state, rightSidebarOpen: open })),

    pinLeftSidebar: (pinned) =>
      set((state) => ({ ...state, leftSidebarPinned: pinned })),

    pinRightSidebar: (pinned) =>
      set((state) => ({ ...state, rightSidebarPinned: pinned })),

    setLeftSidebarAutoHidden: (autoHidden) =>
      set((state) => ({ ...state, leftSidebarAutoHidden: autoHidden })),

    setRightSidebarAutoHidden: (autoHidden) =>
      set((state) => ({ ...state, rightSidebarAutoHidden: autoHidden })),

    setLeftSidebarHovered: (hovered) =>
      set((state) => ({ ...state, leftSidebarHovered: hovered })),

    setRightSidebarHovered: (hovered) =>
      set((state) => ({ ...state, rightSidebarHovered: hovered })),

    setSectionCollapsed: ({ sectionKey, collapsed }) =>
      set((state) => ({
        collapsedSections: {
          ...state.collapsedSections,
          [sectionKey]: collapsed,
        },
      })),

    expandSidebarToSection: ({ sidebar, sectionKey }) =>
      set((state) => {
        // Find which group contains this section
        const toolGroups = state.toolGroups[sidebar];
        let targetGroupId: string | null = null;

        for (const [groupId, group] of Object.entries(toolGroups) as [
          string,
          ToolGroup,
        ][]) {
          if (group.sections.includes(sectionKey)) {
            targetGroupId = groupId;
            break;
          }
        }

        if (!targetGroupId) return state;

        // Update the group's active section and set as active group
        const updatedGroups = {
          ...toolGroups,
          [targetGroupId]: {
            ...toolGroups[targetGroupId],
            activeSection: sectionKey,
          },
        };

        return {
          // Open the appropriate sidebar
          leftSidebarOpen: sidebar === "left" ? true : state.leftSidebarOpen,
          rightSidebarOpen: sidebar === "right" ? true : state.rightSidebarOpen,
          toolGroups: {
            ...state.toolGroups,
            [sidebar]: updatedGroups,
          },
          activeGroups: {
            ...state.activeGroups,
            [sidebar]: targetGroupId,
          },
        };
      }),

    setActiveGroup: ({ sidebar, groupId }) =>
      set((state) => ({
        activeGroups: {
          ...state.activeGroups,
          [sidebar]: groupId,
        },
      })),

    addSectionToGroup: ({ sidebar, groupId, sectionId }) =>
      set((state) => {
        const toolGroups = state.toolGroups[sidebar];
        const hasGroup = groupId in toolGroups;
        const group = hasGroup ? toolGroups[groupId] : undefined;

        logger.debug("ui", `addSectionToGroup called`, {
          sidebar,
          groupId,
          sectionId,
          groupExists: hasGroup,
          existingGroupIds: Object.keys(toolGroups),
          existingGroupSections: group?.sections,
        });

        // Handle existing group
        if (hasGroup && group) {
          // If group already contains the section, do nothing
          if (group.sections.includes(sectionId)) {
            logger.debug(
              "ui",
              `Section ${sectionId} already in group ${groupId}, skipping`,
            );
            return state;
          }
        } else {
          // Check if this is a valid group definition from the registry
          const groupDefinition = getGroupDefinition(groupId);
          if (!groupDefinition) {
            logger.error(
              "ui",
              `Cannot add section to non-existent group - no group definition found`,
              {
                sidebar,
                groupId,
                sectionId,
                availableGroups: Object.keys(toolGroups),
              },
            );
            return state; // Only allow adding to groups that exist in the registry
          }

          logger.debug("ui", `Creating new group from registry definition`, {
            sidebar,
            groupId,
            sectionId,
            groupDefinition: {
              id: groupDefinition.id,
              title: groupDefinition.title,
            },
          });
        }

        // Update existing group or create new one from registry
        let updatedGroup: ToolGroup;
        if (hasGroup && group) {
          // Update existing group
          updatedGroup = {
            ...group,
            sections: [...group.sections, sectionId],
            activeSection: sectionId, // Focus the newly added section
          };
        } else {
          // Create new group from registry definition
          updatedGroup = {
            id: groupId,
            sections: [sectionId],
            activeSection: sectionId,
          };
        }

        logger.debug("ui", `Adding section ${sectionId} to group ${groupId}`, {
          sidebar,
          groupId,
          sectionId,
          isNewGroup: !hasGroup,
          ...(hasGroup && group && { oldSections: group.sections }),
          newSections: updatedGroup.sections,
        });

        // Update group definition based on sections
        updateGroupDefinition(groupId, updatedGroup.sections, getSectionById);

        return {
          toolGroups: {
            ...state.toolGroups,
            [sidebar]: {
              ...toolGroups,
              [groupId]: updatedGroup,
            },
          },
          activeGroups: {
            ...state.activeGroups,
            [sidebar]: groupId, // Activate the group
          },
        };
      }),

    removeSectionFromGroup: ({ sidebar, groupId, sectionId }) =>
      set((state) => {
        const toolGroups = state.toolGroups[sidebar];
        const hasGroup = groupId in toolGroups;
        const group = hasGroup ? toolGroups[groupId] : undefined;

        if (!hasGroup || !group) return state;

        const updatedSections = group.sections.filter((id) => id !== sectionId);
        const newActiveSection =
          group.activeSection === sectionId
            ? updatedSections[0] || null
            : group.activeSection;

        // If group becomes empty, remove it entirely
        if (updatedSections.length === 0) {
          const { [groupId]: _removedGroup, ...remainingGroups } = toolGroups;
          const newActiveGroup =
            state.activeGroups[sidebar] === groupId
              ? null
              : state.activeGroups[sidebar];

          // Remove group definition
          updateGroupDefinition(groupId, [], getSectionById);

          return {
            toolGroups: {
              ...state.toolGroups,
              [sidebar]: remainingGroups,
            },
            activeGroups: {
              ...state.activeGroups,
              [sidebar]: newActiveGroup,
            },
          };
        }

        const updatedGroup = {
          ...group,
          sections: updatedSections,
          activeSection: newActiveSection,
        };

        // Update group definition based on new sections
        updateGroupDefinition(groupId, updatedGroup.sections, getSectionById);

        return {
          toolGroups: {
            ...state.toolGroups,
            [sidebar]: {
              ...toolGroups,
              [groupId]: updatedGroup,
            },
          },
        };
      }),

    setActiveTabInGroup: ({ sidebar, groupId, sectionId }) =>
      set((state) => {
        const toolGroups = state.toolGroups[sidebar];
        const hasGroup = groupId in toolGroups;
        const group = hasGroup ? toolGroups[groupId] : undefined;

        if (!hasGroup || !group?.sections.includes(sectionId)) return state;

        const updatedGroup = {
          ...group,
          activeSection: sectionId,
        };

        return {
          toolGroups: {
            ...state.toolGroups,
            [sidebar]: {
              ...toolGroups,
              [groupId]: updatedGroup,
            },
          },
        };
      }),

    moveSectionToSidebar: ({ sectionId, targetSidebar }) =>
      set((state) => ({
        sectionPlacements: {
          ...state.sectionPlacements,
          [sectionId]: targetSidebar,
        },
      })),

    resetSectionPlacements: () =>
      set((state) => ({
        ...state,
        sectionPlacements: getDefaultSectionPlacements(),
        activeGroups: { left: null, right: null },
        toolGroups: createDefaultToolGroups(),
      })),

    getSectionsForSidebar: (sidebar) => {
      const state = get();
      return getAllSectionIds().filter(
        (sectionId) => state.sectionPlacements[sectionId] === sidebar,
      );
    },

    getActiveGroup: (sidebar) => {
      const state = get();
      return state.activeGroups[sidebar];
    },

    getToolGroupsForSidebar: (sidebar) => {
      const state = get();
      return state.toolGroups[sidebar];
    },

    reorderGroups: ({
      sidebar,
      sourceGroupId,
      targetGroupId,
      insertBefore,
    }) => {
      const state = get();
      const toolGroups = state.toolGroups[sidebar];

      logger.debug("ui", `Starting reorderGroups`, {
        sidebar,
        sourceGroupId,
        targetGroupId,
        insertBefore,
        availableGroups: Object.keys(toolGroups),
      });

      // Get group definitions for both source and target
      const sourceDefinition = getGroupDefinition(sourceGroupId);
      const targetDefinition = getGroupDefinition(targetGroupId);

      logger.debug("ui", `Group definitions found`, {
        sourceDefinition: sourceDefinition
          ? { id: sourceDefinition.id, order: sourceDefinition.order }
          : null,
        targetDefinition: targetDefinition
          ? { id: targetDefinition.id, order: targetDefinition.order }
          : null,
      });

      if (!sourceDefinition || !targetDefinition) {
        logger.warn("ui", `Missing group definitions, cannot reorder`, {
          sourceDefinition: !!sourceDefinition,
          targetDefinition: !!targetDefinition,
        });
        return;
      }

      // Get all groups for this sidebar and sort them by current order
      const allGroupIds = Object.keys(toolGroups);
      const allGroups = allGroupIds
        .map((id) => ({ id, definition: getGroupDefinition(id) }))
        .filter(
          (
            item,
          ): item is {
            id: string;
            definition: NonNullable<ReturnType<typeof getGroupDefinition>>;
          } => item.definition !== undefined,
        )
        .sort(
          (a, b) => (a.definition.order ?? 999) - (b.definition.order ?? 999),
        );

      // Create a new ordered list by removing source and inserting it at the target position
      const reorderedGroups = allGroups.filter(
        ({ id }) => id !== sourceGroupId,
      );
      const targetIndex = reorderedGroups.findIndex(
        ({ id }) => id === targetGroupId,
      );

      const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
      reorderedGroups.splice(insertIndex, 0, {
        id: sourceGroupId,
        definition: sourceDefinition,
      });

      // Reassign orders starting from 1
      reorderedGroups.forEach(({ id, definition }, index) => {
        const newOrder = index + 1;
        logger.debug("ui", `Reassigning order for group ${id}`, {
          groupId: id,
          oldOrder: definition.order,
          newOrder,
        });

        registerGroupDefinition({
          ...definition,
          order: newOrder,
        });
      });

      logger.debug("ui", `Reorder complete`);
    },

    moveGroupToSidebar: ({
      sourceGroupId,
      targetSidebar,
      targetGroupId,
      insertBefore = false,
    }) => {
      const state = get();

      logger.debug("ui", `Starting moveGroupToSidebar`, {
        sourceGroupId,
        targetSidebar,
        targetGroupId,
        insertBefore,
      });

      // Find the source group in both sidebars
      const leftGroups = state.toolGroups.left;
      const rightGroups = state.toolGroups.right;
      let sourceGroup: ToolGroup | null = null;
      let sourceSidebar: "left" | "right" | null = null;

      if (sourceGroupId in leftGroups) {
        sourceGroup = leftGroups[sourceGroupId] ?? null;
        sourceSidebar = "left";
      } else if (sourceGroupId in rightGroups) {
        sourceGroup = rightGroups[sourceGroupId] ?? null;
        sourceSidebar = "right";
      }

      if (!sourceGroup || !sourceSidebar) {
        logger.warn(
          "ui",
          `Source group ${sourceGroupId} not found in either sidebar`,
        );
        return;
      }

      if (sourceSidebar === targetSidebar) {
        logger.debug(
          "ui",
          `Group ${sourceGroupId} is already on ${targetSidebar} sidebar, using reorderGroups instead`,
        );
        if (targetGroupId) {
          get().reorderGroups({
            sidebar: targetSidebar,
            sourceGroupId,
            targetGroupId,
            insertBefore,
          });
        }
        return;
      }

      logger.debug(
        "ui",
        `Moving group ${sourceGroupId} from ${sourceSidebar} to ${targetSidebar}`,
        {
          sourceGroup: { id: sourceGroup.id, sections: sourceGroup.sections },
        },
      );

      // Remove from source sidebar
      set((state) => {
        const newToolGroups = { ...state.toolGroups };

        // Remove from source sidebar
        if (sourceSidebar === "left") {
          const { [sourceGroupId]: _removed, ...remaining } =
            newToolGroups.left;
          newToolGroups.left = remaining;
        } else {
          const { [sourceGroupId]: _removed, ...remaining } =
            newToolGroups.right;
          newToolGroups.right = remaining;
        }

        // Add to target sidebar
        newToolGroups[targetSidebar] = {
          ...newToolGroups[targetSidebar],
          [sourceGroupId]: sourceGroup,
        };

        return { toolGroups: newToolGroups };
      });

      // If a target position is specified, reorder within the target sidebar
      if (targetGroupId) {
        // Give a moment for the state to update, then reorder
        setTimeout(() => {
          get().reorderGroups({
            sidebar: targetSidebar,
            sourceGroupId,
            targetGroupId,
            insertBefore,
          });
        }, 0);
      }

      // Set the moved group as active on the target sidebar
      get().setActiveGroup({ sidebar: targetSidebar, groupId: sourceGroupId });

      // Open the target sidebar to show the moved group
      if (targetSidebar === "left") {
        get().setLeftSidebarOpen(true);
      } else {
        get().setRightSidebarOpen(true);
      }

      logger.debug("ui", `Move to ${targetSidebar} sidebar complete`);
    },

    setGraphProvider: (provider) =>
      set((state) => ({ ...state, graphProvider: provider })),

    setPreviewEntity: (entityId) => {
      const currentState = get();
      if (currentState.previewEntityId !== entityId) {
        set((state) => ({ ...state, previewEntityId: entityId }));
      }
    },

    setAutoPinOnLayoutStabilization: (enabled) =>
      set((state) => ({ ...state, autoPinOnLayoutStabilization: enabled })),
  }),
});

export { useLayoutStore };
