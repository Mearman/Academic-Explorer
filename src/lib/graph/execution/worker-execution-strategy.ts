/**
 * Worker-based Execution Strategy
 * Uses the existing TaskQueue and WorkerPool for background execution
 */

import { logger } from "@/lib/logger";
import { TaskQueue, createTaskQueue } from "@/lib/graph/events/unified-task-queue";
import type { EventBus } from "@/lib/graph/events/unified-event-bus";
import type {
  ExecutionStrategy,
  TaskDescriptor
} from "./execution-strategy";
import { TaskStatus } from "./execution-strategy";

export interface WorkerExecutionStrategyOptions {
  maxConcurrency?: number;
  workerModule: string;
}

/**
 * Worker-based execution strategy using TaskQueue and WorkerPool
 */
export class WorkerExecutionStrategy implements ExecutionStrategy {
  private taskQueue: TaskQueue;
  private readonly workerModule: string;

  readonly supportsWorkers = true;
  readonly mode = "worker" as const;

  constructor(
    private bus: EventBus,
    options: WorkerExecutionStrategyOptions
  ) {
    this.workerModule = options.workerModule;
    this.taskQueue = createTaskQueue(bus, {
      maxConcurrency: options.maxConcurrency ?? 2
    });

    logger.debug("execution", "WorkerExecutionStrategy initialized", {
      maxConcurrency: options.maxConcurrency,
      workerModule: options.workerModule
    });
  }

  async submitTask(task: TaskDescriptor): Promise<string> {
    logger.debug("execution", "Submitting task to worker", {
      taskId: task.id,
      payloadType: task.payload && typeof task.payload === "object" && "type" in task.payload
        ? task.payload.type
        : "unknown"
    });

    const taskId = this.taskQueue.enqueue({
      ...task,
      workerModule: this.workerModule
    });

    return taskId;
  }

  cancelTask(taskId: string): boolean {
    logger.debug("execution", "Cancelling worker task", { taskId });
    return this.taskQueue.cancel(taskId);
  }

  getTaskStatus(taskId: string): TaskStatus | null {
    return this.taskQueue.getTaskStatus(taskId);
  }

  getStats() {
    const queueStats = this.taskQueue.getStats();

    return {
      queueLength: queueStats.queueLength,
      activeTasks: queueStats.activeTasks,
      processing: queueStats.processing,
      maxConcurrency: queueStats.maxConcurrency,
      totalWorkers: undefined, // TaskQueue doesn't expose worker pool stats
      idleWorkers: undefined,
      busyWorkers: undefined
    };
  }

  clear(): void {
    logger.debug("execution", "Clearing worker execution strategy");
    this.taskQueue.clear();
  }

  shutdown(): void {
    logger.debug("execution", "Shutting down worker execution strategy");
    this.taskQueue.clear();
    // Note: TaskQueue doesn't have explicit shutdown, workers are cleaned up by GC
  }
}