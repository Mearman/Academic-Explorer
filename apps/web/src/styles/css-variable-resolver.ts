/**
 * CSS Variable Resolver System
 * Utilities for resolving CSS variables and providing theme information
 */

import { vars } from './theme.css';
import { mantineVars } from './mantine-theme.css';

/**
 * CSS Variable Resolver class
 * Provides dynamic access to CSS custom properties
 */
export class CSSVariableResolver {
  private static instance: CSSVariableResolver;
  private customProperties: Map<string, string> = new Map();

  private constructor() {
    this.initializeCustomProperties();
  }

  public static getInstance(): CSSVariableResolver {
    if (!CSSVariableResolver.instance) {
      CSSVariableResolver.instance = new CSSVariableResolver();
    }
    return CSSVariableResolver.instance;
  }

  /**
   * Initialize custom properties from theme tokens
   */
  private initializeCustomProperties(): void {
    // Extract vanilla extract theme variables
    this.extractPropertiesFromObject(vars.color, 'color');
    this.extractPropertiesFromObject(vars.space, 'space');
    this.extractPropertiesFromObject(vars.fontSize, 'font-size');
    this.extractPropertiesFromObject(vars.fontWeight, 'font-weight');
    this.extractPropertiesFromObject(vars.lineHeight, 'line-height');
    this.extractPropertiesFromObject(vars.borderRadius, 'border-radius');
    this.extractPropertiesFromObject(vars.borderWidth, 'border-width');
    this.extractPropertiesFromObject(vars.shadow, 'shadow');

    // Extract mantine theme variables
    this.extractPropertiesFromObject(mantineVars.color, 'mantine-color');
    this.extractPropertiesFromObject(mantineVars.spacing, 'mantine-spacing');
    this.extractPropertiesFromObject(mantineVars.fontSizes, 'mantine-font-size');
    this.extractPropertiesFromObject(mantineVars.radius, 'mantine-radius');
    this.extractPropertiesFromObject(mantineVars.lineHeights, 'mantine-line-height');
  }

  /**
   * Extract properties from nested theme objects
   */
  private extractPropertiesFromObject(obj: any, prefix: string): void {
    const extract = (current: any, currentPrefix: string) => {
      if (typeof current === 'string' || typeof current === 'number') {
        const value = typeof current === 'number' ? `${current}px` : current;
        this.customProperties.set(currentPrefix, value);
      } else if (typeof current === 'object' && current !== null) {
        Object.entries(current).forEach(([key, value]) => {
          const newPrefix = currentPrefix ? `${currentPrefix}-${String(key)}` : String(key);
          extract(value, newPrefix);
        });
      }
    };

    extract(obj, prefix);
  }

  /**
   * Get CSS custom property value
   */
  public getCustomProperty(property: string): string | undefined {
    return this.customProperties.get(property);
  }

  /**
   * Get all custom properties for a specific category
   */
  public getCustomPropertiesByCategory(category: string): Map<string, string> {
    const filtered = new Map<string, string>();

    this.customProperties.forEach((value, key) => {
      if (key.startsWith(category)) {
        filtered.set(key, value);
      }
    });

    return filtered;
  }

  /**
   * Generate CSS custom property string
   */
  public generateCustomProperty(property: string): string {
    const value = this.customProperties.get(property);
    return value ? `var(--${property}, ${value})` : `var(--${property})`;
  }

  /**
   * Generate CSS custom properties object for inline styles
   */
  public generateCSSCustomProperties(
    properties: Record<string, string>
  ): Record<string, string> {
    const cssVars: Record<string, string> = {};

    Object.entries(properties).forEach(([key, value]) => {
      cssVars[`--${key}`] = this.customProperties.get(key) || value;
    });

    return cssVars;
  }

  /**
   * Resolve theme tokens for runtime use
   */
  public resolveThemeTokens() {
    return {
      color: {
        primary: this.generateCustomProperty('color-blue-6'),
        secondary: this.generateCustomProperty('color-gray-6'),
        success: this.generateCustomProperty('color-green-6'),
        warning: this.generateCustomProperty('color-orange-6'),
        error: this.generateCustomProperty('color-red-6'),
        background: this.generateCustomProperty('color-background'),
        surface: this.generateCustomProperty('color-surface'),
        text: {
          primary: this.generateCustomProperty('color-text'),
          secondary: this.generateCustomProperty('color-text-secondary'),
          muted: this.generateCustomProperty('color-text-muted'),
        },
      },
      spacing: {
        xs: this.generateCustomProperty('spacing-xs'),
        sm: this.generateCustomProperty('spacing-sm'),
        md: this.generateCustomProperty('spacing-md'),
        lg: this.generateCustomProperty('spacing-lg'),
        xl: this.generateCustomProperty('spacing-xl'),
      },
      font: {
        size: {
          xs: this.generateCustomProperty('font-size-xs'),
          sm: this.generateCustomProperty('font-size-sm'),
          base: this.generateCustomProperty('font-size-base'),
          lg: this.generateCustomProperty('font-size-lg'),
          xl: this.generateCustomProperty('font-size-xl'),
        },
        family: this.generateCustomProperty('font-family-primary'),
        weight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
      border: {
        radius: {
          sm: this.generateCustomProperty('border-radius-sm'),
          md: this.generateCustomProperty('border-radius-md'),
          lg: this.generateCustomProperty('border-radius-lg'),
        },
        width: {
          thin: this.generateCustomProperty('border-width-thin'),
          normal: this.generateCustomProperty('border-width-normal'),
          thick: this.generateCustomProperty('border-width-thick'),
        },
      },
      shadow: {
        sm: this.generateCustomProperty('shadow-sm'),
        md: this.generateCustomProperty('shadow-md'),
        lg: this.generateCustomProperty('shadow-lg'),
      },
    };
  }

  /**
   * Get entity-specific colors for academic theming
   */
  public getEntityColors() {
    return {
      work: this.generateCustomProperty('color-blue-6'),
      author: this.generateCustomProperty('color-green-6'),
      source: this.generateCustomProperty('color-purple-6'),
      institution: this.generateCustomProperty('color-orange-6'),
      concept: this.generateCustomProperty('color-pink-6'),
      topic: this.generateCustomProperty('color-red-6'),
      publisher: this.generateCustomProperty('color-teal-6'),
      funder: this.generateCustomProperty('color-cyan-6'),
      keyword: this.generateCustomProperty('color-gray-6'),
    };
  }

  /**
   * Generate theme-aware CSS for dynamic components
   */
  public generateThemeCSS(selector: string, properties: Record<string, string>) {
    const cssVars = this.generateCSSCustomProperties(properties);
    const cssProps = Object.entries(cssVars)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    return `${selector} {\n${cssProps}\n}`;
  }

  /**
   * Export theme configuration for external consumption
   */
  public exportThemeConfig() {
    return {
      customProperties: Object.fromEntries(this.customProperties),
      resolvedTokens: this.resolveThemeTokens(),
      entityColors: this.getEntityColors(),
    };
  }
}

/**
 * Singleton instance for easy access
 */
export const cssVariableResolver = CSSVariableResolver.getInstance();

/**
 * Utility functions for common theme operations
 */
export const themeUtils = {
  /**
   * Get responsive spacing value
   */
  responsive: (size: keyof typeof vars.space) =>
    cssVariableResolver.generateCustomProperty(`space-${size}`),

  /**
   * Get color value with fallback
   */
  color: (colorPath: string, fallback?: string) => {
    const property = `color-${colorPath}`;
    const value = cssVariableResolver.getCustomProperty(property);
    return value || fallback || 'currentColor';
  },

  /**
   * Get entity color for academic entity types
   */
  entityColor: (entityType: string) => {
    const entityColors = cssVariableResolver.getEntityColors();
    return entityColors[entityType as keyof typeof entityColors] ||
           cssVariableResolver.generateCustomProperty('color-blue-6');
  },

  /**
   * Generate theme-aware inline styles
   */
  inlineStyles: (properties: Record<string, string>) =>
    cssVariableResolver.generateCSSCustomProperties(properties),

  /**
   * Check if a theme property exists
   */
  hasProperty: (property: string) =>
    cssVariableResolver.getCustomProperty(property) !== undefined,

  /**
   * Get all properties in a category
   */
  getCategory: (category: string) =>
    Object.fromEntries(cssVariableResolver.getCustomPropertiesByCategory(category)),
};

export default cssVariableResolver;