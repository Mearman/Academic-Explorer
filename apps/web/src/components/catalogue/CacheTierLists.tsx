/**
 * Cache Tier Lists component for displaying entities in each cache tier
 * Shows synthetic system lists for Memory and IndexedDB cache tiers
 */

import type { CachedEntityEntry } from "@bibgraph/client";
import { cachedOpenAlex } from "@bibgraph/client";
import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import {
  Card,
  Group,
  Text,
  Badge,
  Stack,
  SimpleGrid,
  Loader,
  Box,
  Paper,
  Accordion,
  Table,
  ActionIcon,
  Tooltip,
  Progress,
  ThemeIcon,
} from "@mantine/core";
import {
  IconDatabase,
  IconCpu,
  IconExternalLink,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useCallback } from "react";



interface CacheTierSummary {
  memory: { count: number; entities: CachedEntityEntry[] };
  indexedDB: { count: number; entities: CachedEntityEntry[] };
}

interface EntityTypeCount {
  entityType: string;
  count: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getEntityTypeColor(entityType: string): string {
  const colors: Record<string, string> = {
    works: "blue",
    authors: "green",
    sources: "orange",
    institutions: "purple",
    topics: "cyan",
    publishers: "pink",
    funders: "yellow",
    keywords: "teal",
    concepts: "grape",
    domains: "indigo",
    fields: "lime",
    subfields: "violet",
  };
  return colors[entityType] || "gray";
}

function groupByEntityType(entities: CachedEntityEntry[]): EntityTypeCount[] {
  const counts: Record<string, number> = {};
  for (const entity of entities) {
    counts[entity.entityType] = (counts[entity.entityType] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([entityType, count]) => ({ entityType, count }))
    .sort((a, b) => b.count - a.count);
}

interface CacheTierCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  entities: CachedEntityEntry[];
  isLoading: boolean;
  onRefresh: () => void;
  onClear?: () => void;
  isPersistent: boolean;
  maxEntries?: number;
}

function CacheTierCard({
  title,
  description,
  icon,
  entities,
  isLoading,
  onRefresh,
  onClear,
  isPersistent,
  maxEntries = 10000,
}: CacheTierCardProps) {
  const navigate = useNavigate();
  const entityTypeCounts = groupByEntityType(entities);
  const totalSize = entities.reduce((sum, e) => sum + e.dataSize, 0);
  const usagePercent = Math.min((entities.length / maxEntries) * 100, 100);

  const handleEntityClick = (entity: CachedEntityEntry) => {
    const entityType = entity.entityType as EntityType;
    const path = `/${entityType}/${entity.entityId}`;
    navigate({ to: path });
  };

  return (
    <Card withBorder padding="md" data-testid={`cache-tier-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <Group justify="space-between" mb="md">
        <Group>
          <ThemeIcon size="lg" variant="light" color={isPersistent ? "blue" : "orange"}>
            {icon}
          </ThemeIcon>
          <div>
            <Text fw={500} size="lg">{title}</Text>
            <Text size="xs" c="dimmed">{description}</Text>
          </div>
        </Group>
        <Group gap="xs">
          {isPersistent && (
            <Badge size="xs" color="blue" variant="light">
              Persistent
            </Badge>
          )}
          {!isPersistent && (
            <Badge size="xs" color="orange" variant="light">
              Session Only
            </Badge>
          )}
          <Tooltip label="Refresh">
            <ActionIcon variant="subtle" size="sm" onClick={onRefresh} loading={isLoading}>
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
          {onClear && entities.length > 0 && (
            <Tooltip label="Clear cache tier">
              <ActionIcon variant="subtle" color="red" size="sm" onClick={onClear}>
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Group>

      {isLoading ? (
        <Stack align="center" py="xl">
          <Loader size="sm" />
          <Text size="xs" c="dimmed">Loading cache data...</Text>
        </Stack>
      ) : entities.length === 0 ? (
        <Paper withBorder p="md" bg="gray.0">
          <Text size="sm" c="dimmed" ta="center">
            No entities cached in this tier
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {/* Summary Stats */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed" fw={500}>Entities</Text>
              <Text size="lg" fw={700}>{entities.length.toLocaleString()}</Text>
            </Paper>
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed" fw={500}>Total Size</Text>
              <Text size="lg" fw={700}>{formatBytes(totalSize)}</Text>
            </Paper>
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed" fw={500}>Entity Types</Text>
              <Text size="lg" fw={700}>{entityTypeCounts.length}</Text>
            </Paper>
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed" fw={500}>Usage</Text>
              <Text size="lg" fw={700}>{usagePercent.toFixed(1)}%</Text>
            </Paper>
          </SimpleGrid>

          {/* Usage Bar */}
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed">Cache Usage</Text>
              <Text size="xs" c="dimmed">{entities.length.toLocaleString()} / {maxEntries.toLocaleString()}</Text>
            </Group>
            <Progress value={usagePercent} color={usagePercent > 80 ? "red" : usagePercent > 60 ? "yellow" : "blue"} size="sm" />
          </div>

          {/* Entity Type Breakdown */}
          <Accordion variant="contained">
            <Accordion.Item value="breakdown">
              <Accordion.Control>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Entity Type Breakdown</Text>
                  <Badge size="xs" variant="light">{entityTypeCounts.length} types</Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
                  {entityTypeCounts.map(({ entityType, count }) => (
                    <Paper key={entityType} withBorder p="xs" radius="sm">
                      <Group gap="xs">
                        <Badge size="xs" color={getEntityTypeColor(entityType)} variant="filled">
                          {count}
                        </Badge>
                        <Text size="xs" tt="capitalize">{entityType}</Text>
                      </Group>
                    </Paper>
                  ))}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="entities">
              <Accordion.Control>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Recent Entities</Text>
                  <Badge size="xs" variant="light">Last 20</Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Box style={{ overflowX: "auto" }}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Size</Table.Th>
                        <Table.Th>Cached</Table.Th>
                        <Table.Th>Accessed</Table.Th>
                        <Table.Th></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {entities
                        .slice()
                        .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
                        .slice(0, 20)
                        .map((entity, idx) => (
                          <Table.Tr key={`${entity.entityType}-${entity.entityId}-${idx}`}>
                            <Table.Td>
                              <Badge size="xs" color={getEntityTypeColor(entity.entityType)} variant="light">
                                {entity.entityType}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" ff="monospace">{entity.entityId}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" c="dimmed">{formatBytes(entity.dataSize)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" c="dimmed">{formatTimeAgo(entity.cachedAt)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" c="dimmed">{formatTimeAgo(entity.lastAccessedAt)}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Tooltip label="View entity">
                                <ActionIcon
                                  variant="subtle"
                                  size="xs"
                                  onClick={() => handleEntityClick(entity)}
                                >
                                  <IconExternalLink size={12} />
                                </ActionIcon>
                              </Tooltip>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      )}
    </Card>
  );
}

export function CacheTierLists() {
  const [summary, setSummary] = useState<CacheTierSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingMemory, setIsRefreshingMemory] = useState(false);
  const [isRefreshingIndexedDB, setIsRefreshingIndexedDB] = useState(false);

  const loadCacheSummary = useCallback(async () => {
    try {
      const result = await cachedOpenAlex.getCacheTierSummary();
      setSummary(result);
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load cache tier summary", { error });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadCacheSummary().finally(() => setIsLoading(false));
  }, [loadCacheSummary]);

  const handleRefreshMemory = useCallback(async () => {
    setIsRefreshingMemory(true);
    try {
      const memoryEntities = cachedOpenAlex.enumerateMemoryCacheEntities();
      setSummary(prev => prev ? {
        ...prev,
        memory: { count: memoryEntities.length, entities: memoryEntities }
      } : null);
    } finally {
      setIsRefreshingMemory(false);
    }
  }, []);

  const handleRefreshIndexedDB = useCallback(async () => {
    setIsRefreshingIndexedDB(true);
    try {
      const indexedDBEntities = await cachedOpenAlex.enumerateIndexedDBEntities();
      setSummary(prev => prev ? {
        ...prev,
        indexedDB: { count: indexedDBEntities.length, entities: indexedDBEntities }
      } : null);
    } finally {
      setIsRefreshingIndexedDB(false);
    }
  }, []);

  const handleClearIndexedDB = useCallback(async () => {
    try {
      await cachedOpenAlex.clearStaticCache();
      await loadCacheSummary();
      logger.info("cache-tier-ui", "IndexedDB cache cleared");
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to clear IndexedDB cache", { error });
    }
  }, [loadCacheSummary]);

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">Loading cache tiers...</Text>
      </Stack>
    );
  }

  if (!summary) {
    return (
      <Card withBorder p="xl">
        <Stack align="center" gap="md">
          <Box c="gray.4">
            <IconDatabase size={48} />
          </Box>
          <Text size="lg" fw={500}>Unable to load cache data</Text>
          <Text size="sm" c="dimmed">
            There was an error loading the cache tier information.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text size="lg" fw={500}>Cache Tier Overview</Text>
          <Text size="sm" c="dimmed">
            View entities stored in each cache tier. Memory cache is session-only, IndexedDB persists across sessions.
          </Text>
        </div>
        <Badge size="lg" variant="light">
          {(summary.memory.count + summary.indexedDB.count).toLocaleString()} total entities
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <CacheTierCard
          title="Memory Cache"
          description="Fast in-memory cache for current session"
          icon={<IconCpu size={20} />}
          entities={summary.memory.entities}
          isLoading={isRefreshingMemory}
          onRefresh={handleRefreshMemory}
          isPersistent={false}
          maxEntries={1000}
        />

        <CacheTierCard
          title="IndexedDB Cache"
          description="Persistent browser storage across sessions"
          icon={<IconDatabase size={20} />}
          entities={summary.indexedDB.entities}
          isLoading={isRefreshingIndexedDB}
          onRefresh={handleRefreshIndexedDB}
          onClear={handleClearIndexedDB}
          isPersistent={true}
          maxEntries={10000}
        />
      </SimpleGrid>
    </Stack>
  );
}
