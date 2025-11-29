/**
 * Cache Tier Lists component for displaying entities in each cache tier
 * Shows synthetic system lists for Memory and IndexedDB cache tiers
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";
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
  IconBrandGithub,
  IconFolder,
  IconCloud,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useCallback } from "react";



interface CacheTierSummary {
  memory: { count: number; entities: CachedEntityEntry[] };
  indexedDB: { count: number; entities: CachedEntityEntry[] };
}

interface StaticCacheTierConfig {
  gitHubPages: {
    url: string;
    isConfigured: boolean;
    isProduction: boolean;
    isLocalhost: boolean;
  };
  localStatic: {
    path: string;
    isAvailable: boolean;
  };
}

interface CacheTierStats {
  requests: number;
  hits: number;
  averageLoadTime: number;
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

interface StaticCacheTierCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  isConfigured: boolean;
  entities: CachedEntityEntry[];
  stats: CacheTierStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  color: string;
  badges?: React.ReactNode;
}

function StaticCacheTierCard({
  title,
  description,
  icon,
  url,
  isConfigured,
  entities,
  stats,
  isLoading,
  onRefresh,
  color,
  badges,
}: StaticCacheTierCardProps) {
  const navigate = useNavigate();
  const entityTypeCounts = groupByEntityType(entities);
  const hitRate = stats && stats.requests > 0 ? (stats.hits / stats.requests) * 100 : 0;

  const handleEntityClick = (entity: CachedEntityEntry) => {
    const entityType = entity.entityType as EntityType;
    const path = `/${entityType}/${entity.entityId}`;
    navigate({ to: path });
  };

  return (
    <Card withBorder padding="md" data-testid={`cache-tier-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <Group justify="space-between" mb="md">
        <Group>
          <ThemeIcon size="lg" variant="light" color={color}>
            {icon}
          </ThemeIcon>
          <div>
            <Text fw={500} size="lg">{title}</Text>
            <Text size="xs" c="dimmed">{description}</Text>
          </div>
        </Group>
        <Group gap="xs">
          {badges}
          <Tooltip label="Refresh">
            <ActionIcon variant="subtle" size="sm" onClick={onRefresh} loading={isLoading}>
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {!isConfigured ? (
        <Paper withBorder p="md" bg="gray.0">
          <Text size="sm" c="dimmed" ta="center">
            Not configured
          </Text>
        </Paper>
      ) : isLoading ? (
        <Stack align="center" py="xl">
          <Loader size="sm" />
          <Text size="xs" c="dimmed">Loading cache data...</Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {/* URL Display */}
          <Paper withBorder p="xs" radius="sm">
            <Text size="xs" c="dimmed" fw={500} mb={4}>Cache URL</Text>
            <Text size="sm" ff="monospace" style={{ wordBreak: "break-all" }}>
              {url}
            </Text>
          </Paper>

          {/* Summary Stats */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed" fw={500}>Entities</Text>
              <Text size="lg" fw={700}>{entities.length.toLocaleString()}</Text>
            </Paper>
            <Paper withBorder p="xs" radius="sm">
              <Text size="xs" c="dimmed" fw={500}>Entity Types</Text>
              <Text size="lg" fw={700}>{entityTypeCounts.length}</Text>
            </Paper>
            {stats && (
              <>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="xs" c="dimmed" fw={500}>Requests</Text>
                  <Text size="lg" fw={700}>{stats.requests.toLocaleString()}</Text>
                </Paper>
                <Paper withBorder p="xs" radius="sm">
                  <Text size="xs" c="dimmed" fw={500}>Hit Rate</Text>
                  <Text size="lg" fw={700}>{hitRate.toFixed(1)}%</Text>
                </Paper>
              </>
            )}
          </SimpleGrid>

          {/* Hit Rate Bar */}
          {stats && stats.requests > 0 && (
            <div>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed">Cache Hit Rate</Text>
                <Text size="xs" c="dimmed">{stats.hits} / {stats.requests}</Text>
              </Group>
              <Progress
                value={hitRate}
                color={hitRate > 80 ? "green" : hitRate > 50 ? "blue" : "orange"}
                size="sm"
              />
            </div>
          )}

          {/* Entity Type Breakdown & Entity List */}
          {entities.length > 0 && (
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
                    <Text size="sm" fw={500}>Cached Entities</Text>
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
                          <Table.Th>Cached</Table.Th>
                          <Table.Th></Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {entities
                          .slice()
                          .sort((a, b) => b.cachedAt - a.cachedAt)
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
                                <Text size="xs" c="dimmed">{formatTimeAgo(entity.cachedAt)}</Text>
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
          )}

          {entities.length === 0 && (
            <Paper withBorder p="md" bg="gray.0">
              <Text size="sm" c="dimmed" ta="center">
                No entities cached in static storage
              </Text>
            </Paper>
          )}
        </Stack>
      )}
    </Card>
  );
}

export function CacheTierLists() {
  const [summary, setSummary] = useState<CacheTierSummary | null>(null);
  const [staticConfig, setStaticConfig] = useState<StaticCacheTierConfig | null>(null);
  const [staticCacheEntities, setStaticCacheEntities] = useState<CachedEntityEntry[]>([]);
  const [tierStats, setTierStats] = useState<{
    gitHubPages: CacheTierStats | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingMemory, setIsRefreshingMemory] = useState(false);
  const [isRefreshingIndexedDB, setIsRefreshingIndexedDB] = useState(false);
  const [isRefreshingStatic, setIsRefreshingStatic] = useState(false);

  const loadCacheSummary = useCallback(async () => {
    try {
      const result = await cachedOpenAlex.getCacheTierSummary();
      setSummary(result);
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load cache tier summary", { error });
    }
  }, []);

  const loadStaticConfig = useCallback(() => {
    try {
      const config = cachedOpenAlex.getStaticCacheTierConfig();
      setStaticConfig(config);
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load static cache config", { error });
    }
  }, []);

  const loadTierStats = useCallback(async () => {
    try {
      const stats = await cachedOpenAlex.getStaticCacheStats();
      setTierStats({
        gitHubPages: stats.tierStats?.github_pages ?? null,
      });
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load tier stats", { error });
    }
  }, []);

  const loadStaticCacheEntities = useCallback(async () => {
    try {
      const entities = await cachedOpenAlex.enumerateStaticCacheEntities();
      setStaticCacheEntities(entities);
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load static cache entities", { error });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadStaticConfig();
    Promise.all([loadCacheSummary(), loadTierStats(), loadStaticCacheEntities()]).finally(() => setIsLoading(false));
  }, [loadCacheSummary, loadStaticConfig, loadTierStats, loadStaticCacheEntities]);

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

  const handleRefreshStatic = useCallback(async () => {
    setIsRefreshingStatic(true);
    try {
      loadStaticConfig();
      await Promise.all([loadTierStats(), loadStaticCacheEntities()]);
    } finally {
      setIsRefreshingStatic(false);
    }
  }, [loadStaticConfig, loadTierStats, loadStaticCacheEntities]);

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
            Multi-tier caching: Memory → IndexedDB → Static Files → OpenAlex API
          </Text>
        </div>
        <Badge size="lg" variant="light">
          {(summary.memory.count + summary.indexedDB.count).toLocaleString()} cached entities
        </Badge>
      </Group>

      {/* Local Cache Tiers */}
      <Text size="sm" fw={500} c="dimmed" mt="xs">Local Cache Tiers</Text>
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

      {/* Static Cache Tiers */}
      <Text size="sm" fw={500} c="dimmed" mt="md">Static Cache Tiers</Text>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* GitHub Pages Cache - shown in production */}
        {staticConfig?.gitHubPages.isProduction && (
          <StaticCacheTierCard
            title="GitHub Pages Cache"
            description="Pre-cached entities from GitHub Pages CDN"
            icon={<IconBrandGithub size={20} />}
            url={staticConfig.gitHubPages.url}
            isConfigured={staticConfig.gitHubPages.isConfigured}
            entities={staticCacheEntities}
            stats={tierStats?.gitHubPages ?? null}
            isLoading={isRefreshingStatic}
            onRefresh={handleRefreshStatic}
            color="grape"
            badges={
              <Badge size="xs" color="grape" variant="light">
                Remote CDN
              </Badge>
            }
          />
        )}

        {/* Local Static Cache - shown in dev mode */}
        {staticConfig?.gitHubPages.isLocalhost && (
          <StaticCacheTierCard
            title="Local Static Cache"
            description="Pre-cached entities served from local dev server"
            icon={<IconFolder size={20} />}
            url={staticConfig.localStatic.path || staticConfig.gitHubPages.url}
            isConfigured={staticConfig.localStatic.isAvailable}
            entities={staticCacheEntities}
            stats={tierStats?.gitHubPages ?? null}
            isLoading={isRefreshingStatic}
            onRefresh={handleRefreshStatic}
            color="teal"
            badges={
              <Badge size="xs" color="teal" variant="light">
                Dev Mode
              </Badge>
            }
          />
        )}

        {/* Show message if no static cache is configured */}
        {staticConfig && !staticConfig.gitHubPages.isConfigured && (
          <Card withBorder padding="md">
            <Stack align="center" gap="md" py="lg">
              <ThemeIcon size="xl" variant="light" color="gray">
                <IconCloud size={24} />
              </ThemeIcon>
              <div style={{ textAlign: "center" }}>
                <Text fw={500}>No Static Cache Configured</Text>
                <Text size="sm" c="dimmed">
                  Static caching is not configured for this environment.
                </Text>
              </div>
            </Stack>
          </Card>
        )}
      </SimpleGrid>
    </Stack>
  );
}
