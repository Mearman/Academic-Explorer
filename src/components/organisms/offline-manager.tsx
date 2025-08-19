/**
 * Comprehensive offline management component
 * Provides centralized management of offline features, sync status, and conflict resolution
 */

import React, { useState, useEffect } from 'react';

import { useIntelligentOfflineQueue } from '@/hooks/use-intelligent-offline-queue';
import { useOfflineFirstData } from '@/lib/offline-first-data';
import { useServiceWorker } from '@/lib/service-worker';

interface OfflineManagerProps {
  isOpen: boolean;
  onClose: () => void;
  autoManageConflicts?: boolean;
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Offline queue section
 */
function OfflineQueueSection({ queueManager }: { queueManager: ReturnType<typeof useIntelligentOfflineQueue> }) {
  const { queueStatus } = queueManager;

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">Offline Queue</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-2xl font-bold text-blue-600">{queueStatus.pendingRequests}</div>
          <div className="text-sm text-gray-600">Pending Requests</div>
        </div>
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-2xl font-bold text-red-600">{queueStatus.highPriorityRequests}</div>
          <div className="text-sm text-gray-600">High Priority</div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Est. sync time:</span>
          <span className="font-medium">{formatDuration(queueStatus.estimatedSyncTime)}</span>
        </div>
        <div className="flex justify-between">
          <span>Data integrity:</span>
          <span className={`font-medium ${
            queueStatus.dataIntegrityScore >= 90 ? 'text-green-600' :
            queueStatus.dataIntegrityScore >= 70 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {queueStatus.dataIntegrityScore}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Total processed:</span>
          <span className="font-medium text-green-600">{queueStatus.totalProcessed}</span>
        </div>
        <div className="flex justify-between">
          <span>Total failed:</span>
          <span className="font-medium text-red-600">{queueStatus.totalFailed}</span>
        </div>
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => queueManager.processQueueIntelligently()}
          disabled={queueStatus.isProcessing || queueStatus.pendingRequests === 0}
          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {queueStatus.isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </span>
          ) : 'Sync Now'}
        </button>
        <button
          onClick={() => queueManager.clearAll()}
          className="bg-red-100 text-red-700 py-2 px-3 rounded text-sm hover:bg-red-200 transition-colors"
        >
          Clear Queue
        </button>
      </div>
    </div>
  );
}

/**
 * Conflict resolution section
 */
function ConflictResolutionSection({ 
  conflicts, 
  onResolveConflict 
}: { 
  conflicts: ReturnType<typeof useIntelligentOfflineQueue>['conflicts'];
  onResolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge') => void;
}) {
  if (conflicts.length === 0) {
    return (
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-2">Data Conflicts</h3>
        <p className="text-green-700 text-sm">No conflicts detected. All data is in sync.</p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 p-4 rounded-lg">
      <h3 className="font-semibold text-yellow-900 mb-3">Data Conflicts ({conflicts.length})</h3>
      
      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <div key={index} className="bg-white p-3 rounded border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">
                {conflict.conflictType} conflict
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                conflict.resolved 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {conflict.resolved ? 'Resolved' : 'Pending'}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              ID: <code className="bg-gray-100 px-1 rounded">{conflict.requestId}</code>
            </p>

            {!conflict.resolved && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onResolveConflict(conflict.requestId, 'local')}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200 transition-colors"
                >
                  Keep Local
                </button>
                <button
                  onClick={() => onResolveConflict(conflict.requestId, 'server')}
                  className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-200 transition-colors"
                >
                  Keep Server
                </button>
                <button
                  onClick={() => onResolveConflict(conflict.requestId, 'merge')}
                  className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs hover:bg-purple-200 transition-colors"
                >
                  Merge
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Storage management section
 */
function StorageManagementSection({ dataManager }: { dataManager: ReturnType<typeof useOfflineFirstData> }) {
  const [storageUsage, setStorageUsage] = useState<{ usage?: number; quota?: number }>({});
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    dataManager.getStorageUsage().then(setStorageUsage);
  }, [dataManager]);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await dataManager.clearAllCache();
      const newUsage = await dataManager.getStorageUsage();
      setStorageUsage(newUsage);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const usagePercentage = storageUsage.usage && storageUsage.quota 
    ? (storageUsage.usage / storageUsage.quota) * 100
    : 0;

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">Storage Management</h3>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Storage Used:</span>
            <span className="font-medium">
              {storageUsage.usage ? formatBytes(storageUsage.usage) : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span>Storage Quota:</span>
            <span className="font-medium">
              {storageUsage.quota ? formatBytes(storageUsage.quota) : 'Unknown'}
            </span>
          </div>
          
          {storageUsage.usage && storageUsage.quota && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  usagePercentage > 80 ? 'bg-red-500' :
                  usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="bg-red-100 text-red-700 py-2 px-3 rounded text-sm hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </button>
          <button
            onClick={() => dataManager.getStorageUsage().then(setStorageUsage)}
            className="bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PWA management section
 */
function PWAManagementSection({ serviceWorker }: { serviceWorker: ReturnType<typeof useServiceWorker> }) {
  const { status, pwaStatus } = serviceWorker;

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="font-semibold text-blue-900 mb-3">Progressive Web App</h3>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Service Worker:</span>
            <span className={`ml-1 font-medium ${
              status.isRegistered ? 'text-green-600' : 'text-red-600'
            }`}>
              {status.isRegistered ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Installed:</span>
            <span className={`ml-1 font-medium ${
              pwaStatus.isInstalled ? 'text-green-600' : 'text-gray-600'
            }`}>
              {pwaStatus.isInstalled ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Platform:</span>
            <span className="ml-1 font-medium capitalize">{pwaStatus.platform}</span>
          </div>
          <div>
            <span className="text-gray-600">Can Install:</span>
            <span className={`ml-1 font-medium ${
              pwaStatus.canInstall ? 'text-green-600' : 'text-gray-600'
            }`}>
              {pwaStatus.canInstall ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        <div className="flex space-x-2">
          {pwaStatus.canInstall && (
            <button
              onClick={() => serviceWorker.installPWA()}
              className="bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Install App
            </button>
          )}
          {status.isWaiting && (
            <button
              onClick={() => serviceWorker.skipWaiting()}
              className="bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
            >
              Update Available
            </button>
          )}
          <button
            onClick={() => serviceWorker.clearCaches()}
            className="bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors"
          >
            Clear SW Cache
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main offline manager component
 */
export function OfflineManager({ 
  isOpen, 
  onClose, 
  autoManageConflicts = false 
}: OfflineManagerProps) {
  const dataManager = useOfflineFirstData();
  const queueManager = useIntelligentOfflineQueue();
  const serviceWorker = useServiceWorker();
  const [syncStatus, setSyncStatus] = useState<any[]>([]);

  // Load sync status
  useEffect(() => {
    if (isOpen) {
      dataManager.getSyncStatus().then(setSyncStatus);
    }
  }, [isOpen, dataManager]);

  // Auto-resolve conflicts if enabled
  useEffect(() => {
    if (autoManageConflicts && queueManager.conflicts.length > 0) {
      queueManager.conflicts.forEach(conflict => {
        if (!conflict.resolved) {
          // Simple auto-resolution: prefer newer data
          queueManager.resolveConflictManually(conflict.requestId, 'merge');
        }
      });
    }
  }, [queueManager.conflicts, autoManageConflicts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Offline Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Network Status */}
          <div className={`p-4 rounded-lg ${
            dataManager.networkStatus.isOnline 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">
                {dataManager.networkStatus.isOnline ? '🟢' : '🔴'}
              </span>
              <div>
                <h3 className={`font-semibold ${
                  dataManager.networkStatus.isOnline ? 'text-green-900' : 'text-red-900'
                }`}>
                  {dataManager.networkStatus.isOnline ? 'Online' : 'Offline'}
                </h3>
                <p className={`text-sm ${
                  dataManager.networkStatus.isOnline ? 'text-green-700' : 'text-red-700'
                }`}>
                  {dataManager.networkStatus.isOnline 
                    ? `Connected via ${dataManager.networkStatus.connectionType.toUpperCase()} • ${dataManager.networkStatus.connectionQuality} quality`
                    : 'Working in offline mode • Data will sync when connection returns'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              <OfflineQueueSection queueManager={queueManager} />
              <StorageManagementSection dataManager={dataManager} />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <ConflictResolutionSection 
                conflicts={queueManager.conflicts}
                onResolveConflict={queueManager.resolveConflictManually}
              />
              <PWAManagementSection serviceWorker={serviceWorker} />
            </div>
          </div>

          {/* Sync Status */}
          {syncStatus.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Sync Status</h3>
              <div className="space-y-2">
                {syncStatus.map((status, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{status.id}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">
                        Last sync: {new Date(status.lastSynced).toLocaleTimeString()}
                      </span>
                      {status.pendingChanges && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <button
              onClick={() => dataManager.forceSyncAll()}
              disabled={!dataManager.networkStatus.isOnline}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Force Sync All
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition-colors"
              >
                Refresh App
              </button>
              <button
                onClick={onClose}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OfflineManager;