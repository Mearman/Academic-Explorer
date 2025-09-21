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