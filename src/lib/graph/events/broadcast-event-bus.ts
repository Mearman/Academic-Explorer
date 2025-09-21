/**
 * BroadcastChannel-based Event Bus
 * Provides cross-context communication between main thread and workers using the native BroadcastChannel API
 * Based on modern browser standards for efficient multi-context messaging
 */

import { logger } from "@/lib/logger";
import { WorkerEventType, type WorkerEventPayloads } from "./types";

export interface BusEvent {
  type: string;
  payload?: unknown;
  messageId?: string;
  timestamp: number;
  sourceContext: "main" | "worker";
  targetContext?: "main" | "worker" | "all";
}

interface EventListener {
  id: string;
  handler: (event: BusEvent) => void;
  once?: boolean;
}

export class BroadcastEventBus {
  private static instance: BroadcastEventBus | null = null;
  private channel: BroadcastChannel;
  private listeners = new Map<string, Set<EventListener>>();
  private currentContext: "main" | "worker";
  private messageIdCounter = 0;

  private constructor(channelName: string = "academic-explorer-events") {
    this.channel = new BroadcastChannel(channelName);
    this.currentContext = typeof window === "undefined" ? "worker" : "main";
    this.setupMessageHandling();

    logger.debug("eventbridge", `BroadcastEventBus initialized in ${this.currentContext} context`, {
      channelName,
      context: this.currentContext
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(channelName?: string): BroadcastEventBus {
    if (!BroadcastEventBus.instance) {
      BroadcastEventBus.instance = new BroadcastEventBus(channelName);
    }
    return BroadcastEventBus.instance;
  }

  /**
   * Emit an event to the broadcast channel
   */
  emit(event: BusEvent): void {
    try {
      const messageId = `${this.currentContext}-${Date.now().toString()}-${(++this.messageIdCounter).toString()}`;
      const enrichedEvent: BusEvent = {
        ...event,
        messageId,
        timestamp: event.timestamp || Date.now(),
        sourceContext: this.currentContext
      };

      this.channel.postMessage(enrichedEvent);

      logger.debug("eventbridge", "Event emitted to broadcast channel", {
        type: event.type,
        messageId,
        targetContext: event.targetContext,
        sourceContext: this.currentContext
      });
    } catch (error) {
      logger.error("eventbridge", "Failed to emit event to broadcast channel", {
        type: event.type,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Listen for events of a specific type
   */
  listen(eventType: string, handler: (event: BusEvent) => void, options?: { once?: boolean }): string {
    const listenerId = `${eventType}-${Date.now().toString()}-${Math.random().toString(36).substring(2)}`;

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listener: EventListener = {
      id: listenerId,
      handler,
      once: options?.once
    };

    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.add(listener);
    }

    logger.debug("eventbridge", "Event listener registered", {
      eventType,
      listenerId,
      once: options?.once
    });

    return listenerId;
  }

  /**
   * Remove a specific listener
   */
  removeListener(listenerId: string): boolean {
    for (const [eventType, listeners] of this.listeners.entries()) {
      for (const listener of listeners) {
        if (listener.id === listenerId) {
          listeners.delete(listener);
          if (listeners.size === 0) {
            this.listeners.delete(eventType);
          }
          logger.debug("eventbridge", "Event listener removed", { listenerId, eventType });
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      logger.debug("eventbridge", "All listeners removed for event type", { eventType });
    } else {
      this.listeners.clear();
      logger.debug("eventbridge", "All listeners removed");
    }
  }

  /**
   * Listen for an event once
   */
  once(eventType: string, handler: (event: BusEvent) => void): string {
    return this.listen(eventType, handler, { once: true });
  }

  /**
   * Get the current context (main or worker)
   */
  getCurrentContext(): "main" | "worker" {
    return this.currentContext;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): Record<string, unknown> {
    const listenerCounts: Record<string, number> = {};
    for (const [eventType, listeners] of this.listeners.entries()) {
      listenerCounts[eventType] = listeners.size;
    }

    return {
      currentContext: this.currentContext,
      listenerCounts,
      totalListeners: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }

  /**
   * Setup message handling for incoming broadcast events
   */
  private setupMessageHandling(): void {
    this.channel.onmessage = (messageEvent: MessageEvent<BusEvent>) => {
      const event = messageEvent.data;

      // Skip events from the same context to avoid loops
      if (event.sourceContext === this.currentContext) {
        return;
      }

      // Filter by target context if specified
      if (event.targetContext &&
          event.targetContext !== "all" &&
          event.targetContext !== this.currentContext) {
        return;
      }

      this.handleIncomingEvent(event);
    };
  }

  /**
   * Handle incoming events from other contexts
   */
  private handleIncomingEvent(event: BusEvent): void {
    const listeners = this.listeners.get(event.type);
    if (!listeners || listeners.size === 0) {
      return;
    }

    logger.debug("eventbridge", "Handling incoming broadcast event", {
      type: event.type,
      messageId: event.messageId,
      sourceContext: event.sourceContext,
      listenerCount: listeners.size
    });

    // Create a copy of listeners to avoid issues with concurrent modifications
    const listenersArray = Array.from(listeners);

    for (const listener of listenersArray) {
      try {
        listener.handler(event);

        // Remove one-time listeners
        if (listener.once) {
          listeners.delete(listener);
        }
      } catch (error) {
        logger.error("eventbridge", "Error in broadcast event handler", {
          type: event.type,
          listenerId: listener.id,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Clean up empty listener sets
    if (listeners.size === 0) {
      this.listeners.delete(event.type);
    }
  }

  /**
   * Close the broadcast channel and clean up resources
   */
  close(): void {
    this.channel.close();
    this.listeners.clear();
    logger.debug("eventbridge", "BroadcastEventBus closed and cleaned up");
  }

  /**
   * Reset singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    if (BroadcastEventBus.instance) {
      BroadcastEventBus.instance.close();
      BroadcastEventBus.instance = null;
    }
  }
}

// Create typed wrapper for worker events
export class WorkerEventBus {
  private eventBus: BroadcastEventBus;

  constructor(channelName?: string) {
    this.eventBus = BroadcastEventBus.getInstance(channelName);
  }

  /**
   * Emit a typed worker event
   */
  emit<T extends WorkerEventType>(
    eventType: T,
    payload: WorkerEventPayloads[T],
    targetContext?: "main" | "worker" | "all"
  ): void {
    this.eventBus.emit({
      type: eventType,
      payload,
      timestamp: Date.now(),
      sourceContext: this.eventBus.getCurrentContext(),
      targetContext
    });
  }

  /**
   * Listen for typed worker events
   */
  listen<T extends WorkerEventType>(
    eventType: T,
    handler: (payload: WorkerEventPayloads[T]) => void,
    options?: { once?: boolean }
  ): string {
    return this.eventBus.listen(eventType, (event) => {
      // Type-safe payload extraction
      if (event.payload && typeof event.payload === "object" && event.payload !== null) {
        // Validate payload structure before calling handler
        const payload = event.payload;
        if (this.isValidWorkerEventPayload(payload, eventType)) {
          handler(payload);
        }
      }
    }, options);
  }

  /**
   * Validate that a payload matches the expected structure for a worker event type
   */
  private isValidWorkerEventPayload<T extends WorkerEventType>(payload: unknown, eventType: T): payload is WorkerEventPayloads[T] {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return false;
    }

    // All worker events should have these base properties
    if (!("workerId" in payload) || typeof payload.workerId !== "string" ||
        !("timestamp" in payload) || typeof payload.timestamp !== "number") {
      return false;
    }

    // Type-specific validation
    switch (eventType) {
      case WorkerEventType.WORKER_ERROR:
        return "error" in payload && typeof payload.error === "string";
      default:
        return true; // Allow other events with basic validation
    }
  }

  /**
   * Listen for a worker event once
   */
  once<T extends WorkerEventType>(
    eventType: T,
    handler: (payload: WorkerEventPayloads[T]) => void
  ): string {
    return this.listen(eventType, handler, { once: true });
  }

  /**
   * Remove listener
   */
  removeListener(listenerId: string): boolean {
    return this.eventBus.removeListener(listenerId);
  }

  /**
   * Remove all listeners for an event type
   */
  removeAllListeners(eventType?: WorkerEventType): void {
    this.eventBus.removeAllListeners(eventType);
  }

  /**
   * Get debug information
   */
  getDebugInfo(): Record<string, unknown> {
    return this.eventBus.getDebugInfo();
  }
}

// Export singleton instances
export const broadcastEventBus = BroadcastEventBus.getInstance();
export const workerEventBus = new WorkerEventBus();