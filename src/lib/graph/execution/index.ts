/**
 * Execution Strategy Module
 * Provides unified interface for task execution with worker and non-worker support
 */

export type {
  ExecutionStrategy,
  TaskDescriptor,
  TaskResult,
  TaskProgress,
  TaskExecutor,
  TaskExecutorRegistry,
  ForceSimulationTask,
  ForceSimulationStartTask,
  ForceSimulationControlTask,
  ForceSimulationUpdateTask,
  ForceSimulationReheatTask,
  ForceSimulationUpdateLinksTask,
  ForceSimulationUpdateNodesTask
} from "./execution-strategy";

export { TaskStatus } from "./execution-strategy";

export { WorkerExecutionStrategy } from "./worker-execution-strategy";
export { MainThreadExecutionStrategy, SimpleTaskExecutorRegistry } from "./main-thread-execution-strategy";
export { createForceSimulationExecutor } from "./force-simulation-executor";

export {
  createExecutionStrategy,
  detectWorkerSupport,
  ExecutionMode,
  type ExecutionModeType,
  type ExecutionFactoryOptions
} from "./execution-factory";

// Re-export for convenience
export type { EventBus } from "@/lib/graph/events/unified-event-bus";