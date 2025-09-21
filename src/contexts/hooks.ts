/**
 * Context hooks for providers
 */

import { useContext } from "react";
import { BackgroundWorkerContext, type BackgroundWorkerContextType } from "./contexts";

export function useBackgroundWorkerContext(): BackgroundWorkerContextType {
  const context = useContext(BackgroundWorkerContext);
  if (context === undefined) {
    throw new Error("useBackgroundWorkerContext must be used within a BackgroundWorkerProvider");
  }
  return context;
}