/**
 * Auto-simulation manager for intelligent force layout triggering
 * Framework-agnostic heuristics for determining when to start/restart simulations
 */

import type { Logger } from './force-simulation-engine.js';

export interface AutoSimulationState {
  nodeCount: number;
  isWorkerReady: boolean;
  useAnimation: boolean;
  isRunning: boolean;
}

export interface AutoSimulationDecision {
  shouldRequestRestart: boolean;
  shouldApplyLayout: boolean;
  shouldReheatLayout: boolean;
}

export interface AutoSimulationDebugState {
  nodeCount: number;
  isWorkerReady: boolean;
  useAnimation: boolean;
  hasTriggered: boolean;
  lastNodeCount: number;
  decision: AutoSimulationDecision;
}

export interface AutoSimulationManagerOptions {
  /** Do not auto-start until at least this many nodes exist */
  minNodeThreshold?: number;
  /** Optional logger for debug output */
  logger?: Logger;
  /** Optional hook for observing debug state changes */
  onDebugStateChange?: (debug: AutoSimulationDebugState) => void;
}

const DEFAULT_THRESHOLD = 5;

// No-op logger as default
const noopLogger: Logger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Encapsulates the heuristics used to automatically start or reheat the
 * force simulation when the graph content changes. Extracted so the logic can
 * be unit tested in isolation from React/UI frameworks.
 */
export class AutoSimulationManager {
  private readonly minNodeThreshold: number;
  private readonly logger: Logger;
  private readonly onDebugStateChange: ((debug: AutoSimulationDebugState) => void) | undefined;
  private hasTriggered = false;
  private lastNodeCount = 0;

  constructor(options: AutoSimulationManagerOptions = {}) {
    this.minNodeThreshold = options.minNodeThreshold ?? DEFAULT_THRESHOLD;
    this.logger = options.logger ?? noopLogger;
    this.onDebugStateChange = options.onDebugStateChange;
  }

  /**
   * Update the auto-simulation state and get decision on what action to take
   * @param state Current simulation state
   * @returns Decision object indicating what actions should be taken
   */
  update(state: AutoSimulationState): AutoSimulationDecision {
    const decision: AutoSimulationDecision = {
      shouldRequestRestart: false,
      shouldApplyLayout: false,
      shouldReheatLayout: false,
    };

    // Early exit if conditions not met
    if (!state.isWorkerReady || !state.useAnimation) {
      this.hasTriggered = false;
      this.lastNodeCount = state.nodeCount;
      this.publishDebugState(state, decision);
      return decision;
    }

    const shouldConsiderAutoStart = state.nodeCount >= this.minNodeThreshold;
    const hasNewContent = state.nodeCount > this.lastNodeCount;
    const shouldAutoStart = shouldConsiderAutoStart && (!this.hasTriggered || hasNewContent);

    this.lastNodeCount = Math.max(this.lastNodeCount, state.nodeCount);

    if (!shouldAutoStart) {
      this.publishDebugState(state, decision);
      return decision;
    }

    // Trigger auto-start
    this.hasTriggered = true;
    decision.shouldRequestRestart = true;

    if (state.isRunning) {
      decision.shouldReheatLayout = true;
    } else {
      decision.shouldApplyLayout = true;
    }

    this.logger.debug("simulation", "AutoSimulationManager generated decision", {
      state,
      decision,
      minNodeThreshold: this.minNodeThreshold,
      hasTriggered: this.hasTriggered,
      lastNodeCount: this.lastNodeCount,
    });

    this.publishDebugState(state, decision);
    return decision;
  }

  /**
   * Reset the manager state (e.g., when simulation is manually stopped)
   */
  reset(): void {
    this.hasTriggered = false;
    this.lastNodeCount = 0;
  }

  /**
   * Get debug state for current conditions
   */
  getDebugState(state: AutoSimulationState, decision: AutoSimulationDecision): AutoSimulationDebugState {
    return {
      nodeCount: state.nodeCount,
      isWorkerReady: state.isWorkerReady,
      useAnimation: state.useAnimation,
      hasTriggered: this.hasTriggered,
      lastNodeCount: this.lastNodeCount,
      decision,
    };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      minNodeThreshold: this.minNodeThreshold,
      hasTriggered: this.hasTriggered,
      lastNodeCount: this.lastNodeCount,
    };
  }

  private publishDebugState(state: AutoSimulationState, decision: AutoSimulationDecision) {
    const debug = this.getDebugState(state, decision);
    if (this.onDebugStateChange) {
      this.onDebugStateChange(debug);
    }
  }
}

/**
 * Factory function for creating auto-simulation managers
 */
export const createAutoSimulationManager = (options?: AutoSimulationManagerOptions) =>
  new AutoSimulationManager(options);