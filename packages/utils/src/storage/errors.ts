/**
 * Custom error classes for storage operations
 * Provides structured error handling for IndexedDB and storage provider operations
 */

/**
 * Base error class for storage operations
 */
export abstract class StorageError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;

  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error when IndexedDB operations fail
 */
export class IndexedDBError extends StorageError {
  readonly code = 'INDEXED_DB_ERROR';
  readonly userMessage = 'Storage operation failed. Please try again.';

  constructor(
    operation: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(`IndexedDB operation failed: ${operation}`, cause, context);
  }
}

/**
 * Error when quota is exceeded
 */
export class QuotaExceededError extends StorageError {
  readonly code = 'QUOTA_EXCEEDED';
  readonly userMessage = 'Storage space full. Please clear some data and try again.';

  constructor(cause?: Error) {
    super('Storage quota exceeded', cause);
  }
}

/**
 * Error when data is not found
 */
export class NotFoundError extends StorageError {
  readonly code = 'NOT_FOUND';
  readonly userMessage = 'The requested data was not found.';

  constructor(resourceType: string, identifier: string, cause?: Error) {
    super(`${resourceType} not found: ${identifier}`, cause);
  }
}

/**
 * Error when data validation fails
 */
export class ValidationError extends StorageError {
  readonly code = 'VALIDATION_ERROR';
  readonly userMessage = 'Invalid data format. Please check your input and try again.';

  constructor(
    field: string,
    value: unknown,
    reason: string,
    cause?: Error
  ) {
    super(`Validation failed for ${field}: ${reason}`, cause, { field, value });
  }
}

/**
 * Error when network/connexion issues prevent storage operations
 */
export class ConnectionError extends StorageError {
  readonly code = 'CONNECTION_ERROR';
  readonly userMessage = 'Connection to storage failed. Please check your browser settings.';

  constructor(cause?: Error) {
    super('Storage connection failed', cause);
  }
}

/**
 * Error when operations are aborted or interrupted
 */
export class OperationAbortedError extends StorageError {
  readonly code = 'OPERATION_ABORTED';
  readonly userMessage = 'Operation was cancelled. Please try again.';

  constructor(operation: string, cause?: Error) {
    super(`Operation aborted: ${operation}`, cause);
  }
}

/**
 * Utility function to determine if an error is a storage error
 * @param error - The error to check
 */
export const isStorageError = (error: unknown): error is StorageError =>
  error instanceof StorageError;

/**
 * Utility function to convert IndexedDB errors to structured storage errors
 * @param operation - The operation that failed
 * @param error - The original error
 */
export const convertIndexedDBError = (
  operation: string,
  error: unknown
): StorageError => {
  if (isStorageError(error)) {
    return error;
  }

  if (error instanceof DOMException) {
    switch (error.name) {
      case 'QuotaExceededError':
        return new QuotaExceededError(error);
      case 'NotFoundError':
        return new NotFoundError('Resource', 'unknown', error);
      case 'InvalidStateError':
      case 'DataError':
        return new ValidationError('operation', operation, error.message, error);
      case 'AbortError':
        return new OperationAbortedError(operation, error);
      case 'VersionError':
        return new ConnectionError(error);
      default:
        return new IndexedDBError(operation, error);
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('quota') || error.message.includes('storage')) {
      return new QuotaExceededError(error);
    }
    if (error.message.includes('abort') || error.message.includes('cancel')) {
      return new OperationAbortedError(operation, error);
    }
    return new IndexedDBError(operation, error);
  }

  return new IndexedDBError(operation, new Error(String(error)));
};