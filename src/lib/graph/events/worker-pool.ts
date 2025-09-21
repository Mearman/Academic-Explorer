/**
 * Worker Pool Management
 * Maintains a fixed number of long-lived workers for efficient task distribution
 * Based on the ChatGPT document specification for worker pool orchestration
 */

import { logger } from "@/lib/logger";
import { EventBus } from "./unified-event-bus";

export interface PoolWorker {
  id: string;
  worker: Worker;
  status: "idle" | "busy" | "error" | "terminated";
  currentTaskId?: string;
  createdAt: number;
  lastUsed: number;
  tasksCompleted: number;
  errors: number;
}

export interface WorkerPoolOptions {
  size: number;
  workerModule: string;
  maxTasksPerWorker?: number;
  idleTimeout?: number;
  restartOnError?: boolean;
}

export interface PoolTask {
  id: string;
  payload: unknown;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  createdAt: number;
  timeout?: number;
}

/**
 * WorkerPool maintains a fixed pool of workers and distributes jobs among them
 * Workers are reused to avoid the overhead of creating new workers for each task
 */
export class WorkerPool {
  private workers = new Map<string, PoolWorker>();
  private taskQueue: PoolTask[] = [];
  private readonly options: Required<WorkerPoolOptions>;
  private isShuttingDown = false;
  private idleCheckInterval?: ReturnType<typeof setInterval>;

  constructor(
    private bus: EventBus,
    options: WorkerPoolOptions
  ) {
    this.options = {
      maxTasksPerWorker: 100,
      idleTimeout: 300000, // 5 minutes
      restartOnError: true,
      ...options
    };

    logger.debug("workerpool", "WorkerPool created", {
      size: this.options.size,
      workerModule: this.options.workerModule,
      maxTasksPerWorker: this.options.maxTasksPerWorker
    });

    this.initializePool();
    this.startIdleCheck();
  }

  /**
   * Submit a task to the worker pool
   */
  async submitTask(taskId: string, payload: unknown, timeout?: number): Promise<unknown> {
    if (this.isShuttingDown) {
      throw new Error("Worker pool is shutting down");
    }

    return new Promise((resolve, reject) => {
      const task: PoolTask = {
        id: taskId,
        payload,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout
      };

      this.taskQueue.push(task);

      logger.debug("workerpool", "Task submitted to pool", {
        taskId,
        queueLength: this.taskQueue.length,
        availableWorkers: this.getIdleWorkerCount()
      });

      this.bus.emit({
        type: "POOL_TASK_QUEUED",
        payload: { taskId, queueLength: this.taskQueue.length }
      });

      // Try to assign task immediately
      this.assignNextTask();
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    idleWorkers: number;
    busyWorkers: number;
    errorWorkers: number;
    queuedTasks: number;
    totalTasksCompleted: number;
    totalErrors: number;
  } {
    let idleWorkers = 0;
    let busyWorkers = 0;
    let errorWorkers = 0;
    let totalTasksCompleted = 0;
    let totalErrors = 0;

    for (const worker of this.workers.values()) {
      switch (worker.status) {
        case "idle":
          idleWorkers++;
          break;
        case "busy":
          busyWorkers++;
          break;
        case "error":
          errorWorkers++;
          break;
      }
      totalTasksCompleted += worker.tasksCompleted;
      totalErrors += worker.errors;
    }

    return {
      totalWorkers: this.workers.size,
      idleWorkers,
      busyWorkers,
      errorWorkers,
      queuedTasks: this.taskQueue.length,
      totalTasksCompleted,
      totalErrors
    };
  }

  /**
   * Shutdown the worker pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Stop idle check
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = undefined;
    }

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error("Worker pool shutting down"));
    }
    this.taskQueue = [];

    // Terminate all workers
    const terminationPromises: Promise<void>[] = [];
    for (const poolWorker of this.workers.values()) {
      terminationPromises.push(this.terminateWorker(poolWorker.id));
    }

    await Promise.all(terminationPromises);

    logger.debug("workerpool", "Worker pool shutdown complete");

    this.bus.emit({
      type: "POOL_SHUTDOWN",
      payload: { workerCount: this.workers.size }
    });
  }

  /**
   * Initialize the worker pool
   */
  private initializePool(): void {
    for (let i = 0; i < this.options.size; i++) {
      this.createWorker();
    }

    logger.debug("workerpool", "Worker pool initialized", {
      workerCount: this.workers.size
    });
  }

  /**
   * Create a new worker and add it to the pool
   */
  private createWorker(): string {
    const workerId = `worker-${Date.now().toString()}-${Math.random().toString(36).substring(2)}`;

    try {
      const worker = new Worker(this.options.workerModule, { type: "module" });

      const poolWorker: PoolWorker = {
        id: workerId,
        worker,
        status: "idle",
        createdAt: Date.now(),
        lastUsed: Date.now(),
        tasksCompleted: 0,
        errors: 0
      };

      this.setupWorkerHandlers(poolWorker);
      this.workers.set(workerId, poolWorker);

      logger.debug("workerpool", "Worker created", { workerId });

      this.bus.emit({
        type: "POOL_WORKER_CREATED",
        payload: { workerId, totalWorkers: this.workers.size }
      });

      return workerId;

    } catch (error) {
      logger.error("workerpool", "Failed to create worker", {
        workerId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }

  /**
   * Setup event handlers for a worker
   */
  private setupWorkerHandlers(poolWorker: PoolWorker): void {
    poolWorker.worker.onmessage = (e: MessageEvent) => {
      this.handleWorkerMessage(poolWorker, e.data);
    };

    poolWorker.worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(poolWorker, error);
    };

    poolWorker.worker.onmessageerror = (error: MessageEvent) => {
      this.handleWorkerError(poolWorker, new ErrorEvent("messageerror", {
        message: "Worker message error",
        error
      }));
    };
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(poolWorker: PoolWorker, data: unknown): void {
    if (!data || typeof data !== "object") {
      return;
    }

    const message = data as { type: string; payload?: unknown; taskId?: string };

    switch (message.type) {
      case "PROGRESS":
        this.bus.emit({
          type: "POOL_TASK_PROGRESS",
          payload: {
            workerId: poolWorker.id,
            taskId: poolWorker.currentTaskId,
            ...(message.payload && typeof message.payload === "object" ? message.payload : {})
          }
        });
        break;

      case "SUCCESS":
        this.handleTaskCompletion(poolWorker, message.payload, undefined);
        break;

      case "ERROR":
        this.handleTaskCompletion(poolWorker, undefined, new Error(String(message.payload)));
        break;

      default:
        // Forward other messages to the event bus
        this.bus.emit({
          type: `POOL_WORKER_${message.type}`,
          payload: {
            workerId: poolWorker.id,
            ...(message.payload && typeof message.payload === "object" ? message.payload : {})
          }
        });
        break;
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(poolWorker: PoolWorker, error: ErrorEvent): void {
    poolWorker.status = "error";
    poolWorker.errors++;

    logger.error("workerpool", "Worker error", {
      workerId: poolWorker.id,
      error: error.message,
      currentTaskId: poolWorker.currentTaskId
    });

    // Handle current task if any
    if (poolWorker.currentTaskId) {
      this.handleTaskCompletion(poolWorker, undefined, new Error(error.message || "Worker error"));
    }

    this.bus.emit({
      type: "POOL_WORKER_ERROR",
      payload: {
        workerId: poolWorker.id,
        error: error.message,
        taskId: poolWorker.currentTaskId
      }
    });

    // Restart worker if configured to do so
    if (this.options.restartOnError && !this.isShuttingDown) {
      void this.restartWorker(poolWorker.id);
    }
  }

  /**
   * Handle task completion (success or error)
   */
  private handleTaskCompletion(poolWorker: PoolWorker, result?: unknown, error?: Error): void {
    const taskId = poolWorker.currentTaskId;
    if (!taskId) {
      return;
    }

    // Find the task in our records
    const taskIndex = this.taskQueue.findIndex(t => t.id === taskId);
    let task: PoolTask | undefined;

    if (taskIndex !== -1) {
      // Task is still in queue (shouldn't happen, but handle gracefully)
      task = this.taskQueue[taskIndex];
      this.taskQueue.splice(taskIndex, 1);
    }

    // Clear current task
    poolWorker.currentTaskId = undefined;
    poolWorker.lastUsed = Date.now();

    if (error) {
      poolWorker.errors++;
      poolWorker.status = "error";
      task?.reject(error);

      logger.debug("workerpool", "Task failed", {
        workerId: poolWorker.id,
        taskId,
        error: error.message
      });
    } else {
      poolWorker.tasksCompleted++;
      poolWorker.status = "idle";
      task?.resolve(result);

      logger.debug("workerpool", "Task completed", {
        workerId: poolWorker.id,
        taskId,
        tasksCompleted: poolWorker.tasksCompleted
      });
    }

    // Check if worker needs to be restarted due to max tasks
    if (poolWorker.tasksCompleted >= this.options.maxTasksPerWorker && !this.isShuttingDown) {
      void this.restartWorker(poolWorker.id);
    } else {
      // Try to assign next task
      this.assignNextTask();
    }
  }

  /**
   * Assign the next task to an available worker
   */
  private assignNextTask(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    const idleWorker = this.getIdleWorker();
    if (!idleWorker) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    // Check task timeout
    if (task.timeout && Date.now() - task.createdAt > task.timeout) {
      task.reject(new Error("Task timeout before execution"));
      this.assignNextTask(); // Try next task
      return;
    }

    // Assign task to worker
    idleWorker.status = "busy";
    idleWorker.currentTaskId = task.id;
    idleWorker.lastUsed = Date.now();

    try {
      idleWorker.worker.postMessage({
        type: "EXECUTE_TASK",
        taskId: task.id,
        payload: task.payload
      });

      logger.debug("workerpool", "Task assigned to worker", {
        workerId: idleWorker.id,
        taskId: task.id,
        queueLength: this.taskQueue.length
      });

      this.bus.emit({
        type: "POOL_TASK_ASSIGNED",
        payload: {
          workerId: idleWorker.id,
          taskId: task.id,
          queueLength: this.taskQueue.length
        }
      });

    } catch (error) {
      // Failed to send message, put task back and mark worker as error
      this.taskQueue.unshift(task);
      idleWorker.status = "error";
      idleWorker.currentTaskId = undefined;

      logger.error("workerpool", "Failed to assign task to worker", {
        workerId: idleWorker.id,
        taskId: task.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get an idle worker from the pool
   */
  private getIdleWorker(): PoolWorker | undefined {
    for (const worker of this.workers.values()) {
      if (worker.status === "idle") {
        return worker;
      }
    }
    return undefined;
  }

  /**
   * Get count of idle workers
   */
  private getIdleWorkerCount(): number {
    let count = 0;
    for (const worker of this.workers.values()) {
      if (worker.status === "idle") {
        count++;
      }
    }
    return count;
  }

  /**
   * Restart a worker
   */
  private async restartWorker(workerId: string): Promise<void> {
    const oldWorker = this.workers.get(workerId);
    if (!oldWorker) {
      return;
    }

    logger.debug("workerpool", "Restarting worker", {
      workerId,
      tasksCompleted: oldWorker.tasksCompleted,
      errors: oldWorker.errors
    });

    // Terminate old worker
    await this.terminateWorker(workerId);

    // Create new worker with same ID
    try {
      this.createWorker();
    } catch (error) {
      logger.error("workerpool", "Failed to restart worker", {
        workerId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Terminate a specific worker
   */
  private async terminateWorker(workerId: string): Promise<void> {
    const poolWorker = this.workers.get(workerId);
    if (!poolWorker) {
      return;
    }

    poolWorker.status = "terminated";

    // Handle current task if any
    if (poolWorker.currentTaskId) {
      this.handleTaskCompletion(poolWorker, undefined, new Error("Worker terminated"));
    }

    try {
      poolWorker.worker.terminate();
    } catch (error) {
      logger.warn("workerpool", "Error terminating worker", {
        workerId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    this.workers.delete(workerId);

    logger.debug("workerpool", "Worker terminated", { workerId });

    this.bus.emit({
      type: "POOL_WORKER_TERMINATED",
      payload: { workerId, totalWorkers: this.workers.size }
    });
  }

  /**
   * Start periodic check for idle workers
   */
  private startIdleCheck(): void {
    this.idleCheckInterval = setInterval(() => {
      const now = Date.now();
      const workersToRestart: string[] = [];

      for (const worker of this.workers.values()) {
        if (worker.status === "idle" &&
            now - worker.lastUsed > this.options.idleTimeout) {
          workersToRestart.push(worker.id);
        }
      }

      for (const workerId of workersToRestart) {
        void this.restartWorker(workerId);
      }
    }, 60000); // Check every minute
  }
}

// Export convenience function to create a worker pool
export function createWorkerPool(bus: EventBus, options: WorkerPoolOptions): WorkerPool {
  return new WorkerPool(bus, options);
}