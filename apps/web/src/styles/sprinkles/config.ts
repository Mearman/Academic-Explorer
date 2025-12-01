/**
 * Fallback sprinkles implementation that returns inline styles
 * This bypasses Vanilla Extract configuration issues while maintaining API compatibility
 */

// CSS property mapping for kebab-case to camelCase conversion
const cssPropertyMap: Record<string, string> = {
  // Common CSS properties
  'background-color': 'backgroundColor',
  'background': 'backgroundColor',
  'border-color': 'borderColor',
  'border-width': 'borderWidth',
  'border-style': 'borderStyle',
  'border-radius': 'borderRadius',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'line-height': 'lineHeight',
  'font-family': 'fontFamily',
  'text-align': 'textAlign',
  'flex-direction': 'flexDirection',
  'justify-content': 'justifyContent',
  'align-items': 'alignItems',
  'flex-wrap': 'flexWrap',
  'flex-grow': 'flexGrow',
  'flex-shrink': 'flexShrink',
  'flex-basis': 'flexBasis',
  'min-width': 'minWidth',
  'max-width': 'maxWidth',
  'min-height': 'minHeight',
  'max-height': 'maxHeight',
  'padding-top': 'paddingTop',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
  'padding-right': 'paddingRight',
  'margin-top': 'marginTop',
  'margin-bottom': 'marginBottom',
  'margin-left': 'marginLeft',
  'margin-right': 'marginRight',
  'border-top': 'borderTop',
  'border-bottom': 'borderBottom',
  'border-left': 'borderLeft',
  'border-right': 'borderRight',
  'overflow-x': 'overflowX',
  'overflow-y': 'overflowY',
  'z-index': 'zIndex',

  // Mantine-specific properties
  'paper-bg': 'backgroundColor',
  'paper-shadow': 'boxShadow',
  'loader-color': 'color',
  'style={{ border: "1px solid var(--mantine-color-gray-3)" }}': 'border',

  // Common values
  'xs': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'xl': 'xl',
};

// Color token mapping
const colorTokenMap: Record<string, string> = {
  'dimmed': '#868e96',
  'border': '#dee2e6',
  'background': '#ffffff',
  'normal': 'all 0.2s ease',
  'text': '#212529',
  'textPrimary': 'var(--mantine-color-gray-9)',
  'textSecondary': 'var(--mantine-color-gray-6)',
  'textMuted': 'var(--mantine-color-gray-5)',
  'bg': 'var(--mantine-color-white)',
  'bgHover': 'var(--mantine-color-gray-0)',
  'primary': 'var(--mantine-color-blue-6)',
  'primaryHover': 'var(--mantine-color-blue-7)',
};

// Spacing values (in pixels, matching Mantine defaults)
const spacingValues: Record<string, string> = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

// Size values
const sizeValues: Record<string, string> = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
};

// Convert value to appropriate CSS format
const normalizeValue = (value: any, property: string): string => {
  if (value === null || value === undefined) return '';

  // Handle spacing tokens
  if (spacingValues[value as string] && (property.includes('padding') || property.includes('margin') || property === 'gap')) {
    return spacingValues[value as string];
  }

  // Handle size tokens
  if (sizeValues[value as string] && property.includes('font')) {
    return sizeValues[value as string];
  }

  // Handle color tokens
  if (colorTokenMap[value as string] && (property.includes('color') || property === 'bg')) {
    return colorTokenMap[value as string];
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  // Handle special values
  if (value === 'full') return property === 'minHeight' ? '100vh' : '100%';
  if (value === 'auto') return 'auto';
  if (value === 'inherit') return 'inherit';
  if (value === 'initial') return 'initial';

  return String(value);
};

// Convert property name to valid CSS property
const normalizeProperty = (prop: string): string => {
  // Convert kebab-case to camelCase
  const camelCase = prop.replace(/-([a-z])/g, (match) => match[1].toUpperCase());

  // Check if we have a mapping for this property
  return cssPropertyMap[camelCase] || cssPropertyMap[prop] || camelCase;
};

// Fallback sprinkles function that returns a style object
export const sprinkles = (styles: Record<string, any>) => {
  const result: { className?: string; style?: Record<string, string> } = {};

  Object.entries(styles).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;

    // Handle special cases for boolean properties
    if (key === 'style={{ border: "1px solid var(--mantine-color-gray-3)" }}' && value === true) {
      result.style = result.style || {};
      result.style.border = '1px solid var(--mantine-color-gray-3)';
      return;
    }

    // Convert property name and value
    const cssProperty = normalizeProperty(key);
    const cssValue = normalizeValue(value, cssProperty);

    if (cssProperty && cssValue) {
      result.style = result.style || {};
      result.style[cssProperty] = cssValue;
    }
  });

  // Return the style object for direct application
  return result.style || {};
};

/**
 * Export the type for TypeScript support
 */
export type Sprinkles = Record<string, any>;