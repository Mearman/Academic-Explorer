/**
 * Network Status Provider - Provides network-aware UI with retry queue and offline indicators
 *
 * Monitors network connectivity and provides offline detection,
 * request queuing, automatic retry logic, and user feedback.
 */

import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Indicator,
  Modal,
  Notification,
  Portal,
  Progress,
  Stack,
  Text,
  Tooltip} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCloudOff,
  IconDatabase,
  IconWifi,
  IconWifiOff,
  IconX} from "@tabler/icons-react";
import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

// Network status types
export type NetworkStatus = 'online' | 'offline' | 'slow' | 'unstable';

// Queued request interface
interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

// Network configuration interface
interface NetworkConfig {
  // Retry settings
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;

  // Detection settings
  slowConnectionThreshold: number; // ms
  unstableConnectionThreshold: number; // consecutive failures

  // Queue settings
  maxQueueSize: number;
  queueTimeoutMs: number;
}

// Define config as a constant outside component to avoid recreation
const DEFAULT_CONFIG: NetworkConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  slowConnectionThreshold: 3000,
  unstableConnectionThreshold: 3,
  maxQueueSize: 50,
  queueTimeoutMs: 300000, // 5 minutes
} as const;

// Network context interface
interface NetworkContextType {
  status: NetworkStatus;
  isOnline: boolean;
  queueLength: number;
  lastSuccessfulRequest: number;
  failedRequests: number;
  addQueuedRequest: (request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>) => Promise<Response>;
  clearQueue: () => void;
  retryQueue: () => Promise<void>;
  getNetworkStats: () => {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

// Create network context
const NetworkContext = createContext<NetworkContextType | null>(null);

// Provider props
interface NetworkProviderProps {
  children: ReactNode;
  config?: Partial<NetworkConfig>;
  customFetch?: typeof fetch;
}

// Status indicator component (defined outside to avoid nested component definitions)
interface StatusIndicatorProps {
  status: NetworkStatus;
  queueLength: number;
}

const StatusIndicator = ({ status, queueLength }: StatusIndicatorProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'green';
      case 'slow': return 'orange';
      case 'unstable': return 'yellow';
      case 'offline': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online': return <IconWifi size={12} />;
      case 'slow': return <IconWifi size={12} />;
      case 'unstable': return <IconAlertTriangle size={12} />;
      case 'offline': return <IconWifiOff size={12} />;
      default: return <IconWifiOff size={12} />;
    }
  };

  return (
    <Tooltip label={`Network: ${status}${queueLength > 0 ? ` (${queueLength} queued)` : ''}`}>
      <Indicator
        size={12}
        color={getStatusColor()}
        processing={status === 'slow' || status === 'unstable'}
      >
        <ActionIcon size="sm" variant="subtle">
          {getStatusIcon()}
        </ActionIcon>
      </Indicator>
    </Tooltip>
  );
};

/**
 * Network Status Provider Component
 *
 * Provides network monitoring, offline detection, and request queuing
 * @param root0
 * @param root0.children
 * @param root0.config
 * @param root0.customFetch
 */
export const NetworkProvider = ({
  children,
  config: userConfig = {},
  customFetch
}: NetworkProviderProps) => {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const fetchFunction = customFetch || fetch;

  // State management
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [lastSuccessfulRequest, setLastSuccessfulRequest] = useState<number>(Date.now());
  const [failedRequests, setFailedRequests] = useState<number>(0);
  const [consecutiveFailures, setConsecutiveFailures] = useState<number>(0);
  const [averageResponseTime, setAverageResponseTime] = useState<number>(0);
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);

  // Refs for performance tracking
  const responseTimes = useRef<number[]>([]);
  const totalRequests = useRef<number>(0);
  const successfulRequests = useRef<number>(0);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Network monitoring
  const checkNetworkStatus = useCallback(async () => {
    try {
      const startTime = performance.now();
      const response = await fetchFunction('https://httpbin.org/json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        responseTimes.current.push(responseTime);
        if (responseTimes.current.length > 10) {
          responseTimes.current = responseTimes.current.slice(-10);
        }

        const avgTime = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;
        setAverageResponseTime(avgTime);

        // Update status based on connection speed
        if (responseTime > config.slowConnectionThreshold) {
          setStatus('slow');
        } else {
          setStatus('online');
        }

        setConsecutiveFailures(0);
        setLastSuccessfulRequest(Date.now());
        return true;
      }
    } catch (error) {
      console.warn('Network check failed:', error);
    }

    return false;
  }, [fetchFunction, config.slowConnectionThreshold]);

  // Process queued requests
  const processQueue = useCallback(async () => {
    if (queue.length === 0 || !navigator.onLine) return;

    const request = queue[0];

    try {
      const response = await fetchFunction(request.url, request.options);

      // Remove from queue
      setQueue(prev => prev.slice(1));

      // Clear retry timeout
      const timeout = retryTimeouts.current.get(request.id);
      if (timeout) {
        clearTimeout(timeout);
        retryTimeouts.current.delete(request.id);
      }

      // Update stats
      setConsecutiveFailures(0);
      setLastSuccessfulRequest(Date.now());
      successfulRequests.current++;

      // Resolve request
      request.resolve(response);

    } catch (error) {
      request.retryCount++;

      if (request.retryCount < request.maxRetries) {
        // Schedule retry with exponential backoff
        const delay = config.retryDelayMs * Math.pow(config.retryBackoffMultiplier, request.retryCount);

        const timeout = setTimeout(() => {
          processQueue();
        }, delay);

        retryTimeouts.current.set(request.id, timeout);

        // Move to end of queue
        setQueue(prev => [...prev.slice(1), request]);
      } else {
        // Max retries reached, reject and remove
        setQueue(prev => prev.slice(1));
        setFailedRequests(prev => prev + 1);

        const timeout = retryTimeouts.current.get(request.id);
        if (timeout) {
          clearTimeout(timeout);
          retryTimeouts.current.delete(request.id);
        }

        request.reject(error as Error);
      }
    }
  }, [queue, fetchFunction, config.retryDelayMs, config.retryBackoffMultiplier]);

  // Add request to queue
  const addQueuedRequest = useCallback(async (requestParams: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<Response> => {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        ...requestParams,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject
      };

      setQueue(prev => {
        if (prev.length >= config.maxQueueSize) {
          reject(new Error('Queue is full'));
          return prev;
        }
        return [...prev, request];
      });

      // Set queue timeout
      setTimeout(() => {
        setQueue(prev => prev.filter(r => r.id !== request.id));
        reject(new Error('Request timeout'));
      }, config.queueTimeoutMs);
    });
  }, [config.maxQueueSize, config.queueTimeoutMs]);

  // Clear all queued requests
  const clearQueue = useCallback(() => {
    queue.forEach(request => {
      const timeout = retryTimeouts.current.get(request.id);
      if (timeout) {
        clearTimeout(timeout);
      }
      request.reject(new Error('Queue cleared'));
    });

    retryTimeouts.current.clear();
    setQueue([]);
  }, [queue]);

  // Retry all queued requests
  const retryQueue = useCallback(async () => {
    if (queue.length === 0) return;

    // Reset retry counts
    setQueue(prev => prev.map(request => ({ ...request, retryCount: 0 })));

    // Start processing
    for (let i = 0; i < Math.min(3, queue.length); i++) {
      processQueue();
    }
  }, [queue, processQueue]);

  // Enhanced fetch wrapper
  const enhancedFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    totalRequests.current++;

    if (!navigator.onLine || status === 'offline') {
      return addQueuedRequest({
        url,
        options,
        maxRetries: config.maxRetries,
        resolve: () => {},
        reject: () => {}
      }) as Promise<Response>;
    }

    try {
      const startTime = performance.now();
      const response = await fetchFunction(url, options);
      const endTime = performance.now();

      responseTimes.current.push(endTime - startTime);
      if (responseTimes.current.length > 10) {
        responseTimes.current = responseTimes.current.slice(-10);
      }

      const avgTime = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;
      setAverageResponseTime(avgTime);

      if (response.ok) {
        successfulRequests.current++;
        setConsecutiveFailures(0);
        setLastSuccessfulRequest(Date.now());
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch {
      setFailedRequests(prev => prev + 1);
      setConsecutiveFailures(prev => prev + 1);

      // Queue the request for retry
      return addQueuedRequest({
        url,
        options,
        maxRetries: config.maxRetries,
        resolve: () => {},
        reject: () => {}
      }) as Promise<Response>;
    }
  }, [navigator.onLine, status, addQueuedRequest, fetchFunction, config.maxRetries]);

  // Get network statistics
  const getNetworkStats = useCallback(() => ({
    totalRequests: totalRequests.current,
    successfulRequests: successfulRequests.current,
    failedRequests: failedRequests,
    averageResponseTime
  }), [failedRequests, averageResponseTime]);

  // Browser event listeners
  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      setConsecutiveFailures(0);

      // Process queue when coming back online
      if (queue.length > 0) {
        setTimeout(() => {
          retryQueue();
        }, 1000);
      }
    };

    const handleOffline = () => {
      setStatus('offline');
      setShowOfflineModal(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue, retryQueue]);

  // Network monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkNetworkStatus();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [checkNetworkStatus]);

  // Update status based on consecutive failures
  useEffect(() => {
    if (consecutiveFailures >= config.unstableConnectionThreshold) {
      setStatus('unstable');
    }
  }, [consecutiveFailures, config.unstableConnectionThreshold]);

  // Process queue when status changes to online
  useEffect(() => {
    if ((status === 'online' || status === 'slow') && queue.length > 0) {
      processQueue();
    }
  }, [status, queue, processQueue]);

  // Context value - memoized to prevent unnecessary re-renders
  const contextValue = useMemo((): NetworkContextType => ({
    status,
    isOnline: navigator.onLine && status !== 'offline',
    queueLength: queue.length,
    lastSuccessfulRequest,
    failedRequests,
    addQueuedRequest,
    clearQueue,
    retryQueue,
    getNetworkStats
  }), [
    status,
    queue.length,
    lastSuccessfulRequest,
    failedRequests,
    addQueuedRequest,
    clearQueue,
    retryQueue,
    getNetworkStats
  ]);

  return (
    <NetworkContext value={contextValue}>
      {children}

      {/* Status Indicator */}
      <Portal>
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999
        }}>
          <StatusIndicator status={status} queueLength={queue.length} />
        </div>
      </Portal>

      {/* Offline Modal */}
      <Modal
        opened={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        title="Offline Mode"
        size="md"
        centered
      >
        <Stack gap="md">
          <Alert
            icon={<IconCloudOff size={20} />}
            title="You're offline"
            color="orange"
            variant="light"
          >
            <Text size="sm">
              Your network connection appears to be offline. Requests will be queued automatically and retried when you reconnect.
            </Text>
          </Alert>

          {queue.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Queued Requests: {queue.length}
              </Text>
              <Progress
                value={Math.min((queue.length / config.maxQueueSize) * 100, 100)}
                color={queue.length > config.maxQueueSize * 0.8 ? 'red' : 'blue'}
                size="sm"
              />
            </Stack>
          )}

          <Group justify="flex-end">
            <Button
              variant="outline"
              leftSection={<IconX size={14} />}
              onClick={clearQueue}
              disabled={queue.length === 0}
            >
              Clear Queue
            </Button>
            <Button
              leftSection={<IconRefresh size={14} />}
              onClick={retryQueue}
              disabled={!navigator.onLine || queue.length === 0}
            >
              Retry Now
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Queue Notifications */}
      {queue.length > 0 && status === 'online' && (
        <Portal>
          <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 9999,
            maxWidth: 300
          }}>
            <Notification
              icon={<IconDatabase size={18} />}
              title="Processing Queue"
              color="blue"
              loading
              withCloseButton={false}
            >
              <Text size="sm">
                Processing {queue.length} queued request{queue.length !== 1 ? 's' : ''}...
              </Text>
            </Notification>
          </div>
        </Portal>
      )}
    </NetworkContext>
  );
};

// Hook to use network context
export const useNetwork = () => {
  const context = use(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

// Network-aware fetch hook
export const useNetworkFetch = () => {
  const { addQueuedRequest, status, isOnline } = useNetwork();

  return useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!isOnline || status === 'offline') {
      return addQueuedRequest({
        url,
        options,
        maxRetries: DEFAULT_CONFIG.maxRetries,
        resolve: () => {},
        reject: () => {}
      }) as Promise<Response>;
    }

    return fetch(url, options);
  }, [addQueuedRequest, status, isOnline]);
};

// Export fetch function for external use
export { enhancedFetch as networkAwareFetch };