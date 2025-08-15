import React, { useState } from 'react';

import { EntityErrorBoundary } from '../templates/error-boundary';

/**
 * Test component to demonstrate error boundary functionality
 * This component is for development/testing purposes only
 */

interface ErrorTestProps {
  shouldError?: boolean;
  errorType?: 'throw' | 'async' | 'render';
}

function ErrorTrigger({ shouldError = false, errorType = 'throw' }: ErrorTestProps) {
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  // Re-throw async errors to be caught by error boundary
  if (asyncError) {
    throw asyncError;
  }

  const triggerError = () => {
    switch (errorType) {
      case 'throw':
        throw new Error('Test synchronous error - this is intentional for testing the error boundary');
      
      case 'async':
        setTimeout(() => {
          setAsyncError(new Error('Test asynchronous error - this simulates an API failure or async operation error'));
        }, 100);
        break;
      
      case 'render':
        // This will cause a render error
        const obj: any = null;
        return <div>{obj.nonExistentProperty.toString()}</div>;
      
      default:
        throw new Error('Unknown error type');
    }
  };

  if (shouldError) {
    triggerError();
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Error Boundary Test Component</h2>
      <p className="text-gray-600 mb-4">
        This component is working normally. Click the buttons below to test different error scenarios:
      </p>
      
      <div className="space-y-2">
        <button
          onClick={() => triggerError()}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Trigger Synchronous Error
        </button>
        
        <button
          onClick={() => setAsyncError(new Error('Test async error via state update'))}
          className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Trigger Async Error
        </button>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>The error boundary should catch these errors and display the enhanced error UI with:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Error summary with type and message</li>
          <li>System information (browser, URL, etc.)</li>
          <li>Stack trace</li>
          <li>Component stack trace</li>
          <li>Complete error report with copy button</li>
        </ul>
      </div>
    </div>
  );
}

export function ErrorBoundaryTest() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Enhanced Error Boundary Test
          </h1>
          <p className="text-gray-600">
            Test the error boundary with comprehensive debug logging and copy functionality
          </p>
        </div>
        
        <EntityErrorBoundary 
          entityType="test" 
          entityId="error-boundary-test"
        >
          <ErrorTrigger />
        </EntityErrorBoundary>
      </div>
    </div>
  );
}

export default ErrorBoundaryTest;