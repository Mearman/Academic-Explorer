/**
 * Graph edge styling functions for BibGraph
 * Provides multi-modal visual distinction for outbound vs inbound relationships
 *
 * User Story 2: Visual distinction between outbound edges (data stored on source entity)
 * and inbound edges (discovered via reverse lookup)
 *
 * Accessibility: Multi-modal distinction using line style + color + arrow style
 * to meet WCAG 2.1 Level AA standards
 */

import type { GraphEdge, EdgeDirection } from "@bibgraph/types";
import { RelationType } from "@bibgraph/types";

/**
 * Style properties for graph edges
 * Compatible with both SVG and CSS styling
 */
export interface EdgeStyleProperties {
  // Line styling
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeOpacity?: number;

  // Arrow/marker styling
  markerEnd?: string;
  arrowColor?: string;

  // CSS properties (for DOM-based renderers)
  borderStyle?: string;
  borderColor?: string;
  opacity?: number;

  // Data attributes for testing and debugging
  'data-direction'?: EdgeDirection;
  'data-relation-type'?: RelationType;
}

/**
 * Type-specific colors for relationship types
 * All colors meet WCAG 2.1 Level AA contrast ratio (≥3:1 for graphical objects)
 */
export const TYPE_COLORS = {
  AUTHORSHIP: '#4A90E2', // Blue - Work → Author
  REFERENCE: '#7B68EE', // Medium Slate Blue - Work → Work citations
  PUBLICATION: '#50C878', // Emerald - Work → Source
  TOPIC: '#FF6B6B', // Light Coral - Work → Topic
  AFFILIATION: '#FFA500', // Orange - Author → Institution
  HOST_ORGANIZATION: '#9370DB', // Medium Purple - Source → Publisher
  LINEAGE: '#20B2AA', // Light Sea Green - Institution → Institution

  // Additional/less common types
  FUNDED_BY: '#FF8C00', // Dark Orange
  PUBLISHER_CHILD_OF: '#8B4789', // Purple
  WORK_HAS_KEYWORD: '#DC143C', // Crimson
  AUTHOR_RESEARCHES: '#4682B4', // Steel Blue
  INSTITUTION_LOCATED_IN: '#2E8B57', // Sea Green
  FUNDER_LOCATED_IN: '#CD853F', // Peru
  TOPIC_PART_OF_FIELD: '#9932CC', // Dark Orchid
  RELATED_TO: '#708090', // Slate Gray - catch-all
} as const;

/**
 * Default styling constants
 */
const STYLE_CONSTANTS = {
  // Line styles
  OUTBOUND_LINE: 'solid',
  INBOUND_LINE: 'dashed',

  // Dash pattern for inbound edges (8px dash, 4px gap)
  INBOUND_DASHARRAY: '8,4',

  // Stroke widths
  DEFAULT_STROKE_WIDTH: 2,
  HOVER_STROKE_WIDTH: 3,

  // Opacity
  DEFAULT_OPACITY: 0.8,
  HOVER_OPACITY: 1.0,
  FILTERED_OPACITY: 0.2,

  // Arrow markers
  OUTBOUND_MARKER: 'arrow-solid',
  INBOUND_MARKER: 'arrow-dashed',
} as const;

/**
 * Get color for a relationship type
 *
 * @param type - Relationship type
 * @returns Hex color string
 */
export function getTypeColor(type: RelationType): string {
  return TYPE_COLORS[type] || TYPE_COLORS.RELATED_TO;
}

/**
 * Get styling for outbound edges (solid lines)
 * Outbound edges represent relationships stored directly on the source entity
 *
 * @param type - Relationship type
 * @returns Style properties for outbound edges
 */
export function getOutboundStyle(type: RelationType): EdgeStyleProperties {
  const color = getTypeColor(type);

  return {
    // SVG properties
    stroke: color,
    strokeWidth: STYLE_CONSTANTS.DEFAULT_STROKE_WIDTH,
    strokeDasharray: undefined, // Solid line (no dashes)
    strokeOpacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Arrow marker
    markerEnd: STYLE_CONSTANTS.OUTBOUND_MARKER,
    arrowColor: color,

    // CSS properties
    borderStyle: STYLE_CONSTANTS.OUTBOUND_LINE,
    borderColor: color,
    opacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Data attributes
    'data-direction': 'outbound',
    'data-relation-type': type,
  };
}

/**
 * Get styling for inbound edges (dashed lines)
 * Inbound edges represent relationships discovered via reverse lookup
 *
 * @param type - Relationship type
 * @returns Style properties for inbound edges
 */
export function getInboundStyle(type: RelationType): EdgeStyleProperties {
  const color = getTypeColor(type);

  return {
    // SVG properties
    stroke: color,
    strokeWidth: STYLE_CONSTANTS.DEFAULT_STROKE_WIDTH,
    strokeDasharray: STYLE_CONSTANTS.INBOUND_DASHARRAY, // Dashed line pattern
    strokeOpacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Arrow marker
    markerEnd: STYLE_CONSTANTS.INBOUND_MARKER,
    arrowColor: color,

    // CSS properties
    borderStyle: STYLE_CONSTANTS.INBOUND_LINE,
    borderColor: color,
    opacity: STYLE_CONSTANTS.DEFAULT_OPACITY,

    // Data attributes
    'data-direction': 'inbound',
    'data-relation-type': type,
  };
}

/**
 * Get complete styling for an edge based on its direction and type
 * Primary entry point for edge styling
 *
 * Multi-modal visual distinction:
 * 1. Line style: Solid (outbound) vs Dashed (inbound)
 * 2. Color: Type-specific colors
 * 3. Arrow style: Different marker styles for outbound/inbound
 *
 * @param edge - Graph edge to style
 * @returns Style properties with multi-modal visual distinction
 *
 * @example
 * ```typescript
 * const edge: GraphEdge = {
 *   id: 'W1-A1',
 *   source: 'W1',
 *   target: 'A1',
 *   type: RelationType.AUTHORSHIP,
 *   direction: 'outbound',
 * };
 * const style = getEdgeStyle(edge);
 * // Returns: { stroke: '#4A90E2', strokeDasharray: undefined, ... }
 * ```
 */
export function getEdgeStyle(edge: GraphEdge): EdgeStyleProperties {
  const { type, direction } = edge;

  // Use direction field if available, otherwise default to outbound
  const edgeDirection = direction || 'outbound';

  if (edgeDirection === 'inbound') {
    return getInboundStyle(type);
  }

  return getOutboundStyle(type);
}

/**
 * Get hover styling for an edge
 * Increases stroke width and opacity for better visibility
 *
 * @param edge - Graph edge to style
 * @returns Style properties for hover state
 */
export function getEdgeHoverStyle(edge: GraphEdge): EdgeStyleProperties {
  const baseStyle = getEdgeStyle(edge);

  return {
    ...baseStyle,
    strokeWidth: STYLE_CONSTANTS.HOVER_STROKE_WIDTH,
    strokeOpacity: STYLE_CONSTANTS.HOVER_OPACITY,
    opacity: STYLE_CONSTANTS.HOVER_OPACITY,
  };
}

/**
 * Get filtered/dimmed styling for an edge
 * Used when edge is not currently visible/active
 *
 * @param edge - Graph edge to style
 * @returns Style properties for filtered state
 */
export function getEdgeFilteredStyle(edge: GraphEdge): EdgeStyleProperties {
  const baseStyle = getEdgeStyle(edge);

  return {
    ...baseStyle,
    strokeOpacity: STYLE_CONSTANTS.FILTERED_OPACITY,
    opacity: STYLE_CONSTANTS.FILTERED_OPACITY,
  };
}
