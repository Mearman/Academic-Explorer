/**
 * Type definitions for graph clustering, partitioning, and decomposition algorithms.
 *
 * This module defines data structures for 9 algorithms:
 * - Community Detection: Louvain, Leiden, Label Propagation, Infomap
 * - Graph Partitioning: Spectral partitioning
 * - Hierarchical Clustering: Agglomerative clustering with dendrogram
 * - Graph Decomposition: K-core, Core-periphery, Biconnected components
 *
 * @module clustering-types
 */

import type { Result } from './result';

// ============================================================================
// Base Type Aliases
// ============================================================================

/**
 * Community/Cluster identifier
 */
export type CommunityId = number;

/**
 * Partition identifier (0 to k-1)
 */
export type PartitionId = number;

/**
 * Cluster identifier for label propagation
 */
export type ClusterId = number;

/**
 * Module identifier for Infomap
 */
export type ModuleId = number;

/**
 * Biconnected component identifier
 */
export type ComponentId = number;

/**
 * Modularity score
 * Range: [-0.5, 1.0], higher is better
 */
export type Modularity = number;

/**
 * Conductance score
 * Range: [0.0, 1.0], lower is better (fewer boundary edges)
 */
export type Conductance = number;

/**
 * Density score
 * Range: [0.0, 1.0], edges / possible_edges
 */
export type Density = number;

/**
 * Coreness score for core-periphery decomposition
 * Range: [0.0, 1.0], core membership strength
 */
export type CorenessScore = number;

/**
 * Information-theoretic description length (bits)
 */
export type DescriptionLength = number;

/**
 * Compression ratio for Infomap
 * initial_length / final_length, > 1.0 indicates compression
 */
export type CompressionRatio = number;

// ============================================================================
// Entity Interfaces
// ============================================================================

/**
 * Community structure detected by Louvain algorithm.
 * Represents a densely connected subgraph with high modularity.
 */
export interface Community<N> {
  /** Community identifier (0-indexed) */
  id: CommunityId;

  /** Set of nodes belonging to this community */
  nodes: Set<N>;

  /** Number of edges within the community */
  internalEdges: number;

  /** Number of edges crossing community boundary */
  externalEdges: number;

  /** Contribution to global modularity score */
  modularity: number;

  /** Internal edge density (actual_edges / possible_edges) */
  density: number;

  /** Number of nodes in community */
  size: number;
}

/**
 * Balanced graph partition from spectral partitioning.
 * Divides graph into k subgraphs while minimizing edge cuts.
 */
export interface Partition<N> {
  /** Partition identifier (0 to k-1) */
  id: PartitionId;

  /** Nodes assigned to this partition */
  nodes: Set<N>;

  /** Number of nodes in partition */
  size: number;

  /** Edges connecting this partition to other partitions */
  edgeCuts: number;

  /** Size relative to ideal size (ideal = n/k) */
  balance: number;
}

/**
 * Merge step in hierarchical clustering dendrogram.
 * Represents joining two clusters at a specific distance/height.
 */
export interface MergeStep<N> {
  /** Index of first cluster being merged (< 0 for leaves) */
  cluster1: number;

  /** Index of second cluster being merged (< 0 for leaves) */
  cluster2: number;

  /** Distance/dissimilarity between clusters */
  distance: number;

  /** Size of resulting merged cluster */
  size: number;
}

/**
 * Hierarchical clustering dendrogram.
 * Tree structure showing nested clustering levels with cut operations.
 */
export interface Dendrogram<N> {
  /** Sequence of cluster merge operations (n-1 merges for n nodes) */
  merges: MergeStep<N>[];

  /** Height at which each merge occurred (non-decreasing) */
  heights: number[];

  /** Original graph nodes (leaves of dendrogram) */
  leafNodes: N[];

  /** Size of cluster formed at each merge step */
  clusterSizes: number[];

  /**
   * Cut dendrogram at specified height to produce flat clusters.
   * @param height - Height threshold for cutting
   * @returns Array of clusters (sets of nodes)
   */
  cutAtHeight(height: number): Set<N>[];

  /**
   * Get exactly k clusters by cutting dendrogram.
   * @param numClusters - Desired number of clusters
   * @returns Array of exactly k clusters (sets of nodes)
   */
  getClusters(numClusters: number): Set<N>[];
}

/**
 * K-core decomposition result.
 * Maximal subgraph where all nodes have degree ≥ k within the subgraph.
 */
export interface Core<N> {
  /** Core number (minimum degree within core) */
  k: number;

  /** Nodes in the k-core */
  nodes: Set<N>;

  /** Number of nodes in core */
  size: number;

  /** Maximum k value across all cores (graph degeneracy) */
  degeneracy: number;

  /** Per-node core numbers (highest k-core each node belongs to) */
  coreNumbers: Map<N, number>;
}

/**
 * Leiden clustering community.
 * Enhanced community structure with connectivity guarantee.
 */
export interface LeidenCommunity<N> {
  /** Community identifier */
  id: CommunityId;

  /** Nodes in this Leiden community */
  nodes: Set<N>;

  /** Modularity contribution */
  modularity: number;

  /** Connectivity guarantee (always true for Leiden) */
  isConnected: boolean;

  /** Edges within community */
  internalEdges: number;

  /** Boundary quality metric (lower is better) */
  conductance: number;
}

/**
 * Label propagation cluster.
 * Fast clustering result from asynchronous label propagation.
 */
export interface LabelCluster<N> {
  /** Cluster label (inherited from seed node or converged label) */
  label: ClusterId;

  /** Nodes with this label */
  nodes: Set<N>;

  /** Cluster size */
  size: number;

  /** Number of iterations until convergence (or max iterations) */
  iterations: number;

  /** True if converged, false if hit max iterations */
  stable: boolean;
}

/**
 * Infomap module.
 * Information-theoretic community based on flow compression.
 */
export interface InfomapModule<N> {
  /** Module identifier */
  id: ModuleId;

  /** Nodes in this module */
  nodes: Set<N>;

  /** Bits required to describe random walk within module */
  descriptionLength: number;

  /** Steady-state probability of random walk visiting this module */
  visitProbability: number;

  /** initial_description_length / module_description_length (> 1.0 is good) */
  compressionRatio: number;
}

/**
 * Core-periphery structure.
 * Network decomposition into dense core and sparse periphery.
 */
export interface CorePeripheryStructure<N> {
  /** Nodes identified as core (coreness > threshold) */
  coreNodes: Set<N>;

  /** Nodes identified as periphery (coreness ≤ threshold) */
  peripheryNodes: Set<N>;

  /** Per-node coreness scores (0.0 to 1.0) */
  corenessScores: Map<N, number>;

  /** Threshold used to separate core from periphery (default: 0.7) */
  coreThreshold: number;

  /** Correlation between observed and ideal core-periphery structure */
  fitQuality: number;
}

/**
 * Biconnected component.
 * Maximal subgraph with no articulation points (remains connected after removing any single node).
 */
export interface BiconnectedComponent<N> {
  /** Component identifier */
  id: ComponentId;

  /** Nodes in this biconnected component */
  nodes: Set<N>;

  /** Number of nodes */
  size: number;

  /** Articulation points connecting this component to others */
  articulationPoints: Set<N>;

  /** True if component consists of a single bridge edge */
  isBridge: boolean;
}

/**
 * Aggregated quality metrics for clustering results.
 * Used by Louvain, Leiden, Label Propagation algorithms.
 */
export interface ClusterMetrics {
  /** Global modularity score (Newman-Girvan), range: [-0.5, 1.0] */
  modularity: number;

  /** Average conductance across communities, range: [0.0, 1.0] */
  avgConductance: number;

  /** Average internal density across communities, range: [0.0, 1.0] */
  avgDensity: number;

  /** Total number of clusters/communities */
  numClusters: number;

  /** Silhouette score if applicable, range: [-1.0, 1.0] */
  silhouetteCoefficient?: number;

  /** Fraction of edges within clusters vs. total edges, range: [0.0, 1.0] */
  coverageRatio: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error type for clustering/partitioning/decomposition algorithms.
 */
export type ClusteringError =
  | { type: 'EmptyGraph'; message: string }
  | { type: 'InvalidInput'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number }
  | { type: 'ConvergenceFailure'; message: string; iterations: number }
  | { type: 'InvalidParameter'; message: string; parameter: string; value: unknown };

/**
 * Error type for partitioning algorithms (spectral).
 */
export type PartitioningError =
  | { type: 'EmptyGraph'; message: string }
  | { type: 'InvalidInput'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number }
  | { type: 'InvalidPartitionCount'; message: string; k: number; nodeCount: number };

/**
 * Error type for decomposition algorithms (k-core, core-periphery, biconnected).
 */
export type DecompositionError =
  | { type: 'EmptyGraph'; message: string }
  | { type: 'InvalidInput'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number };

/**
 * Error type for hierarchical clustering.
 */
export type HierarchicalError =
  | { type: 'EmptyGraph'; message: string }
  | { type: 'InvalidInput'; message: string }
  | { type: 'InsufficientNodes'; message: string; required: number; actual: number }
  | { type: 'InvalidHeight'; message: string; height: number };

// ============================================================================
// Result Type Wrappers
// ============================================================================

/**
 * Result type for Louvain clustering algorithm.
 */
export type LouvainResult<N> = Result<
  {
    communities: Community<N>[];
    metrics: ClusterMetrics;
    metadata: {
      algorithm: 'louvain';
      runtime: number;
      iterations: number;
      parameters: {
        resolution?: number;
        maxIterations?: number;
        minImprovement?: number;
      };
    };
  },
  ClusteringError
>;

/**
 * Result type for Leiden clustering algorithm.
 */
export type LeidenResult<N> = Result<
  {
    communities: LeidenCommunity<N>[];
    metrics: ClusterMetrics;
    metadata: {
      algorithm: 'leiden';
      runtime: number;
      iterations: number;
      parameters: {
        resolution?: number;
        maxIterations?: number;
      };
    };
  },
  ClusteringError
>;

/**
 * Result type for Label Propagation clustering.
 */
export type LabelPropagationResult<N> = Result<
  {
    clusters: LabelCluster<N>[];
    metadata: {
      algorithm: 'label-propagation';
      runtime: number;
      converged: boolean;
      iterations: number;
      parameters: {
        maxIterations?: number;
        seed?: number;
      };
    };
  },
  ClusteringError
>;

/**
 * Result type for Infomap clustering.
 */
export type InfomapResult<N> = Result<
  {
    modules: InfomapModule<N>[];
    metrics: ClusterMetrics;
    descriptionLength: number;
    compressionRatio: number;
    metadata: {
      algorithm: 'infomap';
      runtime: number;
      iterations: number;
      parameters: {
        maxIterations?: number;
        numTrials?: number;
        seed?: number;
      };
    };
  },
  ClusteringError
>;

/**
 * Result type for Spectral Partitioning.
 */
export type SpectralPartitionResult<N> = Result<
  {
    partitions: Partition<N>[];
    balanceRatio: number;
    totalEdgeCuts: number;
    metadata: {
      algorithm: 'spectral';
      runtime: number;
      parameters: {
        k: number;
        balanceTolerance?: number;
      };
    };
  },
  PartitioningError
>;

/**
 * Result type for Hierarchical Clustering.
 */
export type HierarchicalResult<N> = Result<
  {
    dendrogram: Dendrogram<N>;
    metadata: {
      algorithm: 'hierarchical';
      runtime: number;
      parameters: {
        linkage: 'single' | 'complete' | 'average';
      };
    };
  },
  HierarchicalError
>;

/**
 * Result type for K-Core Decomposition.
 */
export type KCoreResult<N> = Result<
  {
    cores: Map<number, Core<N>>;
    degeneracy: number;
    coreNumbers: Map<N, number>;
    metadata: {
      algorithm: 'k-core';
      runtime: number;
    };
  },
  DecompositionError
>;

/**
 * Result type for Core-Periphery Decomposition.
 */
export type CorePeripheryResult<N> = Result<
  {
    structure: CorePeripheryStructure<N>;
    metadata: {
      algorithm: 'core-periphery';
      runtime: number;
      iterations: number;
      converged: boolean;
      parameters: {
        coreThreshold?: number;
        maxIterations?: number;
        epsilon?: number;
      };
    };
  },
  DecompositionError
>;

/**
 * Result type for Biconnected Component Decomposition.
 */
export type BiconnectedResult<N> = Result<
  {
    components: BiconnectedComponent<N>[];
    articulationPoints: Set<N>;
    metadata: {
      algorithm: 'biconnected';
      runtime: number;
    };
  },
  DecompositionError
>;
