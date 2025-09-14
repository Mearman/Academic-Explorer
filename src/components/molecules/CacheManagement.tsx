/**
 * Cache Management Component
 * Provides UI controls for managing TanStack Query and IndexedDB cache
 */

import React from 'react';
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Progress,
  Divider,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconDatabase,
  IconTrash,
  IconRefresh,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { getCacheStats, clearExpiredCache } from '@/lib/cache/persister';
import { rateLimitedOpenAlex } from '@/lib/openalex/rate-limited-client';
import { notifications } from '@mantine/notifications';
import { logError } from '@/lib/logger';

interface CacheStats {
  exists: boolean;
  size: number;
  age: number;
  queryCount: number;
  isExpired?: boolean;
  error?: string;
}

export function CacheManagement() {
  const queryClient = useQueryClient();
  const [cacheStats, setCacheStats] = React.useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Load cache statistics on mount
  React.useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      logError('Failed to load cache stats', error, 'CacheManagement', 'storage');
      setCacheStats({
        exists: false,
        size: 0,
        age: 0,
        queryCount: 0,
        error: 'Failed to load cache statistics',
      });
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes.toString()} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatAge = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days.toString()}d ${(hours % 24).toString()}h`;
    if (hours > 0) return `${hours.toString()}h`;
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes.toString()}m`;
  };

  const handleClearCache = async () => {
    setIsLoading(true);
    try {
      // Clear TanStack Query cache
      queryClient.clear();

      // Clear IndexedDB cache
      await clearExpiredCache();

      // Reload stats
      await loadCacheStats();

      notifications.show({
        title: 'Cache Cleared',
        message: 'All cached data has been successfully cleared.',
        color: 'green',
        icon: <IconTrash />,
      });
    } catch (error) {
      logError('Failed to clear cache', error, 'CacheManagement', 'storage');
      notifications.show({
        title: 'Cache Clear Failed',
        message: 'Failed to clear cache. Please try again.',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearExpired = async () => {
    setIsLoading(true);
    try {
      const wasExpired = await clearExpiredCache();
      await loadCacheStats();

      if (wasExpired) {
        notifications.show({
          title: 'Expired Cache Cleared',
          message: 'Expired cache data has been removed.',
          color: 'blue',
          icon: <IconRefresh />,
        });
      } else {
        notifications.show({
          title: 'No Expired Data',
          message: 'No expired cache data found.',
          color: 'gray',
          icon: <IconInfoCircle />,
        });
      }
    } catch (error) {
      logError('Failed to clear expired cache', error, 'CacheManagement', 'storage');
      notifications.show({
        title: 'Operation Failed',
        message: 'Failed to clear expired cache.',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rateLimitStats = rateLimitedOpenAlex.getStats();
  const rateLimitConfig = rateLimitedOpenAlex.getRateLimiterStats();

  // Calculate progress percentage for daily rate limit
  const dailyUsagePercent = (rateLimitStats.rateLimit.requestsToday / (rateLimitStats.rateLimit.requestsToday + rateLimitStats.rateLimit.requestsRemaining)) * 100;

  return (
    <Card withBorder shadow="sm" p="lg">
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <IconDatabase size={24} />
          <Text fw={600} size="lg">
            Cache Management
          </Text>
        </Group>
        <Tooltip label="Reload cache statistics">
          <ActionIcon
            variant="light"
            onClick={loadCacheStats}
            loading={isLoading}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Stack gap="md">
        {/* Cache Statistics */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Cache Statistics
          </Text>
          <Group gap="lg">
            <div>
              <Text size="xs" c="dimmed">Size</Text>
              <Text size="sm" fw={500}>
                {cacheStats ? formatSize(cacheStats.size) : 'Loading...'}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Queries</Text>
              <Text size="sm" fw={500}>
                {cacheStats?.queryCount || 0}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Age</Text>
              <Text size="sm" fw={500}>
                {cacheStats ? formatAge(cacheStats.age) : 'Unknown'}
              </Text>
            </div>
            <div>
              <Badge
                color={cacheStats?.exists ? (cacheStats?.isExpired ? 'yellow' : 'green') : 'gray'}
                variant="light"
              >
                {cacheStats?.exists
                  ? (cacheStats?.isExpired ? 'Expired' : 'Active')
                  : 'Empty'
                }
              </Badge>
            </div>
          </Group>
        </div>

        <Divider />

        {/* Rate Limit Statistics */}
        <div>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="sm" fw={500}>
              Rate Limiting
            </Text>
            <Tooltip label="OpenAlex API rate limiting with TanStack Pacer">
              <ActionIcon variant="subtle" size="sm">
                <IconInfoCircle size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group gap="lg" mb="sm">
            <div>
              <Text size="xs" c="dimmed">Today's Requests</Text>
              <Text size="sm" fw={500}>
                {rateLimitStats.rateLimit.requestsToday.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Remaining</Text>
              <Text size="sm" fw={500}>
                {rateLimitStats.rateLimit.requestsRemaining.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Rate Limit</Text>
              <Text size="sm" fw={500}>
                {rateLimitConfig.limit}/sec
              </Text>
            </div>
          </Group>

          <div>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Daily Usage</Text>
              <Text size="xs" c="dimmed">
                {dailyUsagePercent.toFixed(1)}%
              </Text>
            </Group>
            <Progress
              value={dailyUsagePercent}
              color={dailyUsagePercent > 80 ? 'red' : dailyUsagePercent > 50 ? 'yellow' : 'green'}
              size="sm"
            />
          </div>
        </div>

        <Divider />

        {/* Cache Actions */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Cache Actions
          </Text>
          <Group gap="sm">
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              size="sm"
              onClick={handleClearExpired}
              loading={isLoading}
            >
              Clear Expired
            </Button>
            <Button
              leftSection={<IconTrash size={16} />}
              color="red"
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              loading={isLoading}
            >
              Clear All Cache
            </Button>
          </Group>
        </div>

        {/* Error Display */}
        {cacheStats?.error && (
          <>
            <Divider />
            <Text size="sm" c="red">
              Error: {cacheStats.error}
            </Text>
          </>
        )}
      </Stack>
    </Card>
  );
}