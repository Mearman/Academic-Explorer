/**
 * Unified Task Queue
 * Manages task execution either in workers or on the main thread
 * Based on the ChatGPT document specification for unified task management
 */

import { logger } from "@/lib/logger";
import { EventBus } from "./unified-event-bus";
import { z } from "zod";

export interface TaskDescriptor {
  id: string;
  payload: unknown;
  execute?: (payload: unknown, emit: (event: { type: string; payload?: unknown }) => void) => Promise<unknown>;
  workerModule?: string;
  priority?: number;
  timeout?: number;
}

export interface TaskResult {
  id: string;
  result?: unknown;
  error?: string;
  duration: number;
  executedBy: "main" | "worker";
}

export interface TaskProgress {
  id: string;
  progress: number;
  message?: string;
  stage?: string;
}

export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

interface QueuedTask extends TaskDescriptor {
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  worker?: Worker;
}

/**
 * TaskQueue manages sequential execution of tasks either in workers or on main thread
 * Tasks can be defined with either a workerModule path or an execute() function
 */
export class TaskQueue {
  private queue: QueuedTask[] = [];
  private processing = false;
  private readonly maxConcurrency: number;
  private activeTasks = new Map<string, QueuedTask>();

  constructor(
    private bus: EventBus,
    options: {
      maxConcurrency?: number;
    } = {}
  ) {
    this.maxConcurrency = options.maxConcurrency || 1;

    logger.debug("taskqueue", "TaskQueue initialized", {
      maxConcurrency: this.maxConcurrency,
      hasBus: !!bus
    });
  }

  /**
   * Add a task to the queue
   */
  enqueue(task: TaskDescriptor): string {
    const queuedTask: QueuedTask = {
      ...task,
      status: TaskStatus.PENDING,
      createdAt: Date.now()
    };

    // Insert based on priority (higher priority first)
    const priority = task.priority || 0;
    const insertIndex = this.queue.findIndex(t => (t.priority || 0) < priority);

    if (insertIndex === -1) {
      this.queue.push(queuedTask);
    } else {
      this.queue.splice(insertIndex, 0, queuedTask);
    }

    logger.debug("taskqueue", "Task enqueued", {
      taskId: task.id,
      priority,
      queueLength: this.queue.length,
      hasWorkerModule: !!task.workerModule,
      hasExecute: !!task.execute
    });

    this.bus.emit({
      type: "TASK_ENQUEUED",
      payload: { id: task.id, queueLength: this.queue.length }
    });

    // Start processing if not already running
    this.process();

    return task.id;
  }

  /**
   * Cancel a task by ID
   */
  cancel(taskId: string): boolean {
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

      logger.debug("taskqueue", "Task cancelled from queue", { taskId });
      return true;
    }

    // Check if task is currently running
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.status = TaskStatus.CANCELLED;

      // Terminate worker if it exists
      if (activeTask.worker) {
        activeTask.worker.terminate();
        activeTask.worker = undefined;
      }

      this.activeTasks.delete(taskId);

      this.bus.emit({
        type: "TASK_CANCELLED",
        payload: { id: taskId, reason: "cancelled_during_execution" }
      });

      logger.debug("taskqueue", "Active task cancelled", { taskId });
      return true;
    }

    return false;
  }

  /**
   * Get status of a specific task
   */
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

  /**
   * Get queue statistics
   */
  getStats(): {
    queueLength: number;
    activeTasks: number;
    processing: boolean;
    maxConcurrency: number;
  } {
    return {
      queueLength: this.queue.length,
      activeTasks: this.activeTasks.size,
      processing: this.processing,
      maxConcurrency: this.maxConcurrency
    };
  }

  /**
   * Clear all pending tasks
   */
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
      if (task.worker) {
        task.worker.terminate();
      }
    }
    this.activeTasks.clear();

    logger.debug("taskqueue", "Queue cleared", {
      cancelledCount,
      activeTasksCancelled: this.activeTasks.size
    });

    this.bus.emit({
      type: "QUEUE_CLEARED",
      payload: { cancelledCount }
    });
  }

  /**
   * Process the task queue
   */
  private process(): void {
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
    task.status = TaskStatus.RUNNING;
    task.startedAt = Date.now();
    this.activeTasks.set(task.id, task);

    logger.debug("taskqueue", "Starting task execution", {
      taskId: task.id,
      hasWorkerModule: !!task.workerModule,
      hasExecute: !!task.execute
    });

    this.bus.emit({
      type: "TASK_STARTED",
      payload: { id: task.id }
    });

    try {
      let result: unknown;
      let executedBy: "main" | "worker";

      if (task.workerModule) {
        result = await this.runInWorker(task);
        executedBy = "worker";
      } else if (task.execute) {
        result = await this.runOnMainThread(task);
        executedBy = "main";
      } else {
        throw new Error("Task must have either workerModule or execute function");
      }

      // Task completed successfully
      task.status = TaskStatus.COMPLETED;
      task.completedAt = Date.now();

      const taskResult: TaskResult = {
        id: task.id,
        result,
        duration: task.completedAt - (task.startedAt || task.createdAt),
        executedBy
      };

      this.bus.emit({
        type: "TASK_COMPLETED",
        payload: taskResult
      });

      logger.debug("taskqueue", "Task completed successfully", {
        taskId: task.id,
        duration: taskResult.duration,
        executedBy
      });

    } catch (error) {
      // Task failed
      task.status = TaskStatus.FAILED;
      task.completedAt = Date.now();

      const errorMessage = error instanceof Error ? error.message : String(error);
      const taskResult: TaskResult = {
        id: task.id,
        error: errorMessage,
        duration: task.completedAt - (task.startedAt || task.createdAt),
        executedBy: task.workerModule ? "worker" : "main"
      };

      this.bus.emit({
        type: "TASK_FAILED",
        payload: taskResult
      });

      logger.error("taskqueue", "Task failed", {
        taskId: task.id,
        error: errorMessage,
        duration: taskResult.duration
      });
    } finally {
      // Clean up
      if (task.worker) {
        task.worker.terminate();
        task.worker = undefined;
      }

      this.activeTasks.delete(task.id);

      // Continue processing remaining tasks
      this.process();
    }
  }

  /**
   * Execute task in a web worker
   */
  private async runInWorker(task: QueuedTask): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!task.workerModule) {
        reject(new Error("No worker module specified"));
        return;
      }

      try {
        const worker = new Worker(task.workerModule, { type: "module" });
        task.worker = worker;

        // Set up timeout if specified
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        if (task.timeout) {
          timeoutHandle = setTimeout(() => {
            worker.terminate();
            reject(new Error(`Task timeout after ${String(task.timeout)}ms`));
          }, task.timeout);
        }

        worker.onmessage = (e: MessageEvent) => {
          // Type guard for worker message
          interface WorkerMessage {
            type: string;
            payload?: unknown;
          }

          // Zod schema for worker message validation
          const workerMessageSchema = z.looseObject({
            type: z.string(),
            payload: z.unknown().optional()
          });

          function isWorkerMessage(data: unknown): data is WorkerMessage {
            return workerMessageSchema.safeParse(data).success;
          }

          if (!isWorkerMessage(e.data)) {
            return;
          }

          const event = e.data;

          switch (event.type) {
            case "PROGRESS": {
              const progressPayload = event.payload;
              const payloadExtension = progressPayload &&
                typeof progressPayload === "object" &&
                !Array.isArray(progressPayload) &&
                progressPayload !== null
                ? Object.fromEntries(Object.entries(progressPayload).filter(([key, value]) =>
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
              break;
            }

            case "SUCCESS":
              if (timeoutHandle) {
                clearTimeout(timeoutHandle);
              }
              worker.terminate();
              this.bus.emit({
                type: "TASK_SUCCESS",
                payload: { id: task.id, result: event.payload }
              });
              resolve(event.payload);
              break;

            case "ERROR":
              if (timeoutHandle) {
                clearTimeout(timeoutHandle);
              }
              worker.terminate();
              this.bus.emit({
                type: "TASK_ERROR",
                payload: { id: task.id, error: event.payload }
              });
              reject(new Error(String(event.payload)));
              break;

            default:
              // Forward other events to the bus - ensure they have required structure
              if (event.type && typeof event.type === "string") {
                this.bus.emit({
                  type: event.type,
                  payload: event.payload
                });
              }
              break;
          }
        };

        worker.onerror = (error: ErrorEvent) => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          worker.terminate();
          reject(new Error(error.message || "Worker error"));
        };

        // Send task payload to worker
        worker.postMessage(task.payload);

      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Execute task on main thread
   */
  private async runOnMainThread(task: QueuedTask): Promise<unknown> {
    if (!task.execute) {
      throw new Error("No execute function specified");
    }

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

    // Execute with timeout if specified
    if (task.timeout) {
      return Promise.race([
        task.execute(task.payload, emit),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Task timeout after ${String(task.timeout)}ms`));
          }, task.timeout);
        })
      ]);
    } else {
      return task.execute(task.payload, emit);
    }
  }
}

// Export convenience function to create a task queue
export function createTaskQueue(bus: EventBus, options?: { maxConcurrency?: number }): TaskQueue {
  return new TaskQueue(bus, options);
}