/**
 * Algorithm Constants
 * Centralized configuration for all algorithm UI components
 *
 * This file eliminates magic numbers across algorithm components,
 * making defaults discoverable, documented, and easy to maintain.
 * @module components/algorithms/constants
 */

// =============================================================================
// COMMUNITY DETECTION
// =============================================================================

/**
 * Community detection algorithm defaults and parameter ranges
 */
export const COMMUNITY_DETECTION = {
  /** Default resolution parameter for Louvain/Leiden algorithms */
  RESOLUTION_DEFAULT: 1,
  /** Minimum resolution value - lower finds fewer, larger communities */
  RESOLUTION_MIN: 0.1,
  /** Maximum resolution value - higher finds more, smaller communities */
  RESOLUTION_MAX: 3,
  /** Step increment for resolution slider */
  RESOLUTION_STEP: 0.1,

  /** Default number of clusters for spectral/hierarchical algorithms */
  NUM_CLUSTERS_DEFAULT: 5,
  /** Minimum clusters - at least 2 for meaningful partitioning */
  NUM_CLUSTERS_MIN: 2,
  /** Maximum clusters - beyond 20 results become hard to visualize */
  NUM_CLUSTERS_MAX: 20,

  /** Default linkage method for hierarchical clustering */
  LINKAGE_DEFAULT: 'average' as const,
} as const;

// =============================================================================
// K-CORE DECOMPOSITION
// =============================================================================

/**
 * K-core algorithm defaults and parameter ranges
 */
export const K_CORE = {
  /** Default k value - 2-core is a common starting point */
  K_DEFAULT: 2,
  /** Minimum k - 1-core includes all nodes with at least one edge */
  K_MIN: 1,
  /** Maximum k - beyond 20, k-cores are typically empty */
  K_MAX: 20,
} as const;

// =============================================================================
// K-TRUSS DECOMPOSITION
// =============================================================================

/**
 * K-truss algorithm defaults and parameter ranges
 * K-truss: subgraph where every edge participates in at least (k-2) triangles
 */
export const K_TRUSS = {
  /** Default k value - k=3 means edges in at least 1 triangle */
  K_DEFAULT: 3,
  /** Minimum k - k=2 is trivially the original graph */
  K_MIN: 2,
  /** Maximum k - beyond 10, k-trusses are typically very small or empty */
  K_MAX: 10,
} as const;

// =============================================================================
// CORE-PERIPHERY DECOMPOSITION
// =============================================================================

/**
 * Core-periphery analysis defaults and parameter ranges
 */
export const CORE_PERIPHERY = {
  /** Default threshold for core membership (0-1 scale) */
  THRESHOLD_DEFAULT: 0.7,
  /** Minimum threshold - 0.1 avoids classifying everything as core */
  THRESHOLD_MIN: 0.1,
  /** Maximum threshold - 0.95 ensures some nodes qualify as core */
  THRESHOLD_MAX: 0.95,
  /** Step increment for threshold adjustment */
  THRESHOLD_STEP: 0.05,
} as const;

// =============================================================================
// EGO NETWORK
// =============================================================================

/**
 * Ego network extraction defaults and parameter ranges
 */
export const EGO_NETWORK = {
  /** Default ego radius - 1 hop captures immediate neighbors */
  RADIUS_DEFAULT: 1,
  /** Minimum radius - 0 would only include the ego node */
  RADIUS_MIN: 1,
  /** Maximum radius - beyond 5 hops, ego networks become very large */
  RADIUS_MAX: 5,
} as const;

// =============================================================================
// MOTIF DETECTION
// =============================================================================

/**
 * Motif detection defaults and parameter ranges
 */
export const MOTIF_DETECTION = {
  /** Default minimum degree for star center detection */
  STAR_MIN_DEGREE_DEFAULT: 3,
  /** Minimum degree - 2 would be a simple edge, not a star */
  STAR_MIN_DEGREE_MIN: 2,
  /** Maximum degree to search for - limited for performance */
  STAR_MIN_DEGREE_MAX: 20,

  /** Default minimum co-citation count */
  CO_CITATION_MIN_DEFAULT: 2,
  /** Minimum co-citation threshold */
  CO_CITATION_MIN: 1,
  /** Maximum co-citation threshold */
  CO_CITATION_MAX: 20,

  /** Default minimum shared references for bibliographic coupling */
  BIB_COUPLING_MIN_DEFAULT: 2,
  /** Minimum shared references threshold */
  BIB_COUPLING_MIN: 1,
  /** Maximum shared references threshold */
  BIB_COUPLING_MAX: 20,

  /** Maximum number of motifs to display in preview */
  PREVIEW_LIMIT: 5,
  /** Maximum triangles to highlight at once */
  TRIANGLE_HIGHLIGHT_LIMIT: 10,
} as const;

// =============================================================================
// SCORE FILTER (PATH FINDING)
// =============================================================================

/**
 * Score filter defaults for path-finding algorithms
 * Used to filter edges based on normalized score (0-1)
 */
export const SCORE_FILTER = {
  /** Minimum score value (normalized 0-1) */
  MIN: 0,
  /** Maximum score value (normalized 0-1) */
  MAX: 1,
  /** Step increment for score adjustment */
  STEP: 0.1,
  /** Decimal precision for display */
  DECIMAL_SCALE: 2,
  /** Default weight for edges without weight property */
  DEFAULT_WEIGHT: 1,
} as const;

// =============================================================================
// QUALITY THRESHOLDS
// =============================================================================

/**
 * Thresholds for interpreting algorithm quality metrics
 * Used for color-coding badges and providing user feedback
 */
export const QUALITY_THRESHOLDS = {
  /**
   * Modularity score interpretation
   * - Excellent (>0.4): Strong community structure
   * - Good (>0.2): Moderate structure
   * - Poor (≤0.2): Weak or no structure
   */
  MODULARITY: {
    EXCELLENT: 0.4,
    GOOD: 0.2,
  },

  /**
   * Core-periphery fit quality interpretation
   * - Good (>0.5): Strong core-periphery structure
   * - Fair (>0): Some structure detected
   * - Poor (≤0): No clear structure
   */
  CORE_PERIPHERY_FIT: {
    GOOD: 0.5,
    FAIR: 0,
  },

  /**
   * Clustering coefficient interpretation
   * - High (>0.3): Strong local clustering
   * - Medium (>0.1): Moderate clustering
   * - Low (≤0.1): Sparse clustering
   */
  CLUSTERING_COEFFICIENT: {
    HIGH: 0.3,
    MEDIUM: 0.1,
  },

  /**
   * Conductance interpretation (lower is better)
   * - Good (<0.3): Well-separated cluster
   * - Fair (<0.5): Moderate separation
   * - Poor (≥0.5): Weak cluster boundary
   */
  CONDUCTANCE: {
    GOOD: 0.3,
    FAIR: 0.5,
  },

  /**
   * Density interpretation (higher is better)
   * - High (>0.5): Dense cluster
   * - Medium (>0.2): Moderate density
   * - Low (≤0.2): Sparse cluster
   */
  DENSITY: {
    HIGH: 0.5,
    MEDIUM: 0.2,
  },

  /**
   * Coverage ratio interpretation (higher is better)
   * - Good (>0.7): Most edges within clusters
   * - Fair (>0.4): Moderate coverage
   * - Low (≤0.4): Many inter-cluster edges
   */
  COVERAGE: {
    GOOD: 0.7,
    FAIR: 0.4,
  },
} as const;

// =============================================================================
// DISPLAY LIMITS
// =============================================================================

/**
 * Limits for list displays and previews
 * Prevents UI from becoming cluttered with too many items
 */
export const DISPLAY_LIMITS = {
  /** Maximum communities to show in community list */
  COMMUNITIES_PREVIEW: 10,
  /** Maximum connected components to display */
  COMPONENTS_PREVIEW: 5,
  /** Maximum biconnected components to show */
  BICONNECTED_PREVIEW: 6,
  /** Maximum path steps to display at once */
  PATH_STEPS_PREVIEW: 8,
  /** Maximum nodes in dropdown selectors */
  NODE_DROPDOWN_MAX: 100,
} as const;

// =============================================================================
// VISUALIZATION
// =============================================================================

/**
 * Colors for community visualization
 * Chosen for accessibility and visual distinction
 */
export const COMMUNITY_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
] as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LinkageMethod = 'single' | 'complete' | 'average';
