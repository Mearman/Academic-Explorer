/**
 * Engine Settings Hook
 * 
 * Persistent storage for user preferences related to graph engine selection,
 * performance settings, and UI preferences. Uses Zustand with localStorage
 * persistence for cross-session retention.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { GraphEngineType } from '../graph-engines/provider';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EngineSettings {
  /** User's preferred default engine */
  preferredEngine?: GraphEngineType;
  
  /** Whether to show capability badges by default */
  showCapabilities: boolean;
  
  /** Whether to show performance indicators by default */
  showPerformance: boolean;
  
  /** Whether to show smart recommendations */
  showRecommendations: boolean;
  
  /** Whether to auto-select optimal engine for graph size */
  autoOptimize: boolean;
  
  /** Performance monitoring update interval (ms) */
  performanceUpdateInterval: number;
  
  /** Whether to auto-hide performance indicator when good */
  autoHidePerformance: boolean;
  
  /** Graph size thresholds for engine recommendations */
  thresholds: {
    /** Small graph vertex threshold */
    smallGraph: number;
    /** Medium graph vertex threshold */
    mediumGraph: number;
    /** Large graph vertex threshold */
    largeGraph: number;
  };
  
  /** UI preferences */
  ui: {
    /** Whether to use compact layouts */
    compact: boolean;
    /** Maximum number of capability badges to show */
    maxBadges: number;
    /** Whether to show detailed comparison tables */
    showDetailedComparisons: boolean;
    /** Whether to show tooltips for capabilities */
    showTooltips: boolean;
  };
  
  /** Performance preferences */
  performance: {
    /** Preferred performance over features */
    prioritizePerformance: boolean;
    /** Minimum acceptable FPS */
    minFrameRate: number;
    /** Maximum acceptable memory usage (MB) */
    maxMemoryUsage: number;
    /** Whether GPU acceleration is required */
    requireGPU: boolean;
  };
  
  /** Export preferences */
  export: {
    /** Preferred export format */
    preferredFormat: 'png' | 'svg' | 'pdf' | 'json';
    /** Default export quality/resolution */
    quality: 'low' | 'medium' | 'high';
    /** Whether to include metadata in exports */
    includeMetadata: boolean;
  };
}

interface EngineSettingsStore {
  /** Current settings */
  settings: EngineSettings;
  
  /** Update specific setting */
  updateSetting: <K extends keyof EngineSettings>(
    key: K,
    value: EngineSettings[K]
  ) => void;
  
  /** Update nested setting */
  updateNestedSetting: <
    K extends keyof EngineSettings,
    NK extends keyof EngineSettings[K]
  >(
    key: K,
    nestedKey: NK,
    value: EngineSettings[K][NK]
  ) => void;
  
  /** Reset to default settings */
  resetSettings: () => void;
  
  /** Get engine recommendation based on settings and graph size */
  getRecommendedEngine: (vertexCount: number, edgeCount: number) => GraphEngineType | null;
  
  /** Check if current settings are performance-optimized */
  isPerformanceOptimized: () => boolean;
  
  /** Get settings for specific use case */
  getSettingsForUseCase: (
    useCase: 'small-graph' | 'large-graph' | 'interactive' | 'export'
  ) => Partial<EngineSettings>;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: EngineSettings = {
  // Engine preferences
  preferredEngine: 'canvas-2d',
  showCapabilities: true,
  showPerformance: true,
  showRecommendations: true,
  autoOptimize: false,
  performanceUpdateInterval: 1000,
  autoHidePerformance: false,
  
  // Graph size thresholds
  thresholds: {
    smallGraph: 100,
    mediumGraph: 1000,
    largeGraph: 10000,
  },
  
  // UI preferences
  ui: {
    compact: false,
    maxBadges: 6,
    showDetailedComparisons: true,
    showTooltips: true,
  },
  
  // Performance preferences
  performance: {
    prioritizePerformance: false,
    minFrameRate: 30,
    maxMemoryUsage: 512, // 512MB
    requireGPU: false,
  },
  
  // Export preferences
  export: {
    preferredFormat: 'png',
    quality: 'high',
    includeMetadata: true,
  },
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useEngineSettings = create<EngineSettingsStore>()(
  persist(
    immer((set, get) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSetting: (key, value) =>
        set((state) => {
          (state.settings[key] as EngineSettings[typeof key]) = value;
        }),
      
      updateNestedSetting: (key, nestedKey, value) =>
        set((state) => {
          ((state.settings[key] as EngineSettings[typeof key]) as Record<string, unknown>)[nestedKey as string] = value;
        }),
      
      resetSettings: () =>
        set((state) => {
          state.settings = { ...DEFAULT_SETTINGS };
        }),
      
      getRecommendedEngine: (vertexCount: number, edgeCount: number): GraphEngineType | null => {
        const { settings } = get();
        const { thresholds, performance } = settings;
        
        // If user has a preferred engine and auto-optimize is off, use it
        if (!settings.autoOptimize && settings.preferredEngine) {
          return settings.preferredEngine;
        }
        
        // Determine graph size category
        const isLarge = vertexCount > thresholds.largeGraph || edgeCount > thresholds.largeGraph * 5;
        const isMedium = vertexCount > thresholds.mediumGraph || edgeCount > thresholds.mediumGraph * 5;
        
        // Performance-based recommendations
        if (performance.prioritizePerformance) {
          if (isLarge) {
            return performance.requireGPU ? 'webgl' : 'canvas-2d';
          }
          return 'canvas-2d';
        }
        
        // Feature-based recommendations
        if (isLarge) {
          return 'webgl'; // Best for large graphs
        } else if (isMedium) {
          return 'd3-force'; // Good balance for medium graphs
        } else {
          return settings.preferredEngine || 'svg'; // Full features for small graphs
        }
      },
      
      isPerformanceOptimized: (): boolean => {
        const { settings } = get();
        return (
          settings.performance.prioritizePerformance &&
          settings.performanceUpdateInterval >= 1000 &&
          settings.autoHidePerformance &&
          !settings.ui.showDetailedComparisons
        );
      },
      
      getSettingsForUseCase: (useCase): Partial<EngineSettings> => {
        const { settings } = get();
        
        switch (useCase) {
          case 'small-graph':
            return {
              preferredEngine: 'svg',
              showCapabilities: true,
              showPerformance: false,
              performanceUpdateInterval: 2000,
              ui: { ...settings.ui, compact: false, maxBadges: 8 },
            };
          
          case 'large-graph':
            return {
              preferredEngine: 'webgl',
              showCapabilities: true,
              showPerformance: true,
              autoHidePerformance: false,
              performanceUpdateInterval: 500,
              ui: { ...settings.ui, compact: true, maxBadges: 4 },
              performance: {
                ...settings.performance,
                prioritizePerformance: true,
                requireGPU: true,
              },
            };
          
          case 'interactive':
            return {
              preferredEngine: 'd3-force',
              showCapabilities: true,
              showRecommendations: true,
              showPerformance: true,
              ui: { ...settings.ui, showTooltips: true },
            };
          
          case 'export':
            return {
              showPerformance: false,
              ui: { ...settings.ui, compact: true },
              export: {
                ...settings.export,
                quality: 'high',
                includeMetadata: true,
              },
            };
          
          default:
            return settings;
        }
      },
    })),
    {
      name: 'graph-engine-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      
      // Migration logic for future versions
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...DEFAULT_SETTINGS,
            ...(persistedState as Partial<EngineSettings>),
          };
        }
        return persistedState as EngineSettingsStore;
      },
      
      // Only persist the settings, not the functions
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for getting and updating a specific setting.
 */
export function useSpecificSetting<K extends keyof EngineSettings>(
  key: K
): [EngineSettings[K], (value: EngineSettings[K]) => void] {
  const setting = useEngineSettings((state) => state.settings[key]);
  const updateSetting = useEngineSettings((state) => state.updateSetting);
  
  return [setting, (value) => updateSetting(key, value)];
}

/**
 * Hook for getting and updating nested settings.
 */
export function useNestedSetting<
  K extends keyof EngineSettings,
  NK extends keyof EngineSettings[K]
>(
  key: K,
  nestedKey: NK
): [EngineSettings[K][NK], (value: EngineSettings[K][NK]) => void] {
  const setting = useEngineSettings((state) => ((state.settings[key] as EngineSettings[typeof key]) as Record<string, unknown>)[nestedKey as string] as EngineSettings[K][NK]);
  const updateNestedSetting = useEngineSettings((state) => state.updateNestedSetting);
  
  return [setting, (value) => updateNestedSetting(key, nestedKey, value)];
}

/**
 * Hook for performance-related settings.
 */
export function usePerformanceSettings() {
  const performanceSettings = useEngineSettings((state) => state.settings.performance);
  const updateNestedSetting = useEngineSettings((state) => state.updateNestedSetting);
  const isOptimized = useEngineSettings((state) => state.isPerformanceOptimized);
  
  return {
    settings: performanceSettings,
    updateSetting: <K extends keyof EngineSettings['performance']>(
      key: K,
      value: EngineSettings['performance'][K]
    ) => updateNestedSetting('performance', key, value),
    isOptimized: isOptimized(),
  };
}

/**
 * Hook for UI-related settings.
 */
export function useUISettings() {
  const uiSettings = useEngineSettings((state) => state.settings.ui);
  const updateNestedSetting = useEngineSettings((state) => state.updateNestedSetting);
  
  return {
    settings: uiSettings,
    updateSetting: <K extends keyof EngineSettings['ui']>(
      key: K,
      value: EngineSettings['ui'][K]
    ) => updateNestedSetting('ui', key, value),
  };
}

/**
 * Hook for export-related settings.
 */
export function useExportSettings() {
  const exportSettings = useEngineSettings((state) => state.settings.export);
  const updateNestedSetting = useEngineSettings((state) => state.updateNestedSetting);
  
  return {
    settings: exportSettings,
    updateSetting: <K extends keyof EngineSettings['export']>(
      key: K,
      value: EngineSettings['export'][K]
    ) => updateNestedSetting('export', key, value),
  };
}