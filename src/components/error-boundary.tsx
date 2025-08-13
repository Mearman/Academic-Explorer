'use client';

/**
 * Error Boundary Component for Entity Pages
 * Provides graceful error handling with user-friendly messages
 */

import React from 'react';
import { Link } from '@tanstack/react-router';
import { ErrorBoundary } from 'react-error-boundary';

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
          {isNotFound ? (
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto mb-4 text-red-400">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
          )}
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {isNotFound 
            ? `${entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1, -1) : 'Entity'} Not Found`
            : 'Something Went Wrong'
          }
        </h1>
        
        <p className="text-gray-600 mb-6">
          {isNotFound ? (
            <>
              The {entityType ? entityType.slice(0, -1) : 'entity'} 
              {entityId && (
                <> with ID <code className="bg-gray-100 px-1 rounded">{entityId}</code></>
              )} could not be found.
            </>
          ) : isNetworkError ? (
            'There was a problem connecting to the OpenAlex API. Please check your internet connection and try again.'
          ) : (
            'An unexpected error occurred while loading this page. This might be a temporary issue.'
          )}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
          
          <Link
            to="/"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            Home
          </Link>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical Details
            </summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
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