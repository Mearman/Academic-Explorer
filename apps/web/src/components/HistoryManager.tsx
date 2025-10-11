/**
 * History manager component for displaying navigation history
 */

import { useAppActivityStore } from "@/stores/app-activity-store";
import {
  IconHistory,
  IconSearch,
  IconExternalLink,
  IconFilter,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import {
  TextInput,
  Select,
  Button,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Collapse,
} from "@mantine/core";

interface HistoryManagerProps {
  onNavigate?: (url: string) => void;
}

export function HistoryManager({ onNavigate }: HistoryManagerProps) {
  const {
    filteredEvents,
    setTypeFilter,
    setCategoryFilter,
    setSearchTerm,
    clearFilters,
    loadEvents,
  } = useAppActivityStore();

  // Load events from IndexedDB on mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter navigation and search events
  const navigationEvents = filteredEvents.filter(
    (event) =>
      event.type === "navigation" ||
      (event.category === "ui" &&
        (event.event === "entity_page_visit" ||
          event.event === "search_page_visit")),
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setSearchTerm(query);
  };

  const handleNavigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.href = `/#${url}`;
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    clearFilters();
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
      </Group>

      {/* Search and Filters */}
      <Group mb="md">
        <TextInput
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
        />
        <Button
          variant="outline"
          leftSection={<IconFilter size={16} />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
        </Button>
        <Button variant="light" onClick={handleClearFilters}>
          Clear
        </Button>
      </Group>

      {/* Filter Options */}
      <Collapse in={showFilters}>
        <Card withBorder mb="md">
          <Group grow>
            <Select
              label="Type"
              placeholder="All Types"
              data={[
                { value: "navigation", label: "Navigation" },
                { value: "user", label: "User" },
                { value: "component", label: "Component" },
                { value: "performance", label: "Performance" },
                { value: "error", label: "Error" },
              ]}
              onChange={(value) => setTypeFilter(value ? [value] : [])}
              clearable
            />
            <Select
              label="Category"
              placeholder="All Categories"
              data={[
                { value: "ui", label: "UI" },
                { value: "interaction", label: "Interaction" },
                { value: "lifecycle", label: "Lifecycle" },
                { value: "data", label: "Data" },
                { value: "background", label: "Background" },
              ]}
              onChange={(value) => setCategoryFilter(value ? [value] : [])}
              clearable
            />
          </Group>
        </Card>
      </Collapse>

      {navigationEvents.length === 0 ? (
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
                ? "Try adjusting your search terms or filters"
                : "Your navigation history will appear here"}
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="sm">
          {navigationEvents.map((event) => (
            <Card key={event.id} withBorder padding="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {event.description}
                    </Text>
                    <Badge
                      size="xs"
                      color={
                        event.severity === "error"
                          ? "red"
                          : event.severity === "warning"
                            ? "yellow"
                            : "blue"
                      }
                    >
                      {event.severity}
                    </Badge>
                  </Group>

                  <Text size="xs" c="dimmed">
                    {new Date(event.timestamp).toLocaleString()}
                    {event.metadata?.component && (
                      <span> • {event.metadata.component}</span>
                    )}
                  </Text>

                  {event.metadata?.entityType && event.metadata?.entityId ? (
                    <Text size="sm" c="blue">
                      {event.metadata.entityType}: {event.metadata.entityId}
                    </Text>
                  ) : event.metadata?.searchQuery ? (
                    <div>
                      <Text size="sm" c="blue">
                        Search: &ldquo;{event.metadata.searchQuery}&rdquo;
                      </Text>
                      {event.metadata.filters &&
                        typeof event.metadata.filters === "string" && (
                          <Text size="xs" c="dimmed">
                            Filters: {event.metadata.filters}
                          </Text>
                        )}
                      {event.metadata.searchParams &&
                        typeof event.metadata.searchParams === "object" && (
                          <Text size="xs" c="dimmed">
                            Parameters:{" "}
                            {new URLSearchParams(
                              event.metadata.searchParams as Record<
                                string,
                                string
                              >,
                            ).toString()}
                          </Text>
                        )}
                      {event.metadata.searchParams &&
                        typeof event.metadata.searchParams === "string" && (
                          <Text size="xs" c="dimmed">
                            Parameters: {event.metadata.searchParams}
                          </Text>
                        )}
                    </div>
                  ) : event.metadata?.route ? (
                    <Text size="sm" c="blue">
                      Route: {event.metadata.route}
                    </Text>
                  ) : null}
                </Stack>

                {event.metadata?.route && (
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() =>
                      event.metadata?.route &&
                      handleNavigate(event.metadata.route)
                    }
                    title="Navigate to this route"
                  >
                    <IconExternalLink size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      )}

      {navigationEvents.length > 0 && (
        <Text size="sm" c="dimmed" ta="center" mt="md">
          {navigationEvents.length} navigation events
        </Text>
      )}
    </Stack>
  );
}
