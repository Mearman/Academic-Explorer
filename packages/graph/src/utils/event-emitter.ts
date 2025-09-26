/**
 * Browser-compatible EventEmitter implementation
 * Replaces Node.js events module for browser compatibility
 */

import { logger } from "@academic-explorer/utils";

type EventListener = (...args: unknown[]) => void;

export class EventEmitter {
  private events = new Map<string, Set<EventListener>>();
  private maxListeners = 10;

  on(event: string, listener: EventListener): this {
    // Ensure the event has a listeners set
    let listeners = this.events.get(event);
    if (!listeners) {
      listeners = new Set();
      this.events.set(event, listeners);
    }

    listeners.add(listener);

    // Warn if too many listeners (like Node.js EventEmitter)
    if (listeners.size > this.maxListeners) {
      logger.warn("event-emitter", `Possible EventEmitter memory leak detected. ${listeners.size} listeners added to event "${event}". Use setMaxListeners() to increase limit.`);
    }

    return this;
  }

  off(event: string, listener: EventListener): this {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  // Alias for Node.js compatibility
  removeListener(event: string, listener: EventListener): this {
    return this.off(event, listener);
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) {
      return false;
    }

    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (error) {
        logger.error("event-emitter", "EventEmitter listener error", { error });
      }
    }

    return true;
  }

  once(event: string, listener: EventListener): this {
    const onceWrapper = (...args: unknown[]) => {
      this.off(event, onceWrapper);
      listener(...args);
    };

    return this.on(event, onceWrapper);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }

  setMaxListeners(max: number): this {
    this.maxListeners = max;
    return this;
  }

  getMaxListeners(): number {
    return this.maxListeners;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}