import { logger } from "@/lib/logger";

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
  /** Optional hook for observing debug state changes */
  onDebugStateChange?: (debug: AutoSimulationDebugState) => void;
}

const DEFAULT_THRESHOLD = 5;

/**
 * Encapsulates the heuristics used to automatically start or reheat the
 * force simulation when the graph content changes. Extracted so the logic can
 * be unit tested in isolation from React/Playwright.
 */
export class AutoSimulationManager {
  private readonly minNodeThreshold: number;
  private readonly onDebugStateChange?: (debug: AutoSimulationDebugState) => void;
  private hasTriggered = false;
  private lastNodeCount = 0;

  constructor(options: AutoSimulationManagerOptions = {}) {
    this.minNodeThreshold = options.minNodeThreshold ?? DEFAULT_THRESHOLD;
    this.onDebugStateChange = options.onDebugStateChange;
  }

  update(state: AutoSimulationState): AutoSimulationDecision {
    const decision: AutoSimulationDecision = {
      shouldRequestRestart: false,
      shouldApplyLayout: false,
      shouldReheatLayout: false,
    };

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

    this.hasTriggered = true;
    decision.shouldRequestRestart = true;

    if (state.isRunning) {
      decision.shouldReheatLayout = true;
    } else {
      decision.shouldApplyLayout = true;
    }

    logger.debug("graph", "AutoSimulationManager generated decision", {
      state,
      decision,
      minNodeThreshold: this.minNodeThreshold,
      hasTriggered: this.hasTriggered,
      lastNodeCount: this.lastNodeCount,
    }, "AutoSimulationManager");

    this.publishDebugState(state, decision);
    return decision;
  }

  reset(): void {
    this.hasTriggered = false;
    this.lastNodeCount = 0;
  }

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

  private publishDebugState(state: AutoSimulationState, decision: AutoSimulationDecision) {
    const debug = this.getDebugState(state, decision);
    if (this.onDebugStateChange) {
      this.onDebugStateChange(debug);
    }
  }
}

export const createAutoSimulationManager = (options?: AutoSimulationManagerOptions) => new AutoSimulationManager(options);
