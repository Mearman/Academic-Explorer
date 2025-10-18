/**
 * Framework-agnostic event system for simulation events
 * Provides a simple observer pattern for simulation progress and completion events
 */

import type { NodePosition } from "../types/index.js";

// Base event interface
export interface BaseSimulationEvent {
  type: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Progress event for simulation updates
export interface SimulationProgressEvent extends BaseSimulationEvent {
  type: "progress";
  messageType: "started" | "tick" | "paused" | "resumed" | "parameters_updated";
  positions?: NodePosition[];
  alpha?: number;
  iteration?: number;
  fps?: number;
  nodeCount?: number;
  linkCount?: number;
}

// Completion event for simulation end
export interface SimulationCompleteEvent extends BaseSimulationEvent {
  type: "complete";
  reason: "converged" | "max-iterations" | "stopped";
  positions: NodePosition[];
  totalIterations: number;
  finalAlpha: number;
}

// Error event for simulation failures
export interface SimulationErrorEvent extends BaseSimulationEvent {
  type: "error";
  message: string;
  context?: Record<string, unknown>;
}

// Debug event for development and diagnostics
export interface SimulationDebugEvent extends BaseSimulationEvent {
  type: "debug";
  message: string;
  context?: Record<string, unknown>;
}

// Union of all simulation events
export type SimulationEvent =
  | SimulationProgressEvent
  | SimulationCompleteEvent
  | SimulationErrorEvent
  | SimulationDebugEvent;

// Event handler function type
export type SimulationEventHandler<
  T extends SimulationEvent = SimulationEvent,
> = (event: T) => void;

// Event subscription interface
export interface EventSubscription {
  unsubscribe: () => void;
}

// Simple event emitter for simulation events
export class SimulationEventEmitter {
  private handlers = new Map<
    string,
    Set<SimulationEventHandler<SimulationEvent>>
  >();
  private globalHandlers = new Set<SimulationEventHandler<SimulationEvent>>();

  // Subscribe to events of a specific type
  on<T extends SimulationEvent["type"]>(
    eventType: T,
    handler: SimulationEventHandler<SimulationEvent>,
  ): EventSubscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      throw new Error(`No handlers found for event type: ${eventType}`);
    }
    handlers.add(handler);

    return {
      unsubscribe: () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      },
    };
  }

  // Subscribe to all events
  onAny(handler: SimulationEventHandler): EventSubscription {
    this.globalHandlers.add(handler);

    return {
      unsubscribe: () => {
        this.globalHandlers.delete(handler);
      },
    };
  }

  // Emit an event to all subscribers
  emit(event: SimulationEvent): void {
    // Call specific event type handlers
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          // Emit error event if handler throws
          this.emitError(`Event handler error for ${event.type}`, {
            originalEvent: event,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    }

    // Call global handlers
    this.globalHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        // Emit error event if handler throws
        this.emitError(`Global event handler error for ${event.type}`, {
          originalEvent: event,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  // Convenience method to emit progress events
  emitProgress(
    payload: Omit<SimulationProgressEvent, "type" | "timestamp">,
  ): void {
    this.emit({
      type: "progress",
      timestamp: Date.now(),
      ...payload,
    });
  }

  // Convenience method to emit completion events
  emitComplete(
    payload: Omit<SimulationCompleteEvent, "type" | "timestamp">,
  ): void {
    this.emit({
      type: "complete",
      timestamp: Date.now(),
      ...payload,
    });
  }

  // Convenience method to emit error events
  emitError(message: string, context?: Record<string, unknown>): void {
    this.emit({
      type: "error",
      timestamp: Date.now(),
      message,
      ...(context && { context }),
    });
  }

  // Convenience method to emit debug events
  emitDebug(message: string, context?: Record<string, unknown>): void {
    this.emit({
      type: "debug",
      timestamp: Date.now(),
      message,
      ...(context && { context }),
    });
  }

  // Remove all event handlers
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
  }

  // Get count of handlers for an event type
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  // Get all registered event types
  getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Type guards for events
export function isProgressEvent(
  event: SimulationEvent,
): event is SimulationProgressEvent {
  return event.type === "progress";
}

export function isCompleteEvent(
  event: SimulationEvent,
): event is SimulationCompleteEvent {
  return event.type === "complete";
}

export function isErrorEvent(
  event: SimulationEvent,
): event is SimulationErrorEvent {
  return event.type === "error";
}

export function isDebugEvent(
  event: SimulationEvent,
): event is SimulationDebugEvent {
  return event.type === "debug";
}
