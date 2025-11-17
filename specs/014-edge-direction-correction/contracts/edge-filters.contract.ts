/**
 * Contract: Edge Filters Component
 *
 * Defines the interface for filtering graph edges by direction (outbound/inbound) in the UI.
 * This contract ensures consistent filtering behavior and visual distinction between edge types.
 *
 * Location: apps/web/src/components/sections/EdgeFiltersSection.tsx
 */

import type { RelationType, EdgeDirection, GraphEdge } from '@academic-explorer/graph';

/**
 * Edge direction filter state
 */
export type EdgeDirectionFilter = 'outbound' | 'inbound' | 'both';

/**
 * Edge filter configuration
 */
export interface EdgeFilterState {
  /** Relationship types to show (e.g., ['AUTHORSHIP', 'REFERENCE']) */
  types: RelationType[];
  /** Direction filter (outbound, inbound, or both) */
  direction: EdgeDirectionFilter;
}

/**
 * Props for EdgeFiltersSection component
 */
export interface EdgeFiltersSectionProps {
  /** Current filter state */
  filters: EdgeFilterState;
  /** Callback when filters change */
  onFiltersChange: (filters: EdgeFilterState) => void;
  /** Available relationship types in current graph */
  availableTypes: RelationType[];
}

/**
 * Edge filtering service
 */
export interface IEdgeFilterService {
  /**
   * Filter edges by direction
   *
   * @param edges - All edges in graph
   * @param directionFilter - Filter to apply ('outbound', 'inbound', 'both')
   * @returns Filtered edges matching direction criteria
   *
   * @performance Must complete in <1 second for graphs with 500 nodes (~1500-2000 edges)
   *
   * @example
   * ```typescript
   * const allEdges: GraphEdge[] = graph.edges;
   * const outboundOnly = filterByDirection(allEdges, 'outbound');
   * // Returns only edges where direction === 'outbound'
   * ```
   */
  filterByDirection(edges: GraphEdge[], directionFilter: EdgeDirectionFilter): GraphEdge[];

  /**
   * Filter edges by relationship types
   *
   * @param edges - All edges in graph
   * @param types - Relationship types to include
   * @returns Filtered edges matching type criteria
   */
  filterByTypes(edges: GraphEdge[], types: RelationType[]): GraphEdge[];

  /**
   * Apply combined filters (direction + types)
   *
   * @param edges - All edges in graph
   * @param filters - Filter state to apply
   * @returns Filtered edges matching all criteria
   */
  applyFilters(edges: GraphEdge[], filters: EdgeFilterState): GraphEdge[];
}

/**
 * Edge visual styling configuration
 */
export interface EdgeVisualStyle {
  /** Line style (solid for outbound, dashed for inbound) */
  lineStyle: 'solid' | 'dashed';
  /** Line color (varies by direction and type) */
  color: string;
  /** Arrow marker style (different shapes for outbound/inbound) */
  markerEnd: string;
  /** Stroke width */
  strokeWidth: number;
  /** Opacity */
  opacity: number;
}

/**
 * Edge styling service
 */
export interface IEdgeStylingService {
  /**
   * Get visual style for an edge based on its direction and type
   *
   * @param edge - Graph edge to style
   * @returns Visual styling configuration
   *
   * @accessibility Must meet WCAG 2.1 Level AA standards:
   * - Multiple visual channels (line style + color + arrow style)
   * - Color contrast ratio ≥ 3:1 for graphical objects
   * - Pattern differentiation perceivable without color
   *
   * @example
   * ```typescript
   * const edge: GraphEdge = { direction: 'outbound', type: 'AUTHORSHIP', ... };
   * const style = getEdgeStyle(edge);
   * // Returns: { lineStyle: 'solid', color: '#4A90E2', markerEnd: 'arrow-solid', ... }
   *
   * const inboundEdge: GraphEdge = { direction: 'inbound', type: 'REFERENCE', ... };
   * const inboundStyle = getEdgeStyle(inboundEdge);
   * // Returns: { lineStyle: 'dashed', color: '#7B68EE', markerEnd: 'arrow-dashed', ... }
   * ```
   */
  getEdgeStyle(edge: GraphEdge): EdgeVisualStyle;

  /**
   * Get style for outbound edges
   */
  getOutboundStyle(type: RelationType): Omit<EdgeVisualStyle, 'color'>;

  /**
   * Get style for inbound edges
   */
  getInboundStyle(type: RelationType): Omit<EdgeVisualStyle, 'color'>;

  /**
   * Get color for relationship type
   */
  getTypeColor(type: RelationType): string;
}

/**
 * Edge direction toggle component props
 */
export interface EdgeDirectionToggleProps {
  /** Current direction filter */
  value: EdgeDirectionFilter;
  /** Callback when direction changes */
  onChange: (direction: EdgeDirectionFilter) => void;
  /** Number of outbound edges available */
  outboundCount: number;
  /** Number of inbound edges available */
  inboundCount: number;
  /** Whether filter is disabled */
  disabled?: boolean;
}

/**
 * Contract validation rules
 */
export const CONTRACT_VALIDATION_RULES = {
  /**
   * Filter performance requirement
   */
  FILTER_PERFORMANCE: 'filterByDirection must complete in <1 second for 500 nodes',

  /**
   * Visual distinction requirement
   */
  VISUAL_DISTINCTION: 'Edge styling must use line style + color + arrow style (multi-modal)',

  /**
   * Accessibility requirement
   */
  WCAG_COMPLIANCE: 'Edge styles must meet WCAG 2.1 Level AA contrast and pattern requirements',

  /**
   * Filter consistency
   */
  FILTER_CONSISTENCY: 'applyFilters must consistently return same edges for same input',

  /**
   * No edge loss
   */
  NO_EDGE_LOSS: 'filterByDirection("both") must return all edges unchanged',
} as const;

/**
 * Test fixtures for contract validation
 */
export const TEST_FIXTURES = {
  /**
   * Sample edges for testing filters
   */
  SAMPLE_EDGES: [
    { id: 'W1-A1-AUTHORSHIP', direction: 'outbound', type: 'AUTHORSHIP' },
    { id: 'W1-W2-REFERENCE', direction: 'outbound', type: 'REFERENCE' },
    { id: 'W3-W1-REFERENCE', direction: 'inbound', type: 'REFERENCE' },
    { id: 'A1-I1-AFFILIATION', direction: 'outbound', type: 'AFFILIATION' },
  ] as GraphEdge[],

  /**
   * Expected filter results
   */
  EXPECTED_OUTBOUND_ONLY: [
    { id: 'W1-A1-AUTHORSHIP', direction: 'outbound', type: 'AUTHORSHIP' },
    { id: 'W1-W2-REFERENCE', direction: 'outbound', type: 'REFERENCE' },
    { id: 'A1-I1-AFFILIATION', direction: 'outbound', type: 'AFFILIATION' },
  ],

  EXPECTED_INBOUND_ONLY: [
    { id: 'W3-W1-REFERENCE', direction: 'inbound', type: 'REFERENCE' },
  ],

  EXPECTED_BOTH: [
    { id: 'W1-A1-AUTHORSHIP', direction: 'outbound', type: 'AUTHORSHIP' },
    { id: 'W1-W2-REFERENCE', direction: 'outbound', type: 'REFERENCE' },
    { id: 'W3-W1-REFERENCE', direction: 'inbound', type: 'REFERENCE' },
    { id: 'A1-I1-AFFILIATION', direction: 'outbound', type: 'AFFILIATION' },
  ],

  /**
   * Performance test graph (500 nodes, ~1500 edges)
   */
  PERFORMANCE_TEST_CONFIG: {
    nodeCount: 500,
    edgesPerNode: 3,
    expectedEdgeCount: 1500,
    maxFilterTimeMs: 1000,
  },

  /**
   * Accessibility test cases
   */
  ACCESSIBILITY_TESTS: [
    {
      name: 'Outbound solid line perceivable',
      edge: { direction: 'outbound' },
      expectedStyle: { lineStyle: 'solid' },
    },
    {
      name: 'Inbound dashed line perceivable',
      edge: { direction: 'inbound' },
      expectedStyle: { lineStyle: 'dashed' },
    },
    {
      name: 'Color contrast ≥ 3:1',
      edge: { direction: 'outbound', type: 'AUTHORSHIP' },
      contrastRequirement: 3.0,
    },
  ],
} as const;

/**
 * Visual styling constants
 */
export const EDGE_STYLE_CONSTANTS = {
  /**
   * Line styles
   */
  OUTBOUND_LINE_STYLE: 'solid' as const,
  INBOUND_LINE_STYLE: 'dashed' as const,

  /**
   * Stroke widths
   */
  DEFAULT_STROKE_WIDTH: 2,
  HOVER_STROKE_WIDTH: 3,

  /**
   * Opacity values
   */
  DEFAULT_OPACITY: 0.8,
  HOVER_OPACITY: 1.0,
  FILTERED_OPACITY: 0.2,

  /**
   * Arrow markers
   */
  OUTBOUND_MARKER: 'arrow-solid',
  INBOUND_MARKER: 'arrow-dashed',

  /**
   * Type colors (WCAG AA compliant)
   */
  TYPE_COLORS: {
    AUTHORSHIP: '#4A90E2', // Blue
    REFERENCE: '#7B68EE', // Medium Slate Blue
    PUBLICATION: '#50C878', // Emerald
    TOPIC: '#FF6B6B', // Light Coral
    AFFILIATION: '#FFA500', // Orange
    HOST_ORGANIZATION: '#9370DB', // Medium Purple
    LINEAGE: '#20B2AA', // Light Sea Green
  } as const,
} as const;
