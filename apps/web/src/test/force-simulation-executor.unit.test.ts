/**
 * Force Simulation Executor Tests
 * Tests the main thread force simulation executor
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createForceSimulationExecutor } from "@academic-explorer/graph";
import type { ForceSimulationTask } from "@academic-explorer/graph";
import type {
  ForceSimulationNode,
  ForceSimulationLink,
} from "@academic-explorer/graph";

describe("ForceSimulationExecutor", () => {
  let executor: ReturnType<typeof createForceSimulationExecutor>;
  let emitSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    executor = createForceSimulationExecutor();
    emitSpy = vi.fn();
  });

  const createTestNodes = (): ForceSimulationNode[] => [
    { id: "node1", x: 0, y: 0 },
    { id: "node2", x: 100, y: 100 },
    { id: "node3", x: -50, y: 50 },
  ];

  const createTestLinks = (): ForceSimulationLink[] => [
    { id: "link1", source: "node1", target: "node2" },
    { id: "link2", source: "node2", target: "node3" },
  ];

  it("should handle FORCE_SIMULATION_START task", async () => {
    const task: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
      pinnedNodes: ["node1"],
    };

    const result = await executor(task, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_START",
      status: "ok",
    });

    // Should emit progress events during simulation
    expect(emitSpy).toHaveBeenCalled();
    const progressCalls = emitSpy.mock.calls.filter(
      (call) =>
        call[0]?.type === "PROGRESS" &&
        call[0]?.payload?.type === "worker:force-simulation-progress",
    );
    expect(progressCalls.length).toBeGreaterThan(0);
  });

  it("should handle FORCE_SIMULATION_STOP task", async () => {
    // Start a simulation first
    const startTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
    };
    await executor(startTask, emitSpy);

    emitSpy.mockClear();

    // Stop the simulation
    const stopTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_STOP",
    };

    const result = await executor(stopTask, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_STOP",
      status: "ok",
    });
  });

  it("should handle FORCE_SIMULATION_PAUSE task", async () => {
    // Start a simulation first
    const startTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
    };
    await executor(startTask, emitSpy);

    emitSpy.mockClear();

    // Pause the simulation
    const pauseTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_PAUSE",
    };

    const result = await executor(pauseTask, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_PAUSE",
      status: "ok",
    });
  });

  it("should handle FORCE_SIMULATION_RESUME task", async () => {
    // Start and pause a simulation first
    const startTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
    };
    await executor(startTask, emitSpy);

    const pauseTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_PAUSE",
    };
    await executor(pauseTask, emitSpy);

    emitSpy.mockClear();

    // Resume the simulation
    const resumeTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_RESUME",
    };

    const result = await executor(resumeTask, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_RESUME",
      status: "ok",
    });
  });

  it("should handle FORCE_SIMULATION_UPDATE_PARAMETERS task", async () => {
    // Start a simulation first
    const startTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
    };
    await executor(startTask, emitSpy);

    emitSpy.mockClear();

    // Update parameters
    const updateTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_UPDATE_PARAMETERS",
      config: {
        linkStrength: 0.5,
        chargeStrength: -100,
      },
    };

    const result = await executor(updateTask, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_UPDATE_PARAMETERS",
      status: "ok",
    });
  });

  it("should handle FORCE_SIMULATION_REHEAT task", async () => {
    const reheatTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_REHEAT",
      nodes: createTestNodes(),
      links: createTestLinks(),
      alpha: 0.8,
      pinnedNodes: ["node2"],
    };

    const result = await executor(reheatTask, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_REHEAT",
      status: "ok",
      nodeCount: 3,
      linkCount: 2,
      alpha: 0.8,
    });

    // Should emit progress events
    expect(emitSpy).toHaveBeenCalled();
  });

  it("should handle FORCE_SIMULATION_UPDATE_LINKS task", async () => {
    // Start a simulation first
    const startTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
    };
    await executor(startTask, emitSpy);

    emitSpy.mockClear();

    // Update links
    const newLinks: ForceSimulationLink[] = [
      { id: "link1", source: "node1", target: "node2" },
      { id: "link3", source: "node1", target: "node3" },
    ];

    const updateLinksTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_UPDATE_LINKS",
      links: newLinks,
      alpha: 0.7,
    };

    const result = await executor(updateLinksTask, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_UPDATE_LINKS",
      status: "ok",
      linkCount: 2,
      alpha: 0.7,
    });
  });

  it("should handle FORCE_SIMULATION_UPDATE_NODES task", async () => {
    // Start a simulation first
    const startTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
    };
    await executor(startTask, emitSpy);

    emitSpy.mockClear();

    // Update nodes
    const updatedNodes = [
      ...createTestNodes(),
      { id: "node4", entityType: "topics", x: 200, y: 200 },
    ];

    const updateNodesTask: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_UPDATE_NODES",
      nodes: updatedNodes,
      pinnedNodes: ["node1", "node4"],
      alpha: 0.6,
    };

    const result = await executor(updateNodesTask, emitSpy);

    expect(result).toMatchObject({
      entityType: "FORCE_SIMULATION_CONTROL_ACK",
      action: "FORCE_SIMULATION_UPDATE_NODES",
      status: "ok",
      nodeCount: 4,
      pinnedCount: 2,
      alpha: 0.6,
    });
  });

  it("should reject invalid task types", async () => {
    const invalidTask = {
      entityType: "INVALID_TASK_TYPE" as any,
    };

    await expect(executor(invalidTask, emitSpy)).rejects.toThrow(
      "Unknown force simulation task entityType: INVALID_TASK_TYPE",
    );
  });

  it("should reject invalid payloads", async () => {
    await expect(executor(null as any, emitSpy)).rejects.toThrow(
      "Invalid force simulation task payload",
    );

    await expect(executor("invalid" as any, emitSpy)).rejects.toThrow(
      "Invalid force simulation task payload",
    );

    await expect(executor({} as any, emitSpy)).rejects.toThrow(
      "Invalid force simulation task payload",
    );
  });

  it("should emit progress events with correct structure", async () => {
    const task: ForceSimulationTask = {
      entityType: "FORCE_SIMULATION_START",
      nodes: createTestNodes(),
      links: createTestLinks(),
    };

    await executor(task, emitSpy);

    // Check that progress events have the correct structure
    const progressCalls = emitSpy.mock.calls.filter(
      (call) =>
        call[0]?.type === "PROGRESS" &&
        call[0]?.payload?.type === "worker:force-simulation-progress",
    );

    expect(progressCalls.length).toBeGreaterThan(0);

    const progressEvent = progressCalls[0][0];
    expect(progressEvent.payload).toMatchObject({
      entityType: "worker:force-simulation-progress",
      workerId: "main-thread",
      workerType: "force-animation",
      messageType: expect.any(String),
      timestamp: expect.any(Number),
    });
  });
});
