// Re-export the logger from the devtools component for easy importing
export { logger, type LogLevel, type LogCategory, type LogEntry } from '../components/devtools/ApplicationLoggerPanel';

// Convenience functions for common logging patterns
export const logApiRequest = (url: string, method: string, status?: number, responseTime?: number) => {
  const level = status && status >= 400 ? 'error' : status && status >= 300 ? 'warn' : 'info';
  logger.log(level, 'api', `${method} ${url}${status ? ` - ${status}` : ''}`, {
    url,
    method,
    status,
    responseTime
  });
};

export const logCacheHit = (key: string, source: 'memory' | 'indexeddb' | 'localstorage') => {
  logger.debug('cache', `Cache hit: ${key} from ${source}`, { key, source, hit: true });
};

export const logCacheMiss = (key: string) => {
  logger.debug('cache', `Cache miss: ${key}`, { key, hit: false });
};

export const logGraphOperation = (operation: string, nodeCount?: number, edgeCount?: number, duration?: number) => {
  logger.info('graph', `Graph operation: ${operation}`, {
    operation,
    nodeCount,
    edgeCount,
    duration
  });
};

export const logRouteChange = (from: string, to: string, params?: Record<string, any>) => {
  logger.info('routing', `Route change: ${from} → ${to}`, { from, to, params });
};

export const logUIInteraction = (component: string, action: string, data?: any) => {
  logger.debug('ui', `${component}: ${action}`, data, component);
};

export const logStorageOperation = (operation: 'read' | 'write' | 'delete', key: string, size?: number) => {
  logger.debug('storage', `Storage ${operation}: ${key}${size ? ` (${size} bytes)` : ''}`, {
    operation,
    key,
    size
  });
};

// Helper function to safely convert unknown error to Error object
const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return new Error(String(error));
};

export const logError = (message: string, error: unknown, component?: string, category: LogCategory = 'general') => {
  const errorObj = toError(error);
  logger.error(category, message, {
    name: errorObj.name,
    message: errorObj.message,
    stack: errorObj.stack
  }, component);
};

// React hook for using logger in components
import { useEffect } from 'react';

export const useLogger = (componentName: string) => {
  useEffect(() => {
    logger.debug('ui', `Component mounted: ${componentName}`, undefined, componentName);

    return () => {
      logger.debug('ui', `Component unmounted: ${componentName}`, undefined, componentName);
    };
  }, [componentName]);

  return {
    debug: (message: string, data?: any) => logger.debug('ui', message, data, componentName),
    info: (message: string, data?: any) => logger.info('ui', message, data, componentName),
    warn: (message: string, data?: any) => logger.warn('ui', message, data, componentName),
    error: (message: string, data?: any) => logger.error('ui', message, data, componentName),
  };
};

// Global error handler setup
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError('Unhandled promise rejection', new Error(event.reason), 'global');
  });

  // Handle JavaScript errors
  window.addEventListener('error', (event) => {
    logError('JavaScript error', event.error || new Error(event.message), event.filename);
  });

  // Handle React error boundaries (if you set up the logger in an error boundary)
  logger.info('general', 'Global error handling initialized', {}, 'setupGlobalErrorHandling');
};