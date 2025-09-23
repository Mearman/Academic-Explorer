/**
 * Main Thread Execution Strategy
 * Executes tasks directly on the main thread without workers
 */

import { logger } from "@/lib/logger";
import type { EventBus } from "@/lib/graph/events/unified-event-bus";
import type {
  ExecutionStrategy,
  TaskDescriptor,
  TaskExecutor,
  TaskExecutorRegistry
} from "./execution-strategy";
import { TaskStatus } from "./execution-strategy";

interface QueuedTask extends TaskDescriptor {
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  executor?: TaskExecutor;
}

export interface MainThreadExecutionStrategyOptions {
  maxConcurrency?: number;
  executorRegistry?: TaskExecutorRegistry;
}

/**
 * Simple task executor registry
 */
export class SimpleTaskExecutorRegistry implements TaskExecutorRegistry {
  private executors = new Map<string, TaskExecutor>();

  register(taskType: string, executor: TaskExecutor): void {
    logger.debug("execution", "Registering task executor", { taskType });
    this.executors.set(taskType, executor);
  }

  get(taskType: string): TaskExecutor | undefined {
    return this.executors.get(taskType);
  }

  has(taskType: string): boolean {
    return this.executors.has(taskType);
  }

  clear(): void {
    logger.debug("execution", "Clearing all task executors");
    this.executors.clear();
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}

/**
 * Main thread execution strategy - executes tasks directly without workers
 */
export class MainThreadExecutionStrategy implements ExecutionStrategy {
  private queue: QueuedTask[] = [];
  private activeTasks = new Map<string, QueuedTask>();
  private processing = false;
  private readonly maxConcurrency: number;
  private readonly executorRegistry: TaskExecutorRegistry;

  readonly supportsWorkers = false;
  readonly mode = "main-thread" as const;

  constructor(
    private bus: EventBus,
    options: MainThreadExecutionStrategyOptions = {}
  ) {
    this.maxConcurrency = options.maxConcurrency ?? 1;
    this.executorRegistry = options.executorRegistry ?? new SimpleTaskExecutorRegistry();

    logger.debug("execution", "MainThreadExecutionStrategy initialized", {
      maxConcurrency: this.maxConcurrency
    });
  }

  async submitTask(task: TaskDescriptor): Promise<string> {
    logger.debug("execution", "Submitting task to main thread", {
      taskId: task.id,
      payloadType: task.payload && typeof task.payload === "object" && "type" in task.payload
        ? task.payload.type
        : "unknown"
    });

    // Get executor for the task type
    const taskType = task.payload && typeof task.payload === "object" && "type" in task.payload
      ? String(task.payload.type)
      : "unknown";

    const executor = this.executorRegistry.get(taskType);
    if (!executor) {
      const error = `No executor registered for task type: ${taskType}`;
      logger.error("execution", error, { taskId: task.id, taskType });

      // Emit error event
      this.bus.emit({
        type: "TASK_FAILED",
        payload: {
          id: task.id,
          error,
          duration: 0,
          executedBy: "main"
        }
      });

      throw new Error(error);
    }

    // Create queued task
    const queuedTask: QueuedTask = {
      ...task,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      executor
    };

    // Insert based on priority (higher priority first)
    const priority = task.priority ?? 0;
    const insertIndex = this.queue.findIndex(t => (t.priority ?? 0) < priority);

    if (insertIndex === -1) {
      this.queue.push(queuedTask);
    } else {
      this.queue.splice(insertIndex, 0, queuedTask);
    }

    logger.debug("execution", "Task enqueued", {
      taskId: task.id,
      priority,
      queueLength: this.queue.length
    });

    this.bus.emit({
      type: "TASK_ENQUEUED",
      payload: { id: task.id, queueLength: this.queue.length }
    });

    // Start processing if not already running
    void this.process();

    return task.id;
  }

  cancelTask(taskId: string): boolean {
    // Check if task is in queue
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.queue[queueIndex];
      task.status = TaskStatus.CANCELLED;
      this.queue.splice(queueIndex, 1);

      this.bus.emit({
        type: "TASK_CANCELLED",
        payload: { id: taskId, reason: "cancelled_before_execution" }
      });

      logger.debug("execution", "Task cancelled from queue", { taskId });
      return true;
    }

    // Check if task is currently running
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.status = TaskStatus.CANCELLED;
      this.activeTasks.delete(taskId);

      this.bus.emit({
        type: "TASK_CANCELLED",
        payload: { id: taskId, reason: "cancelled_during_execution" }
      });

      logger.debug("execution", "Active task cancelled", { taskId });
      return true;
    }

    return false;
  }

  getTaskStatus(taskId: string): TaskStatus | null {
    // Check active tasks first
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      return activeTask.status;
    }

    // Check queued tasks
    const queuedTask = this.queue.find(t => t.id === taskId);
    if (queuedTask) {
      return queuedTask.status;
    }

    return null;
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeTasks: this.activeTasks.size,
      processing: this.processing,
      maxConcurrency: this.maxConcurrency,
      totalWorkers: 0, // No workers in main thread strategy
      idleWorkers: 0,
      busyWorkers: 0
    };
  }

  clear(): void {
    const cancelledCount = this.queue.length;

    // Cancel all queued tasks
    for (const task of this.queue) {
      task.status = TaskStatus.CANCELLED;
    }
    this.queue = [];

    // Cancel all active tasks
    for (const [, task] of this.activeTasks.entries()) {
      task.status = TaskStatus.CANCELLED;
    }
    this.activeTasks.clear();

    logger.debug("execution", "Main thread strategy cleared", { cancelledCount });

    this.bus.emit({
      type: "QUEUE_CLEARED",
      payload: { cancelledCount }
    });
  }

  shutdown(): void {
    logger.debug("execution", "Shutting down main thread execution strategy");
    this.clear();
  }

  /**
   * Get the executor registry for registering task handlers
   */
  getExecutorRegistry(): TaskExecutorRegistry {
    return this.executorRegistry;
  }

  /**
   * Process the task queue
   */
  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0 && this.activeTasks.size < this.maxConcurrency) {
        const task = this.queue.shift();
        if (!task || task.status === TaskStatus.CANCELLED) {
          continue;
        }

        // Start processing the task
        void this.executeTask(task);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: QueuedTask): Promise<void> {
    if (!task.executor) {
      logger.error("execution", "Task has no executor", { taskId: task.id });
      return;
    }

    task.status = TaskStatus.RUNNING;
    task.startedAt = Date.now();
    this.activeTasks.set(task.id, task);

    logger.debug("execution", "Starting task execution", { taskId: task.id });

    this.bus.emit({
      type: "TASK_STARTED",
      payload: { id: task.id }
    });

    try {
      // Create emit function for the task to report progress
      const emit = (event: { type: string; payload?: unknown }) => {
        if (event.type === "PROGRESS") {
          const payloadExtension = event.payload &&
            typeof event.payload === "object" &&
            !Array.isArray(event.payload) &&
            event.payload !== null
            ? Object.fromEntries(Object.entries(event.payload).filter(([key, value]) =>
                typeof key === "string" && value !== undefined
              ))
            : {};

          this.bus.emit({
            type: "TASK_PROGRESS",
            payload: {
              id: task.id,
              ...payloadExtension
            }
          });
        } else {
          this.bus.emit(event);
        }
      };

      let result: unknown;

      // Execute with timeout if specified
      if (task.timeout) {
        result = await Promise.race([
          task.executor(task.payload, emit),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Task timeout after ${String(task.timeout)}ms`));
            }, task.timeout);
          })
        ]);
      } else {
        result = await task.executor(task.payload, emit);
      }

      // Task completed successfully
      task.status = TaskStatus.COMPLETED;
      task.completedAt = Date.now();

      const taskResult = {
        id: task.id,
        result,
        duration: task.completedAt - (task.startedAt ?? task.createdAt),
        executedBy: "main" as const
      };

      this.bus.emit({
        type: "TASK_COMPLETED",
        payload: taskResult
      });

      logger.debug("execution", "Task completed successfully", {
        taskId: task.id,
        duration: taskResult.duration
      });

    } catch (error) {
      // Task failed
      task.status = TaskStatus.FAILED;
      task.completedAt = Date.now();

      const errorMessage = error instanceof Error ? error.message : String(error);
      const taskResult = {
        id: task.id,
        error: errorMessage,
        duration: task.completedAt - (task.startedAt ?? task.createdAt),
        executedBy: "main" as const
      };

      this.bus.emit({
        type: "TASK_FAILED",
        payload: taskResult
      });

      logger.error("execution", "Task failed", {
        taskId: task.id,
        error: errorMessage,
        duration: taskResult.duration
      });
    } finally {
      this.activeTasks.delete(task.id);

      // Continue processing remaining tasks
      void this.process();
    }
  }
}