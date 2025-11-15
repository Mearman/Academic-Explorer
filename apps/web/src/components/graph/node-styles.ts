/**
 * Graph node styling functions for Academic Explorer
 * Provides conditional styling for xpac works and works with unverified authors
 *
 * User Story 2: Visual distinction for xpac works (datasets, software, specimens)
 * and works with unverified authors (name-string only, no Author ID)
 */

import type { GraphNode } from "@academic-explorer/graph";

/**
 * Style properties for graph nodes
 * Compatible with both SVG and CSS styling
 */
export interface NodeStyleProperties {
  // Border styling
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;

  // Fill styling
  fill?: string;
  fillOpacity?: number;

  // CSS properties (for DOM-based renderers)
  border?: string;
  borderStyle?: string;
  backgroundColor?: string;
  opacity?: number;

  // Data attributes for testing
  'data-xpac'?: string;
  'data-unverified-author'?: string;
}

/**
 * Color palette for node styling
 * Follows WCAG 2.1 Level AA contrast guidelines
 */
const COLORS = {
  // Standard work colors
  standard: {
    fill: '#3b82f6', // Blue-500
    stroke: '#2563eb', // Blue-600
  },

  // Xpac work colors (muted, desaturated)
  xpac: {
    fill: '#94a3b8', // Slate-400 (muted blue-gray)
    stroke: '#64748b', // Slate-500
  },

  // Warning indicators for unverified authors
  warning: {
    fill: '#fbbf24', // Amber-400
    stroke: '#f59e0b', // Amber-500
    tint: '#fef3c7', // Amber-50 (very light tint)
  },
} as const;

/**
 * Get styling for xpac works
 * Applies dashed border and muted colors to visually distinguish non-traditional works
 *
 * @param baseStyle - Base style properties to extend
 * @returns Style properties with xpac-specific styling
 */
export function getXpacWorkStyle(
  baseStyle: NodeStyleProperties = {}
): NodeStyleProperties {
  return {
    ...baseStyle,

    // SVG properties
    stroke: COLORS.xpac.stroke,
    strokeWidth: 2,
    strokeDasharray: '5,3', // Dashed border pattern: 5px dash, 3px gap
    fill: COLORS.xpac.fill,
    fillOpacity: 0.7, // Slightly transparent

    // CSS properties (for DOM renderers)
    border: `2px dashed ${COLORS.xpac.stroke}`,
    borderStyle: 'dashed',
    backgroundColor: COLORS.xpac.fill,
    opacity: 0.7,

    // Test attribute
    'data-xpac': 'true',
  };
}

/**
 * Get styling for works with unverified authors
 * Applies warning indicators (orange/yellow tints) to flag potential data quality issues
 *
 * @param baseStyle - Base style properties to extend
 * @returns Style properties with unverified author warning styling
 */
export function getUnverifiedAuthorStyle(
  baseStyle: NodeStyleProperties = {}
): NodeStyleProperties {
  return {
    ...baseStyle,

    // SVG properties
    stroke: COLORS.warning.stroke,
    strokeWidth: 2.5, // Slightly thicker to draw attention
    fill: baseStyle.fill || COLORS.standard.fill, // Preserve base fill color
    // Add a warning tint overlay (would need to be applied as a filter/overlay in actual rendering)

    // CSS properties (for DOM renderers)
    border: `2.5px solid ${COLORS.warning.stroke}`,
    // Use box-shadow to add warning tint without changing fill color
    opacity: 1,

    // Test attribute
    'data-unverified-author': 'true',
  };
}

/**
 * Get combined styling for xpac works with unverified authors
 * Applies both xpac muted styling and warning indicators
 *
 * @param baseStyle - Base style properties to extend
 * @returns Combined style properties
 */
export function getXpacUnverifiedStyle(
  baseStyle: NodeStyleProperties = {}
): NodeStyleProperties {
  // Start with xpac styling
  const xpacStyle = getXpacWorkStyle(baseStyle);

  // Add unverified author warning
  return {
    ...xpacStyle,

    // Override stroke to show warning color
    stroke: COLORS.warning.stroke,
    strokeWidth: 2.5,

    // CSS override
    border: `2.5px dashed ${COLORS.warning.stroke}`, // Dashed + warning color

    // Both test attributes
    'data-xpac': 'true',
    'data-unverified-author': 'true',
  };
}

/**
 * Get node styling based on node metadata flags
 * Main entry point for conditional styling logic
 *
 * @param node - Graph node with metadata
 * @param baseStyle - Base style properties to extend
 * @returns Conditional style properties based on node flags
 *
 * @example
 * const style = getConditionalNodeStyle(node);
 * // Apply to SVG: <circle {...style} />
 * // Apply to DOM: <div style={style} />
 */
export function getConditionalNodeStyle(
  node: Pick<GraphNode, 'isXpac' | 'hasUnverifiedAuthor'>,
  baseStyle: NodeStyleProperties = {}
): NodeStyleProperties {
  const { isXpac, hasUnverifiedAuthor } = node;

  // Both conditions: xpac + unverified
  if (isXpac && hasUnverifiedAuthor) {
    return getXpacUnverifiedStyle(baseStyle);
  }

  // Only xpac
  if (isXpac) {
    return getXpacWorkStyle(baseStyle);
  }

  // Only unverified author
  if (hasUnverifiedAuthor) {
    return getUnverifiedAuthorStyle(baseStyle);
  }

  // Standard work (no special styling)
  return {
    ...baseStyle,
    stroke: COLORS.standard.stroke,
    strokeWidth: 2,
    fill: COLORS.standard.fill,
    fillOpacity: 1,

    // CSS properties
    border: `2px solid ${COLORS.standard.stroke}`,
    backgroundColor: COLORS.standard.fill,
    opacity: 1,
  };
}

/**
 * Get accessible label text for node styling
 * Provides screen reader context for visual styling differences
 *
 * @param node - Graph node with metadata
 * @returns Descriptive label for accessibility
 */
export function getNodeAccessibilityLabel(
  node: Pick<GraphNode, 'isXpac' | 'hasUnverifiedAuthor' | 'label'>
): string {
  const { isXpac, hasUnverifiedAuthor, label } = node;

  const flags: string[] = [];

  if (isXpac) {
    flags.push('extended research output');
  }

  if (hasUnverifiedAuthor) {
    flags.push('unverified author');
  }

  if (flags.length === 0) {
    return label;
  }

  return `${label} (${flags.join(', ')})`;
}

/**
 * Export color palette for external use (e.g., legend components)
 */
export { COLORS as NODE_STYLE_COLORS };
