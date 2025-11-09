/**
 * History sidebar component for managing navigation history in the right sidebar
 */

import { useUserInteractions } from "@/hooks/use-user-interactions";
import { catalogueService, type CatalogueEntity } from "@academic-explorer/utils/storage/catalogue-db";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Use the refactored user interactions hook for history
  const { recentHistory, clearHistory, isLoadingHistory } = useUserInteractions();

  // Filter history entries based on search query
  const filteredEntries = recentHistory.filter(
    (entry) =>
      searchQuery === "" ||
      entry.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.notes && entry.notes.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setSearchQuery("");
    } catch (error) {
      logError(logger, "Failed to clear history", error, "HistorySidebar");
    }
  };

  const handleNavigate = (entry: CatalogueEntity) => {
    // Extract URL from entry notes or construct from entity
    let url = "";

    // Try to extract URL from notes
    const urlMatch = entry.notes?.match(/URL: ([^\n]+)/);
    if (urlMatch) {
      url = urlMatch[1];
    } else if (entry.entityId.startsWith("search-") || entry.entityId.startsWith("list-")) {
      // For search and list entries, use the URL from notes
      const urlFromNotes = entry.notes?.match(/URL: ([^\n]+)/);
      url = urlFromNotes?.[1] || "";
    } else {
      // For entity entries, construct the internal path
      url = `/${entry.entityType}/${entry.entityId}`;
    }

    // Handle navigation
    if (url.startsWith("/")) {
      navigate({ to: url });
    } else if (url) {
      window.location.href = url;
    }

    if (onClose) {
      onClose();
    }
  };

  const handleDeleteHistoryEntry = (entityRecordId: string, entityTitle: string) => {
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
          await catalogueService.removeEntityFromList("history-list", entityRecordId);
        } catch (error) {
          logError(logger, "Failed to delete history entry", error, "HistorySidebar");
        }
      },
    });
  };

  const formatDate = (date: Date) => {
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

  const groupEntriesByDate = (entries: Array<CatalogueEntity>) => {
    const groups: { [key: string]: Array<CatalogueEntity> } = {};

    entries.forEach(entry => {
      const date = new Date(entry.addedAt);
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
        {recentHistory.length > 0 && (
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
                {entries.map((entry, index) => {
                  // Extract title from entry notes or use entity ID
                  let title = entry.entityId;
                  const titleMatch = entry.notes?.match(/Title: ([^\n]+)/);
                  if (titleMatch) {
                    title = titleMatch[1];
                  } else if (entry.entityId.startsWith("search-")) {
                    title = `Search: ${entry.entityId.replace("search-", "").split("-")[0]}`;
                  } else if (entry.entityId.startsWith("list-")) {
                    title = `List: ${entry.entityId.replace("list-", "")}`;
                  } else {
                    title = `${entry.entityType}: ${entry.entityId}`;
                  }

                  return (
                    <Card
                      key={`${entry.entityId}-${entry.addedAt}`}
                      withBorder
                      padding="xs"
                      shadow="none"
                      className={styles.historyCard}
                      onClick={() => handleNavigate(entry)}
                    >
                      <Group justify="space-between" align="flex-start" gap="xs">
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Text
                            size="xs"
                            fw={500}
                            lineClamp={1}
                            className={styles.historyEntry}
                          >
                            {title}
                          </Text>
                          {entry.notes && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {entry.notes.split('\n').filter(line => !line.startsWith('URL:') && !line.startsWith('Title:')).join('\n')}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed">
                            {formatDate(new Date(entry.addedAt))}
                          </Text>
                        </Stack>
                        <Group gap="xs">
                          <Tooltip label="Navigate to this entry">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              className={styles.navigationButton}
                              aria-label={`Navigate to ${title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigate(entry);
                              }}
                            >
                              <IconExternalLink size={12} />
                            </ActionIcon>
                          </Tooltip>
                          {entry.id && (
                            <Tooltip label="Delete history entry">
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="red"
                                className={styles.actionButton}
                                aria-label={`Delete ${title} from history`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (entry.id) {
                                    handleDeleteHistoryEntry(entry.id, title);
                                  }
                                }}
                              >
                                <IconTrash size={12} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Group>
                    </Card>
                  );
                })}
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