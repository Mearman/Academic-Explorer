/**
 * Force System Exports
 * Custom force management for graph layouts
 */

// Force configuration interface
export interface ForceConfig {
  linkDistance?: number;
  linkStrength?: number;
  chargeStrength?: number;
  centerStrength?: number;
  collisionRadius?: number;
  collisionStrength?: number;
  velocityDecay?: number;
  alphaDecay?: number;
}

// Force manager interface
export interface ForceManager {
  updateForces(config: ForceConfig): void;
  restart(): void;
  stop(): void;
  getForces(): Record<string, unknown>;
  getAllForces(): CustomForce[];
  addForce(force: CustomForce): string;
  updateForce(id: string, updates: Partial<CustomForce>): void;
  removeForce(id: string): void;
  clearAllForces(): void;
  getBuiltInPresets(): Record<string, { name: string; description: string; forces: CustomForce[] }>;
  loadPreset(preset: { name: string; description: string; forces: CustomForce[] }): void;
  getStats(): { enabledForces: number; totalForces: number };
}

// Custom force manager implementation (stub)
export const customForceManager: ForceManager = {
  updateForces: (_config: ForceConfig) => {
    throw new Error("customForceManager not available in graph package - use from application layer");
  },
  restart: () => {
    throw new Error("customForceManager not available in graph package - use from application layer");
  },
  stop: () => {
    throw new Error("customForceManager not available in graph package - use from application layer");
  },
  getForces: () => {
    throw new Error("customForceManager not available in graph package - use from application layer");
  },
  getAllForces: (): CustomForce[] => {
    throw new Error("customForceManager.getAllForces not available in graph package - use from application layer");
  },
  addForce: (_force: CustomForce): string => {
    throw new Error("customForceManager.addForce not available in graph package - use from application layer");
  },
  updateForce: (_id: string, _updates: Partial<CustomForce>): void => {
    throw new Error("customForceManager.updateForce not available in graph package - use from application layer");
  },
  removeForce: (_id: string): void => {
    throw new Error("customForceManager.removeForce not available in graph package - use from application layer");
  },
  clearAllForces: (): void => {
    throw new Error("customForceManager.clearAllForces not available in graph package - use from application layer");
  },
  getBuiltInPresets: (): Record<string, { name: string; description: string; forces: CustomForce[] }> => {
    throw new Error("customForceManager.getBuiltInPresets not available in graph package - use from application layer");
  },
  loadPreset: (_preset: { name: string; description: string; forces: CustomForce[] }): void => {
    throw new Error("customForceManager.loadPreset not available in graph package - use from application layer");
  },
  getStats: (): { enabledForces: number; totalForces: number } => {
    throw new Error("customForceManager.getStats not available in graph package - use from application layer");
  }
};

// Custom force types
export type CustomForceType = "radial" | "property-x" | "property-y" | "cluster" | "repulsion" | "attraction" | "orbit";

export interface CustomForce {
  id?: string;
  name: string;
  type: CustomForceType;
  enabled: boolean;
  strength: number;
  priority: number;
  config: CustomForceConfig;
  distance?: number;
  radius?: number;
  x?: number;
  y?: number;
}

// Additional force configuration types
export interface CustomForceConfig {
  type: CustomForceType;
  enabled?: boolean;
  strength?: number;
  [key: string]: unknown;
}

export interface RadialForceConfig extends CustomForceConfig {
  type: "radial";
  radius?: number;
  centerX?: number;
  centerY?: number;
  innerRadius?: number;
  evenDistribution?: boolean;
}

export interface PropertyForceConfig extends CustomForceConfig {
  type: "property-x" | "property-y";
  propertyName?: string;
  minValue?: number;
  maxValue?: number;
  scaleType?: "linear" | "log" | "sqrt" | "pow";
  scaleExponent?: number;
  reverse?: boolean;
}

export interface ClusterForceConfig extends CustomForceConfig {
  type: "cluster";
  propertyName?: string;
  spacing?: number;
  arrangement?: "grid" | "circular" | "random";
}

export interface RepulsionForceConfig extends CustomForceConfig {
  type: "repulsion";
  maxDistance?: number;
  minDistance?: number;
  falloff?: "linear" | "quadratic" | "cubic";
}

export interface AttractionForceConfig extends CustomForceConfig {
  type: "attraction";
  attractorSelector?: () => boolean;
  maxDistance?: number;
  falloff?: "linear" | "quadratic";
}

export interface OrbitForceConfig extends CustomForceConfig {
  type: "orbit";
  centerSelector?: () => boolean;
  radius?: number;
  speed?: number;
  direction?: "clockwise" | "counterclockwise";
}

export interface RadialForceConfig extends CustomForceConfig {
  radius?: number;
  center?: { x: number; y: number };
}

export interface PropertyForceConfig extends CustomForceConfig {
  property?: string;
  value?: unknown;
}

export interface ClusterForceConfig extends CustomForceConfig {
  clusters?: string[];
  centerStrength?: number;
}

export interface RepulsionForceConfig extends CustomForceConfig {
  distance?: number;
  minDistance?: number;
}

export interface AttractionForceConfig extends CustomForceConfig {
  distance?: number;
  strength?: number;
}

export interface OrbitForceConfig extends CustomForceConfig {
  center?: { x: number; y: number };
  radius?: number;
  speed?: number;
}

// Execution and simulation types
export enum ExecutionMode {
  MAIN_THREAD = "main",
  WORKER_THREAD = "worker",
  AUTO = "auto"
}

export interface ForceSimulationConfig {
  nodes?: ForceNode[];
  links?: ForceLink[];
  forces?: Record<string, unknown>;
  iterations?: number;
  alpha?: number;
  alphaDecay?: number;
  velocityDecay?: number;
}

export interface ForceSimulationNode extends ForceNode {
  mass?: number;
  fixed?: boolean;
}

// Custom forces collection (stub)
export const customForces = {
  link: null,
  charge: null,
  center: null,
  collision: null,
  x: null,
  y: null
};

// Force calculation utilities
export interface ForceCalculation {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export interface ForceNode extends ForceCalculation {
  id: string;
  index?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface ForceLink {
  source: string | ForceNode;
  target: string | ForceNode;
  index?: number;
}

// Force simulation interface
export interface ForceSimulation {
  nodes(): ForceNode[];
  nodes(nodes: ForceNode[]): ForceSimulation;
  links(): ForceLink[];
  links(links: ForceLink[]): ForceSimulation;
  force(name: string): unknown;
  force(name: string, force: unknown): ForceSimulation;
  alpha(): number;
  alpha(alpha: number): ForceSimulation;
  alphaTarget(): number;
  alphaTarget(target: number): ForceSimulation;
  alphaDecay(): number;
  alphaDecay(decay: number): ForceSimulation;
  velocityDecay(): number;
  velocityDecay(decay: number): ForceSimulation;
  restart(): ForceSimulation;
  stop(): ForceSimulation;
  tick(): ForceSimulation;
  on(typenames: string, listener?: ((...args: unknown[]) => void) | null): ForceSimulation;
}

// Force creation functions (stubs)
export function createForceSimulation(_nodes?: ForceNode[]): ForceSimulation {
  throw new Error("createForceSimulation not available in graph package - use D3 directly");
}

export function createLinkForce(_links?: ForceLink[]): unknown {
  throw new Error("createLinkForce not available in graph package - use D3 directly");
}

export function createChargeForce(_strength?: number): unknown {
  throw new Error("createChargeForce not available in graph package - use D3 directly");
}

export function createCenterForce(_x?: number, _y?: number): unknown {
  throw new Error("createCenterForce not available in graph package - use D3 directly");
}

export function createCollisionForce(_radius?: number): unknown {
  throw new Error("createCollisionForce not available in graph package - use D3 directly");
}
