/**
 * React contexts for providers
 */

import { createContext } from "react";

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
export type EventHandler = (message: { eventType: string; payload: unknown; target?: string }) => void;

export interface EventBridgeContextType {
  registerHandler: ({ handlerId, handler }: { handlerId: string; handler: EventHandler }) => void;
  unregisterHandler: (handlerId: string) => void;
  emit: ({ eventType, payload, target }: { eventType: string; payload: unknown; target?: string }) => void;
  registerWorker: ({ worker, workerId }: { worker: Worker; workerId: string }) => void;
}

export const EventBridgeContext = createContext<EventBridgeContextType | undefined>(undefined);