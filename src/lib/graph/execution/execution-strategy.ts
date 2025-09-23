/**
 * Execution Strategy Abstraction
 * Defines the interface for both worker and non-worker execution environments
 */

import type { EventBus } from "@/lib/graph/events/unified-event-bus";
import type {
  ForceSimulationNode,
  ForceSimulationLink,
  ForceSimulationConfig
} from "@/lib/graph/events/enhanced-worker-types";

export interface TaskDescriptor {
  id: string;
  payload: unknown;
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
  payload?: unknown;
}

export enum TaskStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

/**
 * Base execution strategy interface
 * Both worker and non-worker implementations must implement this
 */
export interface ExecutionStrategy {
  /**
   * Submit a task for execution
   */
  submitTask(task: TaskDescriptor): Promise<string>;

  /**
   * Cancel a running or queued task
   */
  cancelTask(taskId: string): boolean;

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus | null;

  /**
   * Get execution statistics
   */
  getStats(): {
    queueLength: number;
    activeTasks: number;
    processing: boolean;
    maxConcurrency: number;
    totalWorkers?: number;
    idleWorkers?: number;
    busyWorkers?: number;
  };

  /**
   * Clear all pending tasks
   */
  clear(): void;

  /**
   * Shutdown the execution environment
   */
  shutdown(): void;

  /**
   * Check if the strategy supports workers
   */
  readonly supportsWorkers: boolean;

  /**
   * Get the execution mode name
   */
  readonly mode: "worker" | "main-thread";
}

/**
 * Force simulation specific task types
 */
export interface ForceSimulationStartTask {
  type: "FORCE_SIMULATION_START";
  nodes: ForceSimulationNode[];
  links: ForceSimulationLink[];
  config?: ForceSimulationConfig;
  pinnedNodes?: string[];
}

export interface ForceSimulationControlTask {
  type: "FORCE_SIMULATION_STOP" | "FORCE_SIMULATION_PAUSE" | "FORCE_SIMULATION_RESUME";
}

export interface ForceSimulationUpdateTask {
  type: "FORCE_SIMULATION_UPDATE_PARAMETERS";
  config: Partial<ForceSimulationConfig>;
}

export interface ForceSimulationReheatTask {
  type: "FORCE_SIMULATION_REHEAT";
  nodes: ForceSimulationNode[];
  links: ForceSimulationLink[];
  config?: ForceSimulationConfig;
  pinnedNodes?: string[];
  alpha?: number;
}

export interface ForceSimulationUpdateLinksTask {
  type: "FORCE_SIMULATION_UPDATE_LINKS";
  links: ForceSimulationLink[];
  alpha?: number;
}

export interface ForceSimulationUpdateNodesTask {
  type: "FORCE_SIMULATION_UPDATE_NODES";
  nodes: ForceSimulationNode[];
  pinnedNodes?: string[];
  alpha?: number;
}

export type ForceSimulationTask =
  | ForceSimulationStartTask
  | ForceSimulationControlTask
  | ForceSimulationUpdateTask
  | ForceSimulationReheatTask
  | ForceSimulationUpdateLinksTask
  | ForceSimulationUpdateNodesTask;

/**
 * Task executor function type for main thread execution
 */
export type TaskExecutor = (
  payload: unknown,
  emit: (event: { type: string; payload?: unknown }) => void
) => Promise<unknown>;

/**
 * Registry of task executors for main thread execution
 */
export interface TaskExecutorRegistry {
  register(taskType: string, executor: TaskExecutor): void;
  get(taskType: string): TaskExecutor | undefined;
  has(taskType: string): boolean;
  clear(): void;
}