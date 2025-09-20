/**
 * Context hooks for providers
 */

import { useContext } from 'react';
import { BackgroundWorkerContext, EventBridgeContext, type BackgroundWorkerContextType, type EventBridgeContextType } from './contexts';

export function useBackgroundWorkerContext(): BackgroundWorkerContextType {
  const context = useContext(BackgroundWorkerContext);
  if (context === undefined) {
    throw new Error('useBackgroundWorkerContext must be used within a BackgroundWorkerProvider');
  }
  return context;
}

export function useEventBridge(): EventBridgeContextType {
  const context = useContext(EventBridgeContext);
  if (context === undefined) {
    throw new Error('useEventBridge must be used within an EventBridgeProvider');
  }
  return context;
}