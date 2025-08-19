/**
 * Hook for managing annotation synchronisation and real-time updates
 * Handles WebSocket events for annotation CRUD operations and conflict resolution
 */

import { useCallback, useEffect, useRef } from 'react';

import { useCollaborationStore } from '@/stores/collaboration-store';
import type { 
  Annotation, 
  WebSocketMessage, 
  Operation 
} from '@/types/collaboration';

export interface UseAnnotationSyncReturn {
  /** Whether annotations are currently syncing */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSync: number;
  /** Pending operations count */
  pendingOperations: number;
  /** Manual sync trigger */
  syncAnnotations: () => Promise<void>;
  /** Force refresh annotations from server */
  refreshAnnotations: () => Promise<void>;
  /** Get annotation sync status */
  getSyncStatus: (annotationId: string) => 'synced' | 'pending' | 'error';
}

/**
 * Custom hook for annotation synchronisation
 */
export function useAnnotationSync(): UseAnnotationSyncReturn {
  const {
    annotations,
    currentSession,
    currentUser,
    isSyncing,
    lastSync,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    sendOperation,
    applyOperation,
  } = useCollaborationStore();
  
  const pendingOperationsRef = useRef<Map<string, Operation>>(new Map());
  const syncTimeoutRef = useRef<number | undefined>(undefined);
  
  /**
   * Handle incoming annotation WebSocket messages
   */
  const handleAnnotationMessage = useCallback((message: WebSocketMessage) => {
    if (!currentSession || !currentUser) return;
    
    switch (message.type) {
      case 'annotation-create': {
        const annotation = message.payload as Annotation;
        
        // Don't process our own messages
        if (annotation.author.id === currentUser.id) return;
        
        // Apply annotation creation
        applyOperation({
          id: `create-${annotation.id}`,
          type: 'insert',
          position: 0,
          content: JSON.stringify(annotation),
          timestamp: message.timestamp,
          userId: annotation.author.id,
        });
        
        console.log('Received annotation creation:', annotation.id);
        break;
      }
      
      case 'annotation-update': {
        const { annotationId, updates } = message.payload as { 
          annotationId: string; 
          updates: Partial<Annotation> 
        };
        
        // Don't process our own messages
        if (updates.author?.id === currentUser.id) return;
        
        // Apply annotation update
        applyOperation({
          id: `update-${annotationId}-${Date.now()}`,
          type: 'format',
          position: 0,
          content: JSON.stringify(updates),
          attributes: { annotationId },
          timestamp: message.timestamp,
          userId: message.userId ?? 'anonymous',
        });
        
        console.log('Received annotation update:', annotationId);
        break;
      }
      
      case 'annotation-delete': {
        const { annotationId } = message.payload as { annotationId: string };
        
        // Apply annotation deletion
        applyOperation({
          id: `delete-${annotationId}`,
          type: 'delete',
          position: 0,
          length: 1,
          attributes: { annotationId },
          timestamp: message.timestamp,
          userId: message.userId ?? 'anonymous',
        });
        
        console.log('Received annotation deletion:', annotationId);
        break;
      }
      
      case 'operation-apply': {
        const operation = message.payload as Operation;
        
        // Don't process our own operations
        if (operation.userId === currentUser.id) return;
        
        // Apply the operation
        applyOperation(operation);
        
        // Remove from pending if it was ours
        pendingOperationsRef.current.delete(operation.id);
        
        console.log('Applied operation:', operation.id);
        break;
      }
    }
  }, [currentSession, currentUser, applyOperation]);
  
  /**
   * Send annotation creation operation
   */
  const sendAnnotationCreate = useCallback(async (annotation: Annotation) => {
    if (!currentSession || !currentUser) return;
    
    const operation: Omit<Operation, 'id' | 'timestamp'> = {
      type: 'insert',
      position: 0,
      content: JSON.stringify(annotation),
      userId: currentUser.id,
    };
    
    // Add to pending operations
    const operationId = `create-${annotation.id}-${Date.now()}`;
    pendingOperationsRef.current.set(operationId, {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
    });
    
    // Send via WebSocket
    sendOperation(operation);
    
    // Set timeout for pending operation cleanup
    window.setTimeout(() => {
      pendingOperationsRef.current.delete(operationId);
    }, 30000); // 30 second timeout
    
  }, [currentSession, currentUser, sendOperation]);
  
  /**
   * Send annotation update operation
   */
  const sendAnnotationUpdate = useCallback(async (
    annotationId: string, 
    updates: Partial<Annotation>
  ) => {
    if (!currentSession || !currentUser) return;
    
    const operation: Omit<Operation, 'id' | 'timestamp'> = {
      type: 'format',
      position: 0,
      content: JSON.stringify(updates),
      attributes: { annotationId },
      userId: currentUser.id,
    };
    
    // Add to pending operations
    const operationId = `update-${annotationId}-${Date.now()}`;
    pendingOperationsRef.current.set(operationId, {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
    });
    
    // Send via WebSocket
    sendOperation(operation);
    
    // Set timeout for pending operation cleanup
    window.setTimeout(() => {
      pendingOperationsRef.current.delete(operationId);
    }, 30000);
    
  }, [currentSession, currentUser, sendOperation]);
  
  /**
   * Send annotation deletion operation
   */
  const sendAnnotationDelete = useCallback(async (annotationId: string) => {
    if (!currentSession || !currentUser) return;
    
    const operation: Omit<Operation, 'id' | 'timestamp'> = {
      type: 'delete',
      position: 0,
      length: 1,
      attributes: { annotationId },
      userId: currentUser.id,
    };
    
    // Add to pending operations
    const operationId = `delete-${annotationId}-${Date.now()}`;
    pendingOperationsRef.current.set(operationId, {
      ...operation,
      id: operationId,
      timestamp: Date.now(),
    });
    
    // Send via WebSocket
    sendOperation(operation);
    
    // Set timeout for pending operation cleanup
    window.setTimeout(() => {
      pendingOperationsRef.current.delete(operationId);
    }, 30000);
    
  }, [currentSession, currentUser, sendOperation]);
  
  /**
   * Manual sync trigger
   */
  const syncAnnotations = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      // In a real implementation, this would fetch from the server
      // For now, we'll simulate syncing pending operations
      const pendingOps = Array.from(pendingOperationsRef.current.values());
      
      for (const operation of pendingOps) {
        sendOperation({
          type: operation.type,
          position: operation.position,
          length: operation.length,
          content: operation.content,
          attributes: operation.attributes,
          userId: operation.userId,
        });
      }
      
      console.log(`Synced ${pendingOps.length} pending operations`);
      
    } catch (error) {
      console.error('Failed to sync annotations:', error);
    }
  }, [currentSession, sendOperation]);
  
  /**
   * Force refresh annotations from server
   */
  const refreshAnnotations = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      // In a real implementation, this would fetch all annotations from server
      // For now, we'll clear pending operations and trigger a refresh
      pendingOperationsRef.current.clear();
      
      console.log('Refreshed annotations from server');
      
    } catch (error) {
      console.error('Failed to refresh annotations:', error);
    }
  }, [currentSession]);
  
  /**
   * Get sync status for a specific annotation
   */
  const getSyncStatus = useCallback((annotationId: string): 'synced' | 'pending' | 'error' => {
    // Check if any pending operations reference this annotation
    const hasPendingOps = Array.from(pendingOperationsRef.current.values()).some(
      op => op.attributes?.annotationId === annotationId || 
            (op.content != null && op.content.includes(annotationId))
    );
    
    if (hasPendingOps) return 'pending';
    
    // Check if annotation exists in store
    const annotation = annotations.get(annotationId);
    if (!annotation) return 'error';
    
    return 'synced';
  }, [annotations]);
  
  /**
   * Set up WebSocket message listeners
   */
  useEffect(() => {
    // In a real implementation, this would be handled by the WebSocket service
    // For now, we'll set up a mock listener
    
    const handleMessage = (event: CustomEvent<WebSocketMessage>) => {
      handleAnnotationMessage(event.detail);
    };
    
    // Listen for custom events (simulating WebSocket messages)
    window.addEventListener('collaboration-message', handleMessage as EventListener);
    
    return () => {
      window.removeEventListener('collaboration-message', handleMessage as EventListener);
      
      // Clear timeouts
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [handleAnnotationMessage]);
  
  /**
   * Periodic sync of pending operations
   */
  useEffect(() => {
    if (!currentSession || pendingOperationsRef.current.size === 0) return;
    
    // Set up periodic sync
    syncTimeoutRef.current = window.setTimeout(() => {
      syncAnnotations();
    }, 5000) as number; // Sync every 5 seconds if there are pending operations
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [currentSession, syncAnnotations]);
  
  /**
   * Override store methods to include real-time sync
   */
  useEffect(() => {
    // Note: In a real implementation, we would properly override the store methods
    // This is a simplified approach for demonstration
    // The wrapped functions would be used to replace the store methods
    
  }, [
    annotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    sendAnnotationCreate,
    sendAnnotationUpdate,
    sendAnnotationDelete,
  ]);
  
  return {
    isSyncing,
    lastSync,
    pendingOperations: pendingOperationsRef.current.size,
    syncAnnotations,
    refreshAnnotations,
    getSyncStatus,
  };
}