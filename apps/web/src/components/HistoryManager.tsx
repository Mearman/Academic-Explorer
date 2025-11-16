/**
 * History manager component for displaying navigation history
 * Refactored to use catalogue-based history system via useUserInteractions hook
 */

import { useUserInteractions } from "@/hooks/use-user-interactions";
import { catalogueService, type CatalogueEntity } from "@academic-explorer/utils/storage/catalogue-db";
import { logError, logger } from "@academic-explorer/utils/logger";
import { useNavigate } from "@tanstack/react-router";
import {
  IconHistory,
  IconSearch,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import {
  TextInput,
  Button,
  Card,
  Text,
  Group,
  Stack,
  ActionIcon,
  Title,
  Divider,
  Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";

interface HistoryManagerProps {
  onNavigate?: (url: string) => void;
}

export function HistoryManager({ onNavigate }: HistoryManagerProps) {
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
    modals.openConfirmModal({
      title: "Clear All History",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to clear all navigation history? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Clear All", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await clearHistory();
          setSearchQuery("");
        } catch (error) {
          logError(logger, "Failed to clear history", error, "HistoryManager");
        }
      },
    });
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
      if (onNavigate) {
        onNavigate(url);
      } else {
        navigate({ to: url });
      }
    } else if (url) {
      window.location.href = url;
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
          logError(logger, "Failed to delete history entry", error, "HistoryManager");
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
    <Stack maw={800} mx="auto" p="md">
      <Group justify="space-between" mb="md">
        <Group>
          <IconHistory size={24} />
          <Title order={2}>Navigation History</Title>
        </Group>
        <Button
          variant="light"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={handleClearHistory}
          disabled={recentHistory.length === 0}
        >
          Clear History
        </Button>
      </Group>

      {/* Search */}
      <Group mb="md">
        <TextInput
          placeholder="Search history..."
          aria-label="Search navigation history"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
        {searchQuery && (
          <Button variant="light" onClick={() => setSearchQuery("")}>
            Clear
          </Button>
        )}
      </Group>

      {filteredEntries.length === 0 ? (
        <Card withBorder p="xl">
          <Stack align="center" gap="md">
            <IconHistory
              size={48}
              style={{ color: "var(--mantine-color-gray-4)" }}
            />
            <Text size="lg" fw={500}>
              {searchQuery ? "No history found" : "No navigation history yet"}
            </Text>
            <Text size="sm" c="dimmed">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Your navigation history will appear here as you browse"}
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="md">
          {Object.entries(groupedEntries).map(([groupKey, entries]) => (
            <Stack key={groupKey} gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={600} c="dimmed">
                  {groupKey}
                </Text>
                <Text size="xs" c="dimmed">
                  {entries.length} {entries.length === 1 ? 'item' : 'items'}
                </Text>
              </Group>
              {entries.map((entry) => {
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
                    padding="md"
                    shadow="sm"
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Text size="sm" fw={500}>
                          {title}
                        </Text>
                        {entry.notes && (
                          <Text size="xs" c="dimmed" lineClamp={2}>
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
                            variant="light"
                            color="blue"
                            onClick={() => handleNavigate(entry)}
                            aria-label={`Navigate to ${title}`}
                          >
                            <IconExternalLink size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {entry.id && (
                          <Tooltip label="Delete history entry">
                            <ActionIcon
                              variant="light"
                              color="red"
                              aria-label={`Delete ${title} from history`}
                              onClick={() => {
                                if (entry.id) {
                                  handleDeleteHistoryEntry(entry.id, title);
                                }
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Group>
                  </Card>
                );
              })}
              {groupKey !== Object.keys(groupedEntries)[Object.keys(groupedEntries).length - 1] && (
                <Divider size="xs" my="xs" />
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {filteredEntries.length > 0 && (
        <Text size="sm" c="dimmed" ta="center" mt="md">
          {filteredEntries.length} history{" "}
          {filteredEntries.length === 1 ? "entry" : "entries"}
        </Text>
      )}
    </Stack>
  );
}
