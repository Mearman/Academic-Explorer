/**
 * Graph Expansion
 *
 * Provides functionality for expanding nodes in the persistent graph
 * by fetching their relationships from the OpenAlex API.
 *
 * When a user clicks on a node, this module:
 * 1. Fetches the full entity data if not already present
 * 2. Extracts and indexes all relationships
 * 3. Creates stub nodes for newly discovered entities
 * 4. Marks the node as expanded
 *
 * @module cache/dexie/graph-expansion
 */

import { logger } from '@bibgraph/utils';
import type { EntityType } from '@bibgraph/types';

import {
  getAuthorById,
  getWorkById,
  getConceptById,
  getInstitutionById,
  getFunderById,
  getPublisherById,
  getSourceById,
  getTopicById,
  getKeywordById,
} from '../../helpers';
import { extractAndIndexRelationships } from './graph-extraction';
import type { PersistentGraph } from './persistent-graph';

const LOG_PREFIX = 'graph-expansion';

/**
 * Result of expanding a node
 */
export interface NodeExpansionResult {
  /** Whether the expansion was successful */
  success: boolean;

  /** Number of new nodes added */
  nodesAdded: number;

  /** Number of new edges added */
  edgesAdded: number;

  /** Error message if expansion failed */
  error?: string;

  /** Whether the entity was already fully expanded */
  alreadyExpanded: boolean;
}

/**
 * Fetch entity data by type and ID
 */
async function fetchEntityData(
  entityType: EntityType,
  entityId: string
): Promise<Record<string, unknown> | null> {
  try {
    switch (entityType) {
      case 'works':
        return (await getWorkById(entityId)) as unknown as Record<string, unknown>;
      case 'authors':
        return (await getAuthorById(entityId)) as unknown as Record<string, unknown>;
      case 'institutions':
        return (await getInstitutionById(entityId)) as unknown as Record<string, unknown>;
      case 'sources':
        return (await getSourceById(entityId)) as unknown as Record<string, unknown>;
      case 'topics':
        return (await getTopicById(entityId)) as unknown as Record<string, unknown>;
      case 'funders':
        return (await getFunderById(entityId)) as unknown as Record<string, unknown>;
      case 'publishers':
        return (await getPublisherById(entityId)) as unknown as Record<string, unknown>;
      case 'concepts':
        return (await getConceptById(entityId)) as unknown as Record<string, unknown>;
      case 'keywords':
        return (await getKeywordById(entityId)) as unknown as Record<string, unknown>;
      default:
        logger.warn(LOG_PREFIX, `Unsupported entity type: ${entityType}`);
        return null;
    }
  } catch (error) {
    logger.error(LOG_PREFIX, `Failed to fetch ${entityType} ${entityId}`, { error });
    return null;
  }
}

/**
 * Expand a node by fetching its entity data and all relationships
 *
 * This function:
 * 1. Checks if the node is already expanded (returns early if so)
 * 2. Fetches the full entity data from OpenAlex API
 * 3. Extracts and indexes all relationships
 * 4. Creates stub nodes for newly discovered entities
 * 5. Marks the node as expanded with timestamp
 *
 * @param graph - The PersistentGraph instance
 * @param nodeId - The ID of the node to expand
 * @returns Expansion result with statistics
 */
export async function expandNode(
  graph: PersistentGraph,
  nodeId: string
): Promise<NodeExpansionResult> {
  // Get current node state
  const node = graph.getNode(nodeId);

  if (!node) {
    return {
      success: false,
      nodesAdded: 0,
      edgesAdded: 0,
      error: `Node ${nodeId} not found in graph`,
      alreadyExpanded: false,
    };
  }

  // Check if already expanded
  if (node.expandedAt !== undefined) {
    logger.debug(LOG_PREFIX, `Node ${nodeId} already expanded`, {
      expandedAt: new Date(node.expandedAt).toISOString(),
    });
    return {
      success: true,
      nodesAdded: 0,
      edgesAdded: 0,
      alreadyExpanded: true,
    };
  }

  // Get counts before expansion
  const nodeCountBefore = graph.getStatistics().nodeCount;
  const edgeCountBefore = graph.getStatistics().edgeCount;

  // Fetch entity data
  logger.debug(LOG_PREFIX, `Fetching entity data for ${node.entityType} ${nodeId}`);
  const entityData = await fetchEntityData(node.entityType, nodeId);

  if (!entityData) {
    return {
      success: false,
      nodesAdded: 0,
      edgesAdded: 0,
      error: `Failed to fetch entity data for ${nodeId}`,
      alreadyExpanded: false,
    };
  }

  // Extract and index relationships
  const extractionResult = await extractAndIndexRelationships(
    graph,
    node.entityType,
    nodeId,
    entityData
  );

  // Mark node as expanded
  await graph.markNodeExpanded(nodeId);

  // Calculate added counts
  const nodeCountAfter = graph.getStatistics().nodeCount;
  const edgeCountAfter = graph.getStatistics().edgeCount;

  const result: NodeExpansionResult = {
    success: true,
    nodesAdded: nodeCountAfter - nodeCountBefore,
    edgesAdded: edgeCountAfter - edgeCountBefore,
    alreadyExpanded: false,
  };

  logger.debug(LOG_PREFIX, `Expanded node ${nodeId}`, {
    nodesAdded: result.nodesAdded,
    edgesAdded: result.edgesAdded,
    relationshipsExtracted: extractionResult.edgesAdded,
    stubsCreated: extractionResult.stubsCreated,
  });

  return result;
}

/**
 * Check if a node is fully expanded (has expandedAt timestamp)
 */
export function isNodeExpanded(graph: PersistentGraph, nodeId: string): boolean {
  const node = graph.getNode(nodeId);
  return node?.expandedAt !== undefined;
}

/**
 * Check if a node is a stub (completeness === 'stub')
 */
export function isStubNode(graph: PersistentGraph, nodeId: string): boolean {
  const node = graph.getNode(nodeId);
  return node?.completeness === 'stub';
}
