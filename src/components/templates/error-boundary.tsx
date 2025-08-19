'use client';

/**
 * Error Boundary Component for Entity Pages
 * Provides graceful error handling with user-friendly messages
 */

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorActions } from '../molecules/error-actions';
import { ErrorDebugDetails } from '../molecules/error-debug-details';
import { ErrorIcon } from '../molecules/error-icon';
import { ErrorMessageContent } from '../molecules/error-message-content';

export interface EntityErrorProps {
  error: Error;
  resetErrorBoundary: () => void;
  errorInfo?: React.ErrorInfo;
  entityType?: string;
  entityId?: string;
}

function EntityError({ 
  error, 
  resetErrorBoundary, 
  errorInfo,
  entityType, 
  entityId 
}: EntityErrorProps) {
  const isNotFound = error.message.includes('404') || error.message.includes('not found');
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <ErrorIcon isNotFound={isNotFound} />
        </div>
        
        <ErrorMessageContent 
          isNotFound={isNotFound}
          isNetworkError={isNetworkError}
          entityType={entityType}
          entityId={entityId}
        />
        
        <ErrorActions onRetry={resetErrorBoundary} />
        
        <ErrorDebugDetails 
          error={error} 
          errorInfo={errorInfo}
          showInProduction={true}
          includeSystemInfo={true}
        />
      </div>
    </div>
  );
}

export interface EntityErrorBoundaryProps {
  children: React.ReactNode;
  entityType?: string;
  entityId?: string;
  fallback?: React.ComponentType<EntityErrorProps>;
}

export function EntityErrorBoundary({ 
  children, 
  entityType, 
  entityId,
  fallback: Fallback = EntityError
}: EntityErrorBoundaryProps) {
  // Store errorInfo in a ref to pass it to the fallback component
  const errorInfoRef = React.useRef<React.ErrorInfo | undefined>(undefined);

  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <Fallback 
          {...props} 
          errorInfo={errorInfoRef.current}
          entityType={entityType} 
          entityId={entityId} 
        />
      )}
      onError={(error, errorInfo) => {
        // Store errorInfo for the fallback component
        errorInfoRef.current = errorInfo;
        
        // Enhanced logging with full context
        const logData = {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          context: {
            entityType,
            entityId,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
        };
        
        console.error('Entity page error:', error, errorInfo);
        console.error('Full error context:', logData);
        
        // Could send to analytics/monitoring service like Sentry
        // if (window.Sentry) {
        //   window.Sentry.captureException(error, {
        //     tags: { entityType, entityId },
        //     extra: { errorInfo, context: logData.context }
        //   });
        // }
      }}
      onReset={() => {
        // Clear errorInfo when boundary resets
        errorInfoRef.current = undefined;
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export { EntityError };