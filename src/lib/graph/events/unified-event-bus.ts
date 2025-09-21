/**
 * Unified Event Bus
 * Provides a consistent API for emitting and listening to events regardless of context
 * Based on the ChatGPT document specification for unified event handling
 */

import { logger } from "@/lib/logger";

export type EventHandler = (event: { type: string; payload?: unknown }) => void;

export interface BusEvent {
  type: string;
  payload?: unknown;
  timestamp: number;
  messageId: string;
  sourceContext?: "main" | "worker";
}

/**
 * Unified EventBus that works in all contexts (main thread, workers, cross-tab)
 * - For local events: instantiate without channelName
 * - For cross-tab events: provide channelName to use BroadcastChannel
 */
export class EventBus {
  private target = new EventTarget();
  private channel?: BroadcastChannel;
  private messageIdCounter = 0;
  private listeners = new Map<string, Set<EventHandler>>();
  private readonly channelName?: string;

  constructor(channelName?: string) {
    this.channelName = channelName;

    if (channelName) {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (ev: MessageEvent<BusEvent>) => {
        // Dispatch to local listeners without re-broadcasting
        this.dispatchLocal(ev.data);
      };

      logger.debug("eventbus", "EventBus initialized with BroadcastChannel", {
        channelName,
        hasBroadcast: true
      });
    } else {
      logger.debug("eventbus", "EventBus initialized for local events only", {
        hasBroadcast: false
      });
    }
  }

  /**
   * Register a handler for a specific event type
   */
  on(type: string, handler: EventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.add(handler);
    }

    // Also register with EventTarget for consistency
    const wrappedHandler = (e: Event) => {
      if (e instanceof CustomEvent &&
          e.detail &&
          typeof e.detail === "object" &&
          "type" in e.detail &&
          typeof (e.detail as Record<string, unknown>).type === "string") {
        const eventDetail = e.detail as { type: string; payload?: unknown };
        handler(eventDetail);
      }
    };

    this.target.addEventListener(type, wrappedHandler);

    const listenerId = `${type}-${Date.now().toString()}-${Math.random().toString(36).substring(2)}`;

    logger.debug("eventbus", "Event handler registered", {
      type,
      listenerId,
      channelName: this.channelName
    });

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(handler);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
      this.target.removeEventListener(type, wrappedHandler);

      logger.debug("eventbus", "Event handler unregistered", {
        type,
        listenerId,
        channelName: this.channelName
      });
    };
  }

  /**
   * Register a handler for one-time execution
   */
  once(type: string, handler: EventHandler): () => void {
    const unsubscribe = this.on(type, (event) => {
      handler(event);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * Remove a specific handler
   */
  off(type: string, handler: EventHandler): boolean {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      const removed = typeListeners.delete(handler);
      if (typeListeners.size === 0) {
        this.listeners.delete(type);
      }
      return removed;
    }
    return false;
  }

  /**
   * Remove all handlers for a type, or all handlers if no type specified
   */
  removeAllListeners(type?: string): void {
    if (type) {
      this.listeners.delete(type);
      logger.debug("eventbus", "All listeners removed for type", { type });
    } else {
      this.listeners.clear();
      logger.debug("eventbus", "All listeners removed");
    }
  }

  /**
   * Emit an event - dispatches locally and broadcasts if channel exists
   */
  emit(event: { type: string; payload?: unknown }): void {
    const enrichedEvent: BusEvent = {
      ...event,
      timestamp: Date.now(),
      messageId: this.generateMessageId(),
      sourceContext: typeof window === "undefined" ? "worker" : "main"
    };

    // Always dispatch locally
    this.dispatchLocal(enrichedEvent);

    // Broadcast to other contexts if channel exists
    if (this.channel) {
      try {
        this.channel.postMessage(enrichedEvent);
        logger.debug("eventbus", "Event broadcast to other contexts", {
          type: event.type,
          messageId: enrichedEvent.messageId,
          channelName: this.channelName
        });
      } catch (error) {
        logger.error("eventbus", "Failed to broadcast event", {
          type: event.type,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  /**
   * Check if this bus uses cross-tab broadcasting
   */
  isBroadcasting(): boolean {
    return !!this.channel;
  }

  /**
   * Get debug information about the bus
   */
  getDebugInfo(): Record<string, unknown> {
    const listenerCounts: Record<string, number> = {};
    for (const [type, listeners] of this.listeners.entries()) {
      listenerCounts[type] = listeners.size;
    }

    return {
      channelName: this.channelName,
      isBroadcasting: this.isBroadcasting(),
      listenerCounts,
      totalListeners: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }

  /**
   * Close the bus and clean up resources
   */
  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = undefined;
    }
    this.listeners.clear();

    logger.debug("eventbus", "EventBus closed and cleaned up", {
      channelName: this.channelName
    });
  }

  /**
   * Dispatch event only to local listeners (no broadcast)
   */
  private dispatchLocal(event: BusEvent): void {
    // Dispatch via EventTarget
    this.target.dispatchEvent(new CustomEvent(event.type, { detail: event }));

    // Dispatch via direct listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners && typeListeners.size > 0) {
      logger.debug("eventbus", "Dispatching to local listeners", {
        type: event.type,
        listenerCount: typeListeners.size,
        messageId: event.messageId
      });

      // Create array to avoid concurrent modification issues
      const listenersArray = Array.from(typeListeners);
      for (const listener of listenersArray) {
        try {
          listener(event);
        } catch (error) {
          logger.error("eventbus", "Error in event handler", {
            type: event.type,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    const context = typeof window === "undefined" ? "worker" : "main";
    return `${context}-${Date.now().toString()}-${(++this.messageIdCounter).toString()}`;
  }
}

// Export convenience factory functions
export function createLocalEventBus(): EventBus {
  return new EventBus();
}

export function createCrossTabEventBus(channelName: string): EventBus {
  return new EventBus(channelName);
}

// Export default bus instances
export const localEventBus = createLocalEventBus();
export const crossTabEventBus = createCrossTabEventBus("academic-explorer-unified");