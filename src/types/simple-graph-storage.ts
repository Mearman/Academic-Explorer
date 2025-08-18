/**
 * Simplified Graph Storage Types
 * 
 * Minimal persistence schema - only stores ID, display_name, and edges
 */

import type { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { EdgeType } from '@/types/entity-graph';

/**
 * Minimal entity data for persistence
 */
export interface SimpleEntity {
  /** Entity ID */
  id: string;
  
  /** Entity type */
  entityType: EntityType;
  
  /** Display name */
  displayName: string;
}

/**
 * Minimal edge data for persistence
 */
export interface SimpleEdge {
  /** Edge ID */
  id: string;
  
  /** Source entity ID */
  sourceId: string;
  
  /** Target entity ID */
  targetId: string;
  
  /** Edge type */
  edgeType: EdgeType;
}

/**
 * Complete simple graph structure for persistence
 */
export interface SimpleGraph {
  /** All entities */
  entities: Record<string, SimpleEntity>;
  
  /** All edges */
  edges: Record<string, SimpleEdge>;
  
  /** Set of directly visited entity IDs */
  visitedEntityIds: string[];
  
  /** Metadata */
  metadata: {
    lastUpdated: string;
    totalVisits: number;
    uniqueEntitiesVisited: number;
  };
}