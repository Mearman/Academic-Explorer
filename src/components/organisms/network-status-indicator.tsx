/**
 * Network Status Indicator
 * Provides comprehensive network status feedback and offline capabilities overview
 */

import React, { useState, useEffect } from 'react';

import { useIntelligentOfflineQueue } from '@/hooks/use-intelligent-offline-queue';
import { useNetworkStatus } from '@/hooks/use-network-status';

interface NetworkStatusIndicatorProps {
  position?: 'top' | 'bottom';
  compact?: boolean;
  showDetails?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

/**
 * Get connection quality color and icon
 */
function getConnectionDisplay(quality: string, isOnline: boolean) {
  if (!isOnline) {
    return {
      color: 'bg-red-500',
      icon: 'OFF',
      text: 'Offline',
      description: 'No internet connection',
    };
  }

  switch (quality) {
    case 'fast':
      return {
        color: 'bg-green-500',
        icon: 'FAST',
        text: 'Excellent',
        description: 'Fast, reliable connection',
      };
    case 'moderate':
      return {
        color: 'bg-yellow-500',
        icon: 'GOOD',
        text: 'Good',
        description: 'Stable connection',
      };
    case 'slow':
      return {
        color: 'bg-orange-500',
        icon: 'SLOW',
        text: 'Slow',
        description: 'Limited bandwidth',
      };
    case 'verySlow':
      return {
        color: 'bg-red-400',
        icon: 'OFF',
        text: 'Very Slow',
        description: 'Poor connection quality',
      };
    default:
      return {
        color: 'bg-gray-500',
        icon: 'UNK',
        text: 'Unknown',
        description: 'Connection quality unknown',
      };
  }
}

/**
 * Format file size for display
 */
function _formatBytes(bytes: number): string {
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

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Compact network status indicator
 */
function CompactIndicator({ 
  networkStatus, 
  queueStatus, 
  onClick 
}: {
  networkStatus: ReturnType<typeof useNetworkStatus>;
  queueStatus: ReturnType<typeof useIntelligentOfflineQueue>['queueStatus'];
  onClick: () => void;
}) {
  const display = getConnectionDisplay(networkStatus.connectionQuality, networkStatus.isOnline);
  
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-all hover:shadow-md"
      style={{ backgroundColor: display.color.replace('bg-', '').includes('500') ? '#f3f4f6' : '#fef7f7' }}
    >
      <span className="text-lg">{display.icon}</span>
      <span className="font-medium text-gray-700">{display.text}</span>
      {queueStatus.pendingRequests > 0 && (
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
          {queueStatus.pendingRequests}
        </span>
      )}
    </button>
  );
}

/**
 * Detailed network status panel
 */
function DetailedPanel({ 
  networkStatus, 
  queueStatus, 
  conflicts,
  onClose 
}: {
  networkStatus: ReturnType<typeof useNetworkStatus>;
  queueStatus: ReturnType<typeof useIntelligentOfflineQueue>['queueStatus'];
  conflicts: ReturnType<typeof useIntelligentOfflineQueue>['conflicts'];
  onClose: () => void;
}) {
  const display = getConnectionDisplay(networkStatus.connectionQuality, networkStatus.isOnline);
  
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{display.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{display.text}</h3>
            <p className="text-sm text-gray-600">{display.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Connection Details */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Type:</span>
            <span className="ml-1 font-medium">{networkStatus.connectionType.toUpperCase()}</span>
          </div>
          <div>
            <span className="text-gray-600">Speed:</span>
            <span className="ml-1 font-medium">{networkStatus.downlink} Mbps</span>
          </div>
          <div>
            <span className="text-gray-600">Latency:</span>
            <span className="ml-1 font-medium">{networkStatus.rtt}ms</span>
          </div>
          <div>
            <span className="text-gray-600">Data Saver:</span>
            <span className="ml-1 font-medium">{networkStatus.saveData ? 'On' : 'Off'}</span>
          </div>
        </div>

        {networkStatus.offlineDuration > 0 && (
          <div className="text-sm">
            <span className="text-gray-600">Last offline:</span>
            <span className="ml-1 font-medium">
              {formatDuration(networkStatus.offlineDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Queue Status */}
      {queueStatus.pendingRequests > 0 && (
        <div className="border-t border-gray-200 pt-3 mb-3">
          <h4 className="font-medium text-gray-900 mb-2">Offline Queue</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pending requests:</span>
              <span className="font-medium">{queueStatus.pendingRequests}</span>
            </div>
            {queueStatus.highPriorityRequests > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">High priority:</span>
                <span className="font-medium text-red-600">{queueStatus.highPriorityRequests}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Est. sync time:</span>
              <span className="font-medium">{formatDuration(queueStatus.estimatedSyncTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Data integrity:</span>
              <span className={`font-medium ${
                queueStatus.dataIntegrityScore >= 90 ? 'text-green-600' :
                queueStatus.dataIntegrityScore >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {queueStatus.dataIntegrityScore}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="border-t border-gray-200 pt-3 mb-3">
          <h4 className="font-medium text-gray-900 mb-2">Data Conflicts</h4>
          <div className="space-y-2">
            {conflicts.slice(0, 3).map((conflict, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate">
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
            ))}
            {conflicts.length > 3 && (
              <div className="text-xs text-gray-500">
                +{conflicts.length - 3} more conflicts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="border-t border-gray-200 pt-3">
        <h4 className="font-medium text-gray-900 mb-2">Session Statistics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Processed:</span>
            <span className="ml-1 font-medium text-green-600">{queueStatus.totalProcessed}</span>
          </div>
          <div>
            <span className="text-gray-600">Failed:</span>
            <span className="ml-1 font-medium text-red-600">{queueStatus.totalFailed}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex space-x-2">
        {queueStatus.pendingRequests > 0 && networkStatus.isOnline && (
          <button className="flex-1 bg-blue-600 text-white text-sm py-2 px-3 rounded hover:bg-blue-700 transition-colors">
            Sync Now
          </button>
        )}
        {!networkStatus.isOnline && (
          <button className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 px-3 rounded cursor-not-allowed">
            Waiting for Connection
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Main network status indicator component
 */
export function NetworkStatusIndicator({
  position = 'bottom',
  compact = false,
  showDetails = true,
  autoHide = true,
  autoHideDelay = 5000,
}: NetworkStatusIndicatorProps) {
  const networkStatus = useNetworkStatus();
  const { queueStatus, conflicts } = useIntelligentOfflineQueue();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetailedPanel, setShowDetailedPanel] = useState(false);

  // Show indicator when offline, has queued requests, or has conflicts
  const shouldShow = !networkStatus.isOnline || 
                    queueStatus.pendingRequests > 0 || 
                    conflicts.length > 0 ||
                    networkStatus.isSlowConnection;

  // Auto-hide logic
  useEffect(() => {
    if (shouldShow) {
      setIsVisible(true);
      
      if (autoHide && networkStatus.isOnline && queueStatus.pendingRequests === 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    } else if (autoHide) {
      setIsVisible(false);
    }
  }, [shouldShow, autoHide, autoHideDelay, networkStatus.isOnline, queueStatus.pendingRequests]);

  // Don't render if not visible and auto-hide is enabled
  if (!isVisible && autoHide) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-4 left-1/2 transform -translate-x-1/2'
    : 'bottom-4 right-4';

  return (
    <div className={`fixed ${positionClasses} z-50 transition-all duration-300`}>
      {compact || !showDetails ? (
        <CompactIndicator
          networkStatus={networkStatus}
          queueStatus={queueStatus}
          onClick={() => setShowDetailedPanel(!showDetailedPanel)}
        />
      ) : (
        <DetailedPanel
          networkStatus={networkStatus}
          queueStatus={queueStatus}
          conflicts={conflicts}
          onClose={() => setIsVisible(false)}
        />
      )}

      {/* Detailed panel for compact mode */}
      {compact && showDetailedPanel && (
        <div className="absolute bottom-full mb-2 right-0">
          <DetailedPanel
            networkStatus={networkStatus}
            queueStatus={queueStatus}
            conflicts={conflicts}
            onClose={() => setShowDetailedPanel(false)}
          />
        </div>
      )}
    </div>
  );
}

