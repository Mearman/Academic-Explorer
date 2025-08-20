/**
 * Enhanced Error Boundary with comprehensive recovery options
 * Provides intelligent error classification, recovery strategies, and user guidance
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineQueue } from '@/hooks/use-offline-queue';

/**
 * Error classification system
 */
export type ErrorCategory = 
  | 'network'      // Network-related errors (fetch failures, timeouts)
  | 'storage'      // Storage-related errors (quota exceeded, corruption)
  | 'rendering'    // React rendering errors
  | 'api'          // API-related errors (400, 500, rate limiting)
  | 'security'     // Security-related errors (CSP violations)
  | 'resource'     // Resource loading errors (chunk loading, imports)
  | 'memory'       // Memory-related errors (OOM, stack overflow)
  | 'unknown';     // Unclassified errors

/**
 * Recovery strategy types
 */
export type RecoveryStrategy = 
  | 'retry'        // Simple retry with backoff
  | 'refresh'      // Full page refresh
  | 'navigate'     // Navigate to safe page
  | 'fallback'     // Show fallback UI
  | 'report'       // Report error and continue
  | 'none';        // No automatic recovery

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Classified error information
 */
export interface ClassifiedError {
  originalError: Error;
  category: ErrorCategory;
  severity: ErrorSeverity;
  suggestedStrategy: RecoveryStrategy;
  userMessage: string;
  technicalMessage: string;
  actionable: boolean;
  retryable: boolean;
  reportable: boolean;
}

/**
 * Recovery attempt information
 */
export interface RecoveryAttempt {
  strategy: RecoveryStrategy;
  timestamp: number;
  success: boolean;
  error?: Error;
}

/**
 * Enhanced error boundary props
 */
export interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  entityType?: string;
  entityId?: string;
  context?: string;
  maxRetryAttempts?: number;
  autoRetryDelay?: number;
  enableNetworkRecovery?: boolean;
  enableStorageRecovery?: boolean;
  onError?: (error: ClassifiedError, attempts: RecoveryAttempt[]) => void;
  onRecovery?: (strategy: RecoveryStrategy, success: boolean) => void;
  fallbackComponent?: React.ComponentType<EnhancedErrorFallbackProps>;
}

/**
 * Enhanced error fallback props
 */
export interface EnhancedErrorFallbackProps {
  error: ClassifiedError;
  retryAttempts: RecoveryAttempt[];
  networkStatus: ReturnType<typeof useNetworkStatus>;
  queueStatus: ReturnType<typeof useOfflineQueue>['queueStatus'];
  onRetry: (strategy?: RecoveryStrategy) => void;
  onReport: () => void;
  onNavigateHome: () => void;
  onRefresh: () => void;
  canRetry: boolean;
  isRetrying: boolean;
  entityType?: string;
  entityId?: string;
  context?: string;
}

/**
 * Check if error is network-related
 */
function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('connection') ||
    (error.name === 'TypeError' && message.includes('fetch'))
  );
}

/**
 * Check if error is storage-related
 */
function isStorageError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('quota') ||
    message.includes('storage') ||
    error.name === 'QuotaExceededError' ||
    message.includes('indexeddb')
  );
}

/**
 * Check if error is API-related
 */
function isApiError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('400') || message.includes('401') || 
    message.includes('403') || message.includes('404') ||
    message.includes('429') || message.includes('500') ||
    message.includes('503')
  );
}

/**
 * Check if error is security-related
 */
function isSecurityError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('content security policy') ||
    message.includes('csp') ||
    message.includes('script-src') ||
    message.includes('refused to load')
  );
}

/**
 * Check if error is resource loading-related
 */
function isResourceError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('loading css chunk failed') ||
    message.includes('loading chunk') ||
    message.includes('import()') ||
    message.includes('dynamic import')
  );
}

/**
 * Check if error is memory-related
 */
function isMemoryError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('maximum call stack') ||
    message.includes('out of memory') ||
    (message.includes('range error') && message.includes('array length'))
  );
}

/**
 * Check if error is React rendering-related
 */
function isRenderingError(error: Error, errorInfo?: React.ErrorInfo): boolean {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  const componentStack = errorInfo?.componentStack?.toLowerCase() || '';
  
  return (
    componentStack.includes('react') ||
    stack.includes('react') ||
    message.includes('render') ||
    error.name === 'Invariant Violation'
  );
}

/**
 * Create classified error for network errors
 */
function createNetworkError(error: Error): ClassifiedError {
  return {
    originalError: error,
    category: 'network',
    severity: 'medium',
    suggestedStrategy: 'retry',
    userMessage: 'Connection issue detected. We\'ll try to reconnect automatically.',
    technicalMessage: 'Network request failed. Check connectivity and retry.',
    actionable: true,
    retryable: true,
    reportable: false,
  };
}

/**
 * Create classified error for storage errors
 */
function createStorageError(error: Error): ClassifiedError {
  return {
    originalError: error,
    category: 'storage',
    severity: 'high',
    suggestedStrategy: 'fallback',
    userMessage: 'Storage space is full. Some features may be limited.',
    technicalMessage: 'Storage quota exceeded. Clear cache or use alternative storage.',
    actionable: true,
    retryable: false,
    reportable: true,
  };
}

/**
 * Create classified error for API errors
 */
function createApiError(error: Error): ClassifiedError {
  const message = error.message.toLowerCase();
  const isServerError = message.includes('500') || message.includes('503');
  const isRateLimit = message.includes('429');
  
  return {
    originalError: error,
    category: 'api',
    severity: isServerError ? 'high' : 'medium',
    suggestedStrategy: isRateLimit ? 'retry' : isServerError ? 'retry' : 'report',
    userMessage: isRateLimit 
      ? 'Request limit reached. Please wait a moment before trying again.'
      : isServerError 
      ? 'Service temporarily unavailable. We\'ll retry automatically.'
      : 'Request failed. Please check your input and try again.',
    technicalMessage: `API error: ${error.message}`,
    actionable: true,
    retryable: isServerError || isRateLimit,
    reportable: !isRateLimit,
  };
}

/**
 * Create classified error for security errors
 */
function createSecurityError(error: Error): ClassifiedError {
  return {
    originalError: error,
    category: 'security',
    severity: 'high',
    suggestedStrategy: 'report',
    userMessage: 'Security policy prevented this action. Please contact support.',
    technicalMessage: 'Content Security Policy violation detected.',
    actionable: false,
    retryable: false,
    reportable: true,
  };
}

/**
 * Create classified error for resource errors
 */
function createResourceError(error: Error): ClassifiedError {
  return {
    originalError: error,
    category: 'resource',
    severity: 'medium',
    suggestedStrategy: 'refresh',
    userMessage: 'Failed to load application resources. Refreshing the page may help.',
    technicalMessage: 'Dynamic import or chunk loading failed.',
    actionable: true,
    retryable: true,
    reportable: false,
  };
}

/**
 * Create classified error for memory errors
 */
function createMemoryError(error: Error): ClassifiedError {
  return {
    originalError: error,
    category: 'memory',
    severity: 'critical',
    suggestedStrategy: 'refresh',
    userMessage: 'The application is using too much memory. Please refresh the page.',
    technicalMessage: 'Memory limit exceeded. Refresh required.',
    actionable: true,
    retryable: false,
    reportable: true,
  };
}

/**
 * Create classified error for rendering errors
 */
function createRenderingError(error: Error): ClassifiedError {
  return {
    originalError: error,
    category: 'rendering',
    severity: 'medium',
    suggestedStrategy: 'retry',
    userMessage: 'Display error occurred. We\'ll try to recover automatically.',
    technicalMessage: 'React rendering error detected.',
    actionable: true,
    retryable: true,
    reportable: true,
  };
}

/**
 * Create classified error for unknown errors
 */
function createUnknownError(error: Error): ClassifiedError {
  return {
    originalError: error,
    category: 'unknown',
    severity: 'medium',
    suggestedStrategy: 'fallback',
    userMessage: 'An unexpected error occurred. We\'re working to resolve it.',
    technicalMessage: error.message || 'Unknown error',
    actionable: true,
    retryable: true,
    reportable: true,
  };
}

/**
 * Classify error based on type, message, and context
 */
function classifyError(error: Error, errorInfo?: React.ErrorInfo): ClassifiedError {
  if (isNetworkError(error)) {
    return createNetworkError(error);
  }
  
  if (isStorageError(error)) {
    return createStorageError(error);
  }
  
  if (isApiError(error)) {
    return createApiError(error);
  }
  
  if (isSecurityError(error)) {
    return createSecurityError(error);
  }
  
  if (isResourceError(error)) {
    return createResourceError(error);
  }
  
  if (isMemoryError(error)) {
    return createMemoryError(error);
  }
  
  if (isRenderingError(error, errorInfo)) {
    return createRenderingError(error);
  }
  
  return createUnknownError(error);
}

/**
 * Enhanced error fallback component
 */
function EnhancedErrorFallback({
  error,
  retryAttempts,
  networkStatus,
  queueStatus,
  onRetry,
  onReport,
  onNavigateHome,
  onRefresh,
  canRetry,
  isRetrying,
  entityType,
  entityId,
  context,
}: EnhancedErrorFallbackProps) {
  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case 'network': return 'NET';
      case 'storage': return 'STO';
      case 'api': return 'API';
      case 'security': return 'SEC';
      case 'resource': return 'RES';
      case 'memory': return 'MEM';
      case 'rendering': return 'UI';
      default: return 'ERR';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6">
        {/* Error Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">
            {getCategoryIcon(error.category)}
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(error.severity)}`}>
            {error.category} error • {error.severity} severity
          </div>
        </div>

        {/* User Message */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700">{error.userMessage}</p>
        </div>

        {/* Context Information */}
        {(entityType || entityId || context) && (
          <div className="mb-6 text-sm text-gray-600">
            <div className="font-medium mb-1">Context:</div>
            {entityType && <div>Type: {entityType}</div>}
            {entityId && <div>ID: <code className="bg-gray-100 px-1 rounded">{entityId}</code></div>}
            {context && <div>Context: {context}</div>}
          </div>
        )}

        {/* Network Status */}
        {!networkStatus.isOnline && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <span className="mr-2 text-red-500 font-bold">OFFLINE</span>
              <span className="text-sm">
                You're currently offline. Some features may not work properly.
              </span>
            </div>
          </div>
        )}

        {/* Queue Status */}
        {queueStatus.pendingRequests > 0 && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-700">
              <span className="mr-2 text-blue-500 font-bold">QUEUED</span>
              <span className="text-sm">
                {queueStatus.pendingRequests} requests queued for when connection returns
              </span>
            </div>
          </div>
        )}

        {/* Recovery Actions */}
        <div className="space-y-3 mb-6">
          {error.retryable && canRetry && (
            <button
              onClick={() => onRetry(error.suggestedStrategy)}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </span>
              ) : (
                `Try Again${error.suggestedStrategy === 'refresh' ? ' (Refresh)' : ''}`
              )}
            </button>
          )}

          {error.category === 'resource' && (
            <button
              onClick={onRefresh}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Refresh Page
            </button>
          )}

          <button
            onClick={onNavigateHome}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            Go to Home
          </button>

          {error.reportable && (
            <button
              onClick={onReport}
              className="w-full bg-red-100 text-red-700 py-2 px-4 rounded-md hover:bg-red-200 transition-colors"
            >
              Report This Issue
            </button>
          )}
        </div>

        {/* Retry History */}
        {retryAttempts.length > 0 && (
          <details className="mb-4">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
              Recovery Attempts ({retryAttempts.length})
            </summary>
            <div className="mt-2 space-y-1">
              {retryAttempts.map((attempt, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded ${
                    attempt.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>{attempt.strategy}</span>
                    <span>{attempt.success ? 'OK' : 'FAIL'}</span>
                  </div>
                  <div className="text-gray-500">
                    {new Date(attempt.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Technical Details */}
        <details className="text-sm">
          <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono">
            <div><strong>Error:</strong> {error.technicalMessage}</div>
            <div><strong>Type:</strong> {error.originalError.name}</div>
            {error.originalError.stack && (
              <div><strong>Stack:</strong> {error.originalError.stack.slice(0, 200)}...</div>
            )}
            <div><strong>Time:</strong> {new Date().toISOString()}</div>
          </div>
        </details>
      </div>
    </div>
  );
}

/**
 * Enhanced error boundary with intelligent recovery
 */
/**
 * Export ErrorBoundary for backward compatibility
 */
export { ErrorBoundary } from 'react-error-boundary';

export function EnhancedErrorBoundary({
  children,
  entityType,
  entityId,
  context,
  maxRetryAttempts = 3,
  autoRetryDelay = 1000,
  enableNetworkRecovery = true,
  enableStorageRecovery: _enableStorageRecovery = true,
  onError,
  onRecovery,
  fallbackComponent: CustomFallback = EnhancedErrorFallback,
}: EnhancedErrorBoundaryProps) {
  const [retryAttempts, setRetryAttempts] = useState<RecoveryAttempt[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const errorInfoRef = useRef<React.ErrorInfo | undefined>(undefined);
  const classifiedErrorRef = useRef<ClassifiedError | null>(null);
  
  const networkStatus = useNetworkStatus();
  const { queueStatus } = useOfflineQueue();

  // Reset retry attempts when component unmounts or resets
  useEffect(() => {
    return () => {
      setRetryAttempts([]);
      setIsRetrying(false);
      errorInfoRef.current = undefined;
      classifiedErrorRef.current = null;
    };
  }, []);

  const attemptRecovery = useCallback(async (strategy?: RecoveryStrategy) => {
    if (isRetrying || retryAttempts.length >= maxRetryAttempts) {
      return;
    }

    // Use suggested strategy from classified error if none provided
    const recoveryStrategy = strategy || classifiedErrorRef.current?.suggestedStrategy || 'retry';

    setIsRetrying(true);
    const timestamp = Date.now();

    try {
      switch (recoveryStrategy) {
        case 'retry':
          // Simple retry - let the error boundary reset
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
        
        case 'refresh':
          window.location.reload();
          return;
        
        case 'navigate':
          window.location.href = '/';
          return;
        
        case 'fallback':
          // Continue with fallback UI
          break;
      }

      // Record successful attempt
      const attempt: RecoveryAttempt = {
        strategy: recoveryStrategy,
        timestamp,
        success: true,
      };

      setRetryAttempts(prev => [...prev, attempt]);
      
      if (onRecovery) {
        onRecovery(recoveryStrategy, true);
      }

      // Reset the error boundary
      window.location.reload();

    } catch (recoveryError) {
      // Record failed attempt
      const attempt: RecoveryAttempt = {
        strategy: recoveryStrategy,
        timestamp,
        success: false,
        error: recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
      };

      setRetryAttempts(prev => [...prev, attempt]);
      
      if (onRecovery) {
        onRecovery(recoveryStrategy, false);
      }
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, retryAttempts.length, maxRetryAttempts, onRecovery]);

  // Auto-retry for network errors when connection is restored
  useEffect(() => {
    if (
      enableNetworkRecovery &&
      networkStatus.isOnline &&
      classifiedErrorRef.current?.category === 'network' &&
      retryAttempts.length > 0 &&
      !isRetrying
    ) {
      const lastAttempt = retryAttempts[retryAttempts.length - 1];
      if (!lastAttempt.success && retryAttempts.length < maxRetryAttempts) {
        setTimeout(() => {
          attemptRecovery('retry');
        }, autoRetryDelay);
      }
    }
  }, [networkStatus.isOnline, retryAttempts, isRetrying, enableNetworkRecovery, maxRetryAttempts, autoRetryDelay, attemptRecovery]);

  const handleReport = useCallback(() => {
    if (classifiedErrorRef.current) {
      // In a real application, you would send this to your error reporting service
      console.error('Error Report:', {
        error: classifiedErrorRef.current,
        retryAttempts,
        networkStatus,
        queueStatus,
        context: { entityType, entityId, context },
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
      
      // Show user feedback
      alert('Error report submitted. Thank you for helping us improve!');
    }
  }, [retryAttempts, networkStatus, queueStatus, entityType, entityId, context]);

  const canRetry = retryAttempts.length < maxRetryAttempts && !isRetrying;

  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <CustomFallback
          {...props}
          error={classifiedErrorRef.current || classifyError(props.error, errorInfoRef.current)}
          retryAttempts={retryAttempts}
          networkStatus={networkStatus}
          queueStatus={queueStatus}
          onRetry={attemptRecovery}
          onReport={handleReport}
          onNavigateHome={() => window.location.href = '/'}
          onRefresh={() => window.location.reload()}
          canRetry={canRetry}
          isRetrying={isRetrying}
          entityType={entityType}
          entityId={entityId}
          context={context}
        />
      )}
      onError={(error, errorInfo) => {
        // Classify the error
        const classifiedError = classifyError(error, errorInfo);
        classifiedErrorRef.current = classifiedError;
        errorInfoRef.current = errorInfo;

        // Enhanced logging
        console.error('Enhanced Error Boundary caught error:', {
          classification: classifiedError,
          originalError: error,
          errorInfo,
          context: { entityType, entityId, context },
          networkStatus,
          queueStatus,
          timestamp: new Date().toISOString(),
        });

        // Call custom error handler
        if (onError) {
          onError(classifiedError, retryAttempts);
        }

        // Auto-retry for certain error types
        if (
          classifiedError.retryable &&
          classifiedError.category === 'network' &&
          networkStatus.isOnline &&
          retryAttempts.length === 0
        ) {
          setTimeout(() => {
            attemptRecovery(classifiedError.suggestedStrategy);
          }, autoRetryDelay);
        }
      }}
      onReset={() => {
        // Clear error state
        errorInfoRef.current = undefined;
        classifiedErrorRef.current = null;
        setRetryAttempts([]);
        setIsRetrying(false);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

