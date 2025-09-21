/**
 * Simplified Background Worker with Unified Event System
 * Uses proper emit format for EventBus
 */

import { WorkerEventType } from "@/lib/graph/events/types";
import { createLocalEventBus } from "@/lib/graph/events";
import { logger } from "@/lib/logger";

// Create worker event bus for cross-context communication
const workerEventBus = createLocalEventBus();

// Initialize worker
function initializeWorker() {
  try {
    // Emit worker ready event
    workerEventBus.emit({
      type: WorkerEventType.WORKER_READY,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation",
        timestamp: Date.now()
      }
    });

    logger.debug("worker", "Simplified background worker initialized successfully");
  } catch (error) {
    logger.error("worker", "Failed to initialize simplified background worker", { error });
    workerEventBus.emit({
      type: WorkerEventType.WORKER_ERROR,
      payload: {
        workerId: "background-worker",
        workerType: "force-animation",
        error: error instanceof Error ? error.message : "Failed to initialize worker",
        timestamp: Date.now()
      }
    });
  }
}

// Type guard for worker messages
function isWorkerMessage(data: unknown): data is { type: string } {
  if (data === null || typeof data !== "object") {
    return false;
  }

  if (!("type" in data)) {
    return false;
  }

  return typeof data.type === "string";
}

// Message handling
self.onmessage = (e: MessageEvent) => {
  const data: unknown = e.data;

  if (isWorkerMessage(data)) {
    switch (data.type) {
      case "FORCE_SIMULATION_START":
        // Emit simulation started
        workerEventBus.emit({
          type: WorkerEventType.FORCE_SIMULATION_PROGRESS,
          payload: {
            workerId: "background-worker",
            workerType: "force-animation",
            messageType: "started",
            timestamp: Date.now()
          }
        });
        break;

      case "FORCE_SIMULATION_STOP":
        // Emit simulation stopped
        workerEventBus.emit({
          type: WorkerEventType.FORCE_SIMULATION_STOPPED,
          payload: {
            workerId: "background-worker",
            workerType: "force-animation",
            timestamp: Date.now()
          }
        });
        break;

      default:
        logger.warn("worker", "Unknown message type", { type: data.type });
    }
  }
};

// Initialize worker on startup
try {
  initializeWorker();
} catch (error: unknown) {
  // Worker initialization error
  workerEventBus.emit({
    type: WorkerEventType.WORKER_ERROR,
    payload: {
      workerId: "background-worker",
      workerType: "force-animation",
      error: String(error),
      timestamp: Date.now()
    }
  });
}