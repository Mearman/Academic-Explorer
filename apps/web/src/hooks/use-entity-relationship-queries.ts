/**
 * React hook for querying entity relationships via OpenAlex API
 * Uses the entity relationship query registry to fetch related entities
 *
 * @module use-entity-relationship-queries
 */

import { useQueries } from '@tanstack/react-query';
import type { EntityType, RelationshipTypeString } from '@academic-explorer/types';
import {
  getInboundQueries,
  getOutboundQueries,
  type RelationshipQueryConfig,
} from '@academic-explorer/types';
import { RelationType } from '@academic-explorer/graph';
import type {
  RelationshipSection,
  RelationshipItem,
  PaginationState,
} from '@/types/relationship';
import { RELATIONSHIP_TYPE_LABELS, DEFAULT_PAGE_SIZE } from '@/types/relationship';
import { getWorks, getAuthors, getSources, getInstitutions } from '@academic-explorer/client';

/**
 * Type guard to check if a string is a valid RelationType enum value
 * This allows safe narrowing from string to the enum type
 */
function isRelationType(value: string): value is RelationType {
  // Get all RelationType enum values (handles duplicates from deprecated aliases)
  const validTypes = new Set(Object.values(RelationType));
  return validTypes.has(value as RelationType);
}

export interface UseEntityRelationshipQueriesResult {
  /** Incoming relationship sections from API queries */
  incoming: RelationshipSection[];

  /** Outgoing relationship sections from API queries */
  outgoing: RelationshipSection[];

  /** Total count of incoming relationships */
  incomingCount: number;

  /** Total count of outgoing relationships */
  outgoingCount: number;

  /** Loading state - true if any query is loading */
  loading: boolean;

  /** Error from any failed query */
  error?: Error;
}

/**
 * Query for entity relationships using the relationship query registry
 * Makes parallel API calls for all configured inbound/outbound relationships
 *
 * @param entityId - The ID of the entity to query relationships for
 * @param entityType - The type of the entity
 * @returns Relationship sections from API queries with loading/error states
 */
export function useEntityRelationshipQueries(
  entityId: string | undefined,
  entityType: EntityType,
): UseEntityRelationshipQueriesResult {
  // Get query configurations from registry
  const inboundConfigs = getInboundQueries(entityType);
  const outboundConfigs = getOutboundQueries(entityType);

  // Execute all queries in parallel using useQueries
  const queryResults = useQueries({
    queries: [
      // Inbound queries
      ...inboundConfigs.map((config) => ({
        queryKey: ['entity-relationships', 'inbound', entityType, entityId, config.type],
        queryFn: () => executeRelationshipQuery(entityId!, config),
        enabled: !!entityId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      })),
      // Outbound queries
      ...outboundConfigs.map((config) => ({
        queryKey: ['entity-relationships', 'outbound', entityType, entityId, config.type],
        queryFn: () => executeRelationshipQuery(entityId!, config),
        enabled: !!entityId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      })),
    ],
  });

  // Split results into inbound and outbound
  const inboundResults = queryResults.slice(0, inboundConfigs.length);
  const outboundResults = queryResults.slice(inboundConfigs.length);

  // Transform query results into RelationshipSections
  const incoming: RelationshipSection[] = inboundResults
    .map((result, index) => {
      if (!result.data) return null;
      return createRelationshipSection(
        inboundConfigs[index],
        result.data,
        'inbound'
      );
    })
    .filter((section): section is RelationshipSection => section !== null);

  const outgoing: RelationshipSection[] = outboundResults
    .map((result, index) => {
      if (!result.data) return null;
      return createRelationshipSection(
        outboundConfigs[index],
        result.data,
        'outbound'
      );
    })
    .filter((section): section is RelationshipSection => section !== null);

  // Calculate counts
  const incomingCount = incoming.reduce((sum, section) => sum + section.totalCount, 0);
  const outgoingCount = outgoing.reduce((sum, section) => sum + section.totalCount, 0);

  // Determine loading and error states
  const loading = queryResults.some((result) => result.isLoading);
  const error = queryResults.find((result) => result.error)?.error as Error | undefined;

  return {
    incoming,
    outgoing,
    incomingCount,
    outgoingCount,
    loading,
    error,
  };
}

/**
 * Execute a single relationship query using the OpenAlex API
 */
async function executeRelationshipQuery(
  entityId: string,
  config: RelationshipQueryConfig
): Promise<RelationshipQueryResult> {
  const filter = config.buildFilter(entityId);
  const pageSize = config.pageSize || DEFAULT_PAGE_SIZE;

  // Choose the appropriate API function based on target type
  let response;
  switch (config.targetType) {
    case 'works':
      response = await getWorks({
        filter,
        per_page: pageSize,
        page: 1,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'authors':
      response = await getAuthors({
        filter,
        per_page: pageSize,
        page: 1,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'sources':
      response = await getSources({
        filters: { id: filter }, // getSources uses 'filters' object, not 'filter' string
        per_page: pageSize,
        page: 1,
        ...(config.select && { select: config.select }),
      });
      break;
    case 'institutions':
      response = await getInstitutions({
        filters: { id: filter }, // getInstitutions uses 'filters' object, not 'filter' string
        per_page: pageSize,
        page: 1,
        ...(config.select && { select: config.select }),
      });
      break;
    // TODO: Add topics, publishers, funders when needed
    default:
      throw new Error(`Unsupported target type: ${config.targetType}`);
  }

  return {
    results: response.results,
    totalCount: response.meta.count,
    page: response.meta.page || 1,
    perPage: response.meta.per_page,
  };
}

/**
 * Result from a relationship query
 */
interface RelationshipQueryResult {
  results: Array<Record<string, unknown>>;
  totalCount: number;
  page: number;
  perPage: number;
}

/**
 * Create a RelationshipSection from query results
 */
function createRelationshipSection(
  config: RelationshipQueryConfig,
  queryResult: RelationshipQueryResult,
  direction: 'inbound' | 'outbound'
): RelationshipSection {
  const { results, totalCount, page, perPage } = queryResult;

  // Transform results into RelationshipItems
  const items: RelationshipItem[] = results.map((entity) =>
    createRelationshipItem(entity, config, direction)
  );

  const visibleItems = items;
  const visibleCount = items.length;
  const hasMore = totalCount > visibleCount;

  const pagination: PaginationState = {
    pageSize: perPage,
    currentPage: page - 1, // OpenAlex uses 1-based, we use 0-based
    totalPages: Math.ceil(totalCount / perPage),
    hasNextPage: hasMore,
    hasPreviousPage: page > 1,
  };

  // Use type guard to safely narrow RelationshipTypeString to RelationType
  if (!isRelationType(config.type)) {
    throw new Error(`Invalid relationship type: ${config.type}`);
  }

  return {
    id: `${config.type}-${direction}`,
    type: config.type, // Type is narrowed to RelationType by the guard
    direction,
    label: config.label,
    items,
    visibleItems,
    totalCount,
    visibleCount,
    hasMore,
    pagination,
    isPartialData: false, // API queries return complete data
  };
}

/**
 * Create a RelationshipItem from an API entity result
 */
function createRelationshipItem(
  entity: Record<string, unknown>,
  config: RelationshipQueryConfig,
  direction: 'inbound' | 'outbound'
): RelationshipItem {
  const entityId = entity.id as string;
  const displayName = entity.display_name as string;

  // Determine source and target based on direction
  // For inbound: target is the current entity (not in this context), source is the API result
  // For outbound: source is the current entity (not in this context), target is the API result
  const sourceId = direction === 'outbound' ? '?' : entityId; // Will be set by consuming code
  const targetId = direction === 'outbound' ? entityId : '?'; // Will be set by consuming code

  // Use type guard to safely narrow RelationshipTypeString to RelationType
  if (!isRelationType(config.type)) {
    throw new Error(`Invalid relationship type: ${config.type}`);
  }

  return {
    id: `query-${config.type}-${entityId}`,
    sourceId,
    targetId,
    sourceType: config.targetType, // This will need adjustment based on direction
    targetType: config.targetType,
    type: config.type, // Type is narrowed to RelationType by the guard
    direction,
    displayName,
    isSelfReference: false,
  };
}
