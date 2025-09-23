/**
 * Unified Task System
 * Provides a consistent API that works with both worker and non-worker execution strategies
 */

import { logger } from "@/lib/logger";
import type { EventBus } from "@/lib/graph/events/unified-event-bus";
import type {
  ExecutionStrategy,
  TaskDescriptor,
  TaskStatus
} from "./execution-strategy";
import type { ExecutionFactoryOptions } from "./execution-factory";
import { createExecutionStrategy } from "./execution-factory";

export interface UnifiedTaskSystemOptions extends ExecutionFactoryOptions {
  /**
   * Event bus for communication
   */
  bus: EventBus;

  /**
   * Auto-initialize the execution strategy
   */
  autoInitialize?: boolean;
}

/**
 * Unified task system that abstracts away the execution strategy
 */
export class UnifiedTaskSystem {
  private executionStrategy: ExecutionStrategy | null = null;
  private readonly options: UnifiedTaskSystemOptions;
  private initialized = false;

  constructor(options: UnifiedTaskSystemOptions) {
    this.options = options;

    if (options.autoInitialize !== false) {
      void this.initialize();
    }
  }

  /**
   * Initialize the execution strategy
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.debug("execution", "Initializing unified task system", {
      mode: this.options.mode,
      maxConcurrency: this.options.maxConcurrency
    });

    try {
      this.executionStrategy = await createExecutionStrategy(this.options.bus, this.options);
      this.initialized = true;

      logger.debug("execution", "Unified task system initialized", {
        strategyMode: this.executionStrategy.mode,
        supportsWorkers: this.executionStrategy.supportsWorkers
      });

    } catch (error) {
      logger.error("execution", "Failed to initialize unified task system", { error });
      throw error;
    }
  }

  /**
   * Submit a task for execution
   */
  async submitTask(task: TaskDescriptor): Promise<string> {
    await this.ensureInitialized();

    logger.debug("execution", "Submitting task to unified system", {
      taskId: task.id,
      strategyMode: this.executionStrategy?.mode
    });

    return this.executionStrategy!.submitTask(task);
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.executionStrategy!.cancelTask(taskId);
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    await this.ensureInitialized();
    return this.executionStrategy!.getTaskStatus(taskId);
  }

  /**
   * Get system statistics
   */
  async getStats() {
    await this.ensureInitialized();
    const stats = this.executionStrategy!.getStats();

    return {
      ...stats,
      strategyMode: this.executionStrategy!.mode,
      supportsWorkers: this.executionStrategy!.supportsWorkers,
      initialized: this.initialized
    };
  }

  /**
   * Clear all pending tasks
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.executionStrategy!.clear();
  }

  /**
   * Shutdown the task system
   */
  async shutdown(): Promise<void> {
    if (this.executionStrategy) {
      logger.debug("execution", "Shutting down unified task system");
      this.executionStrategy.shutdown();
      this.executionStrategy = null;
      this.initialized = false;
    }
  }

  /**
   * Get the current execution strategy (for advanced usage)
   */
  getExecutionStrategy(): ExecutionStrategy | null {
    return this.executionStrategy;
  }

  /**
   * Check if the system is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.executionStrategy !== null;
  }

  /**
   * Check if workers are being used
   */
  isUsingWorkers(): boolean {
    return this.executionStrategy?.supportsWorkers ?? false;
  }

  /**
   * Get execution mode
   */
  getExecutionMode(): "worker" | "main-thread" | "unknown" {
    return this.executionStrategy?.mode ?? "unknown";
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.executionStrategy) {
      throw new Error("Failed to initialize execution strategy");
    }
  }
}

/**
 * Create a unified task system
 */
export function createUnifiedTaskSystem(options: UnifiedTaskSystemOptions): UnifiedTaskSystem {
  return new UnifiedTaskSystem(options);
}

/**
 * Hook for using unified task system
 */
export function useUnifiedTaskSystem(options: Omit<UnifiedTaskSystemOptions, "bus">, bus: EventBus) {
  const taskSystem = createUnifiedTaskSystem({ ...options, bus });

  return {
    submitTask: (task: TaskDescriptor) => taskSystem.submitTask(task),
    cancelTask: (taskId: string) => taskSystem.cancelTask(taskId),
    getTaskStatus: (taskId: string) => taskSystem.getTaskStatus(taskId),
    getStats: () => taskSystem.getStats(),
    clear: () => taskSystem.clear(),
    shutdown: () => taskSystem.shutdown(),
    isInitialized: () => taskSystem.isInitialized(),
    isUsingWorkers: () => taskSystem.isUsingWorkers(),
    getExecutionMode: () => taskSystem.getExecutionMode(),
    getExecutionStrategy: () => taskSystem.getExecutionStrategy()
  };
}