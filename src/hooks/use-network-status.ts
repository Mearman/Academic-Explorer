/**
 * Network status monitoring hook using browser APIs
 */

import { useState, useEffect, useCallback } from 'react';

import type { 
  NetworkStatus, 
  NetworkConnectionType, 
  ConnectionQuality 
} from '@/types/network';

/**
 * Network Information API interface (experimental browser API)
 */
interface NetworkInformation extends EventTarget {
  readonly effectiveType?: NetworkConnectionType;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

/**
 * Extended Navigator interface with Network Information API
 */
interface ExtendedNavigator extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

/**
 * Type guard to check if connection object exists and has required properties
 */
function isNetworkInformation(connection: unknown): connection is NetworkInformation {
  return (
    connection !== null &&
    connection !== undefined &&
    typeof connection === 'object'
  );
}

/**
 * Safely get network connection from navigator
 */
function getNetworkConnection(): NetworkInformation | null {
  const extendedNavigator = navigator as ExtendedNavigator;
  const connection = extendedNavigator.connection || 
                    extendedNavigator.mozConnection || 
                    extendedNavigator.webkitConnection;
  
  return isNetworkInformation(connection) ? connection : null;
}

/**
 * Get current timestamp with fallback
 */
function getCurrentTime(): number {
  return performance?.now?.() ?? Date.now();
}

/**
 * Assess connection quality based on network information
 */
function assessConnectionQuality(
  effectiveType: NetworkConnectionType,
  downlink: number,
  rtt: number
): ConnectionQuality {
  // If we can't determine, return unknown
  if (effectiveType === 'unknown') {
    return 'unknown';
  }

  // Very slow connections
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'verySlow';
  }

  // 3G connections - check bandwidth and latency
  if (effectiveType === '3g') {
    if (downlink < 1 || rtt > 400) {
      return 'slow';
    }
    return 'moderate';
  }

  // 4G connections - check quality metrics
  if (effectiveType === '4g') {
    if (downlink < 2 || rtt > 300) {
      return 'moderate';
    }
    if (downlink < 5 || rtt > 150) {
      return 'moderate';
    }
    return 'fast';
  }

  // Fallback based on RTT if available
  if (rtt > 500) return 'verySlow';
  if (rtt > 300) return 'slow';
  if (rtt > 150) return 'moderate';
  
  return 'fast';
}

/**
 * Hook for monitoring network status and connection quality
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    const isOnline = navigator.onLine;
    const connection = getNetworkConnection();
    
    const effectiveType: NetworkConnectionType = connection?.effectiveType || 'unknown';
    const downlink = connection?.downlink || 0;
    const rtt = connection?.rtt || 0;
    const saveData = connection?.saveData || false;
    const connectionQuality = assessConnectionQuality(effectiveType, downlink, rtt);
    
    return {
      isOnline,
      isOffline: !isOnline,
      connectionType: effectiveType,
      effectiveConnectionType: effectiveType,
      connectionQuality,
      isSlowConnection: connectionQuality === 'slow' || connectionQuality === 'verySlow',
      downlink,
      rtt,
      saveData,
      lastOnlineTime: isOnline ? getCurrentTime() : 0,
      offlineDuration: 0,
    };
  });

  /**
   * Update network status state
   */
  const updateNetworkStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    const connection = getNetworkConnection();
    
    const effectiveType: NetworkConnectionType = connection?.effectiveType || 'unknown';
    const downlink = connection?.downlink || 0;
    const rtt = connection?.rtt || 0;
    const saveData = connection?.saveData || false;
    const connectionQuality = assessConnectionQuality(effectiveType, downlink, rtt);
    const currentTime = getCurrentTime();

    setNetworkStatus(prevStatus => {
      let {lastOnlineTime} = prevStatus;
      let {offlineDuration} = prevStatus;

      // Update timing information
      if (isOnline && !prevStatus.isOnline) {
        // Just came back online
        lastOnlineTime = currentTime;
        if (prevStatus.lastOnlineTime > 0) {
          offlineDuration = currentTime - prevStatus.lastOnlineTime;
        }
      } else if (isOnline) {
        // Still online
        lastOnlineTime = currentTime;
      }

      return {
        isOnline,
        isOffline: !isOnline,
        connectionType: effectiveType,
        effectiveConnectionType: effectiveType,
        connectionQuality,
        isSlowConnection: connectionQuality === 'slow' || connectionQuality === 'verySlow',
        downlink,
        rtt,
        saveData,
        lastOnlineTime,
        offlineDuration,
      };
    });
  }, []);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    console.log('[useNetworkStatus] Network came online');
    updateNetworkStatus();
  }, [updateNetworkStatus]);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    console.log('[useNetworkStatus] Network went offline');
    updateNetworkStatus();
  }, [updateNetworkStatus]);

  /**
   * Handle connection change
   */
  const handleConnectionChange = useCallback(() => {
    console.log('[useNetworkStatus] Network connection changed');
    updateNetworkStatus();
  }, [updateNetworkStatus]);

  // Set up event listeners
  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if available
    const connection = getNetworkConnection();
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [handleOnline, handleOffline, handleConnectionChange]);

  return networkStatus;
}