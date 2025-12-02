/**
 * useMultiSourceGraph - Hook for loading graph data from multiple sources
 *
 * Manages multiple data sources (catalogue lists, caches) and combines them
 * into a unified graph visualization with toggleable visibility per source.
 *
 * @module hooks/use-multi-source-graph
 */

import type { GraphNode, GraphEdge } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import type {
  GraphDataSource,
  GraphDataSourceState,
  GraphSourceEntity,
} from '@bibgraph/utils';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';
import {
  createBookmarksSource,
  createHistorySource,
  createCatalogueListSource,
  createIndexedDBCacheSource,
  createMemoryCacheSource,
  createStaticCacheSource,
  createPersistentGraphSource,
} from '@/lib/graph-sources';

const STORAGE_KEY = 'bibgraph:graph-source-toggles';
const LOG_PREFIX = 'multi-source-graph';

/**
 * Load enabled source IDs from localStorage
 */
function loadEnabledSources(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      return new Set(parsed);
    }
  } catch (error) {
    logger.debug(LOG_PREFIX, 'Failed to load source toggles from localStorage', { error });
  }
  // Default: only bookmarks enabled
  return new Set(['catalogue:bookmarks']);
}

/**
 * Save enabled source IDs to localStorage
 */
function saveEnabledSources(enabledIds: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabledIds]));
  } catch (error) {
    logger.debug(LOG_PREFIX, 'Failed to save source toggles to localStorage', { error });
  }
}

/**
 * Convert GraphSourceEntity to GraphNode
 */
function sourceEntityToNode(entity: GraphSourceEntity): GraphNode {
  return {
    id: entity.entityId,
    entityType: entity.entityType,
    entityId: entity.entityId,
    label: entity.label,
    x: Math.random() * 800 - 400,
    y: Math.random() * 600 - 300,
    externalIds: [],
    entityData: entity.entityData,
  };
}

/**
 * Build edges from entity relationships
 * Only creates edges where both endpoints exist in the entity map
 * Preserves edge properties (score, authorPosition, etc.) for weighted traversal
 */
function buildEdges(
  entities: GraphSourceEntity[],
  entityIds: Set<string>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  for (const entity of entities) {
    for (const rel of entity.relationships) {
      // Only create edge if target exists in our entity set
      if (entityIds.has(rel.targetId)) {
        const edgeKey = `${entity.entityId}-${rel.targetId}-${rel.relationType}`;
        const reverseKey = `${rel.targetId}-${entity.entityId}-${rel.relationType}`;

        if (!seenEdges.has(edgeKey) && !seenEdges.has(reverseKey)) {
          seenEdges.add(edgeKey);
          edges.push({
            id: edgeKey,
            source: entity.entityId,
            target: rel.targetId,
            type: rel.relationType,
            weight: rel.score ?? 1,
            // Include edge properties for weighted traversal
            score: rel.score,
            authorPosition: rel.authorPosition,
            isCorresponding: rel.isCorresponding,
            isOpenAccess: rel.isOpenAccess,
          });
        }
      }
    }
  }

  return edges;
}

/**
 * Result of the useMultiSourceGraph hook
 */
export interface UseMultiSourceGraphResult {
  /** Combined nodes from all enabled sources */
  nodes: GraphNode[];

  /** Edges between nodes (cross-source supported) */
  edges: GraphEdge[];

  /** Loading state */
  loading: boolean;

  /** True when no entities from any enabled source */
  isEmpty: boolean;

  /** Error if loading failed */
  error: Error | null;

  /** Available data sources with their state */
  sources: GraphDataSourceState[];

  /** Set of enabled source IDs */
  enabledSourceIds: Set<string>;

  /** Toggle a single source on/off */
  toggleSource: (sourceId: string) => void;

  /** Enable multiple sources */
  enableSources: (sourceIds: string[]) => void;

  /** Disable multiple sources */
  disableSources: (sourceIds: string[]) => void;

  /** Enable all sources */
  enableAll: () => void;

  /** Disable all sources */
  disableAll: () => void;

  /** Force refresh all data */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing multi-source graph data
 */
export function useMultiSourceGraph(): UseMultiSourceGraphResult {
  const storage = useStorageProvider();

  // Available sources
  const [sources, setSources] = useState<GraphDataSourceState[]>([]);
  const [enabledSourceIds, setEnabledSourceIds] = useState<Set<string>>(() => loadEnabledSources());

  // Graph data
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track initialization
  const initializedRef = useRef(false);
  const loadingSourcesRef = useRef<Set<string>>(new Set());

  /**
   * Discover all available sources
   */
  const discoverSources = useCallback(async (): Promise<GraphDataSource[]> => {
    const discovered: GraphDataSource[] = [];

    // Always add bookmarks and history
    discovered.push(createBookmarksSource(storage));
    discovered.push(createHistorySource(storage));

    // Add user-created catalogue lists
    try {
      const lists = await storage.getAllLists();
      for (const list of lists) {
        // Skip system lists (bookmarks, history) - they're added above
        if (list.id === 'bookmarks-list' || list.id === 'history-list') continue;
        if (list.id) {
          discovered.push(createCatalogueListSource(storage, list.id, list));
        }
      }
    } catch (err) {
      logger.debug(LOG_PREFIX, 'Failed to load catalogue lists', { error: err });
    }

    // Add persistent graph source (primary source for relationship data)
    const persistentGraphSource = createPersistentGraphSource();
    if (await persistentGraphSource.isAvailable()) {
      discovered.push(persistentGraphSource);
    }

    // Add cache sources
    const indexedDBSource = createIndexedDBCacheSource();
    if (await indexedDBSource.isAvailable()) {
      discovered.push(indexedDBSource);
    }

    const memorySource = createMemoryCacheSource();
    if (await memorySource.isAvailable()) {
      discovered.push(memorySource);
    }

    const staticSource = createStaticCacheSource();
    if (await staticSource.isAvailable()) {
      discovered.push(staticSource);
    }

    return discovered;
  }, [storage]);

  /**
   * Load entity counts for all sources
   */
  const loadSourceStates = useCallback(async (
    discoveredSources: GraphDataSource[]
  ): Promise<GraphDataSourceState[]> => {
    const states: GraphDataSourceState[] = [];

    for (const source of discoveredSources) {
      try {
        const count = await source.getEntityCount();
        states.push({
          source,
          enabled: enabledSourceIds.has(source.id),
          entityCount: count,
          loading: false,
          error: null,
        });
      } catch (err) {
        states.push({
          source,
          enabled: enabledSourceIds.has(source.id),
          entityCount: null,
          loading: false,
          error: err instanceof Error ? err : new Error('Failed to load count'),
        });
      }
    }

    return states;
  }, [enabledSourceIds]);

  /**
   * Load graph data from enabled sources
   */
  const loadGraphData = useCallback(async (sourceStates: GraphDataSourceState[]) => {
    const enabledStates = sourceStates.filter(s => s.enabled);

    if (enabledStates.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const allEntities: GraphSourceEntity[] = [];
    const entityMap = new Map<string, GraphSourceEntity>();

    // Load entities from each enabled source
    for (const state of enabledStates) {
      if (loadingSourcesRef.current.has(state.source.id)) continue;

      try {
        loadingSourcesRef.current.add(state.source.id);
        const entities = await state.source.getEntities();

        for (const entity of entities) {
          // Deduplicate by entityId (same entity may exist in multiple sources)
          if (!entityMap.has(entity.entityId)) {
            entityMap.set(entity.entityId, entity);
            allEntities.push(entity);
          }
        }
      } catch (err) {
        logger.warn(LOG_PREFIX, `Failed to load from ${state.source.id}`, { error: err });
      } finally {
        loadingSourcesRef.current.delete(state.source.id);
      }
    }

    // Build nodes
    const nodeArray = allEntities.map(sourceEntityToNode);
    const entityIds = new Set(allEntities.map(e => e.entityId));

    // Build edges (cross-source)
    const edgeArray = buildEdges(allEntities, entityIds);

    setNodes(nodeArray);
    setEdges(edgeArray);

    logger.debug(LOG_PREFIX, 'Graph data loaded', {
      sources: enabledStates.length,
      nodes: nodeArray.length,
      edges: edgeArray.length,
    });
  }, []);

  /**
   * Full refresh - rediscover sources and reload data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize storage if needed
      if (!initializedRef.current) {
        await storage.initializeSpecialLists();
        initializedRef.current = true;
      }

      // Discover sources
      const discovered = await discoverSources();
      const states = await loadSourceStates(discovered);
      setSources(states);

      // Load graph data
      await loadGraphData(states);
    } catch (err) {
      const loadError = err instanceof Error ? err : new Error('Failed to load graph data');
      setError(loadError);
      logger.error(LOG_PREFIX, 'Failed to load graph', { error: err });
    } finally {
      setLoading(false);
    }
  }, [storage, discoverSources, loadSourceStates, loadGraphData]);

  /**
   * Toggle a single source
   */
  const toggleSource = useCallback((sourceId: string) => {
    setEnabledSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      saveEnabledSources(next);
      return next;
    });
  }, []);

  /**
   * Enable multiple sources
   */
  const enableSources = useCallback((sourceIds: string[]) => {
    setEnabledSourceIds(prev => {
      const next = new Set(prev);
      for (const id of sourceIds) {
        next.add(id);
      }
      saveEnabledSources(next);
      return next;
    });
  }, []);

  /**
   * Disable multiple sources
   */
  const disableSources = useCallback((sourceIds: string[]) => {
    setEnabledSourceIds(prev => {
      const next = new Set(prev);
      for (const id of sourceIds) {
        next.delete(id);
      }
      saveEnabledSources(next);
      return next;
    });
  }, []);

  /**
   * Enable all sources
   */
  const enableAll = useCallback(() => {
    const allIds = sources.map(s => s.source.id);
    enableSources(allIds);
  }, [sources, enableSources]);

  /**
   * Disable all sources
   */
  const disableAll = useCallback(() => {
    setEnabledSourceIds(new Set());
    saveEnabledSources(new Set());
  }, []);

  // Initial load
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reload graph data when enabled sources change
  useEffect(() => {
    if (sources.length > 0) {
      // Update source states with new enabled values
      const updatedStates = sources.map(s => ({
        ...s,
        enabled: enabledSourceIds.has(s.source.id),
      }));
      setSources(updatedStates);

      // Reload graph data
      setLoading(true);
      loadGraphData(updatedStates)
        .catch(err => {
          logger.error(LOG_PREFIX, 'Failed to reload graph', { error: err });
        })
        .finally(() => setLoading(false));
    }
  }, [enabledSourceIds, sources.length, loadGraphData]);

  const isEmpty = useMemo(() => nodes.length === 0 && edges.length === 0, [nodes, edges]);

  return {
    nodes,
    edges,
    loading,
    isEmpty,
    error,
    sources,
    enabledSourceIds,
    toggleSource,
    enableSources,
    disableSources,
    enableAll,
    disableAll,
    refresh,
  };
}
