/**
 * API Contract: Enhanced Weighted Traversal
 *
 * This file defines the TypeScript interfaces and function signatures
 * for the enhanced weighted traversal feature (spec-036).
 *
 * @packageDocumentation
 */

import type { EntityType, RelationType } from '@bibgraph/types';
import type { GraphNode, GraphEdge } from '@bibgraph/types';
import { z } from 'zod';

// ============================================================================
// Constants
// ============================================================================

/** Minimum weight value for Dijkstra compatibility */
export const MIN_POSITIVE_WEIGHT = 0.001;

/** Default weight when property is missing */
export const DEFAULT_EDGE_WEIGHT = 1;

/** Default value for missing node properties */
export const DEFAULT_NODE_PROPERTY_VALUE = 1;

// ============================================================================
// Weight Configuration Types
// ============================================================================

/**
 * Edge properties that can be used as numeric weights.
 */
export type WeightableEdgeProperty = 'score' | 'weight';

/**
 * Node properties that can be used as numeric weights.
 * Using a discriminated union of known properties to enable type-safe access.
 */
export type WeightableNodeProperty =
  | 'cited_by_count'
  | 'works_count'
  | 'h_index'
  | 'i10_index'
  | 'publication_year';

/**
 * Schema for extracting numeric weight properties from entity data.
 * Uses Zod's safeParse for type-safe extraction without any type assertions.
 *
 * .passthrough() allows extra properties without failing validation.
 */
export const weightPropertiesSchema = z.object({
  cited_by_count: z.number().optional(),
  works_count: z.number().optional(),
  publication_year: z.number().optional(),
  summary_stats: z.object({
    h_index: z.number().optional(),
    i10_index: z.number().optional(),
  }).optional(),
}).passthrough();

export type WeightProperties = z.infer<typeof weightPropertiesSchema>;

/**
 * Parse entity data to extract weight properties with full type safety.
 * Returns undefined if validation fails.
 *
 * @param entityData - Raw entity data from GraphNode
 * @returns Typed weight properties or undefined
 */
export function parseWeightProperties(entityData: unknown): WeightProperties | undefined {
  const result = weightPropertiesSchema.safeParse(entityData);
  return result.success ? result.data : undefined;
}

/**
 * Target node for property-based weighting.
 */
export type NodePropertyTarget = 'source' | 'target' | 'average';

/**
 * Weight function signature with full node context.
 */
export type WeightFunction = (
  edge: GraphEdge,
  sourceNode: GraphNode,
  targetNode: GraphNode
) => number;

/**
 * Configuration for how edge/node weights are calculated.
 */
export interface WeightConfig {
  /** Use an edge property as weight */
  property?: WeightableEdgeProperty;

  /** Use a node property as weight (NEW) */
  nodeProperty?: string;

  /** Which node to read property from (NEW) */
  nodePropertyTarget?: NodePropertyTarget;

  /** Default value for missing node properties (NEW) */
  nodeDefaultValue?: number;

  /** Custom weight function (takes precedence) */
  weightFn?: WeightFunction;

  /** Invert weights (high value = low cost) */
  invert?: boolean;

  /** Default weight when property undefined */
  defaultWeight?: number;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filter edges by indexed properties.
 */
export interface EdgePropertyFilter {
  authorPosition?: 'first' | 'middle' | 'last';
  isCorresponding?: boolean;
  isOpenAccess?: boolean;
  scoreMin?: number;
  scoreMax?: number;
}

// ============================================================================
// Traversal Options
// ============================================================================

/**
 * Direction filter for traversal operations.
 */
export type TraversalDirection = 'outbound' | 'inbound' | 'both';

/**
 * Complete options for graph traversal and pathfinding.
 */
export interface TraversalOptions {
  /** Weight configuration */
  weight?: WeightConfig;

  /** Direction mode */
  direction?: TraversalDirection;

  /** Filter edges by properties */
  edgeFilter?: EdgePropertyFilter;

  /** Filter edges by relationship type (NEW) */
  edgeTypes?: RelationType[];

  /** Filter nodes by entity type */
  nodeTypes?: EntityType[];

  /** Maximum traversal depth */
  maxDepth?: number;

  /** Treat graph as directed */
  directed?: boolean;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of a shortest path search.
 */
export interface PathResult {
  /** Ordered node IDs from source to target */
  path: string[];

  /** Total path distance/weight */
  distance: number;

  /** Whether a path was found */
  found: boolean;
}

// ============================================================================
// Service Function Signatures
// ============================================================================

/**
 * Find shortest path between two nodes with weighted traversal.
 *
 * @param nodes - Graph nodes
 * @param edges - Graph edges
 * @param sourceId - Starting node ID
 * @param targetId - Destination node ID
 * @param options - Traversal options including weight config and filters
 * @returns Path result with node IDs and distance
 *
 * @example
 * ```typescript
 * // Find path using citation count as weight
 * const result = findShortestPath(nodes, edges, 'A', 'B', {
 *   weight: {
 *     nodeProperty: 'cited_by_count',
 *     invert: true, // Higher citations = shorter path
 *   },
 *   edgeTypes: [RelationType.REFERENCE], // Only follow citations
 * });
 * ```
 */
export type FindShortestPathFn = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceId: string,
  targetId: string,
  options?: TraversalOptions
) => PathResult;

// ============================================================================
// UI Option Types
// ============================================================================

/**
 * Option for edge type filter dropdown.
 */
export interface EdgeTypeOption {
  value: RelationType;
  label: string;
  group?: string;
}

/**
 * Option for node property weight dropdown.
 */
export interface NodePropertyOption {
  value: WeightableNodeProperty | 'none';
  label: string;
  description: string;
  entityTypes?: EntityType[];
}

/**
 * Predefined edge type options for UI.
 */
export const EDGE_TYPE_OPTIONS: EdgeTypeOption[] = [
  // Core relationships
  { value: 'AUTHORSHIP' as RelationType, label: 'Authorship', group: 'Core' },
  { value: 'AFFILIATION' as RelationType, label: 'Affiliation', group: 'Core' },
  { value: 'PUBLICATION' as RelationType, label: 'Publication', group: 'Core' },
  { value: 'REFERENCE' as RelationType, label: 'Reference', group: 'Core' },
  { value: 'TOPIC' as RelationType, label: 'Topic', group: 'Core' },
  // Publishing
  { value: 'HOST_ORGANIZATION' as RelationType, label: 'Host Organization', group: 'Publishing' },
  // Institutional
  { value: 'LINEAGE' as RelationType, label: 'Lineage', group: 'Institutional' },
  { value: 'institution_associated' as RelationType, label: 'Associated Institution', group: 'Institutional' },
  // Additional
  { value: 'funded_by' as RelationType, label: 'Funded By', group: 'Additional' },
  { value: 'work_has_keyword' as RelationType, label: 'Has Keyword', group: 'Additional' },
];

/**
 * Predefined node property options for UI.
 */
export const NODE_PROPERTY_OPTIONS: NodePropertyOption[] = [
  {
    value: 'cited_by_count',
    label: 'Citation Count',
    description: 'Number of citations received',
    entityTypes: ['works', 'authors', 'sources', 'institutions'] as EntityType[],
  },
  {
    value: 'works_count',
    label: 'Works Count',
    description: 'Number of associated works',
    entityTypes: ['authors', 'sources', 'institutions'] as EntityType[],
  },
  {
    value: 'h_index',
    label: 'H-Index',
    description: 'H-index metric',
    entityTypes: ['authors'] as EntityType[],
  },
  {
    value: 'publication_year',
    label: 'Publication Year',
    description: 'Year of publication',
    entityTypes: ['works'] as EntityType[],
  },
];
