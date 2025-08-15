import React, { useState } from 'react';

import { getFullBuildInfo } from '@/lib/build-info-utils';

import { 
  ErrorSummary, 
  SystemInfoSection, 
  BuildInfoSection, 
  StackTraceSection, 
  ComponentStackSection, 
  FullReportSection 
} from './error-debug-sections';

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
  buildInfo: {
    commitHash: string;
    commitMessage: string;
    branch: string;
    buildTimestamp: string;
    nodeVersion: string;
    platform: string;
    environment: string;
  };
}

function getSystemInfo(): SystemInfo {
  const buildInfo = getFullBuildInfo();
  
  return {
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    localStorage: typeof Storage !== 'undefined',
    sessionStorage: typeof Storage !== 'undefined',
    indexedDB: 'indexedDB' in window,
    reactVersion: React.version,
    buildInfo: {
      commitHash: `${buildInfo.git.short} (${buildInfo.git.full})`,
      commitMessage: buildInfo.git.message,
      branch: buildInfo.git.branch,
      buildTimestamp: buildInfo.buildTimestamp,
      nodeVersion: buildInfo.nodeVersion,
      platform: buildInfo.platform,
      environment: buildInfo.env.NODE_ENV,
    },
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

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers or non-HTTPS
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }
}

function getCopyButtonTextForStatus(status: 'idle' | 'copying' | 'copied' | 'error'): string {
  switch (status) {
    case 'copying': return 'Copying...';
    case 'copied': return 'Copied!';
    case 'error': return 'Copy Failed';
    default: return 'Copy Error Details';
  }
}

function getCopyButtonClassForStatus(status: 'idle' | 'copying' | 'copied' | 'error'): string {
  const baseClass = "mt-3 px-3 py-1 text-xs rounded transition-colors duration-200";
  switch (status) {
    case 'copying': return `${baseClass} bg-blue-100 text-blue-700 cursor-wait`;
    case 'copied': return `${baseClass} bg-green-100 text-green-700`;
    case 'error': return `${baseClass} bg-red-100 text-red-700`;
    default: return `${baseClass} bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer`;
  }
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
      await copyToClipboard(fullErrorReport);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const getCopyButtonText = (): string => {
    return getCopyButtonTextForStatus(copyStatus);
  };

  const getCopyButtonClass = (): string => {
    return getCopyButtonClassForStatus(copyStatus);
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
        <ErrorSummary error={error} />
        
        {systemInfo && <SystemInfoSection systemInfo={systemInfo} />}
        
        {systemInfo?.buildInfo && <BuildInfoSection buildInfo={systemInfo.buildInfo} />}
        
        <StackTraceSection error={error} />
        
        {errorInfo?.componentStack && (
          <ComponentStackSection componentStack={errorInfo.componentStack} />
        )}
        
        <FullReportSection
          fullErrorReport={fullErrorReport}
          onCopy={handleCopyToClipboard}
          copyStatus={copyStatus}
          copyButtonText={getCopyButtonText()}
          copyButtonClass={getCopyButtonClass()}
        />

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