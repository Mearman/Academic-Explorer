/**
 * Base event emitter class providing core event handling functionality
 * Used as foundation for all event system levels
 */

import { logger } from "@/lib/logger";
import type { BaseListenerOptions, EventSystemListener, EventEmitter } from "./types";

export class BaseEventEmitter<TEventType extends string, TPayload> implements EventEmitter<TEventType, TPayload> {
  private listeners = new Map<TEventType, EventSystemListener<TPayload>[]>();
  private nextId = 1;

  /**
   * Emit an event to all registered listeners
   */
  async emit(eventType: TEventType, payload: TPayload): Promise<void> {
    const eventListeners = this.listeners.get(eventType) || [];

    if (eventListeners.length === 0) {
      logger.debug("general", `No listeners for event type: ${eventType}`);
      return;
    }

    logger.debug("general", `Emitting event ${eventType} to ${String(eventListeners.length)} listeners`);

    // Sort by priority (higher priority first)
    const sortedListeners = [...eventListeners].sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

    // Execute listeners
    const promises: Promise<void>[] = [];
    const listenersToRemove: string[] = [];

    for (const listener of sortedListeners) {
      try {
        // Check condition if provided
        if (listener.options.condition && !listener.options.condition(payload)) {
          continue;
        }

        // Execute handler
        const result = listener.handler(payload);
        if (result instanceof Promise) {
          promises.push(result);
        }

        // Mark for removal if once-only
        if (listener.options.once) {
          listenersToRemove.push(listener.id);
        }
      } catch (error) {
        logger.error("general", `Error executing event listener for ${eventType}`, {
          error: error instanceof Error ? error.message : "Unknown error",
          listenerId: listener.id
        });
      }
    }

    // Wait for all async handlers to complete
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    // Remove once-only listeners
    for (const listenerId of listenersToRemove) {
      this.off(listenerId);
    }
  }

  /**
   * Register an event listener
   */
  on(eventType: TEventType, handler: (payload: TPayload) => void | Promise<void>, options: BaseListenerOptions = {}): string {
    const listenerId = `${eventType}-${String(this.nextId++)}`;

    const listener: EventSystemListener<TPayload> = {
      id: listenerId,
      handler,
      options
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const eventListeners = this.listeners.get(eventType);
    if (!eventListeners) {
      logger.error("general", `Event listeners array not found for ${eventType}`);
      return listenerId;
    }
    eventListeners.push(listener);

    logger.debug("general", `Registered listener for ${eventType}`, {
      listenerId,
      options,
      totalListeners: String(this.listeners.get(eventType)?.length ?? 0)
    });

    return listenerId;
  }

  /**
   * Remove a specific event listener
   */
  off(listenerId: string): boolean {
    for (const [eventType, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);

        // Clean up empty arrays
        if (listeners.length === 0) {
          this.listeners.delete(eventType);
        }

        logger.debug("general", `Removed listener ${listenerId} for ${eventType}`);
        return true;
      }
    }

    logger.warn("general", `Attempted to remove non-existent listener: ${listenerId}`);
    return false;
  }

  /**
   * Register a one-time event listener
   */
  once(eventType: TEventType, handler: (payload: TPayload) => void | Promise<void>): string {
    return this.on(eventType, handler, { once: true });
  }

  /**
   * Remove all listeners for a specific event type or all listeners
   */
  removeAllListeners(eventType?: TEventType): void {
    if (eventType) {
      const count = this.listeners.get(eventType)?.length || 0;
      this.listeners.delete(eventType);
      logger.debug("general", `Removed all ${String(count)} listeners for ${eventType}`);
    } else {
      const totalCount = Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0);
      this.listeners.clear();
      logger.debug("general", `Removed all ${String(totalCount)} listeners from event emitter`);
    }
  }

  /**
   * Get the number of listeners for a specific event type
   */
  getListenerCount(eventType: TEventType): number {
    return this.listeners.get(eventType)?.length || 0;
  }

  /**
   * Get all registered event types
   */
  getEventTypes(): TEventType[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if there are any listeners for a specific event type
   */
  hasListeners(eventType: TEventType): boolean {
    return this.getListenerCount(eventType) > 0;
  }

  /**
   * Get debug information about the event emitter state
   */
  getDebugInfo(): Record<string, unknown> {
    const eventCounts: Record<string, number> = {};
    for (const [eventType, listeners] of this.listeners.entries()) {
      eventCounts[eventType] = listeners.length;
    }

    return {
      totalEventTypes: this.listeners.size,
      totalListeners: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0),
      eventCounts,
      nextId: this.nextId
    };
  }
}