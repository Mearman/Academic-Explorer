import { describe, it, expect } from "vitest";
import { AutoSimulationManager } from "./auto-simulation-manager";

const baseState = {
  nodeCount: 0,
  isWorkerReady: true,
  useAnimation: true,
  isRunning: false,
};

describe("AutoSimulationManager", () => {
  it("should not trigger when worker is not ready", () => {
    const manager = new AutoSimulationManager();
    const decision = manager.update({ ...baseState, isWorkerReady: false });
    expect(decision.shouldRequestRestart).toBe(false);
    expect(decision.shouldApplyLayout).toBe(false);
    expect(decision.shouldReheatLayout).toBe(false);
  });

  it("should trigger apply when enough nodes are present and simulation not running", () => {
    const manager = new AutoSimulationManager({ minNodeThreshold: 2 });
    const decision = manager.update({ ...baseState, nodeCount: 3 });
    expect(decision.shouldRequestRestart).toBe(true);
    expect(decision.shouldApplyLayout).toBe(true);
    expect(decision.shouldReheatLayout).toBe(false);
  });

  it("should trigger reheat when simulation already running", () => {
    const manager = new AutoSimulationManager({ minNodeThreshold: 2 });
    const decision = manager.update({ ...baseState, nodeCount: 5, isRunning: true });
    expect(decision.shouldRequestRestart).toBe(true);
    expect(decision.shouldApplyLayout).toBe(false);
    expect(decision.shouldReheatLayout).toBe(true);
  });

  it("should only trigger once until node count increases", () => {
    const manager = new AutoSimulationManager({ minNodeThreshold: 2 });
    const first = manager.update({ ...baseState, nodeCount: 3 });
    expect(first.shouldRequestRestart).toBe(true);

    const second = manager.update({ ...baseState, nodeCount: 3 });
    expect(second.shouldRequestRestart).toBe(false);

    const third = manager.update({ ...baseState, nodeCount: 4 });
    expect(third.shouldRequestRestart).toBe(true);
  });

  it("should reset trigger when worker becomes unavailable", () => {
    const manager = new AutoSimulationManager({ minNodeThreshold: 2 });
    manager.update({ ...baseState, nodeCount: 4 });

    manager.update({ ...baseState, isWorkerReady: false, nodeCount: 4 });

    const decision = manager.update({ ...baseState, nodeCount: 4 });
    expect(decision.shouldRequestRestart).toBe(true);
  });

  it("should provide debug state", () => {
    let lastDebug: ReturnType<AutoSimulationManager["getDebugState"]> | null = null;
    const manager = new AutoSimulationManager({
      minNodeThreshold: 2,
      onDebugStateChange: (debug) => {
        lastDebug = debug;
      },
    });

    const decision = manager.update({ ...baseState, nodeCount: 3 });
    expect(lastDebug).not.toBeNull();
    expect(lastDebug?.decision).toEqual(decision);
  });
});
