import React, { useState, useEffect } from 'react';
import { Box, Text, Stack, Group, Badge, Button, Divider, ScrollArea, Code, Paper, Tabs, TextInput, Select, ActionIcon } from '@mantine/core';
import { IconRefresh, IconTrash, IconSearch, IconFilter, IconDownload, IconBug, IconInfoCircle, IconAlertTriangle, IconX } from '@tabler/icons-react';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'api' | 'cache' | 'graph' | 'routing' | 'ui' | 'auth' | 'storage' | 'general';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  component?: string;
  stack?: string;
}

// Logger configuration
interface LoggerConfig {
  maxLogs: number;
  enableConsoleOutput: boolean;
  enableDebugLogs: boolean;
}

// Global logger instance that can be imported and used throughout the app
class ApplicationLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private config: LoggerConfig = {
    maxLogs: 1000,
    enableConsoleOutput: true, // Set to false to disable browser console output
    enableDebugLogs: import.meta.env.DEV, // Only debug logs in development
  };

  log(level: LogLevel, category: LogCategory, message: string, data?: any, component?: string) {
    // Skip debug logs if disabled
    if (level === 'debug' && !this.config.enableDebugLogs) {
      return;
    }

    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      component,
      stack: level === 'error' ? new Error().stack : undefined,
    };

    this.logs.unshift(entry);

    // Keep only recent logs
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));

    // Also log to console if enabled
    if (this.config.enableConsoleOutput) {
      const consoleMethod = level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error';
      console[consoleMethod](`[${category}] ${message}`, data || '');
    }
  }

  debug(category: LogCategory, message: string, data?: any, component?: string) {
    this.log('debug', category, message, data, component);
  }

  info(category: LogCategory, message: string, data?: any, component?: string) {
    this.log('info', category, message, data, component);
  }

  warn(category: LogCategory, message: string, data?: any, component?: string) {
    this.log('warn', category, message, data, component);
  }

  error(category: LogCategory, message: string, data?: any, component?: string) {
    this.log('error', category, message, data, component);
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }

  exportLogs() {
    const data = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-explorer-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = new ApplicationLogger();

export function ApplicationLoggerPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('logs');

  useEffect(() => {
    const unsubscribe = logger.subscribe(setLogs);
    setLogs(logger.getLogs());
    return unsubscribe;
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
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
  }, [logs, selectedLevel, selectedCategory, searchQuery]);

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
              onClick={() => logger.exportLogs()}
            >
              Export
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => logger.clear()}
            >
              Clear
            </Button>
          </Group>
        </Group>

        <Divider />

        <Tabs value={activeTab} onChange={setActiveTab}>
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
              <Group gap="md">
                <TextInput
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                  style={{ flex: 1 }}
                  rightSection={
                    searchQuery ? (
                      <ActionIcon size="sm" variant="transparent" onClick={() => setSearchQuery('')}>
                        <IconX size={12} />
                      </ActionIcon>
                    ) : null
                  }
                />
                <Select
                  placeholder="Level"
                  value={selectedLevel}
                  onChange={(value) => setSelectedLevel((value as LogLevel) || 'all')}
                  data={[
                    { value: 'all', label: 'All Levels' },
                    { value: 'debug', label: 'Debug' },
                    { value: 'info', label: 'Info' },
                    { value: 'warn', label: 'Warning' },
                    { value: 'error', label: 'Error' },
                  ]}
                  leftSection={<IconFilter size={16} />}
                  style={{ width: 140 }}
                />
                <Select
                  placeholder="Category"
                  value={selectedCategory}
                  onChange={(value) => setSelectedCategory((value as LogCategory) || 'all')}
                  data={[
                    { value: 'all', label: 'All Categories' },
                    { value: 'api', label: 'API' },
                    { value: 'cache', label: 'Cache' },
                    { value: 'graph', label: 'Graph' },
                    { value: 'routing', label: 'Routing' },
                    { value: 'ui', label: 'UI' },
                    { value: 'auth', label: 'Auth' },
                    { value: 'storage', label: 'Storage' },
                    { value: 'general', label: 'General' },
                  ]}
                  style={{ width: 140 }}
                />
              </Group>

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
                          <Code size="xs" c="dimmed">{log.component}</Code>
                        )}
                      </Group>
                      <Text size="sm" mb={log.data ? 'xs' : 0}>
                        {log.message}
                      </Text>
                      {log.data && (
                        <Code block size="xs" c="dimmed">
                          {JSON.stringify(log.data, null, 2)}
                        </Code>
                      )}
                      {log.stack && (
                        <Code block size="xs" c="red" mt="xs">
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
  );
}