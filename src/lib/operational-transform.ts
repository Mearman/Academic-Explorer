/**
 * Operational Transformation implementation for real-time collaboration
 * Handles conflict resolution for concurrent operations on shared documents
 */

import type { Operation } from '@/types/collaboration';

/**
 * Transform operation against another operation
 * Returns the transformed operation that can be applied after the other operation
 */
export function transformOperation(
  operation: Operation,
  otherOperation: Operation,
  _priority: 'left' | 'right' = 'left'
): Operation {
  // If operations are from the same user, no transformation needed
  if (operation.userId === otherOperation.userId) {
    return operation;
  }

  // Transform based on operation types
  switch (operation.type) {
    case 'insert':
      return transformInsert(operation, otherOperation, _priority);
    case 'delete':
      return transformDelete(operation, otherOperation, _priority);
    case 'retain':
      return transformRetain(operation, otherOperation, _priority);
    case 'format':
      return transformFormat(operation, otherOperation, _priority);
    default:
      return operation;
  }
}

/**
 * Transform an insert operation
 */
function transformInsert(
  insertOp: Operation,
  otherOp: Operation,
  _priority: 'left' | 'right'
): Operation {
  switch (otherOp.type) {
    case 'insert': {
      // Two inserts at the same position
      if (insertOp.position === otherOp.position) {
        // Use priority to determine order
        if (_priority === 'left') {
          // Keep original position
          return insertOp;
        } else {
          // Move after the other insert
          return {
            ...insertOp,
            position: insertOp.position + (otherOp.content?.length || 0),
          };
        }
      }
      
      // Other insert is before this one
      if (otherOp.position < insertOp.position) {
        return {
          ...insertOp,
          position: insertOp.position + (otherOp.content?.length || 0),
        };
      }
      
      // Other insert is after this one - no change needed
      return insertOp;
    }

    case 'delete': {
      const deleteEnd = otherOp.position + (otherOp.length || 0);
      
      // Insert is before the deletion
      if (insertOp.position <= otherOp.position) {
        return insertOp;
      }
      
      // Insert is after the deletion
      if (insertOp.position >= deleteEnd) {
        return {
          ...insertOp,
          position: insertOp.position - (otherOp.length || 0),
        };
      }
      
      // Insert is within the deletion range - move to deletion start
      return {
        ...insertOp,
        position: otherOp.position,
      };
    }

    case 'retain':
      // Retain operations don't affect positions
      return insertOp;

    case 'format': {
      // Format operations don't affect positions
      return insertOp;
    }

    default:
      return insertOp;
  }
}

/**
 * Transform a delete operation
 */
function transformDelete(
  deleteOp: Operation,
  otherOp: Operation,
  _priority: 'left' | 'right'
): Operation {
  const deleteStart = deleteOp.position;
  const deleteEnd = deleteStart + (deleteOp.length || 0);

  switch (otherOp.type) {
    case 'insert': {
      // Insert is before the deletion
      if (otherOp.position <= deleteStart) {
        return {
          ...deleteOp,
          position: deleteStart + (otherOp.content?.length || 0),
        };
      }
      
      // Insert is within the deletion range
      if (otherOp.position < deleteEnd) {
        return {
          ...deleteOp,
          length: (deleteOp.length || 0) + (otherOp.content?.length || 0),
        };
      }
      
      // Insert is after the deletion - no change needed
      return deleteOp;
    }

    case 'delete': {
      const otherDeleteStart = otherOp.position;
      const otherDeleteEnd = otherDeleteStart + (otherOp.length || 0);
      
      // No overlap - other delete is completely before this one
      if (otherDeleteEnd <= deleteStart) {
        return {
          ...deleteOp,
          position: deleteStart - (otherOp.length || 0),
        };
      }
      
      // No overlap - other delete is completely after this one
      if (otherDeleteStart >= deleteEnd) {
        return deleteOp;
      }
      
      // Overlapping deletes - need to adjust
      if (otherDeleteStart <= deleteStart) {
        if (otherDeleteEnd >= deleteEnd) {
          // Other delete completely contains this delete - this becomes no-op
          return {
            ...deleteOp,
            position: otherDeleteStart,
            length: 0,
          };
        } else {
          // Partial overlap at start
          const newStart = otherDeleteStart;
          const newLength = deleteEnd - otherDeleteEnd;
          return {
            ...deleteOp,
            position: newStart,
            length: Math.max(0, newLength),
          };
        }
      } else {
        // otherDeleteStart > deleteStart
        if (otherDeleteEnd >= deleteEnd) {
          // Partial overlap at end
          const newLength = otherDeleteStart - deleteStart;
          return {
            ...deleteOp,
            length: Math.max(0, newLength),
          };
        } else {
          // Other delete is contained within this delete
          const newLength = (deleteOp.length || 0) - (otherOp.length || 0);
          return {
            ...deleteOp,
            length: Math.max(0, newLength),
          };
        }
      }
    }

    case 'retain':
      // Retain operations don't affect deletions
      return deleteOp;

    case 'format':
      // Format operations don't affect deletions
      return deleteOp;

    default:
      return deleteOp;
  }
}

/**
 * Transform a retain operation
 */
function transformRetain(
  retainOp: Operation,
  otherOp: Operation,
  _priority: 'left' | 'right'
): Operation {
  // Retain operations preserve their length regardless of other operations
  // They might need position adjustments based on inserts/deletes before them
  
  switch (otherOp.type) {
    case 'insert': {
      // Insert before retain position affects the starting position
      if (otherOp.position <= retainOp.position) {
        return {
          ...retainOp,
          position: retainOp.position + (otherOp.content?.length || 0),
        };
      }
      return retainOp;
    }

    case 'delete': {
      const deleteEnd = otherOp.position + (otherOp.length || 0);
      
      // Delete is completely before retain
      if (deleteEnd <= retainOp.position) {
        return {
          ...retainOp,
          position: retainOp.position - (otherOp.length || 0),
        };
      }
      
      // Delete overlaps with or is after retain start
      if (otherOp.position < retainOp.position) {
        const deletedFromRetain = Math.min(
          deleteEnd - retainOp.position,
          retainOp.length || 0
        );
        return {
          ...retainOp,
          position: otherOp.position,
          length: Math.max(0, (retainOp.length || 0) - deletedFromRetain),
        };
      }
      
      return retainOp;
    }

    default:
      return retainOp;
  }
}

/**
 * Transform a format operation
 */
function transformFormat(
  formatOp: Operation,
  otherOp: Operation,
  _priority: 'left' | 'right'
): Operation {
  // Format operations are similar to retain operations in terms of positioning
  return transformRetain(formatOp, otherOp, _priority);
}

/**
 * Transform a list of operations against another list
 */
export function transformOperations(
  operations: Operation[],
  againstOperations: Operation[],
  priority: 'left' | 'right' = 'left'
): Operation[] {
  let transformed = [...operations];
  
  // Apply each operation in againstOperations to transform our operations
  for (const againstOp of againstOperations) {
    transformed = transformed.map(op => transformOperation(op, againstOp, priority));
  }
  
  return transformed;
}

/**
 * Compose multiple operations into a single operation where possible
 */
export function composeOperations(operations: Operation[]): Operation[] {
  if (operations.length <= 1) {
    return operations;
  }

  const composed: Operation[] = [];
  let current = operations[0];

  for (let i = 1; i < operations.length; i++) {
    const next = operations[i];
    const composedOp = composeTwoOperations(current, next);
    
    if (composedOp) {
      current = composedOp;
    } else {
      composed.push(current);
      current = next;
    }
  }
  
  composed.push(current);
  return composed;
}

/**
 * Compose two operations if possible
 */
function composeTwoOperations(op1: Operation, op2: Operation): Operation | null {
  // Can only compose operations from the same user
  if (op1.userId !== op2.userId) {
    return null;
  }

  // Compose consecutive inserts
  if (op1.type === 'insert' && op2.type === 'insert') {
    const op1End = op1.position + (op1.content?.length || 0);
    if (op2.position === op1End) {
      return {
        ...op1,
        content: (op1.content || '') + (op2.content || ''),
        timestamp: Math.max(op1.timestamp, op2.timestamp),
        id: op2.id, // Use the later operation's ID
      };
    }
  }

  // Compose consecutive deletes
  if (op1.type === 'delete' && op2.type === 'delete') {
    if (op2.position === op1.position) {
      return {
        ...op1,
        length: (op1.length || 0) + (op2.length || 0),
        timestamp: Math.max(op1.timestamp, op2.timestamp),
        id: op2.id, // Use the later operation's ID
      };
    }
  }

  // Compose consecutive retains
  if (op1.type === 'retain' && op2.type === 'retain') {
    const op1End = op1.position + (op1.length || 0);
    if (op2.position === op1End) {
      return {
        ...op1,
        length: (op1.length || 0) + (op2.length || 0),
        timestamp: Math.max(op1.timestamp, op2.timestamp),
        id: op2.id, // Use the later operation's ID
      };
    }
  }

  return null;
}

/**
 * Apply an operation to a document state
 */
export function applyOperation(content: string, operation: Operation): string {
  switch (operation.type) {
    case 'insert': {
      const position = Math.min(operation.position, content.length);
      return (
        content.slice(0, position) +
        (operation.content || '') +
        content.slice(position)
      );
    }

    case 'delete': {
      const start = Math.min(operation.position, content.length);
      const end = Math.min(start + (operation.length || 0), content.length);
      return content.slice(0, start) + content.slice(end);
    }

    case 'retain': {
      // Retain operations don't change content, just position
      return content;
    }

    case 'format': {
      // Format operations don't change text content
      return content;
    }

    default:
      return content;
  }
}

/**
 * Apply a series of operations to a document
 */
export function applyOperations(content: string, operations: Operation[]): string {
  return operations.reduce((currentContent, operation) => 
    applyOperation(currentContent, operation), content
  );
}

/**
 * Invert an operation (create its undo operation)
 */
export function invertOperation(operation: Operation, content: string): Operation {
  switch (operation.type) {
    case 'insert': {
      // Invert insert with delete
      return {
        ...operation,
        type: 'delete',
        length: operation.content?.length || 0,
        content: undefined,
      };
    }

    case 'delete': {
      // Invert delete with insert
      const deletedContent = content.slice(
        operation.position,
        operation.position + (operation.length || 0)
      );
      return {
        ...operation,
        type: 'insert',
        content: deletedContent,
        length: undefined,
      };
    }

    case 'retain':
      // Retain operations are their own inverse
      return operation;

    case 'format': {
      // Format operations need attribute inversion
      // This would require more complex attribute handling
      return operation;
    }

    default:
      return operation;
  }
}

/**
 * Check if an operation is a no-op (does nothing)
 */
export function isNoop(operation: Operation): boolean {
  switch (operation.type) {
    case 'insert':
      return !operation.content || operation.content.length === 0;
    case 'delete':
      return !operation.length || operation.length === 0;
    case 'retain':
      return !operation.length || operation.length === 0;
    case 'format':
      return !operation.attributes || Object.keys(operation.attributes).length === 0;
    default:
      return true;
  }
}

/**
 * Normalize operations by removing no-ops and composing where possible
 */
export function normalizeOperations(operations: Operation[]): Operation[] {
  // Remove no-op operations
  const filtered = operations.filter(op => !isNoop(op));
  
  // Compose consecutive operations
  return composeOperations(filtered);
}

/**
 * Operational transformation engine for managing document state
 */
export class OperationalTransform {
  private appliedOperations: Operation[] = [];
  private pendingOperations: Operation[] = [];

  constructor(private content: string = '') {}

  /**
   * Apply a local operation (from this client)
   */
  applyLocalOperation(operation: Operation): string {
    // Apply operation to content
    this.content = applyOperation(this.content, operation);
    
    // Add to pending operations
    this.pendingOperations.push(operation);
    
    return this.content;
  }

  /**
   * Apply a remote operation (from another client)
   */
  applyRemoteOperation(operation: Operation): string {
    // Transform pending operations against the remote operation
    this.pendingOperations = this.pendingOperations.map(pendingOp =>
      transformOperation(pendingOp, operation, 'right')
    );

    // Transform the remote operation against all applied operations
    let transformedOp = operation;
    for (const appliedOp of this.appliedOperations) {
      transformedOp = transformOperation(transformedOp, appliedOp, 'left');
    }

    // Apply the transformed remote operation
    this.content = applyOperation(this.content, transformedOp);
    
    // Add to applied operations
    this.appliedOperations.push(transformedOp);
    
    return this.content;
  }

  /**
   * Acknowledge that a local operation has been accepted by the server
   */
  acknowledgeOperation(operationId: string): void {
    const operationIndex = this.pendingOperations.findIndex(op => op.id === operationId);
    if (operationIndex >= 0) {
      const operation = this.pendingOperations.splice(operationIndex, 1)[0];
      this.appliedOperations.push(operation);
    }
  }

  /**
   * Get current document content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): Operation[] {
    return [...this.pendingOperations];
  }

  /**
   * Get applied operations
   */
  getAppliedOperations(): Operation[] {
    return [...this.appliedOperations];
  }

  /**
   * Reset the transformation state
   */
  reset(content: string = ''): void {
    this.content = content;
    this.appliedOperations = [];
    this.pendingOperations = [];
  }
}