import React, { useState, useEffect } from 'react';
import { Text, Stack, Group, Badge, Button, Divider, ScrollArea, Code, Paper, Tabs, TextInput, MultiSelect, ActionIcon } from '@mantine/core';
import { IconTrash, IconSearch, IconFilter, IconDownload, IconBug, IconInfoCircle, IconAlertTriangle, IconX } from '@tabler/icons-react';
import { logger, type LogLevel, type LogCategory, type LogEntry } from '@/lib/logger';


export function ApplicationLoggerPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<LogCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('logs');

  useEffect(() => {
    const unsubscribe = logger.subscribe(setLogs);
    setLogs(logger.getLogs());

    // Add some test log entries to verify filtering works
    if (logger.getLogs().length === 0) {
      logger.info('general', 'ApplicationLoggerPanel initialized', { component: 'devtools' }, 'ApplicationLoggerPanel');
      logger.debug('ui', 'Filter test log entry', { testData: 'filtering' }, 'ApplicationLoggerPanel');
      logger.warn('cache', 'Sample warning for filter testing', { level: 'warn' });
      logger.error('api', 'Sample error for filter testing', { status: 500 });
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (selectedLevels.length > 0) {
      filtered = filtered.filter(log => selectedLevels.includes(log.level));
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter(log => selectedCategories.includes(log.category));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.component?.toLowerCase().includes(query) ||
        JSON.stringify(log.data || '').toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedLevels, selectedCategories, searchQuery]);

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'debug': return 'gray';
      case 'info': return 'blue';
      case 'warn': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'debug': return <IconBug size={14} />;
      case 'info': return <IconInfoCircle size={14} />;
      case 'warn': return <IconAlertTriangle size={14} />;
      case 'error': return <IconX size={14} />;
      default: return <IconInfoCircle size={14} />;
    }
  };

  const getCategoryBadgeColor = (category: LogCategory) => {
    const colors = {
      'api': 'blue',
      'cache': 'green',
      'graph': 'purple',
      'routing': 'orange',
      'ui': 'pink',
      'auth': 'red',
      'storage': 'teal',
      'search': 'cyan',
      'general': 'gray',
    };
    return colors[category] || 'gray';
  };

  const logStats = {
    total: logs.length,
    debug: logs.filter(l => l.level === 'debug').length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  return (
    <>
      <style>
        {`
          [data-mantine-dropdown-portal="true"] {
            z-index: 2147483647 !important;
          }
          .mantine-Select-dropdown,
          .mantine-MultiSelect-dropdown,
          [data-floating-ui-portal] {
            z-index: 2147483647 !important;
          }
          /* Target dropdown containers directly */
          div[data-mantine-stop-propagation] {
            z-index: 2147483647 !important;
          }
        `}
      </style>
      <ScrollArea h={500} p="md">
        <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Text size="xl" fw={600}>Application Logger</Text>
          <Group gap="xs">
            <Badge color="blue" variant="light">{logStats.total} total</Badge>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={14} />}
              onClick={() => {
                logger.exportLogs();
              }}
            >
              Export
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => {
                logger.clear();
              }}
            >
              Clear
            </Button>
          </Group>
        </Group>

        <Divider />

        <Tabs value={activeTab} onChange={(value) => {
          setActiveTab(value || 'logs');
        }}>
          <Tabs.List>
            <Tabs.Tab value="logs" leftSection={<IconInfoCircle size={14} />}>
              Live Logs ({filteredLogs.length})
            </Tabs.Tab>
            <Tabs.Tab value="stats" leftSection={<IconBug size={14} />}>
              Statistics
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="logs" pt="md">
            <Stack gap="md">
              {/* Filters */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '12px',
                alignItems: 'center',
                width: '100%'
              }}>
                <TextInput
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.currentTarget.value);
                  }}
                  leftSection={<IconSearch size={16} />}
                  rightSection={
                    searchQuery ? (
                      <ActionIcon size="sm" variant="transparent" onClick={() => {
                        setSearchQuery('');
                      }}>
                        <IconX size={12} />
                      </ActionIcon>
                    ) : null
                  }
                />
                <MultiSelect
                  placeholder="Filter by Level"
                  value={selectedLevels}
                  onChange={(values) => {
                    const validLevels = values.filter((value): value is LogLevel =>
                      ['debug', 'info', 'warn', 'error'].includes(value)
                    );
                    setSelectedLevels(validLevels);
                  }}
                  data={[
                    { value: 'debug', label: 'Debug' },
                    { value: 'info', label: 'Info' },
                    { value: 'warn', label: 'Warning' },
                    { value: 'error', label: 'Error' },
                  ]}
                  leftSection={<IconFilter size={16} />}
                  styles={{
                    root: {
                      width: 'auto',
                      minWidth: '160px'
                    },
                    input: {
                      minHeight: '36px',
                      height: '36px'
                    },
                    pill: {
                      gap: '4px',
                      flexWrap: 'nowrap'
                    }
                  }}
                  clearable
                  hidePickedOptions
                  searchable
                />
                <MultiSelect
                  placeholder="Filter by Category"
                  value={selectedCategories}
                  onChange={setSelectedCategories}
                  data={[
                    { value: 'api', label: 'API' },
                    { value: 'cache', label: 'Cache' },
                    { value: 'graph', label: 'Graph' },
                    { value: 'routing', label: 'Routing' },
                    { value: 'ui', label: 'UI' },
                    { value: 'auth', label: 'Auth' },
                    { value: 'storage', label: 'Storage' },
                    { value: 'search', label: 'Search' },
                    { value: 'general', label: 'General' },
                  ]}
                  styles={{
                    root: {
                      width: 'auto',
                      minWidth: '180px'
                    },
                    input: {
                      minHeight: '36px',
                      height: '36px'
                    },
                    pillsContainer: {
                      gap: '4px',
                      flexWrap: 'nowrap'
                    }
                  }}
                  clearable
                  hidePickedOptions
                  searchable
                />
              </div>

              {/* Log Entries */}
              <Stack gap="xs" style={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredLogs.length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    {logs.length === 0 ? 'No logs yet' : 'No logs match current filters'}
                  </Text>
                ) : (
                  filteredLogs.map((log) => (
                    <Paper key={log.id} p="sm" withBorder style={{ fontSize: '12px' }}>
                      <Group gap="xs" mb="xs" wrap="nowrap">
                        <Badge
                          color={getLevelColor(log.level)}
                          variant="light"
                          size="xs"
                          leftSection={getLevelIcon(log.level)}
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <Badge
                          color={getCategoryBadgeColor(log.category)}
                          variant="outline"
                          size="xs"
                        >
                          {log.category}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {log.timestamp.toLocaleTimeString()}.{log.timestamp.getMilliseconds().toString().padStart(3, '0')}
                        </Text>
                        {log.component && (
                          <Code c="dimmed">{log.component}</Code>
                        )}
                      </Group>
                      <Text size="sm" mb={log.data ? 'xs' : 0}>
                        {log.message}
                      </Text>
                      {log.data && (
                        <Code block c="dimmed">
                          {JSON.stringify(log.data, null, 2)}
                        </Code>
                      )}
                      {log.stack && (
                        <Code block c="red" mt="xs">
                          {log.stack}
                        </Code>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="stats" pt="md">
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Text fw={500} mb="sm">Log Level Distribution</Text>
                <Group gap="xl">
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">Debug</Text>
                    <Text fw={500}>{logStats.debug}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">Info</Text>
                    <Text fw={500}>{logStats.info}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">Warning</Text>
                    <Text fw={500}>{logStats.warn}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">Error</Text>
                    <Text fw={500} c="red">{logStats.error}</Text>
                  </Stack>
                </Group>
              </Paper>

              {logStats.error > 0 && (
                <Paper p="md" withBorder>
                  <Text fw={500} mb="sm" c="red">Recent Errors</Text>
                  <Stack gap="xs">
                    {logs
                      .filter(log => log.level === 'error')
                      .slice(0, 5)
                      .map(log => (
                        <Group key={log.id} gap="xs">
                          <Text size="xs" c="dimmed">
                            {log.timestamp.toLocaleTimeString()}
                          </Text>
                          <Text size="sm">{log.message}</Text>
                        </Group>
                      ))}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
        </Stack>
      </ScrollArea>
    </>
  );
}