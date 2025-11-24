/**
 * Graph-related type definitions
 * Extracted from the removed @academic-explorer/graph package
 */

import type { EntityType } from "./entities";
import { RelationType } from "./relationships";

/**
 * External identifier for linking to other systems
 */
export interface ExternalIdentifier {
  type: string;
  value: string;
}

/**
 * Graph node representing an entity in the knowledge graph
 */
export interface GraphNode {
  id: string; // OpenAlex ID
  entityType: EntityType;
  label: string;
  entityId: string;
  x?: number;
  y?: number; // Graph positions
  externalIds?: ExternalIdentifier[];
  entityData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  isXpac?: boolean;
  hasUnverifiedAuthor?: boolean;
}

/**
 * Graph edge representing a relationship between two entities
 */
export interface GraphEdge {
  id: string;
  source: string; // Source node ID
  target: string; // Target node ID
  type: RelationType;
  direction?: "outbound" | "inbound";
  label?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Sort criteria for expansion
 */
export interface SortCriteria {
  property: string;
  direction: "asc" | "desc";
  priority: number;
  label?: string;
}

/**
 * Filter criteria for expansion
 */
export interface FilterCriteria {
  property: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
  value: unknown;
  enabled: boolean;
  label?: string;
}

/**
 * Expansion settings for a specific target
 */
export interface ExpansionSettings {
  limit?: number;
  sorts?: SortCriteria[];
  filters?: FilterCriteria[];
  maxWorks?: number;
  maxAuthors?: number;
  maxInstitutions?: number;
  maxSources?: number;
  maxConcepts?: number;
  maxTopics?: number;
  maxFunders?: number;
  maxPublishers?: number;
}

/**
 * Expansion target type (entity type or relation type)
 */
export type ExpansionTarget = EntityType | RelationType;

/**
 * Get default expansion settings for a target
 */
export function getDefaultSettingsForTarget(
  _target: ExpansionTarget
): ExpansionSettings {
  return {
    limit: 10,
    sorts: [],
    filters: [],
    maxWorks: 10,
    maxAuthors: 10,
    maxInstitutions: 10,
    maxSources: 10,
    maxConcepts: 10,
    maxTopics: 10,
    maxFunders: 10,
    maxPublishers: 10,
  };
}
