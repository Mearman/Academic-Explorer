/**
 * Group-based layout store for VSCode-style sidebar state management
 * Ribbon buttons represent tool groups (categories), multiple tools can be in each group
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProviderType } from "@academic-explorer/graph";
import { getDefaultSectionPlacements, getAllSectionIds, getSectionById } from "@/stores/section-registry";
import { updateGroupDefinition, getGroupDefinition, registerGroupDefinition } from "@/stores/group-registry";
import { createHybridStorage } from "@academic-explorer/utils/storage";
import { logger } from "@academic-explorer/utils/logger";

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
  setSectionCollapsed: (sectionKey: string, collapsed: boolean) => void;
  expandSidebarToSection: (sidebar: "left" | "right", sectionKey: string) => void;
  setActiveGroup: (sidebar: "left" | "right", groupId: string | null) => void;
  addSectionToGroup: (sidebar: "left" | "right", groupId: string, sectionId: string) => void;
  removeSectionFromGroup: (sidebar: "left" | "right", groupId: string, sectionId: string) => void;
  setActiveTabInGroup: (sidebar: "left" | "right", groupId: string, sectionId: string) => void;
  moveSectionToSidebar: (sectionId: string, targetSidebar: "left" | "right") => void;
  resetSectionPlacements: () => void;
  getSectionsForSidebar: (sidebar: "left" | "right") => string[];
  getActiveGroup: (sidebar: "left" | "right") => string | null;
  getToolGroupsForSidebar: (sidebar: "left" | "right") => Record<string, ToolGroup>;
  reorderGroups: (sidebar: "left" | "right", sourceGroupId: string, targetGroupId: string, insertBefore: boolean) => void;
  moveGroupToSidebar: (sourceGroupId: string, targetSidebar: "left" | "right", targetGroupId?: string, insertBefore?: boolean) => void;
  setGraphProvider: (provider: ProviderType) => void;
  setPreviewEntity: (entityId: string | null) => void;
  setAutoPinOnLayoutStabilization: (enabled: boolean) => void;
}

// Helper function to create default tool groups based on categories
const createDefaultToolGroups = (): Record<"left" | "right", Record<string, ToolGroup>> => {
	const placements = getDefaultSectionPlacements();
	const leftSections = getAllSectionIds().filter(id => placements[id] === "left");
	const rightSections = getAllSectionIds().filter(id => placements[id] === "right");

	// Get unique categories for each sidebar
	const leftCategories = [...new Set(leftSections.map(id => getSectionById(id)?.category).filter((cat): cat is string => Boolean(cat)))];
	const rightCategories = [...new Set(rightSections.map(id => getSectionById(id)?.category).filter((cat): cat is string => Boolean(cat)))];

	const createGroupsForSide = (sections: string[], categories: string[]) => {
		const groups: Record<string, ToolGroup> = {};
		for (const category of categories) {
			const categorySections = sections.filter(id => {
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
const createDefaultActiveGroups = (): Record<"left" | "right", string | null> => {
	const toolGroups = createDefaultToolGroups();
	const leftGroupIds = Object.keys(toolGroups.left);
	const rightGroupIds = Object.keys(toolGroups.right);

	return {
		left: leftGroupIds[0] ?? null,
		right: rightGroupIds[0] ?? null,
	};
};

type LayoutPersistedState = Partial<Pick<LayoutState,
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
>>;

export const useLayoutStore = create<LayoutState>()(
	persist(
		(set, get) => ({
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

			// Actions
			toggleLeftSidebar: () =>
				set((state) => ({
					leftSidebarOpen: !state.leftSidebarOpen,
				})),

			toggleRightSidebar: () =>
				set((state) => ({
					rightSidebarOpen: !state.rightSidebarOpen,
				})),

			setLeftSidebarOpen: (open) =>
				set({ leftSidebarOpen: open }),

			setRightSidebarOpen: (open) =>
				set({ rightSidebarOpen: open }),

			pinLeftSidebar: (pinned) =>
				set({ leftSidebarPinned: pinned }),

			pinRightSidebar: (pinned) =>
				set({ rightSidebarPinned: pinned }),

			setLeftSidebarAutoHidden: (autoHidden) =>
				set({ leftSidebarAutoHidden: autoHidden }),

			setRightSidebarAutoHidden: (autoHidden) =>
				set({ rightSidebarAutoHidden: autoHidden }),

			setLeftSidebarHovered: (hovered) =>
				set({ leftSidebarHovered: hovered }),

			setRightSidebarHovered: (hovered) =>
				set({ rightSidebarHovered: hovered }),

			setSectionCollapsed: (sectionKey, collapsed) =>
				set((state) => ({
					collapsedSections: {
						...state.collapsedSections,
						[sectionKey]: collapsed,
					},
				})),

			expandSidebarToSection: (sidebar, sectionKey) =>
				set((state) => {
					// Find which group contains this section
					const toolGroups = state.toolGroups[sidebar];
					let targetGroupId: string | null = null;

					for (const [groupId, group] of Object.entries(toolGroups)) {
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

			setActiveGroup: (sidebar, groupId) =>
				set((state) => ({
					activeGroups: {
						...state.activeGroups,
						[sidebar]: groupId,
					},
				})),

			addSectionToGroup: (sidebar, groupId, sectionId) =>
				set((state) => {
					const toolGroups = state.toolGroups[sidebar];
					// Type guard for group existence
					function isValidGroup(g: ToolGroup | undefined): g is ToolGroup {
						return g !== undefined;
					}
					const group = toolGroups[groupId];
					const groupExists = isValidGroup(group);

					const existingGroupSections = groupExists ? group.sections : undefined;
					logger.debug("ui", `addSectionToGroup called`, {
						sidebar,
						groupId,
						sectionId,
						groupExists,
						existingGroupIds: Object.keys(toolGroups),
						existingGroupSections
					});

					// Handle existing group
					if (group) {
						// If group already contains the section, do nothing
						if (group.sections.includes(sectionId)) {
							logger.debug("ui", `Section ${sectionId} already in group ${groupId}, skipping`);
							return state;
						}
					} else {
						// Check if this is a valid group definition from the registry
						const groupDefinition = getGroupDefinition(groupId);
						if (!groupDefinition) {
							logger.error("ui", `Cannot add section to non-existent group - no group definition found`, {
								sidebar,
								groupId,
								sectionId,
								availableGroups: Object.keys(toolGroups)
							});
							return state; // Only allow adding to groups that exist in the registry
						}

						logger.debug("ui", `Creating new group from registry definition`, {
							sidebar,
							groupId,
							sectionId,
							groupDefinition: { id: groupDefinition.id, title: groupDefinition.title }
						});
					}

					// Update existing group or create new one from registry
					let updatedGroup: ToolGroup;
					if (group) {
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
						isNewGroup: !group,
						...(group?.sections !== undefined && { oldSections: group.sections }),
						newSections: updatedGroup.sections
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

			removeSectionFromGroup: (sidebar, groupId, sectionId) =>
				set((state) => {
					const toolGroups = state.toolGroups[sidebar];
					const group: ToolGroup | undefined = toolGroups[groupId];

					if (!(groupId in toolGroups)) return state;
					if (!group) return state;

					const updatedSections = group.sections.filter(id => id !== sectionId);
					const newActiveSection = group.activeSection === sectionId
						? updatedSections[0] || null
						: group.activeSection;

					// If group becomes empty, remove it entirely
					if (updatedSections.length === 0) {
						const { [groupId]: removedGroup, ...remainingGroups } = toolGroups;
						const newActiveGroup = state.activeGroups[sidebar] === groupId
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

			setActiveTabInGroup: (sidebar, groupId, sectionId) =>
				set((state) => {
					const toolGroups = state.toolGroups[sidebar];
					const group: ToolGroup | undefined = toolGroups[groupId];

					if (!(groupId in toolGroups)) return state;
					if (!group?.sections.includes(sectionId)) return state;

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

			moveSectionToSidebar: (sectionId, targetSidebar) =>
				set((state) => ({
					sectionPlacements: {
						...state.sectionPlacements,
						[sectionId]: targetSidebar,
					},
				})),

			resetSectionPlacements: () =>
				set({
					sectionPlacements: getDefaultSectionPlacements(),
					activeGroups: { left: null, right: null },
					toolGroups: createDefaultToolGroups(),
				}),

			getSectionsForSidebar: (sidebar) => {
				const state = get();
				return getAllSectionIds().filter(
					sectionId => state.sectionPlacements[sectionId] === sidebar
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

			reorderGroups: (sidebar, sourceGroupId, targetGroupId, insertBefore) => {
				const state = get();
				const toolGroups = state.toolGroups[sidebar];

				logger.debug("ui", `Starting reorderGroups`, {
					sidebar,
					sourceGroupId,
					targetGroupId,
					insertBefore,
					availableGroups: Object.keys(toolGroups)
				});

				// Get group definitions for both source and target
				const sourceDefinition = getGroupDefinition(sourceGroupId);
				const targetDefinition = getGroupDefinition(targetGroupId);

				logger.debug("ui", `Group definitions found`, {
					sourceDefinition: sourceDefinition ? { id: sourceDefinition.id, order: sourceDefinition.order } : null,
					targetDefinition: targetDefinition ? { id: targetDefinition.id, order: targetDefinition.order } : null
				});

				if (!sourceDefinition || !targetDefinition) {
					logger.warn("ui", `Missing group definitions, cannot reorder`, {
						sourceDefinition: !!sourceDefinition,
						targetDefinition: !!targetDefinition
					});
					return;
				}

				// Get all groups for this sidebar and sort them by current order
				const allGroupIds = Object.keys(toolGroups);
				const allGroups = allGroupIds
					.map(id => ({ id, definition: getGroupDefinition(id) }))
					.filter((item): item is { id: string; definition: NonNullable<ReturnType<typeof getGroupDefinition>> } => item.definition !== undefined)
					.sort((a, b) => (a.definition.order ?? 999) - (b.definition.order ?? 999));

				// Create a new ordered list by removing source and inserting it at the target position
				const reorderedGroups = allGroups.filter(({ id }) => id !== sourceGroupId);
				const targetIndex = reorderedGroups.findIndex(({ id }) => id === targetGroupId);

				const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
				reorderedGroups.splice(insertIndex, 0, { id: sourceGroupId, definition: sourceDefinition });

				// Reassign orders starting from 1
				reorderedGroups.forEach(({ id, definition }, index) => {
					const newOrder = index + 1;
					logger.debug("ui", `Reassigning order for group ${id}`, {
						groupId: id,
						oldOrder: definition.order,
						newOrder
					});

					registerGroupDefinition({
						...definition,
						order: newOrder
					});
				});

				logger.debug("ui", `Reorder complete`);
			},

			moveGroupToSidebar: (sourceGroupId, targetSidebar, targetGroupId, insertBefore = false) => {
				const state = get();

				logger.debug("ui", `Starting moveGroupToSidebar`, {
					sourceGroupId,
					targetSidebar,
					targetGroupId,
					insertBefore
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
					logger.warn("ui", `Source group ${sourceGroupId} not found in either sidebar`);
					return;
				}

				if (sourceSidebar === targetSidebar) {
					logger.debug("ui", `Group ${sourceGroupId} is already on ${targetSidebar} sidebar, using reorderGroups instead`);
					if (targetGroupId) {
						get().reorderGroups(targetSidebar, sourceGroupId, targetGroupId, insertBefore);
					}
					return;
				}

				logger.debug("ui", `Moving group ${sourceGroupId} from ${sourceSidebar} to ${targetSidebar}`, {
					sourceGroup: { id: sourceGroup.id, sections: sourceGroup.sections }
				});

				// Remove from source sidebar
				set(state => {
					const newToolGroups = { ...state.toolGroups };

					// Remove from source sidebar
					if (sourceSidebar === "left") {
						const { [sourceGroupId]: removed, ...remaining } = newToolGroups.left;
						newToolGroups.left = remaining;
					} else {
						const { [sourceGroupId]: removed, ...remaining } = newToolGroups.right;
						newToolGroups.right = remaining;
					}

					// Add to target sidebar
					newToolGroups[targetSidebar] = {
						...newToolGroups[targetSidebar],
						[sourceGroupId]: sourceGroup
					};

					return { toolGroups: newToolGroups };
				});

				// If a target position is specified, reorder within the target sidebar
				if (targetGroupId) {
					// Give a moment for the state to update, then reorder
					setTimeout(() => {
						get().reorderGroups(targetSidebar, sourceGroupId, targetGroupId, insertBefore);
					}, 0);
				}

				// Set the moved group as active on the target sidebar
				get().setActiveGroup(targetSidebar, sourceGroupId);

				// Open the target sidebar to show the moved group
				if (targetSidebar === "left") {
					get().setLeftSidebarOpen(true);
				} else {
					get().setRightSidebarOpen(true);
				}

				logger.debug("ui", `Move to ${targetSidebar} sidebar complete`);
			},

			setGraphProvider: (provider) =>
				set({ graphProvider: provider }),

			setPreviewEntity: (entityId) => {
				const currentState = get();
				if (currentState.previewEntityId !== entityId) {
					set({ previewEntityId: entityId });
				}
			},

			setAutoPinOnLayoutStabilization: (enabled) =>
				set({ autoPinOnLayoutStabilization: enabled }),
		}),
		{
			name: "academic-explorer-layout",
			storage: createJSONStorage(() => createHybridStorage({
				dbName: "academic-explorer",
				storeName: "layout-store",
				version: 1
			})),
			// Only persist certain values
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
			// Migration for existing localStorage entries
			migrate: (persistedState: unknown): unknown => {
				function isValidPersistedState(state: unknown): state is Record<string, unknown> {
					return state !== null && typeof state === "object";
				}

				function isLayoutPersistedState(state: unknown): state is LayoutPersistedState {
					if (!isValidPersistedState(state)) {
						return false;
					}

					const typedState = state as LayoutPersistedState;

					// Validate optional boolean fields
					const booleanFields = ["leftSidebarOpen", "leftSidebarPinned", "rightSidebarOpen", "rightSidebarPinned", "autoPinOnLayoutStabilization"] as const;
					for (const field of booleanFields) {
						if (typedState[field] !== undefined && typeof typedState[field] !== "boolean") {
							return false;
						}
					}
					// Validate optional object fields
					if (typedState.collapsedSections !== undefined && typedState.collapsedSections !== null && typeof typedState.collapsedSections !== "object") {
						return false;
					}
					if (typedState.sectionPlacements !== undefined && typedState.sectionPlacements !== null && typeof typedState.sectionPlacements !== "object") {
						return false;
					}
					if (typedState.activeGroups !== undefined && typedState.activeGroups !== null && typeof typedState.activeGroups !== "object") {
						return false;
					}
					if (typedState.toolGroups !== undefined && typedState.toolGroups !== null && typeof typedState.toolGroups !== "object") {
						return false;
					}
					// Validate optional string fields
					if (typedState.graphProvider !== undefined && typeof typedState.graphProvider !== "string") {
						return false;
					}
					return true;
				}

				if (isLayoutPersistedState(persistedState)) {
					const state = persistedState;
					let migrated = false;

					// Add autoPinOnLayoutStabilization if missing
					if (typeof state.autoPinOnLayoutStabilization === "undefined") {
						state.autoPinOnLayoutStabilization = true;
						migrated = true;
					}

					// Add sectionPlacements if missing
					if (!state.sectionPlacements) {
						state.sectionPlacements = getDefaultSectionPlacements();
						migrated = true;
					}

					// Add collapsedSections if missing
					if (!state.collapsedSections) {
						state.collapsedSections = {};
						migrated = true;
					}

					// Add toolGroups if missing (new group-based system)
					if (!state.toolGroups) {
						state.toolGroups = createDefaultToolGroups();
						migrated = true;
					}

					// Add activeGroups if missing or if they're both null
					if (!state.activeGroups || (state.activeGroups.left === null && state.activeGroups.right === null)) {
						state.activeGroups = createDefaultActiveGroups();
						migrated = true;
					}

					return migrated ? { ...state } : persistedState;
				}
				return persistedState;
			},
			version: 2,
		}
	)
);