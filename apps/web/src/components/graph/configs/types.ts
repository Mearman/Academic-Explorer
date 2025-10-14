import type { GraphAdapterType } from "../adapters/GraphAdapterFactory";

/**
 * Base configuration interface for all graph adapters
 */
export interface BaseGraphAdapterConfig {
  /** Display name for the configuration */
  name: string;
  /** Description of what this config does */
  description: string;
  /** Whether this is the default config for the adapter type */
  isDefault?: boolean;
}

/**
 * ReactFlow hierarchical adapter specific configuration
 */
export interface ReactFlowConfig extends BaseGraphAdapterConfig {
  /** Direction of the hierarchical layout */
  direction: "TB" | "BT" | "LR" | "RL";
  /** Spacing between nodes */
  nodeSpacing: number;
  /** Spacing between levels */
  levelSpacing: number;
  /** Whether to align nodes to center */
  alignCenter: boolean;
}

/**
 * React Force Graph 2D adapter specific configuration
 */
export interface ReactForceGraph2DConfig extends BaseGraphAdapterConfig {
  /** Force simulation parameters */
  force: {
    /** Link force strength */
    link: number;
    /** Charge force strength */
    charge: number;
    /** Center force strength */
    center: number;
  };
  /** Node size scaling factor */
  nodeSize: number;
  /** Link width scaling factor */
  linkWidth: number;
  /** Whether to enable zoom and pan */
  enableZoom: boolean;
}

/**
 * React Force Graph 3D adapter specific configuration
 */
export interface ReactForceGraph3DConfig extends BaseGraphAdapterConfig {
  /** Force simulation parameters */
  force: {
    /** Link force strength */
    link: number;
    /** Charge force strength */
    charge: number;
    /** Center force strength */
    center: number;
  };
  /** Node size scaling factor */
  nodeSize: number;
  /** Link width scaling factor */
  linkWidth: number;
  /** Whether to enable controls */
  enableControls: boolean;
}

/**
 * R3F Force Graph adapter specific configuration
 */
export interface R3FForceGraphConfig extends BaseGraphAdapterConfig {
  /** Force simulation parameters */
  force: {
    /** Link force strength */
    link: number;
    /** Charge force strength */
    charge: number;
    /** Center force strength */
    center: number;
  };
  /** Node size scaling factor */
  nodeSize: number;
  /** Link width scaling factor */
  linkWidth: number;
  /** Camera distance */
  cameraDistance: number;
  /** Whether to enable orbit controls */
  enableOrbitControls: boolean;
  /** Whether to show node labels */
  showLabels: boolean;
}

/**
 * Union type for all adapter configurations
 */
export type GraphAdapterConfig =
  | ReactFlowConfig
  | ReactForceGraph2DConfig
  | ReactForceGraph3DConfig
  | R3FForceGraphConfig;

/**
 * Configuration registry for each adapter type
 */
export interface GraphAdapterConfigRegistry {
  [key: string]: {
    /** The adapter type this config is for */
    adapterType: GraphAdapterType;
    /** Available configurations for this adapter */
    configs: GraphAdapterConfig[];
  };
}

/**
 * Configuration selector for UI components
 */
export interface GraphConfigOption {
  /** Unique identifier for the config */
  id: string;
  /** Display label */
  label: string;
  /** Description */
  description: string;
  /** The adapter type */
  adapterType: GraphAdapterType;
  /** The configuration object */
  config: GraphAdapterConfig;
}
