/**
 * BroadcastChannel-based Event Bus
 * Simplified implementation inspired by the Web Worker integration notes.
 * Provides a lightweight publish/subscribe API that works in both the main
 * thread and worker contexts while remaining easy to reason about.
 */

import { logger } from "@/lib/logger";
import { WorkerEventType, type WorkerEventPayloads } from "./types";

export interface BusEvent {
  type: string;
  payload?: unknown;
}

interface EventListener {
  id: string;
  handler: (event: BusEvent) => void;
  once: boolean;
}

function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

function isWorkerPayload<T extends WorkerEventType>(
  type: T,
  payload: unknown
): payload is WorkerEventPayloads[T] {
  void type;
  return payload !== undefined;
}

/**
 * Small event bus that mirrors the API described in the worker integration
 * document. It keeps a per-channel singleton so UI code and workers can share
 * the same instance when they use the same channel name.
 */
export class BroadcastEventBus {
  private static instances = new Map<string, BroadcastEventBus>();

  private readonly listeners = new Map<string, Set<EventListener>>();
  private readonly channel?: BroadcastChannel;

  private constructor(private readonly channelName: string) {
    if (isBroadcastChannelSupported()) {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event: MessageEvent<BusEvent>) => {
        this.dispatch(event.data);
      };
    }
  }

  /**
   * Retrieve or create the singleton instance for a channel name.
   */
  static getInstance(channelName = "academic-explorer-events"): BroadcastEventBus {
    let instance = this.instances.get(channelName);
    if (!instance) {
      instance = new BroadcastEventBus(channelName);
      this.instances.set(channelName, instance);
    }
    return instance;
  }

  /**
   * Emit an event. Listeners in the current context receive the event
   * immediately. If BroadcastChannel is available the event is also
   * propagated to other contexts on the same origin.
   */
  emit(event: BusEvent): void {
    this.dispatch(event);
    try {
      this.channel?.postMessage(event);
    } catch (error) {
      logger.error("eventbridge", "BroadcastEventBus failed to post message", {
        channel: this.channelName,
        error,
      });
    }
  }

  /**
   * Subscribe to an event type. Returns a listener id that can be used to
   * remove the listener later.
   */
  listen(eventType: string, handler: (event: BusEvent) => void, options?: { once?: boolean }): string {
    const listenerId = `${eventType}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    const listener: EventListener = {
      id: listenerId,
      handler,
      once: Boolean(options?.once),
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    const listenersForType = this.listeners.get(eventType);
    listenersForType?.add(listener);

    return listenerId;
  }

  /**
   * Convenience helper to register a listener that automatically removes
   * itself after the first event.
   */
  once(eventType: string, handler: (event: BusEvent) => void): string {
    return this.listen(eventType, handler, { once: true });
  }

  /**
   * Remove a listener by id. Returns true when the listener existed.
   */
  removeListener(listenerId: string): boolean {
    for (const [eventType, listeners] of this.listeners.entries()) {
      for (const listener of listeners) {
        if (listener.id === listenerId) {
          listeners.delete(listener);
          if (listeners.size === 0) {
            this.listeners.delete(eventType);
          }
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Remove all listeners for an event type or, when no type is provided,
   * remove every registered listener.
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      return;
    }
    this.listeners.clear();
  }

  /**
   * Close the underlying BroadcastChannel and clear all listeners.
   */
  close(): void {
    this.channel?.close();
    this.listeners.clear();
    BroadcastEventBus.instances.delete(this.channelName);
  }

  /**
   * Helper used by unit tests to reset all cached instances.
   */
  static resetInstance(): void {
    for (const instance of this.instances.values()) {
      instance.close();
    }
    this.instances.clear();
  }

  private dispatch(event: BusEvent): void {
    const listeners = this.listeners.get(event.type);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const snapshot = Array.from(listeners);
      for (const listener of snapshot) {
        try {
          listener.handler(event);
        } catch (error) {
          logger.error("eventbridge", "BroadcastEventBus listener error", {
            eventType: event.type,
            error,
          });
        }

        if (listener.once) {
          listeners.delete(listener);
        }
    }

    if (listeners.size === 0) {
      this.listeners.delete(event.type);
    }
  }
}

/**
 * Light wrapper dedicated to worker events. It keeps the old ergonomic API
 * (emit/listen/once) but delegates to the simplified BroadcastEventBus.
 */
export class WorkerEventBus {
  private readonly bus: BroadcastEventBus;

  constructor(channelName = "academic-explorer-worker-events") {
    this.bus = BroadcastEventBus.getInstance(channelName);
  }

  emit<T extends WorkerEventType>(type: T, payload: WorkerEventPayloads[T]): void {
    this.bus.emit({ type, payload });
  }

  listen<T extends WorkerEventType>(
    type: T,
    handler: (payload: WorkerEventPayloads[T]) => void,
    options?: { once?: boolean }
  ): string {
    return this.bus.listen(type, (event) => {
      if (!isWorkerPayload(type, event.payload)) {
        return;
      }
      handler(event.payload);
    }, options);
  }

  once<T extends WorkerEventType>(type: T, handler: (payload: WorkerEventPayloads[T]) => void): string {
    return this.listen(type, handler, { once: true });
  }

  removeListener(listenerId: string): boolean {
    return this.bus.removeListener(listenerId);
  }

  removeAllListeners(type?: WorkerEventType): void {
    this.bus.removeAllListeners(type);
  }

  close(): void {
    this.bus.close();
  }
}

export const broadcastEventBus = BroadcastEventBus.getInstance();
export const workerEventBus = new WorkerEventBus();
