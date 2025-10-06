/**
 * Execution Strategy Implementation
 * Provides unified execution system for task execution
 */

import { createLocalEventBus, type Event } from "../events";
import { logger } from "@academic-explorer/utils";

// Execution modes
export enum ExecutionMode {
  MAIN_THREAD = "main-thread",
  WORKER = "worker-thread",
}
// Task execution types
export interface Task {
  id: string;
  payload: unknown;
}

export interface TaskResult {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface TaskStats {
  queueLength: number;
  activeTasks: number;
  processing: boolean;
  maxConcurrency: number;
  totalWorkers: number;
}

// Task executor interface
export interface TaskExecutor {
  (
    payload: unknown,
    progressCallback: (event: unknown) => void,
  ): Promise<unknown>;
}

// Task executor registry
export class SimpleTaskExecutorRegistry {
  private executors = new Map<string, TaskExecutor>();

  register(entityType: string, executor: TaskExecutor): void {
    this.executors.set(entityType, executor);
  }

  get(entityType: string): TaskExecutor | undefined {
    return this.executors.get(entityType);
  }

  has(entityType: string): boolean {
    return this.executors.has(entityType);
  }

  clear(): void {
    this.executors.clear();
  }
}

// Execution strategy base class
export abstract class BaseExecutionStrategy {
  protected bus: ReturnType<typeof createLocalEventBus>;
  protected registry: SimpleTaskExecutorRegistry;
  protected maxConcurrency: number;
  protected activeTasks = 0;
  protected taskQueue: Task[] = [];
  protected processing = false;
  protected destroyed = false;
  protected cancelledTasks = new Set<string>();

  constructor(
    bus: ReturnType<typeof createLocalEventBus>,
    options: {
      maxConcurrency?: number;
      executorRegistry?: SimpleTaskExecutorRegistry;
    } = {},
  ) {
    this.bus = bus;
    this.maxConcurrency = options.maxConcurrency || 1;
    this.registry =
      options.executorRegistry || new SimpleTaskExecutorRegistry();

    this.bus.on("TASK_COMPLETED", this.onTaskCompleted.bind(this));
    this.bus.on("TASK_FAILED", this.onTaskFailed.bind(this));
  }

  abstract get mode(): string;
  abstract get supportsWorkers(): boolean;

  async submitTask(task: Task): Promise<string> {
    if (this.destroyed) {
      throw new Error("Strategy has been shut down");
    }

    this.taskQueue.push(task);
    this.bus.emit({
      type: "TASK_ENQUEUED",
      payload: { id: task.id, payload: task.payload },
    });

    this.processQueue();
    return task.id;
  }

  cancelTask(taskId: string): boolean {
    const index = this.taskQueue.findIndex((task) => task.id === taskId);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
      this.cancelledTasks.add(taskId);
      this.bus.emit({ type: "TASK_CANCELLED", payload: { id: taskId } });
      return true;
    }
    return false;
  }

  getTaskStatus(taskId: string): string | undefined {
    const inQueue = this.taskQueue.some((task) => task.id === taskId);
    if (inQueue) return "queued";

    if (this.cancelledTasks.has(taskId)) return "cancelled";

    // In a real implementation, we'd track active tasks
    return undefined;
  }

  getStats(): TaskStats {
    return {
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks,
      processing: this.processing,
      maxConcurrency: this.maxConcurrency,
      totalWorkers: this.supportsWorkers ? 1 : 0,
    };
  }

  shutdown(): void {
    this.destroyed = true;
    this.taskQueue.length = 0;
    this.processing = false;
    this.cancelledTasks.clear();
    this.bus.close();
  }

  protected abstract executeTask(task: Task): Promise<void>;

  protected processQueue(): void {
    if (this.destroyed || this.activeTasks >= this.maxConcurrency) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    this.processing = true;
    this.activeTasks++;
    this.bus.emit({ type: "TASK_STARTED", payload: { id: task.id } });

    this.executeTask(task).finally(() => {
      this.activeTasks--;
      this.processing = false;
      this.processQueue();
    });
  }

  private onTaskCompleted(_event: Event): void {
    // Handle completion if needed
  }

  private onTaskFailed(_event: Event): void {
    // Handle failure if needed
  }
}

// Main thread execution strategy
export class MainThreadExecutionStrategy extends BaseExecutionStrategy {
  get mode(): string {
    return "main-thread";
  }

  get supportsWorkers(): boolean {
    return false;
  }

  protected async executeTask(task: Task): Promise<void> {
    try {
      const payload = task.payload;
      const entityType =
        typeof payload === "object" &&
        payload !== null &&
        "entityType" in payload
          ? (payload as { entityType: string }).entityType
          : undefined;

      if (!entityType) {
        throw new Error(`Task payload missing required entityType field`);
      }

      const executor = this.registry.get(entityType);
      if (!executor) {
        throw new Error(
          `No executor registered for task entityType: ${entityType}`,
        );
      }

      const result = await executor(task.payload, (event) => {
        this.bus.emit({
          type: "TASK_PROGRESS",
          payload: { id: task.id, ...(event as Record<string, unknown>) },
        });
      });

      this.bus.emit({
        type: "TASK_COMPLETED",
        payload: { id: task.id, result },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.bus.emit({
        type: "TASK_FAILED",
        payload: {
          id: task.id,
          error: errorMessage,
          executedBy: "main",
        },
      });
    }
  }
}

// Execution strategy factory
export async function createExecutionStrategy(
  bus: ReturnType<typeof createLocalEventBus>,
  options: {
    mode?: "main-thread" | "worker-thread";
    maxConcurrency?: number;
    executorRegistry?: SimpleTaskExecutorRegistry;
    workerModule?: string;
  } = {},
): Promise<BaseExecutionStrategy> {
  const {
    mode = "main-thread",
    maxConcurrency = 1,
    executorRegistry,
  } = options;

  switch (mode) {
    case "main-thread":
      return new MainThreadExecutionStrategy(bus, {
        maxConcurrency,
        executorRegistry,
      });

    case "worker-thread":
      // For now, fallback to main thread if worker module is not available
      if (!options.workerModule) {
        logger.warn(
          "execution-strategy",
          "Worker module not specified, falling back to main thread execution",
        );
        return new MainThreadExecutionStrategy(bus, {
          maxConcurrency,
          executorRegistry,
        });
      }
      throw new Error("Worker execution not implemented yet");

    default:
      throw new Error(`Unknown execution mode: ${mode}`);
  }
}

// Worker support detection
export async function detectWorkerSupport(): Promise<boolean> {
  // In Node.js/test environment, workers might not be available
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return false;
  }

  // Check if we can create a worker
  try {
    // This is a basic check - in practice you'd test with an actual worker
    return true;
  } catch {
    return false;
  }
}
