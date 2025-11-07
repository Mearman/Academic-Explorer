/**
 * History sidebar component for managing navigation history in the right sidebar
 */

import { historyDB } from "@/lib/history-db";
import { logError, logger } from "@academic-explorer/utils/logger";
import { useNavigate } from "@tanstack/react-router";
import {
  IconHistory,
  IconSearch,
  IconExternalLink,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Card,
  Text,
  Group,
  Stack,
  ActionIcon,
  ScrollArea,
  Title,
  Divider,
  Tooltip,
} from "@mantine/core";

interface HistorySidebarProps {
  onClose?: () => void;
}

export function HistorySidebar({ onClose }: HistorySidebarProps) {
  const navigate = useNavigate();
  const [historyEntries, setHistoryEntries] = useState<
    Array<{ route: string; visitedAt: number }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load history from Dexie on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const entries = await historyDB.getAll();
        // Sort by most recent first
        setHistoryEntries(entries.sort((a, b) => b.visitedAt - a.visitedAt));
      } catch (error) {
        logError(logger, "Failed to load history", error, "HistorySidebar");
      }
    };
    loadHistory();
  }, []);

  // Filter history entries based on search query
  const filteredEntries = historyEntries.filter(
    (entry) =>
      searchQuery === "" ||
      entry.route.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleClearHistory = async () => {
    try {
      await historyDB.clear();
      setHistoryEntries([]);
      setSearchQuery("");
    } catch (error) {
      logError(logger, "Failed to clear history", error, "HistorySidebar");
    }
  };

  const handleNavigate = (url: string) => {
    // Handle hash-based navigation for internal routes
    if (url.startsWith("/")) {
      navigate({ to: url });
    } else {
      window.location.href = url;
    }
    if (onClose) {
      onClose();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const diffDays = (date: Date) => {
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const groupEntriesByDate = (entries: Array<{ route: string; visitedAt: number }>) => {
    const groups: { [key: string]: Array<{ route: string; visitedAt: number }> } = {};

    entries.forEach(entry => {
      const date = new Date(entry.visitedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (diffDays(date) < 7) {
        groupKey = "This week";
      } else {
        groupKey = date.toLocaleDateString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });

    return groups;
  };

  const groupedEntries = groupEntriesByDate(filteredEntries);

  return (
    <Stack h="100%" p="md">
      {/* Header */}
      <Group justify="space-between">
        <Group>
          <IconHistory size={18} />
          <Title order={6}>History</Title>
        </Group>
        {onClose && (
          <ActionIcon size="sm" variant="subtle" onClick={onClose}>
            <IconX size={14} />
          </ActionIcon>
        )}
      </Group>

      {/* Search */}
      <Group gap="xs">
        <TextInput
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={14} />}
          size="sm"
          style={{ flex: 1 }}
        />
        {historyEntries.length > 0 && (
          <Tooltip label="Clear all history">
            <ActionIcon
              variant="light"
              color="red"
              size="sm"
              onClick={handleClearHistory}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* History List */}
      <ScrollArea flex={1}>
        {filteredEntries.length === 0 ? (
          <Card withBorder p="md">
            <Stack align="center" gap="md">
              <IconHistory
                size={32}
                style={{ color: "var(--mantine-color-gray-4)" }}
              />
              <Text size="sm" fw={500} ta="center">
                {searchQuery ? "No history found" : "No navigation history yet"}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Your navigation history will appear here"}
              </Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="xs">
            {Object.entries(groupedEntries).map(([groupKey, entries]) => (
              <Stack key={groupKey} gap="xs">
                <Group justify="space-between">
                  <Text size="xs" fw={600} c="dimmed">
                    {groupKey}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {entries.length} {entries.length === 1 ? 'item' : 'items'}
                  </Text>
                </Group>
                {entries.map((entry, index) => (
                  <Card
                    key={`${entry.route}-${entry.visitedAt}`}
                    withBorder
                    padding="xs"
                    shadow="none"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleNavigate(entry.route)}
                  >
                    <Group justify="space-between" align="flex-start" gap="xs">
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Text
                          size="xs"
                          fw={500}
                          lineClamp={1}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {entry.route}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatDate(entry.visitedAt)}
                        </Text>
                      </Stack>
                      <Tooltip label="Navigate to this route">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(entry.route);
                          }}
                        >
                          <IconExternalLink size={12} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Card>
                ))}
                {groupKey !== Object.keys(groupedEntries)[Object.keys(groupedEntries).length - 1] && (
                  <Divider size="xs" />
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </ScrollArea>

      {/* Footer */}
      {filteredEntries.length > 0 && (
        <Text size="xs" c="dimmed" ta="center">
          {filteredEntries.length} history {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </Text>
      )}
    </Stack>
  );
}