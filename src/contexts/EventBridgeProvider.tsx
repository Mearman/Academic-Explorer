/**
 * EventBridge Provider
 * Provides centralized EventBridge communication and shared event state across all components
 */

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { eventBridge } from "@/lib/graph/events/event-bridge";
import { logger } from "@/lib/logger";
import { EventBridgeContext, type EventBridgeContextType, type EventHandler } from "./contexts";
import type { ExecutionContext } from "@/lib/graph/events/types";

export function EventBridgeProvider({ children }: { children: React.ReactNode }) {
  const handlersRef = useRef<Map<string, EventHandler>>(new Map());
  const initialized = useRef(false);

  const registerHandler = useCallback(({ handlerId, handler }: { handlerId: string; handler: EventHandler }) => {
    logger.debug("eventbridge", "Registering event handler", { handlerId });

    // Store the handler in our local registry
    handlersRef.current.set(handlerId, handler);

    // Register with the actual EventBridge
    eventBridge.registerMessageHandler(handlerId, handler);
  }, []);

  const unregisterHandler = useCallback((handlerId: string) => {
    logger.debug("eventbridge", "Unregistering event handler", { handlerId });

    // Remove from our local registry
    handlersRef.current.delete(handlerId);

    // Unregister from the actual EventBridge
    eventBridge.unregisterMessageHandler(handlerId);
  }, []);

  const emit = useCallback(({ eventType, payload, target }: { eventType: string; payload: unknown; target?: ExecutionContext }) => {
    logger.debug("eventbridge", "Emitting event", { eventType, target });
    eventBridge.emit(eventType, payload, target);
  }, []);

  const registerWorker = useCallback(({ worker, workerId }: { worker: Worker; workerId: string }) => {
    logger.debug("eventbridge", "Registering worker", { workerId });
    eventBridge.registerWorker(worker, workerId);
  }, []);

  useEffect(() => {
    if (initialized.current) return;

    logger.debug("eventbridge", "EventBridgeProvider initializing");
    initialized.current = true;

    return () => {
      logger.debug("eventbridge", "EventBridgeProvider cleaning up");

      // Unregister all handlers we've registered
      const currentHandlers = handlersRef.current;
      const handlerIds = Array.from(currentHandlers.keys());
      for (const handlerId of handlerIds) {
        eventBridge.unregisterMessageHandler(handlerId);
      }
      currentHandlers.clear();

      initialized.current = false;
    };
  }, []);

  const contextValue: EventBridgeContextType = useMemo(() => ({
    registerHandler,
    unregisterHandler,
    emit,
    registerWorker,
  }), [registerHandler, unregisterHandler, emit, registerWorker]);

  return (
    <EventBridgeContext.Provider value={contextValue}>
      {children}
    </EventBridgeContext.Provider>
  );
}

// Export types for convenience
export type { EventBridgeContextType, EventHandler };