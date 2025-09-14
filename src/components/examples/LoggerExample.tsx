import React, { useState } from 'react';
import { Button, Group, Stack, Text, Paper } from '@mantine/core';
import {
  logger,
  logApiRequest,
  logCacheHit,
  logCacheMiss,
  logGraphOperation,
  logRouteChange,
  logUIInteraction,
  logStorageOperation,
  logError,
  useLogger
} from '../../lib/logger';

/**
 * Example component showing how to use the application logger
 * This demonstrates various logging patterns you can use throughout your app
 */
export function LoggerExample() {
  const [counter, setCounter] = useState(0);

  // Use the React hook for component-specific logging
  const componentLogger = useLogger('LoggerExample');

  const handleApiExample = () => {
    // Log API requests with response details
    logApiRequest('/api/works/search', 'GET', 200, 150);
    logApiRequest('/api/authors/12345', 'GET', 404, 89);

    componentLogger.info('Simulated API requests logged');
  };

  const handleCacheExample = () => {
    // Log cache operations
    logCacheHit('works:query:machine-learning', 'memory');
    logCacheMiss('authors:12345');
    logCacheHit('institutions:harvard', 'indexeddb');

    componentLogger.info('Simulated cache operations logged');
  };

  const handleGraphExample = () => {
    // Log graph operations
    logGraphOperation('layout-update', 150, 200, 45);
    logGraphOperation('node-selection', 1);

    componentLogger.info('Simulated graph operations logged');
  };

  const handleRoutingExample = () => {
    // Log route changes
    logRouteChange('/search', '/authors/12345', { authorId: '12345' });
    logRouteChange('/authors/12345', '/works/67890', { workId: '67890' });

    componentLogger.info('Simulated route changes logged');
  };

  const handleStorageExample = () => {
    // Log storage operations
    logStorageOperation('write', 'user-preferences', 256);
    logStorageOperation('read', 'search-history');
    logStorageOperation('delete', 'temp-data');

    componentLogger.info('Simulated storage operations logged');
  };

  const handleErrorExample = () => {
    try {
      // Simulate an error
      throw new Error('This is a simulated error for logging demonstration');
    } catch (error) {
      logError('Failed to process data', error instanceof Error ? error : new Error(String(error)), 'LoggerExample', 'ui');
    }

    componentLogger.warn('Simulated error logged');
  };

  const handleUIInteractionExample = () => {
    setCounter(prev => prev + 1);

    // Log UI interactions
    logUIInteraction('LoggerExample', 'button-click', {
      counter: counter + 1,
      timestamp: new Date().toISOString()
    });

    componentLogger.debug(`Button clicked, counter is now ${(counter + 1).toString()}`);
  };

  const handleDirectLogExample = () => {
    // Direct logging with different levels and categories
    logger.debug('api', 'Cache warming started', { strategy: 'background' });
    logger.info('graph', 'Layout algorithm changed', { from: 'force', to: 'hierarchical' });
    logger.warn('storage', 'IndexedDB quota approaching limit', { usage: '85%' });
    logger.error('auth', 'Authentication token expired', { userId: '12345' });

    componentLogger.info('Direct logging examples added');
  };

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        <Text size="lg" fw={600}>Logger Examples</Text>
        <Text size="sm" c="dimmed">
          Click buttons below to generate different types of log entries.
          Open the "App Logs" panel in devtools to see the results.
        </Text>

        <Group gap="md">
          <Button size="sm" onClick={handleApiExample}>
            Log API Examples
          </Button>

          <Button size="sm" onClick={handleCacheExample}>
            Log Cache Examples
          </Button>

          <Button size="sm" onClick={handleGraphExample}>
            Log Graph Examples
          </Button>
        </Group>

        <Group gap="md">
          <Button size="sm" onClick={handleRoutingExample}>
            Log Routing Examples
          </Button>

          <Button size="sm" onClick={handleStorageExample}>
            Log Storage Examples
          </Button>

          <Button size="sm" color="red" onClick={handleErrorExample}>
            Log Error Example
          </Button>
        </Group>

        <Group gap="md">
          <Button size="sm" variant="light" onClick={handleUIInteractionExample}>
            UI Interaction ({counter})
          </Button>

          <Button size="sm" variant="light" onClick={handleDirectLogExample}>
            Direct Logging Examples
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          💡 Tip: Use the filters in the App Logs panel to focus on specific log levels or categories
        </Text>
      </Stack>
    </Paper>
  );
}