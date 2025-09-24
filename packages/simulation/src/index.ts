/**
 * @academic-explorer/simulation
 *
 * Pure force-directed graph simulation engine for Academic Explorer.
 * Framework-agnostic APIs for graph layout with D3-force integration.
 *
 * @author Joe Mearman
 * @license MIT
 */

// Core types and configuration
export * from './types/index.js';

// Event system
export * from './events/index.js';

// Utilities
export * from './utils/index.js';

// Simulation engines
export * from './engines/index.js';

// Re-export key types for convenience
export type {
  SimulationNode,
  SimulationLink,
  NodePosition,
  ForceSimulationConfig,
} from './types/index.js';

export type {
  SimulationEvent,
  SimulationProgressEvent,
  SimulationCompleteEvent,
  SimulationErrorEvent,
  SimulationEventHandler,
} from './events/index.js';

export type {
  Logger,
  ForceSimulationEngineOptions,
} from './engines/force-simulation-engine.js';

export type {
  AutoSimulationState,
  AutoSimulationDecision,
  AutoSimulationManagerOptions,
} from './engines/auto-simulation-manager.js';