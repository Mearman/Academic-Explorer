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
  entityType?: string;
  entityId?: string;
}

function EntityError({ 
  error, 
  resetErrorBoundary, 
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
        
        <ErrorDebugDetails error={error} />
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
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <Fallback {...props} entityType={entityType} entityId={entityId} />
      )}
      onError={(error, errorInfo) => {
        // Log error for monitoring (could integrate with Sentry, etc.)
        console.error('Entity page error:', error, errorInfo);
        
        // Could send to analytics/monitoring service
        // Note: Analytics integration can be added later with proper type definitions
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default EntityErrorBoundary;