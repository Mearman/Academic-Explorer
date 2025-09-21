/**
 * BroadcastChannel-based event bus implementation.
 * Provides cross-context messaging following the patterns described in the
 * worker off-loading and event coordination design notes.
 */

import { logger } from "@/lib/logger";
import { WorkerEventType, WorkerEventPayloadSchemas, parseWorkerEventPayload, type WorkerEventPayloads } from "./types";

function isBusEvent(value: unknown): value is BusEvent {
  return typeof value === "object" && value !== null && "type" in value;
}

export interface BusEvent {
  type: string;
  payload?: unknown;
  requestId?: string;
  timestamp?: number;
  source?: "local" | "remote";
}

interface ListenerEntry {
  handler: (event: BusEvent) => void;
  once: boolean;
}

/**
 * Event bus that optionally mirrors messages through BroadcastChannel.
 * Each channel name receives its own singleton instance.
 */
export class BroadcastEventBus {
  private static instances = new Map<string, BroadcastEventBus>();

  private readonly listeners = new Map<string, Map<string, ListenerEntry>>();
  private readonly channelName: string;
  private readonly channel?: BroadcastChannel;
  private disposed = false;

  private constructor(channelName: string) {
    this.channelName = channelName;

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = event => {
        if (isBusEvent(event.data)) {
          this.dispatch(event.data, { fromChannel: true });
        }
      };
    } else {
      logger.warn("eventbridge", "BroadcastChannel unavailable - operating in local mode", { channelName });
    }
  }

  static getInstance(channelName = "academic-explorer-events"): BroadcastEventBus {
    const existing = BroadcastEventBus.instances.get(channelName);
    if (existing) {
      return existing;
    }

    const instance = new BroadcastEventBus(channelName);
    BroadcastEventBus.instances.set(channelName, instance);
    return instance;
  }

  emit(event: BusEvent): void {
    if (this.disposed) {
      return;
    }

    const enriched: BusEvent = {
      ...event,
      timestamp: event.timestamp ?? Date.now(),
      source: event.source ?? "local"
    };

    this.dispatch(enriched, { fromChannel: false });
  }

  listen(
    eventType: string,
    ...[handler, options]: [(event: BusEvent) => void, { once?: boolean }?]
  ): string {
    const listenerId = `${eventType}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    const eventListeners = this.listeners.get(eventType);
    const entry: ListenerEntry = {
      handler,
      once: options?.once ?? false
    };

    if (eventListeners) {
      eventListeners.set(listenerId, entry);
    } else {
      const map = new Map<string, ListenerEntry>();
      map.set(listenerId, entry);
      this.listeners.set(eventType, map);
    }

    return listenerId;
  }

  once(...[eventType, handler]: [string, (event: BusEvent) => void]): string {
    return this.listen(eventType, handler, { once: true });
  }

  removeListener(listenerId: string): boolean {
    for (const [eventType, handlers] of this.listeners.entries()) {
      if (handlers.delete(listenerId)) {
        if (handlers.size === 0) {
          this.listeners.delete(eventType);
        }
        return true;
      }
    }

    return false;
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      return;
    }

    this.listeners.clear();
  }

  close(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.channel?.close();
    this.listeners.clear();
  }

  getDebugInfo(): Record<string, unknown> {
    const listenerCounts: Record<string, number> = {};
    for (const [eventType, handlers] of this.listeners.entries()) {
      listenerCounts[eventType] = handlers.size;
    }

    return {
      channelName: this.channelName,
      listenerCounts,
      totalListeners: Object.values(listenerCounts).reduce((sum, count) => sum + count, 0)
    };
  }

  static resetInstance(channelName?: string): void {
    if (channelName) {
      const bus = BroadcastEventBus.instances.get(channelName);
      bus?.close();
      BroadcastEventBus.instances.delete(channelName);
      return;
    }

    for (const bus of BroadcastEventBus.instances.values()) {
      bus.close();
    }
    BroadcastEventBus.instances.clear();
  }

  private dispatch(event: BusEvent, { fromChannel }: { fromChannel: boolean }): void {
    if (this.disposed) {
      return;
    }

    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const [listenerId, entry] of handlers.entries()) {
        try {
          entry.handler({
            ...event,
            source: fromChannel ? "remote" : (event.source ?? "local"),
            timestamp: event.timestamp ?? Date.now()
          });
        } catch (error) {
          logger.error("eventbridge", "Error running event listener", {
            eventType: event.type,
            listenerId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }

        if (entry.once) {
          handlers.delete(listenerId);
        }
      }

      if (handlers.size === 0) {
        this.listeners.delete(event.type);
      }
    }

    if (!fromChannel && this.channel) {
      try {
        this.channel.postMessage({
          ...event,
          source: "local",
          timestamp: event.timestamp ?? Date.now()
        });
      } catch (error) {
        logger.error("eventbridge", "Failed to post event to BroadcastChannel", {
          eventType: event.type,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }
}

export class WorkerEventBus {
  private readonly bus: BroadcastEventBus;

  constructor(channelName = "academic-explorer-worker-events") {
    this.bus = BroadcastEventBus.getInstance(channelName);
  }

  emit<T extends WorkerEventType>(
    ...[eventType, payload]: [T, WorkerEventPayloads[T]]
  ): void {
    this.bus.emit({
      type: eventType,
      payload,
      timestamp: Date.now()
    });
  }

  emitUnknown(...[eventType, payload]: [string, unknown]): void {
    this.bus.emit({
      type: eventType,
      payload,
      timestamp: Date.now()
    });
  }

  listen<T extends WorkerEventType>(
    ...[eventType, handler, options]: [
      T,
      (payload: WorkerEventPayloads[T]) => void,
      { once?: boolean }?
    ]
  ): string {
    const schema = WorkerEventPayloadSchemas[eventType];
    return this.bus.listen(
      eventType,
      event => {
        const parsed = parseWorkerEventPayload(event.payload, eventType, schema);
        if (parsed !== null) {
          handler(parsed);
        }
      },
      options
    );
  }

  once<T extends WorkerEventType>(
    ...[eventType, handler]: [T, (payload: WorkerEventPayloads[T]) => void]
  ): string {
    return this.listen(eventType, handler, { once: true });
  }

  removeListener(listenerId: string): boolean {
    return this.bus.removeListener(listenerId);
  }

  removeAllListeners(eventType?: WorkerEventType): void {
    this.bus.removeAllListeners(eventType);
  }

  getDebugInfo(): Record<string, unknown> {
    return this.bus.getDebugInfo();
  }
}

export const broadcastEventBus = BroadcastEventBus.getInstance();
export const workerEventBus = new WorkerEventBus();
