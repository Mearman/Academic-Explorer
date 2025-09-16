/**
 * Layout store for sidebar state management
 * Simple Zustand store without Immer to avoid React 19 infinite loops
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProviderType } from "@/lib/graph/types";

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

  // Section expansion states
  expandedSections: Record<string, boolean>;

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
  setSectionExpanded: (sectionKey: string, expanded: boolean) => void;
  expandSidebarToSection: (sidebar: "left" | "right", sectionKey: string) => void;
  setGraphProvider: (provider: ProviderType) => void;
  setPreviewEntity: (entityId: string | null) => void;
  setAutoPinOnLayoutStabilization: (enabled: boolean) => void;
}

type LayoutPersistedState = Partial<Pick<LayoutState,
  | "leftSidebarOpen"
  | "leftSidebarPinned"
  | "rightSidebarOpen"
  | "rightSidebarPinned"
  | "expandedSections"
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
			expandedSections: {},
			graphProvider: "xyflow",
			previewEntityId: null,
			autoPinOnLayoutStabilization: true,

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

			setSectionExpanded: (sectionKey, expanded) =>
				set((state) => ({
					expandedSections: {
						...state.expandedSections,
						[sectionKey]: expanded,
					},
				})),

			expandSidebarToSection: (sidebar, sectionKey) =>
				set((state) => ({
					// Open the appropriate sidebar
					leftSidebarOpen: sidebar === "left" ? true : state.leftSidebarOpen,
					rightSidebarOpen: sidebar === "right" ? true : state.rightSidebarOpen,
					// Expand the target section
					expandedSections: {
						...state.expandedSections,
						[sectionKey]: true,
					},
				})),

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
			storage: createJSONStorage(() => localStorage),
			// Only persist certain values
			partialize: (state) => ({
				leftSidebarPinned: state.leftSidebarPinned,
				rightSidebarPinned: state.rightSidebarPinned,
				expandedSections: state.expandedSections,
				graphProvider: state.graphProvider,
				autoPinOnLayoutStabilization: state.autoPinOnLayoutStabilization,
			}),
			// Migration for existing localStorage entries that don't have autoPinOnLayoutStabilization
			migrate: (persistedState: unknown): unknown => {
				// If the persisted state doesn't have autoPinOnLayoutStabilization, add it with default value
				if (persistedState && typeof persistedState === "object") {
					const state = persistedState as LayoutPersistedState;
					if (typeof state.autoPinOnLayoutStabilization === "undefined") {
						return {
							...state,
							autoPinOnLayoutStabilization: true,
						};
					}
				}
				return persistedState;
			},
			version: 1,
		}
	)
);