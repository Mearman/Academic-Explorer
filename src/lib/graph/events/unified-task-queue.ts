/**
 * Unified Task Queue
 * Manages task execution either in workers or on the main thread
 * Based on the ChatGPT document specification for unified task management
 */

import { logger } from "@/lib/logger";
import { EventBus } from "./unified-event-bus";
import { z } from "zod";

// Zod schema for node objects
const NodeSchema = z.object({
  id: z.unknown().optional(),
}).loose();

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
  private workerConnections = new Map<string, {
    worker: Worker;
    handlers: Map<string, {
      resolve: (value: unknown) => void;
      reject: (reason: Error) => void;
      timeoutHandle?: ReturnType<typeof setTimeout>;
    }>;
  }>();

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
    // Deep clone payload to prevent mutation issues
    const clonedPayload: unknown = task.payload ? JSON.parse(JSON.stringify(task.payload)) : task.payload;

    const queuedTask: QueuedTask = {
      ...task,
      payload: clonedPayload,
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

      if (activeTask.workerModule) {
        const connection = this.workerConnections.get(activeTask.workerModule);
        if (connection) {
          connection.worker.terminate();
          this.workerConnections.delete(activeTask.workerModule);

          for (const [, handler] of connection.handlers) {
            handler.reject(new Error("Task cancelled"));
            if (handler.timeoutHandle) {
              clearTimeout(handler.timeoutHandle);
            }
          }
          connection.handlers.clear();
        }
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
    }
    this.activeTasks.clear();

    // Terminate and clear worker connections
    for (const [, connection] of this.workerConnections.entries()) {
      for (const [, handler] of connection.handlers.entries()) {
        handler.reject(new Error("Task queue cleared"));
        if (handler.timeoutHandle) {
          clearTimeout(handler.timeoutHandle);
        }
      }
      connection.handlers.clear();
      connection.worker.terminate();
    }
    this.workerConnections.clear();

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
        const connection = this.getWorkerConnection(task.workerModule);

        const handler: {
          resolve: (value: unknown) => void;
          reject: (reason?: unknown) => void;
          timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        } = {
          resolve,
          reject,
          timeoutHandle: undefined
        };

        connection.handlers.set(task.id, handler);

        if (task.timeout) {
          handler.timeoutHandle = setTimeout(() => {
            connection.handlers.delete(task.id);
            reject(new Error(`Task timeout after ${String(task.timeout)}ms`));
          }, task.timeout);
        }

        if (task.payload && typeof task.payload === "object" && "type" in task.payload) {
          const payload = task.payload;
          if (typeof payload.type !== "string") return;
          if (payload.type === "FORCE_SIMULATION_START" || payload.type === "FORCE_SIMULATION_REHEAT") {
            // Extract nodes and links safely
            const nodes = ("nodes" in payload && Array.isArray(payload.nodes)) ? payload.nodes : [];
            const links = ("links" in payload && Array.isArray(payload.links)) ? payload.links : [];

            logger.debug("taskqueue", "TASK_QUEUE: Sending to shared worker", {
              taskId: task.id,
              type: payload.type,
              nodesLength: nodes.length,
              linksLength: links.length,
              firstNodeId: (() => {
                const firstNode: unknown = nodes[0];
                if (firstNode) {
                  const parseResult = NodeSchema.safeParse(firstNode);
                  return parseResult.success ? parseResult.data.id : undefined;
                }
                return undefined;
              })(),
              allNodeIds: nodes.map(n => {
                if (n) {
                  const parseResult = NodeSchema.safeParse(n);
                  return parseResult.success ? parseResult.data.id : "unknown";
                }
                return "unknown";
              }),
              linkDetails: links.slice(0, 3).map((link: unknown) => {
                if (link && typeof link === "object" && link !== null) {
                  const linkObj = link;
                  return {
                    id: "id" in linkObj ? linkObj.id : undefined,
                    source: "source" in linkObj ? linkObj.source : undefined,
                    target: "target" in linkObj ? linkObj.target : undefined
                  };
                }
                return { id: undefined, source: undefined, target: undefined };
              })
            });
          }
        }

        connection.worker.postMessage({
          type: "EXECUTE_TASK",
          taskId: task.id,
          payload: task.payload
        });

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

  private getWorkerConnection(workerModule: string) {
    let connection = this.workerConnections.get(workerModule);
    if (!connection) {
      const worker = new Worker(workerModule, { type: "module" });
      const handlers = new Map<string, {
        resolve: (value: unknown) => void;
        reject: (reason: Error) => void;
        timeoutHandle?: ReturnType<typeof setTimeout>;
      }>();

      worker.onmessage = (event: MessageEvent) => {
        this.handleSharedWorkerMessage(workerModule, event.data);
      };

      worker.onerror = (error: ErrorEvent) => {
        this.handleSharedWorkerError(workerModule, error);
      };

      worker.onmessageerror = (error: MessageEvent) => {
        this.handleSharedWorkerError(workerModule, new ErrorEvent("messageerror", {
          message: "Worker message error",
          error
        }));
      };

      connection = { worker, handlers };
      this.workerConnections.set(workerModule, connection);
    }

    return connection;
  }

  private handleSharedWorkerMessage(workerModule: string, data: unknown) {
    const connection = this.workerConnections.get(workerModule);
    if (!connection) {
      return;
    }

    const workerMessageSchema = z.looseObject({
      type: z.string(),
      payload: z.unknown().optional(),
      taskId: z.string().optional()
    });

    const parseResult = workerMessageSchema.safeParse(data);
    if (!parseResult.success) {
      return;
    }

    const message = parseResult.data;
    const taskId = typeof message.taskId === "string" ? message.taskId : undefined;

    switch (message.type) {
      case "PROGRESS": {
        const progressPayload = message.payload &&
          typeof message.payload === "object" &&
          !Array.isArray(message.payload) &&
          message.payload !== null
          ? Object.fromEntries(Object.entries(message.payload).filter(([key, value]) =>
              typeof key === "string" && value !== undefined
            ))
          : {};

        this.bus.emit({
          type: "TASK_PROGRESS",
          payload: {
            id: taskId,
            ...progressPayload
          }
        });
        break;
      }

      case "SUCCESS": {
        if (taskId) {
          const handler = connection.handlers.get(taskId);
          if (handler) {
            if (handler.timeoutHandle) {
              clearTimeout(handler.timeoutHandle);
            }
            connection.handlers.delete(taskId);
            handler.resolve(message.payload);
          }

          this.bus.emit({
            type: "TASK_SUCCESS",
            payload: { id: taskId, result: message.payload }
          });
        }
        break;
      }

      case "ERROR": {
        if (taskId) {
          const handler = connection.handlers.get(taskId);
          if (handler) {
            if (handler.timeoutHandle) {
              clearTimeout(handler.timeoutHandle);
            }
            connection.handlers.delete(taskId);
            handler.reject(new Error(String(message.payload)));
          }

          this.bus.emit({
            type: "TASK_ERROR",
            payload: { id: taskId, error: message.payload }
          });
        }
        break;
      }

      default:
        if (message.type && typeof message.type === "string") {
          this.bus.emit({
            type: message.type,
            payload: message.payload
          });
        }
    }
  }

  private handleSharedWorkerError(workerModule: string, error: ErrorEvent) {
    const connection = this.workerConnections.get(workerModule);
    if (!connection) {
      return;
    }

    for (const [, handler] of connection.handlers.entries()) {
      handler.reject(new Error(error.message || "Worker error"));
      if (handler.timeoutHandle) {
        clearTimeout(handler.timeoutHandle);
      }
    }

    connection.handlers.clear();
    connection.worker.terminate();
    this.workerConnections.delete(workerModule);

    this.bus.emit({
      type: "TASK_ERROR",
      payload: {
        error: error.message || "Worker error"
      }
    });
  }
}

// Export convenience function to create a task queue
export function createTaskQueue(bus: EventBus, options?: { maxConcurrency?: number }): TaskQueue {
  return new TaskQueue(bus, options);
}
