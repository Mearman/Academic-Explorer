import React, { useState } from 'react';

interface ErrorDebugDetailsProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  showInProduction?: boolean;
  includeSystemInfo?: boolean;
}

interface SystemInfo {
  userAgent: string;
  url: string;
  timestamp: string;
  viewport: string;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  reactVersion?: string;
}

function getSystemInfo(): SystemInfo {
  return {
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    localStorage: typeof Storage !== 'undefined',
    sessionStorage: typeof Storage !== 'undefined',
    indexedDB: 'indexedDB' in window,
    reactVersion: React.version,
  };
}

function generateErrorReport(
  error: Error, 
  errorInfo?: React.ErrorInfo, 
  systemInfo?: SystemInfo
): string {
  const report = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    errorInfo: errorInfo ? {
      componentStack: errorInfo.componentStack,
    } : null,
    systemInfo,
    timestamp: new Date().toISOString(),
  };
  
  return JSON.stringify(report, null, 2);
}

export function ErrorDebugDetails({ 
  error, 
  errorInfo, 
  showInProduction = false,
  includeSystemInfo = true 
}: ErrorDebugDetailsProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment && !showInProduction) {
    return null;
  }

  const systemInfo = includeSystemInfo ? getSystemInfo() : undefined;
  const fullErrorReport = generateErrorReport(error, errorInfo, systemInfo);

  const handleCopyToClipboard = async () => {
    setCopyStatus('copying');
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullErrorReport);
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = fullErrorReport;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const getCopyButtonText = () => {
    switch (copyStatus) {
      case 'copying': return 'Copying...';
      case 'copied': return 'Copied!';
      case 'error': return 'Copy Failed';
      default: return 'Copy Error Details';
    }
  };

  const getCopyButtonClass = () => {
    const baseClass = "mt-3 px-3 py-1 text-xs rounded transition-colors duration-200";
    switch (copyStatus) {
      case 'copying': return `${baseClass} bg-blue-100 text-blue-700 cursor-wait`;
      case 'copied': return `${baseClass} bg-green-100 text-green-700`;
      case 'error': return `${baseClass} bg-red-100 text-red-700`;
      default: return `${baseClass} bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer`;
    }
  };

  return (
    <details className="mt-6 text-left">
      <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center justify-between">
        <span>Technical Details & Debug Information</span>
        <span className="text-xs text-gray-400">
          {isDevelopment ? 'Development' : 'Production'}
        </span>
      </summary>
      
      <div className="mt-3 space-y-3">
        {/* Error Summary */}
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <h4 className="text-sm font-semibold text-red-800 mb-2">Error Summary</h4>
          <div className="text-xs space-y-1">
            <div><span className="font-medium">Type:</span> {error.name}</div>
            <div><span className="font-medium">Message:</span> {error.message}</div>
          </div>
        </div>

        {/* System Information */}
        {systemInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">System Information</h4>
            <div className="text-xs space-y-1">
              <div><span className="font-medium">URL:</span> {systemInfo.url}</div>
              <div><span className="font-medium">Timestamp:</span> {systemInfo.timestamp}</div>
              <div><span className="font-medium">Viewport:</span> {systemInfo.viewport}</div>
              <div><span className="font-medium">User Agent:</span> {systemInfo.userAgent}</div>
              <div><span className="font-medium">React Version:</span> {systemInfo.reactVersion}</div>
              <div>
                <span className="font-medium">Storage Support:</span>
                <span className={systemInfo.localStorage ? 'text-green-600' : 'text-red-600'}>
                  {' '}localStorage: {systemInfo.localStorage ? '✓' : '✗'}
                </span>
                <span className={systemInfo.indexedDB ? 'text-green-600' : 'text-red-600'}>
                  {' '}IndexedDB: {systemInfo.indexedDB ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stack Trace */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Stack Trace</h4>
          <pre className="text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
            {error.stack}
          </pre>
        </div>

        {/* Component Stack */}
        {errorInfo?.componentStack && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Component Stack</h4>
            <pre className="text-xs text-yellow-700 overflow-auto max-h-32 whitespace-pre-wrap">
              {errorInfo.componentStack}
            </pre>
          </div>
        )}

        {/* Full Report */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-800">Complete Error Report</h4>
            <button
              onClick={handleCopyToClipboard}
              disabled={copyStatus === 'copying'}
              className={getCopyButtonClass()}
            >
              {getCopyButtonText()}
            </button>
          </div>
          <pre className="text-xs text-gray-600 overflow-auto max-h-64 whitespace-pre-wrap bg-white border rounded p-2">
            {fullErrorReport}
          </pre>
        </div>

        {/* Helper Text */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
          <p className="mb-1">
            <strong>For Developers:</strong> This detailed error information can help diagnose issues.
          </p>
          <p>
            <strong>For Support:</strong> Click "Copy Error Details" and include this information when reporting bugs.
          </p>
        </div>
      </div>
    </details>
  );
}