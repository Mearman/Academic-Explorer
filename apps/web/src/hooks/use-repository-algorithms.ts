/**
 * Hook to integrate graph algorithms with the repository store
 * Bridges the repository's graph data with the algorithms package
 * @module hooks/use-repository-algorithms
 */

import type { GraphEdge,GraphNode } from '@bibgraph/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  calculateStatistics,
  type ClusteringAlgorithm,
  type CommunityResult,
  detectCommunities,
  type EgoNetworkResult,
  findShortestPath,
  getEgoNetwork,
  getKCore,
  type GraphStatistics,
  type KCoreResult,
  type PathResult,
} from '@/services/graph-algorithms';
import { type RepositoryState,repositoryStore } from '@/stores/repository-store';

/**
 * Community assignment map for coloring graph nodes
 */
export interface CommunityAssignment {
  nodeIdToCommunity: Map<string, number>;
  communityColors: Map<number, string>;
  communities: CommunityResult[];
}

/**
 * Algorithm state with all computed results
 */
export interface RepositoryAlgorithmsState {
  // Graph data from repository
  nodes: GraphNode[];
  edges: GraphEdge[];
  hasData: boolean;

  // Statistics
  statistics: GraphStatistics | null;

  // Community detection
  communities: CommunityResult[];
  communityAssignment: CommunityAssignment | null;
  modularity: number;

  // Path finding
  pathResult: PathResult | null;

  // K-core
  kCore: KCoreResult | null;

  // Ego network
  egoNetwork: EgoNetworkResult | null;

  // Loading states
  isLoading: boolean;
  isComputing: boolean;
}

/**
 * Community color palette for visualization
 */
const COMMUNITY_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#a855f7', // purple
  '#14b8a6', // teal
];

/**
 * Hook to run algorithms on repository graph data
 */
export const useRepositoryAlgorithms = () => {
  // Repository state
  const [repositoryState, setRepositoryState] = useState<RepositoryState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComputing, setIsComputing] = useState(false);

  // Algorithm results
  const [communities, setCommunities] = useState<CommunityResult[]>([]);
  const [modularity, setModularity] = useState(0);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [kCore, setKCore] = useState<KCoreResult | null>(null);
  const [egoNetwork, setEgoNetwork] = useState<EgoNetworkResult | null>(null);

  // Algorithm options
  const [clusteringAlgorithm, setClusteringAlgorithm] = useState<ClusteringAlgorithm>('louvain');
  const [resolution, setResolution] = useState(1);
  const [kCoreK, setKCoreK] = useState(2);

  // Load repository state
  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      try {
        const state = await repositoryStore.getRepositoryState();
        if (mounted) {
          setRepositoryState(state);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load repository state:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadState();

    // Poll for updates (simple approach without complex subscription)
    const interval = setInterval(() => {
      void loadState();
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Extract nodes and edges from repository state
  const nodes = useMemo(() => {
    if (!repositoryState) return [];
    return Object.values(repositoryState.repositoryNodes);
  }, [repositoryState]);

  const edges = useMemo(() => {
    if (!repositoryState) return [];
    return Object.values(repositoryState.repositoryEdges);
  }, [repositoryState]);

  const hasData = nodes.length > 0;

  // Compute statistics
  const statistics = useMemo(() => {
    if (!hasData) return null;
    return calculateStatistics(nodes, edges, true);
  }, [nodes, edges, hasData]);

  // Detect communities when data or algorithm changes
  useEffect(() => {
    if (!hasData) {
      setCommunities([]);
      setModularity(0);
      return;
    }

    setIsComputing(true);

    // Use setTimeout to avoid blocking UI
    const timeoutId = setTimeout(() => {
      try {
        const result = detectCommunities(nodes, edges, {
          algorithm: clusteringAlgorithm,
          resolution,
        });
        setCommunities(result);

        // Calculate modularity (simple sum of community modularities)
        const totalMod = result.reduce((sum, c) => sum + (c.density * c.size), 0) / nodes.length;
        setModularity(totalMod);
      } catch (error) {
        console.error('Community detection failed:', error);
        setCommunities([]);
      } finally {
        setIsComputing(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, hasData, clusteringAlgorithm, resolution]);

  // Create community assignment for graph coloring
  const communityAssignment = useMemo((): CommunityAssignment | null => {
    if (communities.length === 0) return null;

    const nodeIdToCommunity = new Map<string, number>();
    const communityColors = new Map<number, string>();

    // Sort communities by size (largest first) for consistent coloring
    const sortedCommunities = [...communities].sort((a, b) => b.size - a.size);

    sortedCommunities.forEach((community, index) => {
      const color = COMMUNITY_COLORS[index % COMMUNITY_COLORS.length];
      communityColors.set(community.id, color);

      for (const nodeId of community.nodeIds) {
        nodeIdToCommunity.set(nodeId, community.id);
      }
    });

    return {
      nodeIdToCommunity,
      communityColors,
      communities: sortedCommunities,
    };
  }, [communities]);

  // Find shortest path
  const findPath = useCallback((sourceId: string, targetId: string) => {
    if (!hasData) return;

    const result = findShortestPath(nodes, edges, sourceId, targetId, true);
    setPathResult(result);
  }, [nodes, edges, hasData]);

  // Compute k-core
  const computeKCore = useCallback((k: number) => {
    if (!hasData) return;

    setKCoreK(k);
    const result = getKCore(nodes, edges, k);
    setKCore(result);
  }, [nodes, edges, hasData]);

  // Extract ego network
  const extractEgo = useCallback((centerId: string, radius: number = 1) => {
    if (!hasData) return;

    const result = getEgoNetwork(nodes, edges, centerId, radius, true);
    setEgoNetwork(result);
  }, [nodes, edges, hasData]);

  // Update clustering options
  const updateClusteringOptions = useCallback((options: {
    algorithm?: ClusteringAlgorithm;
    resolution?: number;
  }) => {
    if (options.algorithm !== undefined) {
      setClusteringAlgorithm(options.algorithm);
    }
    if (options.resolution !== undefined) {
      setResolution(options.resolution);
    }
  }, []);

  // Get node color based on community
  const getNodeColor = useCallback((nodeId: string): string | undefined => {
    if (!communityAssignment) return undefined;

    const communityId = communityAssignment.nodeIdToCommunity.get(nodeId);
    if (communityId === undefined) return undefined;

    return communityAssignment.communityColors.get(communityId);
  }, [communityAssignment]);

  // Get highlighted nodes (from path, k-core, or ego network)
  const highlightedNodes = useMemo(() => {
    const highlighted = new Set<string>();

    if (pathResult?.found) {
      pathResult.path.forEach(id => highlighted.add(id));
    }

    if (kCore && kCore.nodes.length > 0) {
      kCore.nodes.forEach(id => highlighted.add(id));
    }

    if (egoNetwork && egoNetwork.nodes.length > 0) {
      egoNetwork.nodes.forEach(n => highlighted.add(n.id));
    }

    return highlighted;
  }, [pathResult, kCore, egoNetwork]);

  return {
    // Data
    nodes,
    edges,
    hasData,

    // Statistics
    statistics,

    // Community detection
    communities,
    communityAssignment,
    modularity,
    clusteringAlgorithm,
    resolution,
    updateClusteringOptions,
    getNodeColor,

    // Path finding
    pathResult,
    findPath,

    // K-core
    kCore,
    kCoreK,
    computeKCore,

    // Ego network
    egoNetwork,
    extractEgo,

    // Highlighted nodes
    highlightedNodes,

    // Loading states
    isLoading,
    isComputing,
  };
};
