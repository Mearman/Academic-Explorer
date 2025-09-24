/**
 * Unified Event System Hooks
 * React hooks for integrating with the unified EventBus, TaskQueue, and QueuedResourceCoordinator
 * Based on the ChatGPT document specification for React integration
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@academic-explorer/utils/logger";
import { EventBus, EventHandler, createLocalEventBus, createCrossTabEventBus } from "@academic-explorer/graph";
import { TaskQueue, TaskDescriptor, TaskResult, TaskStatus, createTaskQueue } from "@academic-explorer/graph";
import { WorkerPool, WorkerPoolOptions, createWorkerPool } from "@academic-explorer/graph";
import { QueuedResourceCoordinator, QueueCoordinatorOptions, createQueuedResourceCoordinator } from "@academic-explorer/graph";

// Type guard for TaskResult
function isTaskResult(value: unknown): value is TaskResult {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "duration" in value &&
    typeof value.duration === "number" &&
    "executedBy" in value &&
    (value.executedBy === "main" || value.executedBy === "worker")
  );
}

/**
 * Hook for managing EventBus instances
 */
export function useEventBus(channelName?: string): EventBus {
  const busRef = useRef<EventBus | null>(null);

  if (!busRef.current) {
    busRef.current = channelName
      ? createCrossTabEventBus(channelName)
      : createLocalEventBus();
  }

  useEffect(() => {
    return () => {
      if (busRef.current) {
        busRef.current.close();
        busRef.current = null;
      }
    };
  }, []);

  return busRef.current;
}

/**
 * Hook for listening to specific event types
 */
export function useEventListener(
  bus: EventBus,
  eventType: string,
  handler: (payload?: unknown) => void,
  deps: React.DependencyList = []
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler: EventHandler = (event) => {
      handlerRef.current(event.payload);
    };

    const listenerId = bus.on(eventType, wrappedHandler);

    logger.debug("hooks", "Event listener registered", {
      eventType,
      listenerId,
      isBroadcasting: bus.isBroadcasting()
    });

    return () => {
      bus.off(eventType, wrappedHandler);
      logger.debug("hooks", "Event listener removed", { eventType, listenerId });
    };
  }, [bus, eventType, ...deps]);
}

/**
 * Hook for managing TaskQueue
 */
export function useTaskQueue(
  bus: EventBus,
  options: { maxConcurrency?: number } = {}
): {
  taskQueue: TaskQueue;
  submitTask: (task: TaskDescriptor) => Promise<string>;
  cancelTask: (taskId: string) => boolean;
  getTaskStatus: (taskId: string) => TaskStatus | null;
  clearQueue: () => void;
  stats: ReturnType<TaskQueue["getStats"]>;
} {
  const taskQueueRef = useRef<TaskQueue | null>(null);
  const [stats, setStats] = useState({ queueLength: 0, activeTasks: 0, processing: false, maxConcurrency: 1 });

  if (!taskQueueRef.current) {
    taskQueueRef.current = createTaskQueue(bus, options);
  }

  const taskQueue = taskQueueRef.current;

  // Update stats when tasks change
  useEventListener(bus, "TASK_ENQUEUED", () => {
    setStats(taskQueue.getStats());
  });

  useEventListener(bus, "TASK_STARTED", () => {
    setStats(taskQueue.getStats());
  });

  useEventListener(bus, "TASK_COMPLETED", () => {
    setStats(taskQueue.getStats());
  });

  useEventListener(bus, "TASK_FAILED", () => {
    setStats(taskQueue.getStats());
  });

  useEventListener(bus, "QUEUE_CLEARED", () => {
    setStats(taskQueue.getStats());
  });

  const submitTask = useCallback((task: TaskDescriptor) => {
    return Promise.resolve(taskQueue.enqueue(task));
  }, [taskQueue]);

  const cancelTask = useCallback((taskId: string) => {
    return taskQueue.cancel(taskId);
  }, [taskQueue]);

  const getTaskStatus = useCallback((taskId: string) => {
    return taskQueue.getTaskStatus(taskId);
  }, [taskQueue]);

  const clearQueue = useCallback(() => {
    taskQueue.clear();
  }, [taskQueue]);

  useEffect(() => {
    setStats(taskQueue.getStats());
  }, [taskQueue]);

  return {
    taskQueue,
    submitTask,
    cancelTask,
    getTaskStatus,
    clearQueue,
    stats
  };
}

/**
 * Hook for managing WorkerPool
 */
export function useWorkerPool(
  bus: EventBus,
  options: WorkerPoolOptions
): {
  workerPool: WorkerPool;
  submitTask: (taskId: string, payload: unknown, timeout?: number) => Promise<unknown>;
  stats: ReturnType<WorkerPool["getStats"]>;
  shutdown: () => Promise<void>;
} {
  const workerPoolRef = useRef<WorkerPool | null>(null);
  const [stats, setStats] = useState({
    totalWorkers: 0,
    idleWorkers: 0,
    busyWorkers: 0,
    errorWorkers: 0,
    queuedTasks: 0,
    totalTasksCompleted: 0,
    totalErrors: 0
  });

  if (!workerPoolRef.current) {
    workerPoolRef.current = createWorkerPool(bus, options);
  }

  const workerPool = workerPoolRef.current;

  // Update stats when pool state changes
  useEventListener(bus, "POOL_WORKER_CREATED", () => {
    setStats(workerPool.getStats());
  });

  useEventListener(bus, "POOL_WORKER_TERMINATED", () => {
    setStats(workerPool.getStats());
  });

  useEventListener(bus, "POOL_TASK_QUEUED", () => {
    setStats(workerPool.getStats());
  });

  useEventListener(bus, "POOL_TASK_ASSIGNED", () => {
    setStats(workerPool.getStats());
  });

  useEventListener(bus, "POOL_WORKER_ERROR", () => {
    setStats(workerPool.getStats());
  });

  const submitTask = useCallback((taskId: string, payload: unknown, timeout?: number) => {
    return workerPool.submitTask(taskId, payload, timeout);
  }, [workerPool]);

  const shutdown = useCallback((): Promise<void> => {
    workerPool.shutdown();
    return Promise.resolve();
  }, [workerPool]);

  useEffect(() => {
    setStats(workerPool.getStats());

    return () => {
      workerPool.shutdown();
    };
  }, [workerPool]);

  return {
    workerPool,
    submitTask,
    stats,
    shutdown
  };
}

/**
 * Hook for managing QueuedResourceCoordinator
 */
export function useQueuedResourceCoordinator(
  bus: EventBus,
  options: QueueCoordinatorOptions
): {
  coordinator: QueuedResourceCoordinator;
  submitTask: (task: TaskDescriptor) => Promise<string>;
  cancelTask: (taskId: string) => boolean;
  getTaskStatus: (taskId: string) => TaskStatus | null;
  clearQueue: () => void;
  leaderStatus: ReturnType<QueuedResourceCoordinator["getStatus"]>;
  queueStats: ReturnType<QueuedResourceCoordinator["getQueueStats"]>;
  release: () => Promise<void>;
} {
  const coordinatorRef = useRef<QueuedResourceCoordinator | null>(null);
  const [leaderStatus, setLeaderStatus] = useState<ReturnType<QueuedResourceCoordinator["getStatus"]>>({
    isLeader: false,
    followers: []
  });
  const [queueStats, setQueueStats] = useState({
    pendingTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalTasks: 0,
    isLeader: false,
    queueCapacity: 0
  });

  if (!coordinatorRef.current) {
    coordinatorRef.current = createQueuedResourceCoordinator(bus, options);
  }

  const coordinator = coordinatorRef.current;

  // Track leadership changes
  useEffect(() => {
    const unsubscribe = coordinator.onLeadershipChange((status) => {
      setLeaderStatus(status);
      setQueueStats(coordinator.getQueueStats());
    });

    setLeaderStatus(coordinator.getStatus());
    setQueueStats(coordinator.getQueueStats());

    return unsubscribe;
  }, [coordinator]);

  // Update queue stats when tasks change
  useEventListener(bus, "QUEUE_TASK_SUBMITTED", () => {
    setQueueStats(coordinator.getQueueStats());
  });

  useEventListener(bus, "QUEUE_TASK_ASSIGNED", () => {
    setQueueStats(coordinator.getQueueStats());
  });

  useEventListener(bus, "QUEUE_TASK_COMPLETED", () => {
    setQueueStats(coordinator.getQueueStats());
  });

  useEventListener(bus, "QUEUE_TASK_FAILED", () => {
    setQueueStats(coordinator.getQueueStats());
  });

  useEventListener(bus, "QUEUE_TASK_CANCELLED", () => {
    setQueueStats(coordinator.getQueueStats());
  });

  useEventListener(bus, "QUEUE_CLEARED", () => {
    setQueueStats(coordinator.getQueueStats());
  });

  const submitTask = useCallback((task: TaskDescriptor) => {
    return Promise.resolve(coordinator.submitTask(task));
  }, [coordinator]);

  const cancelTask = useCallback((taskId: string) => {
    return coordinator.cancelTask(taskId);
  }, [coordinator]);

  const getTaskStatus = useCallback((taskId: string) => {
    return coordinator.getTaskStatus(taskId);
  }, [coordinator]);

  const clearQueue = useCallback(() => {
    coordinator.clearQueue();
  }, [coordinator]);

  const release = useCallback((): Promise<void> => {
    coordinator.release();
    return Promise.resolve();
  }, [coordinator]);

  useEffect(() => {
    return () => {
      coordinator.release();
    };
  }, [coordinator]);

  return {
    coordinator,
    submitTask,
    cancelTask,
    getTaskStatus,
    clearQueue,
    leaderStatus,
    queueStats,
    release
  };
}

/**
 * Hook for task progress tracking
 */
export function useTaskProgress(
  bus: EventBus,
  taskId: string
): {
  status: TaskStatus | null;
  progress: number;
  message?: string;
  result?: TaskResult;
  error?: Error;
} {
  const [state, setState] = useState<{
    status: TaskStatus | null;
    progress: number;
    message?: string;
    result?: TaskResult;
    error?: Error;
  }>({
    status: null,
    progress: 0
  });

  useEventListener(bus, "TASK_PROGRESS", (payload?: unknown) => {
    if (payload && typeof payload === "object" && payload !== null &&
        "id" in payload && typeof payload.id === "string" && payload.id === taskId &&
        "progress" in payload && typeof payload.progress === "number") {
      // Safe to access properties since we validated above
      const message = "message" in payload && typeof payload.message === "string" ? payload.message : undefined;
      setState(prev => {
        if ("progress" in payload && typeof payload.progress === "number") {
          const update: Partial<typeof prev> = {
            progress: payload.progress
          };
          if (message !== undefined) {
            update.message = message;
          }
          return {
            ...prev,
            ...update
          };
        }
        return prev;
      });
    }
  });

  useEventListener(bus, "TASK_STARTED", (payload?: unknown) => {
    if (payload && typeof payload === "object" && payload !== null &&
        "id" in payload && typeof payload.id === "string" && payload.id === taskId) {
      setState(prev => ({
        ...prev,
        status: TaskStatus.RUNNING,
        progress: 0
      }));
    }
  });

  useEventListener(bus, "TASK_COMPLETED", (payload?: unknown) => {
    if (payload && typeof payload === "object" && payload !== null &&
        "id" in payload && typeof payload.id === "string" && payload.id === taskId &&
        isTaskResult(payload)) {
      setState(prev => ({
        ...prev,
        status: TaskStatus.COMPLETED,
        progress: 100,
        result: payload
      }));
    }
  });

  useEventListener(bus, "TASK_FAILED", (payload?: unknown) => {
    if (payload && typeof payload === "object" && payload !== null &&
        "id" in payload && typeof payload.id === "string" && payload.id === taskId &&
        isTaskResult(payload)) {
      setState(prev => ({
        ...prev,
        status: TaskStatus.FAILED,
        error: new Error(payload.error ?? "Task failed")
      }));
    }
  });

  useEventListener(bus, "TASK_CANCELLED", (payload?: unknown) => {
    if (payload && typeof payload === "object" && payload !== null &&
        "id" in payload && typeof payload.id === "string" && payload.id === taskId) {
      setState(prev => ({
        ...prev,
        status: TaskStatus.CANCELLED,
        error: new Error("Task cancelled")
      }));
    }
  });

  return state;
}

/**
 * Hook for cross-tab event broadcasting
 */
export function useCrossTabEvent(
  channelName: string,
  eventType: string,
  handler: (payload?: unknown) => void,
  deps: React.DependencyList = []
): {
  broadcast: (payload?: unknown) => void;
  isConnected: boolean;
} {
  const bus = useEventBus(channelName);
  const [isConnected, setIsConnected] = useState(bus.isBroadcasting());

  useEventListener(bus, eventType, handler, deps);

  const broadcast = useCallback((payload?: unknown) => {
    bus.emit({ type: eventType, payload });
  }, [bus, eventType]);

  useEffect(() => {
    setIsConnected(bus.isBroadcasting());
  }, [bus]);

  return {
    broadcast,
    isConnected
  };
}

/**
 * Hook for managing multiple event subscriptions
 */
export function useEventSubscriptions(
  bus: EventBus,
  subscriptions: Array<{
    eventType: string;
    handler: EventHandler;
  }>
): void {
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    for (const { eventType, handler } of subscriptions) {
      const listenerId = bus.on(eventType, handler);
      unsubscribers.push(() => { bus.off(eventType, handler); });

      logger.debug("hooks", "Event subscription registered", {
        eventType,
        listenerId
      });
    }

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [bus, subscriptions]);
}