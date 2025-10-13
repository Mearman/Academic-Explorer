/**
 * Core simulation types for force-directed graph layout
 * Framework-agnostic types for node positioning and force simulation
 */

// Core simulation node interface
export interface SimulationNode {
  id: string;
  type?: string;
  x?: number;
  y?: number;
  fx?: number | null; // Fixed position
  fy?: number | null;
  vx?: number; // Velocity
  vy?: number;
  index?: number; // D3 assigns this
}

// Core simulation link interface
export interface SimulationLink {
  id: string;
  source: string | SimulationNode;
  target: string | SimulationNode;
  index?: number; // D3 assigns this
}

// Position data for layout updates
export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

// Force simulation configuration
export interface ForceSimulationConfig {
  // Simulation parameters
  targetFPS?: number;
  maxIterations?: number;
  alphaDecay?: number;
  velocityDecay?: number;
  seed?: number;

  // Force parameters
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  centerStrength?: number;
  collisionRadius?: number;
  collisionStrength?: number;

  // Performance options
  sendEveryNTicks?: number;
  enableOptimizations?: boolean;
  batchUpdates?: boolean;
}

// Default force parameters (matching current hardcoded values)
export const DEFAULT_FORCE_PARAMS: Required<ForceSimulationConfig> = {
  linkDistance: 200,
  linkStrength: 0.05,
  chargeStrength: -1000,
  centerStrength: 0.01,
  collisionRadius: 120,
  collisionStrength: 1.0,
  velocityDecay: 0.1,
  alphaDecay: 0.03,
  maxIterations: 1000,
  seed: 0x12345678,
  targetFPS: 60,
  sendEveryNTicks: 1,
  enableOptimizations: true,
  batchUpdates: true,
} as const;

export type ForceParameters = typeof DEFAULT_FORCE_PARAMS;

// Force parameter metadata for UI controls
export const FORCE_PARAM_CONFIG = {
  linkDistance: {
    label: "Link Distance",
    min: 10,
    max: 300,
    step: 10,
    description: "Target distance between connected nodes",
  },
  linkStrength: {
    label: "Link Strength",
    min: 0,
    max: 1,
    step: 0.01,
    description: "Strength of the force connecting nodes",
  },
  chargeStrength: {
    label: "Charge Strength",
    min: -3000,
    max: 0,
    step: 50,
    description: "Repulsive force between nodes (negative values)",
  },
  centerStrength: {
    label: "Center Strength",
    min: 0,
    max: 0.1,
    step: 0.001,
    description: "Force pulling nodes toward the center",
  },
  collisionRadius: {
    label: "Collision Radius",
    min: 10,
    max: 200,
    step: 5,
    description: "Minimum distance between node centers",
  },
  collisionStrength: {
    label: "Collision Strength",
    min: 0,
    max: 2,
    step: 0.1,
    description: "Strength of collision detection",
  },
  velocityDecay: {
    label: "Velocity Decay",
    min: 0,
    max: 1,
    step: 0.01,
    description: "Friction coefficient (higher = more friction)",
  },
  alphaDecay: {
    label: "Alpha Decay",
    min: 0.001,
    max: 0.1,
    step: 0.001,
    description: "Rate at which simulation cools down",
  },
  maxIterations: {
    label: "Max Iterations",
    min: 100,
    max: 5000,
    step: 100,
    description: "Maximum number of simulation iterations",
  },
  seed: {
    label: "Random Seed",
    min: 0,
    max: 0xffffffff,
    step: 1,
    description: "Seed for deterministic random number generation",
  },
  targetFPS: {
    label: "Target FPS",
    min: 10,
    max: 120,
    step: 1,
    description: "Target frames per second for simulation",
  },
  sendEveryNTicks: {
    label: "Send Every N Ticks",
    min: 1,
    max: 10,
    step: 1,
    description: "Send position updates every N simulation ticks",
  },
} as const;
