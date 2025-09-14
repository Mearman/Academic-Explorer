/**
 * Cache Management Panel
 * Full-featured cache management interface with detailed statistics and controls
 */

import React from 'react';
import {
  Container,
  Grid,
  Card,
  Text,
  Group,
  Badge,
  Table,
  ScrollArea,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconChartBar,
  IconSettings,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { CacheManagement } from '@/components/molecules/CacheManagement';

interface QueryCacheEntry {
  queryKey: readonly unknown[];
  dataUpdatedAt: number;
  isStale: boolean;
  isInvalidated: boolean;
  fetchStatus: string;
  status: string;
}

export function CacheManagementPanel() {
  const queryClient = useQueryClient();
  const [queryCache, setQueryCache] = React.useState<QueryCacheEntry[]>([]);

  // Load query cache details
  React.useEffect(() => {
    const loadQueryCache = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      const cacheEntries: QueryCacheEntry[] = queries.map((query) => ({
        queryKey: query.queryKey,
        dataUpdatedAt: query.state.dataUpdatedAt || 0,
        isStale: query.isStale(),
        isInvalidated: query.state.isInvalidated || false,
        fetchStatus: query.state.fetchStatus,
        status: query.state.status,
      }));

      // Sort by most recently updated
      cacheEntries.sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt);

      setQueryCache(cacheEntries);
    };

    loadQueryCache();

    // Refresh every 30 seconds
    const interval = setInterval(loadQueryCache, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const formatQueryKey = (queryKey: readonly unknown[]): string => {
    return queryKey.map(key => String(key)).join(' → ');
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  // Calculate cache statistics
  const totalQueries = queryCache.length;
  const staleQueries = queryCache.filter(q => q.isStale).length;
  const invalidatedQueries = queryCache.filter(q => q.isInvalidated).length;
  const successfulQueries = queryCache.filter(q => q.status === 'success').length;
  const errorQueries = queryCache.filter(q => q.status === 'error').length;

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <IconSettings size={28} />
          <Text size="xl" fw={700}>
            Cache Management
          </Text>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <CacheManagement />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder shadow="sm" p="lg">
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <IconChartBar size={20} />
                <Text fw={600} size="lg">
                  Query Cache Details
                </Text>
              </Group>
              <Tooltip label="TanStack Query cache entries">
                <ActionIcon variant="subtle" size="sm">
                  <IconInfoCircle size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Quick Stats */}
            <Group gap="lg" mb="md">
              <div>
                <Text size="xs" c="dimmed">Total</Text>
                <Text size="sm" fw={500}>{totalQueries}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Success</Text>
                <Text size="sm" fw={500} c="green">{successfulQueries}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Errors</Text>
                <Text size="sm" fw={500} c="red">{errorQueries}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Stale</Text>
                <Text size="sm" fw={500} c="yellow">{staleQueries}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Invalidated</Text>
                <Text size="sm" fw={500} c="orange">{invalidatedQueries}</Text>
              </div>
            </Group>

            {/* Query Cache Table */}
            <ScrollArea h={400}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Query Key</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Updated</Table.Th>
                    <Table.Th>State</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {queryCache.length > 0 ? (
                    queryCache.slice(0, 100).map((entry, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <Text size="xs" style={{ wordBreak: 'break-all' }}>
                            {formatQueryKey(entry.queryKey)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={getStatusColor(entry.status)}
                            variant="light"
                            size="sm"
                          >
                            {entry.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {formatTimestamp(entry.dataUpdatedAt)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            {entry.isStale && (
                              <Badge color="yellow" variant="outline" size="xs">
                                Stale
                              </Badge>
                            )}
                            {entry.isInvalidated && (
                              <Badge color="orange" variant="outline" size="xs">
                                Invalid
                              </Badge>
                            )}
                            {entry.fetchStatus === 'fetching' && (
                              <Badge color="blue" variant="outline" size="xs">
                                Fetching
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text ta="center" c="dimmed" py="md">
                          No cached queries found
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {queryCache.length > 100 && (
              <Text size="xs" c="dimmed" mt="sm">
                Showing first 100 of {queryCache.length} queries
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );
}