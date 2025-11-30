/**
 * Styling System Contracts
 *
 * TypeScript interfaces and types for the switchable styling system.
 * These contracts define the shape of theme data, component mappings, and settings.
 */

export type StylingSystem = 'mantine' | 'shadcn' | 'radix';

export interface StylingSystemConfig {
  readonly system: StylingSystem;
  readonly isActive: boolean;
  readonly loadState: 'idle' | 'loading' | 'loaded' | 'error';
  readonly lastError?: string;
}

export interface BaseThemeTokens {
  readonly colors: {
    readonly primary: string;
    readonly secondary: string;
    readonly background: string;
    readonly foreground: string;
    readonly muted: string;
    readonly accent: string;
    readonly destructive: string;
    readonly border: string;
    readonly input: string;
    readonly ring: string;
    // Academic entity colors (preserved from hash-based system)
    readonly works: string;      // Blue
    readonly authors: string;    // Green
    readonly sources: string;    // Violet
    readonly institutions: string; // Orange
    readonly publishers: string; // Red
    readonly funders: string;    // Yellow
    readonly topics: string;     // Pink
    readonly concepts: string;   // Purple
    readonly keywords: string;   // Teal
    readonly domains: string;    // Cyan
    readonly fields: string;     // Indigo
    readonly subfields: string;  // Rose
  };
  readonly spacing: {
    readonly xs: string;
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly xl: string;
  };
  readonly radii: {
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
    readonly full: string;
  };
  readonly fonts: {
    readonly body: string;
    readonly heading: string;
    readonly mono: string;
  };
  readonly shadows: {
    readonly sm: string;
    readonly md: string;
    readonly lg: string;
  };
  readonly zIndices: {
    readonly dropdown: string;
    readonly sticky: string;
    readonly modal: string;
    readonly popover: string;
    readonly tooltip: string;
  };
}

export interface MantineThemeContract extends BaseThemeTokens {
  readonly mantine: {
    readonly colors: {
      readonly dark: readonly string[];
      readonly gray: readonly string[];
      readonly blue: readonly string[];
      readonly red: readonly string[];
      readonly green: readonly string[];
      readonly yellow: readonly string[];
      readonly orange: readonly string[];
      readonly teal: readonly string[];
      readonly cyan: readonly string[];
      readonly purple: readonly string[];
      readonly pink: readonly string[];
    };
    readonly headings: {
      readonly fontFamily: string;
      readonly fontWeight: string;
      readonly sizes: {
        readonly h1: string;
        readonly h2: string;
        readonly h3: string;
        readonly h4: string;
        readonly h5: string;
        readonly h6: string;
      };
    };
  };
}

export interface ShadcnThemeContract extends BaseThemeTokens {
  readonly shadcn: {
    readonly light: {
      readonly background: string;
      readonly foreground: string;
      readonly card: string;
      readonly cardForeground: string;
      readonly popover: string;
      readonly popoverForeground: string;
      readonly primary: string;
      readonly primaryForeground: string;
      readonly secondary: string;
      readonly secondaryForeground: string;
      readonly muted: string;
      readonly mutedForeground: string;
      readonly accent: string;
      readonly accentForeground: string;
      readonly destructive: string;
      readonly destructiveForeground: string;
      readonly border: string;
      readonly input: string;
      readonly ring: string;
    };
    readonly dark: {
      readonly background: string;
      readonly foreground: string;
      readonly card: string;
      readonly cardForeground: string;
      readonly popover: string;
      readonly popoverForeground: string;
      readonly primary: string;
      readonly primaryForeground: string;
      readonly secondary: string;
      readonly secondaryForeground: string;
      readonly muted: string;
      readonly mutedForeground: string;
      readonly accent: string;
      readonly accentForeground: string;
      readonly destructive: string;
      readonly destructiveForeground: string;
      readonly border: string;
      readonly input: string;
      readonly ring: string;
    };
  };
}

export interface RadixThemeContract extends BaseThemeTokens {
  readonly radix: {
    readonly colors: {
      readonly background: string;
      readonly foreground: string;
      readonly muted: string;
      readonly mutedForeground: string;
      readonly popover: string;
      readonly popoverForeground: string;
      readonly card: string;
      readonly cardForeground: string;
      readonly border: string;
      readonly input: string;
      readonly ring: string;
      readonly selection: string;
      readonly selectionForeground: string;
    };
    readonly components: {
      readonly button: {
        readonly default: string;
        readonly defaultHover: string;
        readonly defaultActive: string;
        readonly defaultForeground: string;
        readonly destructive: string;
        readonly destructiveHover: string;
        readonly destructiveActive: string;
        readonly destructiveForeground: string;
        readonly outline: string;
        readonly outlineHover: string;
        readonly outlineActive: string;
        readonly outlineForeground: string;
        readonly subtle: string;
        readonly subtleHover: string;
        readonly subtleActive: string;
        readonly subtleForeground: string;
        readonly ghost: string;
        readonly ghostHover: string;
        readonly ghostActive: string;
        readonly ghostForeground: string;
        readonly link: string;
        readonly linkHover: string;
        readonly linkActive: string;
        readonly linkForeground: string;
      };
      readonly card: {
        readonly background: string;
        readonly foreground: string;
        readonly border: string;
      };
      readonly dialog: {
        readonly background: string;
        readonly foreground: string;
        readonly border: string;
        readonly overlay: string;
      };
      readonly slider: {
        readonly background: string;
        readonly foreground: string;
        readonly range: string;
        readonly thumb: string;
        readonly thumbHover: string;
        readonly thumbActive: string;
      };
    };
  };
}

export interface MantinePreferences {
  readonly primaryColor: string;
  readonly defaultRadius: number;
  readonly fontFamily: string;
  readonly headingFontWeight: string;
}

export interface ShadcnPreferences {
  readonly primaryHue: number;
  readonly accentHue: number;
  readonly borderRadius: number;
  readonly fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
}

export interface RadixPreferences {
  readonly grayScale: 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone';
  readonly accentColor: string;
  readonly radius: number;
}

export interface ColorPreference {
  readonly type: 'semantic' | 'hue' | 'name' | 'hex';
  readonly value: string | number;
  readonly autoMap: boolean;
  readonly lastUpdated: Date;
}

export interface ColorMapping {
  readonly semantic: string;      // 'red', 'blue', 'green', etc.
  readonly mantine: string;        // Mantine color name
  readonly shadcn: number;         // HSL hue value (0-360)
  readonly radix: string;          // Radix accent color
  readonly hex: string;           // Hex value for reference
  readonly rgb: string;           // RGB value for reference
  readonly category: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic';
}

export interface ColorMapper {
  readonly mappings: Map<string, ColorMapping>;
  mapToSystem: (color: string | number, targetSystem: StylingSystem) => ColorMapping | null;
  mapFromSystem: (systemColor: string | number, sourceSystem: StylingSystem) => ColorMapping | null;
  validateColor: (color: string | number, type: string) => boolean;
}

export interface SystemPreferenceOverrides<T> {
  readonly preferences: Partial<T>;
  readonly hasOverride: boolean;
  readonly overrideTimestamp?: Date;
}

export interface StylingSettings {
  // Core preferences
  readonly activeSystem: StylingSystem;
  readonly darkMode: boolean;
  readonly autoDarkMode: boolean;

  // Global color preference (maps across systems)
  readonly colorPreference: ColorPreference;

  // System-specific preferences (overrides only)
  readonly systemPreferences: {
    readonly mantine: SystemPreferenceOverrides<MantinePreferences>;
    readonly shadcn: SystemPreferenceOverrides<ShadcnPreferences>;
    readonly radix: SystemPreferenceOverrides<RadixPreferences>;
  };

  // Performance settings
  readonly enableSystemPreloading: boolean;
  readonly cacheThemeContracts: boolean;

  // Accessibility
  readonly respectSystemPreference: boolean;
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
}

export interface ComponentStyleMapping {
  readonly componentId: string;
  readonly mappings: {
    readonly mantine: {
      readonly recipe?: string;
      readonly className?: string;
      readonly styles?: Record<string, string>;
      readonly wrapperProps?: Record<string, unknown>;
    };
    readonly shadcn: {
      readonly recipe?: string;
      readonly className?: string;
      readonly styles?: Record<string, string>;
      readonly wrapperProps?: Record<string, unknown>;
    };
    readonly radix: {
      readonly recipe?: string;
      readonly className?: string;
      readonly styles?: Record<string, string>;
      readonly wrapperProps?: Record<string, unknown>;
    };
  };
  readonly fallbackSystem: StylingSystem;
  readonly isMigrating: boolean;
}

export interface ThemeCacheEntry {
  readonly system: StylingSystem;
  readonly darkMode: boolean;
  readonly cssVariables: Record<string, string>;
  readonly compiledAt: Date;
  readonly expiresAt: Date;
  readonly size: number; // bytes
  readonly isValid: boolean;
}

export interface ThemeCache {
  readonly entries: Map<string, ThemeCacheEntry>;
  readonly maxSize: number; // bytes
  readonly currentSize: number;
  readonly lastCleanup: Date;
}

// React Hook Contracts
export interface UseStylingSystem {
  readonly activeSystem: StylingSystem;
  readonly darkMode: boolean;
  readonly isSystemLoading: boolean;
  readonly systemLoadState: Record<StylingSystem, 'idle' | 'loading' | 'loaded' | 'error'>;
  readonly switchSystem: (system: StylingSystem) => Promise<void>;
  readonly toggleDarkMode: () => void;
  readonly setAutoDarkMode: (enabled: boolean) => void;
}

export interface UseComponentStyles<T = unknown> {
  readonly styles: string;
  readonly system: StylingSystem;
  readonly isFallback: boolean;
  readonly props: T;
}

// Event Contracts
export interface SystemSwitchEvent {
  readonly type: 'SYSTEM_SWITCH';
  readonly payload: {
    readonly from: StylingSystem;
    readonly to: StylingSystem;
    readonly switchTime: number; // milliseconds
    readonly success: boolean;
    readonly error?: string;
  };
}

export interface SettingsUpdateEvent {
  readonly type: 'SETTINGS_UPDATE';
  readonly payload: {
    readonly settings: Partial<StylingSettings>;
    readonly timestamp: Date;
  };
}

export type StylingSystemEvent = SystemSwitchEvent | SettingsUpdateEvent;

// Validation Contracts
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface ThemeValidator {
  validateContract: (contract: BaseThemeTokens) => ValidationResult;
  validateSettings: (settings: StylingSettings) => ValidationResult;
  validateMapping: (mapping: ComponentStyleMapping) => ValidationResult;
}

// Performance Contracts
export interface PerformanceMetrics {
  readonly systemSwitchTime: number; // milliseconds
  readonly cacheHitRate: number; // percentage
  readonly bundleSizeIncrease: number; // percentage
  readonly memoryUsage: number; // MB
  readonly totalCacheSize: number; // bytes
}

export interface PerformanceMonitor {
  measureSystemSwitch: (from: StylingSystem, to: StylingSystem) => Promise<number>;
  getCacheMetrics: () => { hitRate: number; size: number };
  getBundleMetrics: () => { size: number; increase: number };
  measureMemoryUsage: () => number;
}