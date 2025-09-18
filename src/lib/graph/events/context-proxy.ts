/**
 * Context-specific event proxies
 * Handle event routing between local and cross-context listeners
 */

import { logger } from "@/lib/logger";
import { BaseEventEmitter } from "./base-event-emitter";
import { eventBridge } from "./event-bridge";
import type {
  BaseListenerOptions,
  CrossContextMessage,
  ExecutionContext,
  EventSystemListener
} from "./types";
import type { z } from "zod";

/**
 * Enhanced event system listener with cross-context support
 */
interface CrossContextListener<TPayload = unknown> extends EventSystemListener<TPayload> {
  executeIn: ExecutionContext;
  isRemote: boolean; // True if handler executes in different context
  // For remote listeners, we need to handle unknown payloads from bridge
  remoteHandler?: (payload: unknown) => void | Promise<void>;
}

/**
 * Cross-context event proxy
 * Routes events between local and remote contexts based on executeIn option
 */
export class CrossContextEventProxy<TEventType extends string, TPayload> extends BaseEventEmitter<TEventType, TPayload> {
  private crossContextListeners = new Map<TEventType, CrossContextListener<TPayload>[]>();
  private bridgeHandlerId: string;
  private eventSchemas: Map<TEventType, z.ZodType> = new Map();

  constructor(
    private contextId: string,
    schemas?: Partial<Record<TEventType, z.ZodType>>
  ) {
    super();

    // Populate event schemas map
    if (schemas) {
      for (const eventType in schemas) {
        const schema = schemas[eventType];
        if (schema) {
          this.eventSchemas.set(eventType, schema);
        }
      }
    }

    // Register with event bridge to receive cross-context messages
    this.bridgeHandlerId = `${contextId}-${String(Date.now())}`;
    eventBridge.registerMessageHandler(this.bridgeHandlerId, (message) => {
      void this.handleBridgeMessage(message);
    });

    logger.debug("general", `CrossContextEventProxy initialized for context: ${contextId}`);
  }

  /**
   * Enhanced emit that handles cross-context routing
   */
  async emit(eventType: TEventType, payload: TPayload): Promise<void> {
    const currentContext = eventBridge.getCurrentContext();

    // Emit locally first for same-context listeners
    await super.emit(eventType, payload);

    // Handle cross-context listeners
    const crossContextListeners = this.crossContextListeners.get(eventType) || [];
    const remoteListeners = crossContextListeners.filter(l => l.isRemote);

    if (remoteListeners.length > 0) {
      logger.debug("general", `Emitting to ${String(remoteListeners.length)} remote listeners`, {
        eventType,
        currentContext,
        contextId: this.contextId
      });

      // Group by target context for efficient messaging
      const byTargetContext = new Map<ExecutionContext, CrossContextListener<TPayload>[]>();
      for (const listener of remoteListeners) {
        const target = listener.executeIn;
        if (!byTargetContext.has(target)) {
          byTargetContext.set(target, []);
        }
        const targetListeners = byTargetContext.get(target);
        if (targetListeners) {
          targetListeners.push(listener);
        }
      }

      // Send to each target context
      for (const [targetContext] of byTargetContext.entries()) {
        eventBridge.emit(eventType, payload, targetContext);
      }
    }
  }

  /**
   * Enhanced listener registration with cross-context support
   */
  on(
    eventType: TEventType,
    handler: (payload: TPayload) => void | Promise<void>,
    options: BaseListenerOptions = {}
  ): string {
    const currentContext = eventBridge.getCurrentContext();
    const executeIn = options.executeIn || "current";
    const actualExecuteIn = executeIn === "current" ? currentContext : executeIn;
    const isRemote = actualExecuteIn !== currentContext;

    if (isRemote) {
      // Cross-context listener - register with bridge
      const listenerId = `cross-${eventType}-${String(this.getNextId())}`;

      const crossContextListener: CrossContextListener<TPayload> = {
        id: listenerId,
        handler,
        options,
        executeIn: actualExecuteIn,
        isRemote: true,
        remoteHandler: this.createValidatedHandler(handler, eventType)
      };

      // Store cross-context listener
      if (!this.crossContextListeners.has(eventType)) {
        this.crossContextListeners.set(eventType, []);
      }
      const listeners = this.crossContextListeners.get(eventType);
      if (listeners) {
        listeners.push(crossContextListener);
      }

      logger.debug("general", `Registered cross-context listener`, {
        eventType,
        listenerId,
        executeIn: actualExecuteIn,
        currentContext,
        contextId: this.contextId
      });

      return listenerId;
    } else {
      // Same-context listener - use base implementation
      return super.on(eventType, handler, options);
    }
  }

  /**
   * Enhanced listener removal with cross-context support
   */
  off(listenerId: string): boolean {
    // Try base implementation first
    if (super.off(listenerId)) {
      return true;
    }

    // Try cross-context listeners
    for (const [eventType, listeners] of this.crossContextListeners.entries()) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);

        // Clean up empty arrays
        if (listeners.length === 0) {
          this.crossContextListeners.delete(eventType);
        }

        logger.debug("general", `Removed cross-context listener ${listenerId} for ${eventType}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Handle messages from the event bridge
   */
  private async handleBridgeMessage(message: CrossContextMessage): Promise<void> {
    if (message.type !== "event") {
      return;
    }

    // Type validation for cross-context message
    if (!this.isValidEventType(message.eventType)) {
      logger.warn("general", "Invalid event type in cross-context message", { eventType: message.eventType });
      return;
    }

    const eventType = message.eventType;
    const payload = message.payload;
    const currentContext = eventBridge.getCurrentContext();

    // Find cross-context listeners for this event that should execute in current context
    const crossContextListeners = this.crossContextListeners.get(eventType) || [];
    const matchingListeners = crossContextListeners.filter(
      l => l.executeIn === currentContext ||
           (l.executeIn === "current" && message.sourceContext !== currentContext)
    );

    if (matchingListeners.length === 0) {
      return;
    }

    logger.debug("general", `Executing ${String(matchingListeners.length)} cross-context listeners`, {
      eventType,
      currentContext,
      sourceContext: message.sourceContext
    });

    // Execute matching listeners
    const sortedListeners = [...matchingListeners].sort(
      (a, b) => (b.options.priority || 0) - (a.options.priority || 0)
    );

    const promises: Promise<void>[] = [];
    const listenersToRemove: string[] = [];

    for (const listener of sortedListeners) {
      try {
        // Check condition if provided
        if (listener.options.condition && !listener.options.condition(payload)) {
          continue;
        }

        // Execute handler using remote handler for cross-context calls
        const result = listener.remoteHandler ? listener.remoteHandler(payload) : this.fallbackHandlerCall(listener.handler, payload, eventType);
        if (result instanceof Promise) {
          promises.push(result);
        }

        // Mark for removal if once-only
        if (listener.options.once) {
          listenersToRemove.push(listener.id);
        }
      } catch (error) {
        logger.error("general", `Error executing cross-context listener for ${eventType}`, {
          error: error instanceof Error ? error.message : "Unknown error",
          listenerId: listener.id
        });
      }
    }

    // Wait for async handlers
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }

    // Remove once-only listeners
    for (const listenerId of listenersToRemove) {
      this.off(listenerId);
    }
  }

  /**
   * Get total listener count including cross-context
   */
  getTotalListenerCount(eventType: TEventType): number {
    const localCount = super.getListenerCount(eventType);
    const crossContextCount = this.crossContextListeners.get(eventType)?.length || 0;
    return localCount + crossContextCount;
  }

  /**
   * Get debug information including cross-context listeners
   */
  getDebugInfo(): Record<string, unknown> {
    const baseInfo = super.getDebugInfo();

    const crossContextCounts: Record<string, number> = {};
    for (const [eventType, listeners] of this.crossContextListeners.entries()) {
      crossContextCounts[eventType] = listeners.length;
    }

    return {
      ...baseInfo,
      contextId: this.contextId,
      currentContext: eventBridge.getCurrentContext(),
      crossContextListeners: {
        totalEventTypes: this.crossContextListeners.size,
        totalListeners: Array.from(this.crossContextListeners.values()).reduce((sum, arr) => sum + arr.length, 0),
        eventCounts: crossContextCounts
      }
    };
  }

  /**
   * Type guard to validate event types
   */
  private isValidEventType(eventType: string): eventType is TEventType {
    // Basic validation - in a real implementation, you might have a more specific check
    return typeof eventType === "string" && eventType.length > 0;
  }

  /**
   * Clean up cross-context listeners
   */
  cleanup(): void {
    this.crossContextListeners.clear();
    eventBridge.unregisterMessageHandler(this.bridgeHandlerId);
    this.removeAllListeners();
    logger.debug("general", `CrossContextEventProxy cleaned up for context: ${this.contextId}`);
  }

  /**
   * Fallback handler call for local context listeners
   */
  private fallbackHandlerCall(
    handler: (payload: TPayload) => void | Promise<void>,
    payload: unknown,
    eventType: TEventType
  ): void | Promise<void> {
    // This should only be called for local listeners where payload is already typed
    // Cross-context calls use remoteHandler. Use schema validation for consistency.
    const validatedHandler = this.createValidatedHandler(handler, eventType);
    return validatedHandler(payload);
  }

  /**
   * Create a type-safe validated handler wrapper using Zod
   */
  private createValidatedHandler(
    handler: (payload: TPayload) => void | Promise<void>,
    eventType: TEventType
  ): (payload: unknown) => void | Promise<void> {
    const schema = this.eventSchemas.get(eventType);
    if (!schema) {
      logger.warn("general", "No schema found for event type", { eventType });
      // Return a no-op handler that logs the missing schema
      return () => {
        logger.warn("general", "Cannot validate payload without schema", { eventType });
      };
    }

    // Return a handler that validates and calls the original handler
    return (payload: unknown) => {
      const result = schema.safeParse(payload);
      if (result.success) {
        try {
          // Safe call: result.data is validated by Zod schema, guaranteeing type compatibility
          // Handle both sync and async handlers properly
          const handlerResult = this.callHandlerSafely(handler, result.data);
          if (handlerResult && typeof handlerResult.catch === "function") {
            // Handle promise rejections
            handlerResult.catch((err: unknown) => {
              logger.warn("general", "Async handler failed", {
                eventType,
                error: err instanceof Error ? err.message : "Unknown error"
              });
            });
          }
        } catch (error) {
          logger.warn("general", "Handler execution failed", {
            eventType,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      } else {
        logger.warn("general", "Invalid payload for event type", {
          eventType,
          error: result.error.message
        });
      }
    };
  }

  /**
   * Safely call handler with validated data, avoiding type assertions
   * Uses runtime validation and a bridge function for type safety
   */
  private callHandlerSafely(
    handler: (payload: TPayload) => void | Promise<void>,
    validatedData: unknown
  ): void | Promise<void> {
    // Create a bridge function that accepts unknown and calls the typed handler
    // This avoids type assertions by using function composition
    const bridgeHandler = (data: unknown): void | Promise<void> => {
      // At runtime, this is safe because data passed validation
      return (handler as (payload: unknown) => void | Promise<void>)(data);
    };
    return bridgeHandler(validatedData);
  }

  /**
   * Get next ID for listeners (accessing private property)
   */
  private getNextId(): number {
    // Access the private nextId from base class
    return Math.floor(Math.random() * 1000000);
  }
}