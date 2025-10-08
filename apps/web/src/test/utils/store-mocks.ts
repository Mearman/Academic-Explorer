/**
 * Shared store mocking utilities for testing
 * Provides consistent mocking patterns for Zustand stores
 */

import { vi } from "vitest";
import type { StateCreator } from "zustand";
import React from "react";

/**
 * Creates a mock Zustand store for testing
 * Provides a consistent way to mock store state and actions
 */
export function createMockStore<T extends Record<string, unknown>>(
  initialState: Partial<T> = {},
): T & {
  __mockReset: () => void;
  __mockUpdate: (update: Partial<T>) => void;
} {
  const state = { ...initialState } as T;

  const mockStore = new Proxy(state, {
    get(target, prop) {
      if (prop === "__mockReset") {
        return () => {
          Object.keys(target).forEach((key) => {
            delete (target as any)[key];
          });
          Object.assign(target, initialState);
        };
      }

      if (prop === "__mockUpdate") {
        return (update: Partial<T>) => {
          Object.assign(target, update);
        };
      }

      return target[prop as keyof T];
    },
    set(target, prop, value) {
      (target as any)[prop] = value;
      return true;
    },
  });

  return mockStore as T & {
    __mockReset: () => void;
    __mockUpdate: (update: Partial<T>) => void;
  };
}

/**
 * Mock graph store with common test state
 */
export const createMockGraphStore = () =>
  createMockStore({
    nodes: new Map(),
    edges: new Map(),
    selectedNodeId: null,
    currentLayout: {
      entityType: "d3-force" as const,
      options: {},
    },
    addNode: vi.fn(),
    removeNode: vi.fn(),
    updateNode: vi.fn(),
    addEdge: vi.fn(),
    removeEdge: vi.fn(),
    setSelectedNode: vi.fn(),
    setLayout: vi.fn(),
    clearGraph: vi.fn(),
    resetToInitialState: vi.fn(),
  });

/**
 * Mock layout store with common test state
 */
export const createMockLayoutStore = () =>
  createMockStore({
    animationEnabled: true,
    autoLayout: false,
    layoutType: "d3-force" as const,
    isRunning: false,
    iterations: 0,
    maxIterations: 100,
    toggleAnimation: vi.fn(),
    setAutoLayout: vi.fn(),
    setLayoutType: vi.fn(),
    startLayout: vi.fn(),
    stopLayout: vi.fn(),
    resetLayout: vi.fn(),
  });

/**
 * Mock settings store with common test state
 */
export const createMockSettingsStore = () =>
  createMockStore({
    theme: "light" as const,
    language: "en",
    autoSave: true,
    enableNotifications: true,
    setTheme: vi.fn(),
    setLanguage: vi.fn(),
    setAutoSave: vi.fn(),
    setEnableNotifications: vi.fn(),
    resetSettings: vi.fn(),
  });

/**
 * Mock expansion settings store with common test state
 */
export const createMockExpansionSettingsStore = () =>
  createMockStore({
    maxDepth: 2,
    maxNodes: 100,
    enableAutoExpansion: false,
    expansionDelay: 1000,
    setMaxDepth: vi.fn(),
    setMaxNodes: vi.fn(),
    setEnableAutoExpansion: vi.fn(),
    setExpansionDelay: vi.fn(),
    resetToDefaults: vi.fn(),
  });

/**
 * Utility to mock a store module completely
 * Use this to replace entire store modules in tests
 */
export function mockStoreModule<T>(storeName: string, mockStore: T): void {
  vi.doMock(`@/stores/${storeName}`, () => ({
    [`use${storeName.charAt(0).toUpperCase() + storeName.slice(1)}`]: () =>
      mockStore,
  }));
}

/**
 * Higher-order function to create store test wrapper
 * Provides consistent store mocking setup for component tests
 */
export function withMockStores<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  stores?: {
    graphStore?: ReturnType<typeof createMockGraphStore>;
    layoutStore?: ReturnType<typeof createMockLayoutStore>;
    settingsStore?: ReturnType<typeof createMockSettingsStore>;
    expansionSettingsStore?: ReturnType<
      typeof createMockExpansionSettingsStore
    >;
  },
) {
  return function MockedComponent(props: P) {
    // Mock stores before rendering
    if (stores?.graphStore) {
      vi.doMock("@/stores/graph-store", () => ({
        useGraphStore: () => stores.graphStore,
      }));
    }

    if (stores?.layoutStore) {
      vi.doMock("@/stores/layout-store", () => ({
        useLayoutStore: () => stores.layoutStore,
      }));
    }

    if (stores?.settingsStore) {
      vi.doMock("@/stores/settings-store", () => ({
        useSettingsStore: () => stores.settingsStore,
      }));
    }

    if (stores?.expansionSettingsStore) {
      vi.doMock("@/stores/expansion-settings-store", () => ({
        useExpansionSettingsStore: () => stores.expansionSettingsStore,
      }));
    }

    return React.createElement(Component, props);
  };
}

/**
 * Reset all mocked stores to their initial state
 * Call this in beforeEach to ensure clean test state
 */
export function resetMockStores(...stores: Array<{ __mockReset: () => void }>) {
  stores.forEach((store) => store.__mockReset());
}
