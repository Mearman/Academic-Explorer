/**
 * History sidebar component for managing navigation history in the right sidebar
 */

import { historyDB } from "@/lib/history-db";
import { logError, logger } from "@academic-explorer/utils/logger";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  IconHistory,
  IconSearch,
  IconExternalLink,
  IconTrash,
  IconX,
  IconSettings,
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
import { modals } from "@mantine/modals";
import * as styles from "./sidebar.css";

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

  const handleDeleteHistoryEntry = (route: string, visitedAt: number) => {
    modals.openConfirmModal({
      title: "Delete History Entry",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this history entry? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await historyDB.deleteVisit(route, visitedAt);
          // Reload history entries
          const entries = await historyDB.getAll();
          setHistoryEntries(entries.sort((a, b) => b.visitedAt - a.visitedAt));
        } catch (error) {
          logError(logger, "Failed to delete history entry", error, "HistorySidebar");
        }
      },
    });
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
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <IconHistory size={18} />
          <Title order={6}>History</Title>
        </div>
        <Group gap="xs">
          <Tooltip label="Manage all history">
            <ActionIcon
              size="sm"
              variant="subtle"
              component={Link}
              to="/history"
              aria-label="Go to history management page"
            >
              <IconSettings size={14} />
            </ActionIcon>
          </Tooltip>
          {onClose && (
            <ActionIcon size="sm" variant="subtle" onClick={onClose}>
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>
      </div>

      {/* Search */}
      <Group gap="xs" className={styles.searchInput}>
        <TextInput
          placeholder="Search history..."
          aria-label="Search navigation history"
          label="Search history"
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
              className={styles.actionButton}
              aria-label="Clear all navigation history"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* History List */}
      <div className={styles.scrollableContent}>
        {filteredEntries.length === 0 ? (
          <Card withBorder p="md">
            <Stack align="center" gap="md" className={styles.emptyState}>
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
                <div className={styles.groupHeader}>
                  <Text className={styles.groupTitle}>
                    {groupKey}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {entries.length} {entries.length === 1 ? 'item' : 'items'}
                  </Text>
                </div>
                {entries.map((entry, index) => (
                  <Card
                    key={`${entry.route}-${entry.visitedAt}`}
                    withBorder
                    padding="xs"
                    shadow="none"
                    className={styles.historyCard}
                    onClick={() => handleNavigate(entry.route)}
                  >
                    <Group justify="space-between" align="flex-start" gap="xs">
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Text
                          size="xs"
                          fw={500}
                          lineClamp={1}
                          className={styles.historyEntry}
                        >
                          {entry.route}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatDate(entry.visitedAt)}
                        </Text>
                      </Stack>
                      <Group gap="xs">
                        <Tooltip label="Navigate to this route">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            className={styles.navigationButton}
                            aria-label={`Navigate to ${entry.route}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigate(entry.route);
                            }}
                          >
                            <IconExternalLink size={12} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete history entry">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            className={styles.actionButton}
                            aria-label={`Delete ${entry.route} from history`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistoryEntry(entry.route, entry.visitedAt);
                            }}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))}
                {groupKey !== Object.keys(groupedEntries)[Object.keys(groupedEntries).length - 1] && (
                  <Divider size="xs" className={styles.groupDivider} />
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </div>

      {/* Footer */}
      {filteredEntries.length > 0 && (
        <Text className={styles.footerText}>
          {filteredEntries.length} history {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </Text>
      )}
    </div>
  );
}