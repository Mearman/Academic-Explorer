/**
 * Queued Resource Coordinator
 * Extends ResourceCoordinator to add cross-tab task queuing and coordination
 * Based on the ChatGPT document specification for distributed task management
 */

import { logger } from "@/lib/logger";
import { EventBus } from "./unified-event-bus";
import { ResourceCoordinator, ResourceOptions, ControlMessage } from "./resource-coordinator";
import { TaskDescriptor, TaskResult, TaskStatus } from "./unified-task-queue";
import { z } from "zod";

export interface QueuedTaskMessage {
  type: "QUEUE_TASK" | "TASK_ASSIGNED" | "TASK_COMPLETED" | "TASK_FAILED" | "TASK_CANCELLED" | "SYNC_QUEUE";
  resourceId: string;
  senderId: string;
  targetId?: string;
  payload?: unknown;
  timestamp: number;
  taskData?: QueuedTask;
  taskResult?: TaskResult;
  queueSnapshot?: QueuedTask[];
}

export interface QueuedTask extends TaskDescriptor {
  status: TaskStatus;
  assignedTo?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  originTab: string;
  attempts: number;
  maxAttempts?: number;
}

export interface QueueCoordinatorOptions extends ResourceOptions {
  maxQueueSize?: number;
  taskTimeout?: number;
  maxAttempts?: number;
  syncInterval?: number;
}

/**
 * QueuedResourceCoordinator manages a distributed task queue across multiple tabs
 * Only the leader can assign tasks, but any tab can submit tasks to the queue
 */
export class QueuedResourceCoordinator extends ResourceCoordinator {
  private taskQueue: QueuedTask[] = [];
  private activeTasks = new Map<string, QueuedTask>();
  private completedTasks = new Map<string, TaskResult>();
  private syncInterval?: ReturnType<typeof setInterval>;
  private taskTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  protected readonly queueOptions: Required<QueueCoordinatorOptions>;

  private taskCallbacks = new Set<(task: QueuedTask, result?: TaskResult, error?: Error) => void>();

  constructor(bus: EventBus, options: QueueCoordinatorOptions) {
    super(bus, options);

    this.queueOptions = {
      maxQueueSize: 100,
      taskTimeout: 60000,
      maxAttempts: 3,
      syncInterval: 10000,
      acquireTimeout: 10000,
      heartbeatInterval: 5000,
      maxRetries: 3,
      ...options
    };

    logger.debug("queuecoordinator", "QueuedResourceCoordinator created", {
      id: this.id,
      resourceId: this.resourceId,
      maxQueueSize: this.queueOptions.maxQueueSize,
      taskTimeout: this.queueOptions.taskTimeout
    });

    // Start queue synchronization if we become leader
    this.onLeadershipChange((status) => {
      if (status.isLeader) {
        this.startQueueSync();
        this.processQueue();
      } else {
        this.stopQueueSync();
      }
    });
  }

  /**
   * Submit a task to the distributed queue
   */
  submitTask(task: TaskDescriptor): string {
    if (this.taskQueue.length >= this.queueOptions.maxQueueSize) {
      throw new Error("Task queue is full");
    }

    const queuedTask: QueuedTask = {
      ...task,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      originTab: this.id,
      attempts: 0,
      maxAttempts: task.timeout ? this.queueOptions.maxAttempts : undefined
    };

    // Add to local queue
    this.taskQueue.push(queuedTask);

    logger.debug("queuecoordinator", "Task submitted to queue", {
      taskId: task.id,
      originTab: this.id,
      queueLength: this.taskQueue.length,
      isLeader: this.isLeader
    });

    // If we're the leader, process immediately
    if (this.isLeader) {
      this.processQueue();
    } else {
      // Send to leader for processing
      this.sendQueueMessage({
        type: "QUEUE_TASK",
        resourceId: this.resourceId,
        senderId: this.id,
        taskData: queuedTask,
        timestamp: Date.now()
      });
    }

    this.bus.emit({
      type: "QUEUE_TASK_SUBMITTED",
      payload: { taskId: task.id, queueLength: this.taskQueue.length }
    });

    return task.id;
  }

  /**
   * Cancel a task by ID
   */
  cancelTask(taskId: string): boolean {
    // Remove from local queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue[queueIndex];
      task.status = TaskStatus.CANCELLED;
      this.taskQueue.splice(queueIndex, 1);

      this.bus.emit({
        type: "QUEUE_TASK_CANCELLED",
        payload: { taskId, reason: "cancelled_before_assignment" }
      });

      logger.debug("queuecoordinator", "Task cancelled from queue", { taskId });
      return true;
    }

    // Check active tasks
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.status = TaskStatus.CANCELLED;
      this.clearTaskTimeout(taskId);

      // Notify assigned worker if we're the leader
      if (this.isLeader && activeTask.assignedTo) {
        this.sendQueueMessage({
          type: "TASK_CANCELLED",
          resourceId: this.resourceId,
          senderId: this.id,
          targetId: activeTask.assignedTo,
          taskData: activeTask,
          timestamp: Date.now()
        });
      }

      this.activeTasks.delete(taskId);

      this.bus.emit({
        type: "QUEUE_TASK_CANCELLED",
        payload: { taskId, reason: "cancelled_during_execution" }
      });

      logger.debug("queuecoordinator", "Active task cancelled", { taskId });
      return true;
    }

    return false;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus | null {
    // Check completed tasks first
    if (this.completedTasks.has(taskId)) {
      return TaskStatus.COMPLETED;
    }

    // Check active tasks
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      return activeTask.status;
    }

    // Check queue
    const queuedTask = this.taskQueue.find(t => t.id === taskId);
    if (queuedTask) {
      return queuedTask.status;
    }

    return null;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pendingTasks: number;
    activeTasks: number;
    completedTasks: number;
    totalTasks: number;
    isLeader: boolean;
    queueCapacity: number;
  } {
    return {
      pendingTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      completedTasks: this.completedTasks.size,
      totalTasks: this.taskQueue.length + this.activeTasks.size + this.completedTasks.size,
      isLeader: this.isLeader,
      queueCapacity: this.queueOptions.maxQueueSize
    };
  }

  /**
   * Register callback for task updates
   */
  onTaskUpdate(callback: (task: QueuedTask, result?: TaskResult, error?: Error) => void): () => void {
    this.taskCallbacks.add(callback);
    return () => this.taskCallbacks.delete(callback);
  }

  /**
   * Clear all tasks from the queue
   */
  clearQueue(): void {
    const cancelledCount = this.taskQueue.length + this.activeTasks.size;

    // Cancel all queued tasks
    for (const task of this.taskQueue) {
      task.status = TaskStatus.CANCELLED;
    }
    this.taskQueue = [];

    // Cancel all active tasks
    for (const [taskId, task] of this.activeTasks.entries()) {
      task.status = TaskStatus.CANCELLED;
      this.clearTaskTimeout(taskId);
    }
    this.activeTasks.clear();

    // Clear completed tasks
    this.completedTasks.clear();

    logger.debug("queuecoordinator", "Queue cleared", { cancelledCount });

    this.bus.emit({
      type: "QUEUE_CLEARED",
      payload: { cancelledCount }
    });
  }

  /**
   * Release coordinator and clean up
   */
  release(): void {
    this.stopQueueSync();
    this.clearAllTaskTimeouts();
    this.clearQueue();
    super.release();
  }

  /**
   * Handle control messages (override to add queue messages)
   */
  protected handleControlMessage(msg: ControlMessage): void {
    // Handle queue-specific messages first
    if (this.isQueueMessage(msg)) {
      const queueMessage = this.extractQueueMessage(msg);
      if (queueMessage) {
        this.handleQueueMessage(queueMessage);
        return; // Don't pass to parent if it's a queue message
      }
    }

    // Handle base control messages
    super.handleControlMessage(msg);
  }

  /**
   * Handle queue-specific messages
   */
  private handleQueueMessage(msg: QueuedTaskMessage): void {
    logger.debug("queuecoordinator", "Received queue message", {
      type: msg.type,
      from: msg.senderId,
      taskId: msg.taskData?.id
    });

    switch (msg.type) {
      case "QUEUE_TASK":
        if (this.isLeader && msg.taskData) {
          this.addTaskToQueue(msg.taskData);
          this.processQueue();
        }
        break;

      case "TASK_ASSIGNED":
        if (msg.taskData && msg.taskData.assignedTo === this.id) {
          this.handleTaskAssignment(msg.taskData).catch((error: unknown) => {
            logger.error("queuecoordinator", "Failed to handle task assignment", {
              taskId: msg.taskData?.id,
              error: error instanceof Error ? error.message : String(error)
            });
          });
        }
        break;

      case "TASK_COMPLETED":
        if (msg.taskResult) {
          this.handleTaskCompletion(msg.taskResult);
        }
        break;

      case "TASK_FAILED":
        if (msg.taskResult) {
          this.handleTaskFailure(msg.taskResult);
        }
        break;

      case "TASK_CANCELLED":
        if (msg.taskData) {
          this.handleTaskCancellation(msg.taskData);
        }
        break;

      case "SYNC_QUEUE":
        if (this.isLeader && msg.queueSnapshot) {
          this.syncQueueState(msg.queueSnapshot);
        }
        break;
    }
  }

  /**
   * Process the task queue (leader only)
   */
  private processQueue(): void {
    if (!this.isLeader || this.taskQueue.length === 0) {
      return;
    }

    // Find available followers
    const availableFollowers = Array.from(this.followers).filter(followerId => {
      // Check if follower is not currently assigned a task
      const hasActiveTask = Array.from(this.activeTasks.values())
        .some(task => task.assignedTo === followerId);
      return !hasActiveTask;
    });

    // Assign tasks to available followers
    while (this.taskQueue.length > 0 && availableFollowers.length > 0) {
      const task = this.taskQueue.shift();
      const followerId = availableFollowers.shift();

      if (task && followerId) {
        this.assignTaskToFollower(task, followerId);
      }
    }
  }

  /**
   * Assign a task to a specific follower
   */
  private assignTaskToFollower(task: QueuedTask, followerId: string): void {
    task.status = TaskStatus.RUNNING;
    task.assignedTo = followerId;
    task.startedAt = Date.now();
    task.attempts++;

    this.activeTasks.set(task.id, task);

    // Set task timeout
    if (this.queueOptions.taskTimeout) {
      const timeoutHandle = setTimeout(() => {
        this.handleTaskTimeout(task.id);
      }, this.queueOptions.taskTimeout);
      this.taskTimeouts.set(task.id, timeoutHandle);
    }

    // Send assignment message
    this.sendQueueMessage({
      type: "TASK_ASSIGNED",
      resourceId: this.resourceId,
      senderId: this.id,
      targetId: followerId,
      taskData: task,
      timestamp: Date.now()
    });

    logger.debug("queuecoordinator", "Task assigned to follower", {
      taskId: task.id,
      followerId,
      attempt: task.attempts
    });

    this.bus.emit({
      type: "QUEUE_TASK_ASSIGNED",
      payload: {
        taskId: task.id,
        assignedTo: followerId,
        attempt: task.attempts
      }
    });

    this.notifyTaskCallbacks(task);
  }

  /**
   * Handle task assignment (follower side)
   */
  private async handleTaskAssignment(task: QueuedTask): Promise<void> {
    logger.debug("queuecoordinator", "Received task assignment", {
      taskId: task.id,
      fromLeader: task.assignedTo === this.id
    });

    try {
      // Execute the task (this would integrate with TaskQueue)
      const result = await this.executeTask(task);

      // Report success to leader
      const taskResult: TaskResult = {
        id: task.id,
        result,
        duration: Date.now() - (task.startedAt || task.createdAt),
        executedBy: "worker"
      };

      this.sendQueueMessage({
        type: "TASK_COMPLETED",
        resourceId: this.resourceId,
        senderId: this.id,
        targetId: this.leaderId,
        taskResult,
        timestamp: Date.now()
      });

      logger.debug("queuecoordinator", "Task completed successfully", {
        taskId: task.id,
        duration: taskResult.duration
      });

    } catch (error) {
      // Report failure to leader
      const taskResult: TaskResult = {
        id: task.id,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - (task.startedAt || task.createdAt),
        executedBy: "worker"
      };

      this.sendQueueMessage({
        type: "TASK_FAILED",
        resourceId: this.resourceId,
        senderId: this.id,
        targetId: this.leaderId,
        taskResult,
        timestamp: Date.now()
      });

      logger.error("queuecoordinator", "Task execution failed", {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute a task (integration point with TaskQueue)
   */
  private async executeTask(task: QueuedTask): Promise<unknown> {
    // This is a placeholder - in practice this would delegate to TaskQueue
    if (task.execute) {
      const emit = (event: { type: string; payload?: unknown }) => {
        this.bus.emit(event);
      };
      return task.execute(task.payload, emit);
    } else {
      throw new Error("Task execution not implemented for worker modules in coordinator");
    }
  }

  /**
   * Handle task completion
   */
  private handleTaskCompletion(result: TaskResult): void {
    const task = this.activeTasks.get(result.id);
    if (!task) {
      return;
    }

    task.status = TaskStatus.COMPLETED;
    task.completedAt = Date.now();

    this.activeTasks.delete(result.id);
    this.completedTasks.set(result.id, result);
    this.clearTaskTimeout(result.id);

    logger.debug("queuecoordinator", "Task completed", {
      taskId: result.id,
      duration: result.duration,
      executedBy: result.executedBy
    });

    this.bus.emit({
      type: "QUEUE_TASK_COMPLETED",
      payload: result
    });

    this.notifyTaskCallbacks(task, result);

    // Continue processing queue
    this.processQueue();
  }

  /**
   * Handle task failure
   */
  private handleTaskFailure(result: TaskResult): void {
    const task = this.activeTasks.get(result.id);
    if (!task) {
      return;
    }

    this.clearTaskTimeout(result.id);

    // Check if we should retry
    const shouldRetry = task.maxAttempts && task.attempts < task.maxAttempts;

    if (shouldRetry) {
      // Reset task and put back in queue
      task.status = TaskStatus.PENDING;
      task.assignedTo = undefined;
      task.startedAt = undefined;
      this.taskQueue.unshift(task); // Priority for retries
      this.activeTasks.delete(result.id);

      logger.debug("queuecoordinator", "Task will be retried", {
        taskId: result.id,
        attempt: task.attempts,
        maxAttempts: task.maxAttempts
      });

      // Continue processing queue
      this.processQueue();

    } else {
      // Task failed permanently
      task.status = TaskStatus.FAILED;
      task.completedAt = Date.now();

      this.activeTasks.delete(result.id);
      this.completedTasks.set(result.id, result);

      logger.error("queuecoordinator", "Task failed permanently", {
        taskId: result.id,
        attempts: task.attempts,
        error: result.error
      });

      this.bus.emit({
        type: "QUEUE_TASK_FAILED",
        payload: result
      });

      this.notifyTaskCallbacks(task, result, new Error(result.error || "Task failed"));

      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Handle task cancellation
   */
  private handleTaskCancellation(task: QueuedTask): void {
    this.activeTasks.delete(task.id);
    this.clearTaskTimeout(task.id);

    logger.debug("queuecoordinator", "Task cancelled", { taskId: task.id });

    this.bus.emit({
      type: "QUEUE_TASK_CANCELLED",
      payload: { taskId: task.id, reason: "cancelled_by_coordinator" }
    });

    this.notifyTaskCallbacks(task, undefined, new Error("Task cancelled"));
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return;
    }

    logger.warn("queuecoordinator", "Task timeout", {
      taskId,
      timeout: this.queueOptions.taskTimeout,
      assignedTo: task.assignedTo
    });

    const result: TaskResult = {
      id: taskId,
      error: `Task timeout after ${String(this.queueOptions.taskTimeout)}ms`,
      duration: this.queueOptions.taskTimeout,
      executedBy: "worker"
    };

    this.handleTaskFailure(result);
  }

  /**
   * Add task to queue (leader only)
   */
  private addTaskToQueue(task: QueuedTask): void {
    if (this.taskQueue.length >= this.queueOptions.maxQueueSize) {
      logger.warn("queuecoordinator", "Queue full, rejecting task", {
        taskId: task.id,
        queueSize: this.taskQueue.length
      });
      return;
    }

    this.taskQueue.push(task);

    logger.debug("queuecoordinator", "Task added to queue", {
      taskId: task.id,
      queueLength: this.taskQueue.length
    });
  }

  /**
   * Start queue synchronization
   */
  private startQueueSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.broadcastQueueState();
    }, this.queueOptions.syncInterval);

    logger.debug("queuecoordinator", "Queue sync started", {
      interval: this.queueOptions.syncInterval
    });
  }

  /**
   * Stop queue synchronization
   */
  private stopQueueSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    logger.debug("queuecoordinator", "Queue sync stopped");
  }

  /**
   * Broadcast current queue state to all followers
   */
  private broadcastQueueState(): void {
    if (!this.isLeader) {
      return;
    }

    const queueSnapshot = [...this.taskQueue, ...Array.from(this.activeTasks.values())];

    this.sendQueueMessage({
      type: "SYNC_QUEUE",
      resourceId: this.resourceId,
      senderId: this.id,
      queueSnapshot,
      timestamp: Date.now()
    });
  }

  /**
   * Sync queue state with leader's snapshot
   */
  private syncQueueState(queueSnapshot: QueuedTask[]): void {
    logger.debug("queuecoordinator", "Syncing queue state", {
      snapshotLength: queueSnapshot.length
    });

    // This would implement queue state synchronization logic
    // For now, just log the sync event
    this.bus.emit({
      type: "QUEUE_STATE_SYNCED",
      payload: { queueLength: queueSnapshot.length }
    });
  }

  /**
   * Send a queue-specific message
   */
  private sendQueueMessage(message: QueuedTaskMessage, transfer?: Transferable[]): void {
    // Convert to ControlMessage format for base class
    const controlMessage: ControlMessage = {
      type: "HEARTBEAT", // Use a safe base type
      resourceId: message.resourceId,
      senderId: message.senderId,
      targetId: message.targetId,
      payload: {
        queueMessageType: message.type,
        taskData: message.taskData,
        taskResult: message.taskResult,
        queueSnapshot: message.queueSnapshot
      },
      timestamp: message.timestamp
    };
    this.sendControlMessage(controlMessage, transfer);
  }

  /**
   * Check if message is a queue message
   */
  private isQueueMessage(msg: ControlMessage): boolean {
    return !!(msg.payload &&
           typeof msg.payload === "object" &&
           "queueMessageType" in msg.payload);
  }

  /**
   * Convert ControlMessage to QueuedTaskMessage
   */
  private extractQueueMessage(msg: ControlMessage): QueuedTaskMessage | null {
    if (!this.isQueueMessage(msg) || !msg.payload || typeof msg.payload !== "object") {
      return null;
    }

    if (!msg.payload ||
        typeof msg.payload !== "object" ||
        !("queueMessageType" in msg.payload) ||
        typeof msg.payload.queueMessageType !== "string") {
      return null;
    }

    // Type guard for queue payload
    interface QueuePayload {
      queueMessageType: string;
      taskData?: unknown;
      taskResult?: unknown;
      queueSnapshot?: unknown;
    }

    // Zod schema for queue payload validation
    const queuePayloadSchema = z.looseObject({
      queueMessageType: z.string(),
      taskData: z.unknown().optional(),
      taskResult: z.unknown().optional(),
      queueSnapshot: z.unknown().optional()
    });

    function isQueuePayload(data: unknown): data is QueuePayload {
      return queuePayloadSchema.safeParse(data).success;
    }

    if (!isQueuePayload(msg.payload)) {
      return null;
    }

    const payload = msg.payload;

    const queueTypes: readonly string[] = ["QUEUE_TASK", "TASK_ASSIGNED", "TASK_COMPLETED", "TASK_FAILED", "TASK_CANCELLED", "SYNC_QUEUE"];
    if (!queueTypes.includes(payload.queueMessageType)) {
      return null;
    }

    // Helper function to safely extract task data
    function isQueuedTask(data: unknown): data is QueuedTask {
      return (
        data !== null &&
        typeof data === "object" &&
        "id" in data &&
        "status" in data &&
        "createdAt" in data &&
        "originTab" in data &&
        "attempts" in data
      );
    }

    // Helper function to safely extract task result
    function isTaskResult(data: unknown): data is TaskResult {
      return (
        data !== null &&
        typeof data === "object" &&
        "id" in data &&
        "duration" in data &&
        "executedBy" in data
      );
    }

    // Helper function to safely extract queue snapshot
    function isQueuedTaskArray(data: unknown): data is QueuedTask[] {
      return Array.isArray(data) && data.every(isQueuedTask);
    }

    return {
      type: payload.queueMessageType,
      resourceId: msg.resourceId,
      senderId: msg.senderId,
      targetId: msg.targetId,
      payload: msg.payload,
      timestamp: msg.timestamp,
      taskData: isQueuedTask(payload.taskData) ? payload.taskData : undefined,
      taskResult: isTaskResult(payload.taskResult) ? payload.taskResult : undefined,
      queueSnapshot: isQueuedTaskArray(payload.queueSnapshot) ? payload.queueSnapshot : undefined
    };
  }

  /**
   * Clear timeout for a specific task
   */
  private clearTaskTimeout(taskId: string): void {
    const timeoutHandle = this.taskTimeouts.get(taskId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.taskTimeouts.delete(taskId);
    }
  }

  /**
   * Clear all task timeouts
   */
  private clearAllTaskTimeouts(): void {
    for (const timeoutHandle of this.taskTimeouts.values()) {
      clearTimeout(timeoutHandle);
    }
    this.taskTimeouts.clear();
  }

  /**
   * Notify task callbacks
   */
  private notifyTaskCallbacks(task: QueuedTask, result?: TaskResult, error?: Error): void {
    for (const callback of this.taskCallbacks) {
      try {
        callback(task, result, error);
      } catch (err) {
        logger.error("queuecoordinator", "Error in task callback", {
          taskId: task.id,
          error: err instanceof Error ? err.message : "Unknown error"
        });
      }
    }
  }
}

// Export convenience function to create a queued resource coordinator
export function createQueuedResourceCoordinator(
  bus: EventBus,
  options: QueueCoordinatorOptions
): QueuedResourceCoordinator {
  return new QueuedResourceCoordinator(bus, options);
}