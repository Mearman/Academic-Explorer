/**
 * Execution Strategy Tests
 * Tests both worker and main-thread execution strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createLocalEventBus } from "@academic-explorer/graph";
import {
  MainThreadExecutionStrategy,
  SimpleTaskExecutorRegistry,
  createExecutionStrategy,
  detectWorkerSupport,
  ExecutionMode
} from "@academic-explorer/graph";
import type { TaskExecutor } from "@academic-explorer/graph";

describe("MainThreadExecutionStrategy", () => {
  let bus: ReturnType<typeof createLocalEventBus>;
  let registry: SimpleTaskExecutorRegistry;
  let strategy: MainThreadExecutionStrategy;

  beforeEach(() => {
    bus = createLocalEventBus();
    registry = new SimpleTaskExecutorRegistry();
    strategy = new MainThreadExecutionStrategy(bus, {
      maxConcurrency: 2,
      executorRegistry: registry
    });
  });

  afterEach(() => {
    strategy.shutdown();
    bus.destroy();
  });

  it("should initialize correctly", () => {
    expect(strategy.supportsWorkers).toBe(false);
    expect(strategy.mode).toBe("main-thread");

    const stats = strategy.getStats();
    expect(stats.queueLength).toBe(0);
    expect(stats.activeTasks).toBe(0);
    expect(stats.processing).toBe(false);
    expect(stats.maxConcurrency).toBe(2);
    expect(stats.totalWorkers).toBe(0);
  });

  it("should execute tasks with registered executors", async () => {
    const mockExecutor: TaskExecutor = vi.fn().mockResolvedValue("test-result");
    registry.register("TEST_TASK", mockExecutor);

    const taskId = await strategy.submitTask({
      id: "test-task-1",
      payload: { type: "TEST_TASK", data: "test" }
    });

    expect(taskId).toBe("test-task-1");

    // Wait a bit for task execution
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockExecutor).toHaveBeenCalledWith(
      { type: "TEST_TASK", data: "test" },
      expect.any(Function)
    );
  });

  it("should emit events during task execution", async () => {
    const mockExecutor: TaskExecutor = vi.fn().mockResolvedValue("success");
    registry.register("TEST_TASK", mockExecutor);

    const events: Array<{ type: string; payload?: unknown }> = [];
    bus.on("TASK_ENQUEUED", (event) => events.push(event));
    bus.on("TASK_STARTED", (event) => events.push(event));
    bus.on("TASK_COMPLETED", (event) => events.push(event));

    await strategy.submitTask({
      id: "test-task-1",
      payload: { type: "TEST_TASK" }
    });

    // Wait for task execution
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("TASK_ENQUEUED");
    expect(events[1].type).toBe("TASK_STARTED");
    expect(events[2].type).toBe("TASK_COMPLETED");
  });

  it("should handle task failures", async () => {
    const error = new Error("Task failed");
    const mockExecutor: TaskExecutor = vi.fn().mockRejectedValue(error);
    registry.register("FAILING_TASK", mockExecutor);

    const events: Array<{ type: string; payload?: unknown }> = [];
    bus.on("TASK_FAILED", (event) => events.push(event));

    await strategy.submitTask({
      id: "failing-task-1",
      payload: { type: "FAILING_TASK" }
    });

    // Wait for task execution
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("TASK_FAILED");
    expect(events[0].payload).toMatchObject({
      id: "failing-task-1",
      error: "Task failed",
      executedBy: "main"
    });
  });

  it("should handle missing executors", async () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    bus.on("TASK_FAILED", (event) => events.push(event));

    await expect(strategy.submitTask({
      id: "unknown-task-1",
      payload: { type: "UNKNOWN_TASK" }
    })).rejects.toThrow("No executor registered for task type: UNKNOWN_TASK");

    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({
      id: "unknown-task-1",
      error: "No executor registered for task type: UNKNOWN_TASK"
    });
  });

  it("should cancel tasks", async () => {
    const mockExecutor: TaskExecutor = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    registry.register("SLOW_TASK", mockExecutor);

    const taskId = await strategy.submitTask({
      id: "slow-task-1",
      payload: { type: "SLOW_TASK" }
    });

    const cancelled = strategy.cancelTask(taskId);
    expect(cancelled).toBe(true);

    const status = strategy.getTaskStatus(taskId);
    expect(status).toBe("cancelled");
  });

  it("should respect maxConcurrency", async () => {
    const resolvers: Array<(value: unknown) => void> = [];
    const mockExecutor: TaskExecutor = vi.fn().mockImplementation(
      () => new Promise(resolve => resolvers.push(resolve))
    );
    registry.register("CONCURRENT_TASK", mockExecutor);

    // Submit 3 tasks when maxConcurrency is 2
    await strategy.submitTask({
      id: "concurrent-1",
      payload: { type: "CONCURRENT_TASK" }
    });
    await strategy.submitTask({
      id: "concurrent-2",
      payload: { type: "CONCURRENT_TASK" }
    });
    await strategy.submitTask({
      id: "concurrent-3",
      payload: { type: "CONCURRENT_TASK" }
    });

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 10));

    const stats = strategy.getStats();
    expect(stats.activeTasks).toBe(2); // maxConcurrency
    expect(stats.queueLength).toBe(1); // One waiting

    // Complete one task
    resolvers[0]("done");
    await new Promise(resolve => setTimeout(resolve, 10));

    const statsAfter = strategy.getStats();
    expect(statsAfter.activeTasks).toBe(2); // Still 2 active (third started)
    expect(statsAfter.queueLength).toBe(0); // Queue empty

    // Complete remaining tasks
    resolvers.forEach(resolve => resolve("done"));
  });
});

describe("ExecutionFactory", () => {
  it("should detect worker support", async () => {
    const supported = await detectWorkerSupport();
    // This will depend on the test environment
    expect(typeof supported).toBe("boolean");
  });

  it("should create main thread strategy when workers disabled", async () => {
    const bus = createLocalEventBus();

    const strategy = await createExecutionStrategy(bus, {
      mode: ExecutionMode.MAIN_THREAD
    });

    expect(strategy.mode).toBe("main-thread");
    expect(strategy.supportsWorkers).toBe(false);

    strategy.shutdown();
    bus.destroy();
  });

  it("should fallback to main thread when worker module missing", async () => {
    const bus = createLocalEventBus();

    const strategy = await createExecutionStrategy(bus, {
      mode: ExecutionMode.WORKER
      // No workerModule provided
    });

    expect(strategy.mode).toBe("main-thread");
    expect(strategy.supportsWorkers).toBe(false);

    strategy.shutdown();
    bus.destroy();
  });
});

describe("SimpleTaskExecutorRegistry", () => {
  let registry: SimpleTaskExecutorRegistry;

  beforeEach(() => {
    registry = new SimpleTaskExecutorRegistry();
  });

  it("should register and retrieve executors", () => {
    const executor: TaskExecutor = vi.fn();

    registry.register("TEST_TYPE", executor);

    expect(registry.has("TEST_TYPE")).toBe(true);
    expect(registry.get("TEST_TYPE")).toBe(executor);
    expect(registry.has("UNKNOWN_TYPE")).toBe(false);
    expect(registry.get("UNKNOWN_TYPE")).toBeUndefined();
  });

  it("should clear all executors", () => {
    const executor1: TaskExecutor = vi.fn();
    const executor2: TaskExecutor = vi.fn();

    registry.register("TYPE_1", executor1);
    registry.register("TYPE_2", executor2);

    expect(registry.has("TYPE_1")).toBe(true);
    expect(registry.has("TYPE_2")).toBe(true);

    registry.clear();

    expect(registry.has("TYPE_1")).toBe(false);
    expect(registry.has("TYPE_2")).toBe(false);
  });
});