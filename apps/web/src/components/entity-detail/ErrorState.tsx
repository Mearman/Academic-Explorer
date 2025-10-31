import React from "react";

interface ErrorStateProps {
  entityType: string;
  entityId: string;
  error: unknown;
}

export function ErrorState({ entityType, entityId, error }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-red-600 mb-2">Error Loading {entityType}</h2>
        </div>
        <div className="space-y-3 text-left">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 font-semibold mb-1">{entityType} ID:</p>
            <p className="text-gray-800 font-mono break-all">{entityId}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 font-semibold mb-1">Error Details:</p>
            <p className="text-red-800 font-mono text-sm break-all">{String(error)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
