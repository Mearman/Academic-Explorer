/**
 * Layout store for sidebar state management
 * Simple Zustand store without Immer to avoid React 19 infinite loops
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProviderType } from '@/lib/graph/types';

interface LayoutState {
  // Sidebar states
  leftSidebarOpen: boolean;
  leftSidebarPinned: boolean;
  rightSidebarOpen: boolean;
  rightSidebarPinned: boolean;

  // Graph provider selection
  graphProvider: ProviderType;

  // Preview entity (for hover/selection)
  previewEntityId: string | null;

  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  pinLeftSidebar: (pinned: boolean) => void;
  pinRightSidebar: (pinned: boolean) => void;
  setGraphProvider: (provider: ProviderType) => void;
  setPreviewEntity: (entityId: string | null) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Initial state
      leftSidebarOpen: true,
      leftSidebarPinned: false,
      rightSidebarOpen: true,
      rightSidebarPinned: false,
      graphProvider: 'xyflow',
      previewEntityId: null,

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

      setGraphProvider: (provider) =>
        set({ graphProvider: provider }),

      setPreviewEntity: (entityId) =>
        set({ previewEntityId: entityId }),
    }),
    {
      name: 'academic-explorer-layout',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain values
      partialize: (state) => ({
        leftSidebarPinned: state.leftSidebarPinned,
        rightSidebarPinned: state.rightSidebarPinned,
        graphProvider: state.graphProvider,
      }),
    }
  )
);