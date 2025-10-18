/**
 * History manager component for displaying navigation history
 */

import { historyDB } from "@/lib/history-db";
import { logError, logger } from "@academic-explorer/utils/logger";
import {
  IconHistory,
  IconSearch,
  IconExternalLink,
  IconTrash,
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
} from "@mantine/core";

interface HistoryManagerProps {
  onNavigate?: (url: string) => void;
}

export function HistoryManager({ onNavigate }: HistoryManagerProps) {
  const [historyEntries, setHistoryEntries] = useState<
    Array<{ route: string; visitedAt: number }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load history from Dexie on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const entries = await historyDB.getAll();
        setHistoryEntries(entries);
      } catch (error) {
        logError(logger, "Failed to load history", error, "HistoryManager");
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

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearHistory = async () => {
    try {
      await historyDB.clear();
      setHistoryEntries([]);
      setSearchQuery("");
    } catch (error) {
      logError(logger, "Failed to clear history", error, "HistoryManager");
    }
  };

  const handleNavigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.href = `/#${url}`;
    }
  };

  return (
    <Stack maw={800} mx="auto" p="md">
      <Group justify="space-between" mb="md">
        <Group>
          <IconHistory size={24} />
          <Text size="xl" fw={700}>
            Navigation History
          </Text>
        </Group>
        <Button
          variant="light"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={handleClearHistory}
        >
          Clear History
        </Button>
      </Group>

      {/* Search */}
      <Group mb="md">
        <TextInput
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
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
                : "Your navigation history will appear here"}
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="sm">
          {filteredEntries.map((entry, index) => (
            <Card
              key={`${entry.route}-${entry.visitedAt}`}
              withBorder
              padding="md"
            >
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {entry.route}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(entry.visitedAt).toLocaleString()}
                  </Text>
                </Stack>
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => handleNavigate(entry.route)}
                  title="Navigate to this route"
                >
                  <IconExternalLink size={16} />
                </ActionIcon>
              </Group>
            </Card>
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
