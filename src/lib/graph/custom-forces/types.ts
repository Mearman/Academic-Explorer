/**
 * Custom Force System Types
 * Defines types for extensible force management in the D3 force simulation
 */

import type { SimulationNodeDatum } from "d3-force";

/**
 * Base interface for all custom forces
 */
export interface CustomForce {
  /** Unique identifier for the force */
  id: string;
  /** Human-readable name */
  name: string;
  /** Force type */
  type: CustomForceType;
  /** Whether the force is currently enabled */
  enabled: boolean;
  /** Force strength multiplier (0-1) */
  strength: number;
  /** Priority for force application order (higher = applied later) */
  priority: number;
  /** Configuration specific to the force type */
  config: CustomForceConfig;
}

/**
 * Available custom force types
 */
export type CustomForceType =
  | "radial"           // Radial positioning force
  | "property-x"       // Horizontal positioning based on node property
  | "property-y"       // Vertical positioning based on node property
  | "property-both"    // Both X and Y positioning based on properties
  | "cluster"          // Clustering force
  | "repulsion"        // Custom repulsion force
  | "attraction"       // Custom attraction force
  | "orbit";           // Orbital motion force

/**
 * Configuration union for all force types
 */
export type CustomForceConfig =
  | RadialForceConfig
  | PropertyForceConfig
  | PropertyBothForceConfig
  | ClusterForceConfig
  | RepulsionForceConfig
  | AttractionForceConfig
  | OrbitForceConfig;

/**
 * Radial force configuration
 * Positions nodes in circular patterns around a center point
 */
export interface RadialForceConfig {
  type: "radial";
  /** Center X coordinate (default: 0) */
  centerX?: number;
  /** Center Y coordinate (default: 0) */
  centerY?: number;
  /** Target radius for all nodes */
  radius: number;
  /** Optional inner radius for annular layout */
  innerRadius?: number;
  /** Whether to distribute nodes evenly around the circle */
  evenDistribution?: boolean;
  /** Starting angle in radians (default: 0) */
  startAngle?: number;
}

/**
 * Property-based force configuration (single axis)
 * Positions nodes based on a node property value
 */
export interface PropertyForceConfig {
  type: "property-x" | "property-y";
  /** Property name to use for positioning */
  propertyName: string;
  /** Minimum coordinate value */
  minValue: number;
  /** Maximum coordinate value */
  maxValue: number;
  /** Property value range (auto-detected if not provided) */
  propertyRange?: [number, number];
  /** Scaling function type */
  scaleType?: "linear" | "log" | "sqrt" | "pow";
  /** Exponent for power scaling (default: 2) */
  scaleExponent?: number;
  /** Whether to reverse the scale */
  reverse?: boolean;
}

/**
 * Property-based force configuration (both axes)
 * Positions nodes based on two node properties
 */
export interface PropertyBothForceConfig {
  type: "property-both";
  /** X-axis property configuration */
  xProperty: Omit<PropertyForceConfig, "type">;
  /** Y-axis property configuration */
  yProperty: Omit<PropertyForceConfig, "type">;
}

/**
 * Cluster force configuration
 * Groups nodes by a categorical property
 */
export interface ClusterForceConfig {
  type: "cluster";
  /** Property name to use for clustering */
  propertyName: string;
  /** Cluster spacing */
  spacing: number;
  /** Cluster arrangement pattern */
  arrangement: "grid" | "circular" | "random";
  /** Grid dimensions (for grid arrangement) */
  gridDimensions?: [number, number];
}

/**
 * Custom repulsion force configuration
 */
export interface RepulsionForceConfig {
  type: "repulsion";
  /** Maximum distance for repulsion effect */
  maxDistance: number;
  /** Minimum distance (prevents infinite force) */
  minDistance: number;
  /** Falloff type */
  falloff: "linear" | "quadratic" | "exponential";
  /** Node selector function for targeted repulsion */
  nodeSelector?: (node: EnhancedSimulationNode) => boolean;
}

/**
 * Custom attraction force configuration
 */
export interface AttractionForceConfig {
  type: "attraction";
  /** Target nodes to attract to */
  attractorSelector: (node: EnhancedSimulationNode) => boolean;
  /** Maximum distance for attraction effect */
  maxDistance: number;
  /** Falloff type */
  falloff: "linear" | "quadratic" | "exponential";
}

/**
 * Orbital force configuration
 * Creates orbital motion around specified nodes
 */
export interface OrbitForceConfig {
  type: "orbit";
  /** Center nodes to orbit around */
  centerSelector: (node: EnhancedSimulationNode) => boolean;
  /** Orbital radius */
  radius: number;
  /** Orbital speed (radians per simulation step) */
  speed: number;
  /** Orbit direction */
  direction: "clockwise" | "counterclockwise";
}

/**
 * Enhanced simulation node with custom force support
 */
export interface EnhancedSimulationNode extends SimulationNodeDatum {
  id: string;
  type?: string;
  [key: string]: unknown; // Allow arbitrary properties for force calculations
}

/**
 * Force calculation function signature
 */
export type ForceCalculationFunction = (
  nodes: EnhancedSimulationNode[],
  config: CustomForceConfig,
  strength: number,
  alpha: number
) => void;

/**
 * Force manager configuration
 */
export interface CustomForceManagerConfig {
  /** Maximum number of custom forces allowed */
  maxForces?: number;
  /** Whether to enable force priority sorting */
  enablePriority?: boolean;
  /** Default strength for new forces */
  defaultStrength?: number;
  /** Performance monitoring options */
  performance?: {
    enableTiming?: boolean;
    logSlowForces?: boolean;
    maxExecutionTime?: number; // milliseconds
  };
}

/**
 * Force performance metrics
 */
export interface ForcePerformanceMetrics {
  forceId: string;
  executionTime: number; // milliseconds
  nodeCount: number;
  alpha: number;
  timestamp: number;
}

/**
 * Force manager state
 */
export interface CustomForceManagerState {
  forces: Map<string, CustomForce>;
  calculationFunctions: Map<CustomForceType, ForceCalculationFunction>;
  performanceMetrics: ForcePerformanceMetrics[];
  config: CustomForceManagerConfig;
}

/**
 * Preset force configurations for common use cases
 */
export interface ForcePreset {
  id: string;
  name: string;
  description: string;
  forces: Omit<CustomForce, "id">[];
}

/**
 * Built-in force presets
 */
export const BUILT_IN_PRESETS: Record<string, ForcePreset> = {
  yearCitation: {
    id: "year-citation",
    name: "Year vs Citation Count",
    description: "Positions works by publication year (X) and citation count (Y)",
    forces: [
      {
        name: "Year Positioning",
        type: "property-x",
        enabled: true,
        strength: 0.8,
        priority: 10,
        config: {
          type: "property-x",
          propertyName: "publication_year",
          minValue: -400,
          maxValue: 400,
          scaleType: "linear"
        }
      },
      {
        name: "Citation Positioning",
        type: "property-y",
        enabled: true,
        strength: 0.8,
        priority: 10,
        config: {
          type: "property-y",
          propertyName: "cited_by_count",
          minValue: -300,
          maxValue: 300,
          scaleType: "log"
        }
      }
    ]
  },
  radialByType: {
    id: "radial-by-type",
    name: "Radial by Entity Type",
    description: "Arranges nodes in concentric circles by entity type",
    forces: [
      {
        name: "Author Circle",
        type: "radial",
        enabled: true,
        strength: 0.6,
        priority: 5,
        config: {
          type: "radial",
          radius: 200,
          centerX: 0,
          centerY: 0,
          evenDistribution: true
        }
      }
    ]
  },
  institutionClusters: {
    id: "institution-clusters",
    name: "Institution Clusters",
    description: "Groups nodes by institution affiliation",
    forces: [
      {
        name: "Institution Grouping",
        type: "cluster",
        enabled: true,
        strength: 0.7,
        priority: 8,
        config: {
          type: "cluster",
          propertyName: "institution_id",
          spacing: 150,
          arrangement: "circular"
        }
      }
    ]
  }
} as const;