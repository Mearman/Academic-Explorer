/**
 * React contexts for providers
 */

import { createContext } from "react";
import type { CrossContextMessage, ExecutionContext } from "@/lib/graph/events/types";

// Background Worker Context
export interface BackgroundWorkerContextType {
  worker: Worker | null;
  isWorkerReady: boolean;
  isInitializing: boolean;
  error: string | null;
  getWorker: () => Promise<Worker>;
  terminateWorker: () => void;
}

export const BackgroundWorkerContext = createContext<BackgroundWorkerContextType | undefined>(undefined);

// EventBridge Context
export type EventHandler = (message: CrossContextMessage) => void;

export interface EventBridgeContextType {
  registerHandler: ({ handlerId, handler }: { handlerId: string; handler: EventHandler }) => void;
  unregisterHandler: (handlerId: string) => void;
  emit: ({ eventType, payload, target }: { eventType: string; payload: unknown; target?: ExecutionContext }) => void;
  registerWorker: ({ worker, workerId }: { worker: Worker; workerId: string }) => void;
}

export const EventBridgeContext = createContext<EventBridgeContextType | undefined>(undefined);