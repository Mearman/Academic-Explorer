import React from 'react';

interface ErrorSummaryProps {
  error: Error;
}

export function ErrorSummary({ error }: ErrorSummaryProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded p-3">
      <h4 className="text-sm font-semibold text-red-800 mb-2">Error Summary</h4>
      <div className="text-xs space-y-1">
        <div><span className="font-medium">Type:</span> {error.name}</div>
        <div><span className="font-medium">Message:</span> {error.message}</div>
      </div>
    </div>
  );
}

interface SystemInfoSectionProps {
  systemInfo: {
    url: string;
    timestamp: string;
    viewport: string;
    userAgent: string;
    reactVersion?: string;
    localStorage: boolean;
    indexedDB: boolean;
  };
}

export function SystemInfoSection({ systemInfo }: SystemInfoSectionProps) {
  return (
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
  );
}

interface BuildInfoSectionProps {
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

export function BuildInfoSection({ buildInfo }: BuildInfoSectionProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded p-3">
      <h4 className="text-sm font-semibold text-purple-800 mb-2">Build Information</h4>
      <div className="text-xs space-y-1">
        <div><span className="font-medium">Commit:</span> {buildInfo.commitHash}</div>
        <div><span className="font-medium">Branch:</span> {buildInfo.branch}</div>
        <div><span className="font-medium">Build Time:</span> {buildInfo.buildTimestamp}</div>
        <div><span className="font-medium">Environment:</span> {buildInfo.environment}</div>
        <div><span className="font-medium">Node Version:</span> {buildInfo.nodeVersion}</div>
        <div><span className="font-medium">Platform:</span> {buildInfo.platform}</div>
        <div className="pt-1">
          <span className="font-medium">Commit Message:</span>
          <div className="text-gray-600 text-xs mt-1 pl-2 border-l-2 border-purple-200 whitespace-pre-wrap">
            {buildInfo.commitMessage}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StackTraceSectionProps {
  error: Error;
}

export function StackTraceSection({ error }: StackTraceSectionProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">Stack Trace</h4>
      <pre className="text-xs text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap">
        {error.stack}
      </pre>
    </div>
  );
}

interface ComponentStackSectionProps {
  componentStack: string;
}

export function ComponentStackSection({ componentStack }: ComponentStackSectionProps) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
      <h4 className="text-sm font-semibold text-yellow-800 mb-2">Component Stack</h4>
      <pre className="text-xs text-yellow-700 overflow-auto max-h-32 whitespace-pre-wrap">
        {componentStack}
      </pre>
    </div>
  );
}

interface FullReportSectionProps {
  fullErrorReport: string;
  onCopy: () => void;
  copyStatus: 'idle' | 'copying' | 'copied' | 'error';
  copyButtonText: string;
  copyButtonClass: string;
}

export function FullReportSection({ 
  fullErrorReport, 
  onCopy, 
  copyStatus, 
  copyButtonText, 
  copyButtonClass 
}: FullReportSectionProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800">Complete Error Report</h4>
        <button
          onClick={onCopy}
          disabled={copyStatus === 'copying'}
          className={copyButtonClass}
        >
          {copyButtonText}
        </button>
      </div>
      <pre className="text-xs text-gray-600 overflow-auto max-h-64 whitespace-pre-wrap bg-white border rounded p-2">
        {fullErrorReport}
      </pre>
    </div>
  );
}