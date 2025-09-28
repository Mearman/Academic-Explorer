import { useState, useEffect, useCallback } from "react";
import {
  Stack,
  Paper,
  Title,
  Button,
  Group,
  TextInput,
  ActionIcon,
  Menu,
  Text,
  Badge,
  Alert,
  Modal,
  Tooltip,
  ScrollArea,
  Box,
} from "@mantine/core";
import {
  IconBookmark,
  IconTrash,
  IconEdit,
  IconLoader,
  IconStar,
  IconStarFilled,
  IconDotsVertical,
  IconSearch,
  IconCalendar,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { logger } from "@academic-explorer/utils";

// TypeScript interfaces for saved query structure
export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  lastModified: Date;
  isFavorite: boolean;
  description?: string;
  tags?: string[];
}

export interface SavedQueryCreateInput {
  name: string;
  query: string;
  startDate: Date | null;
  endDate: Date | null;
  description?: string;
  tags?: string[];
}

export interface SavedQueryUpdateInput {
  name?: string;
  description?: string;
  isFavorite?: boolean;
  tags?: string[];
}

// Props interface for the component
export interface SavedQueriesProps {
  onLoadQuery?: (query: SavedQuery) => void;
  currentQuery?: {
    query: string;
    startDate: Date | null;
    endDate: Date | null;
  };
  className?: string;
}

// localStorage key for persistence
const STORAGE_KEY = "academic-explorer:saved-queries";

// Custom hook for localStorage operations
const useSavedQueriesStorage = () => {
  const loadQueries = useCallback((): SavedQuery[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored) as unknown[];
      return parsed.map((item: unknown): SavedQuery => {
        if (typeof item !== "object" || item === null) {
          throw new Error("Invalid query format");
        }

        const query = item as Record<string, unknown>;

        // Type guards and validation
        if (typeof query.id !== "string" ||
            typeof query.name !== "string" ||
            typeof query.query !== "string") {
          throw new Error("Missing required fields");
        }

        return {
          id: query.id,
          name: query.name,
          query: query.query,
          startDate: query.startDate ? new Date(query.startDate as string) : null,
          endDate: query.endDate ? new Date(query.endDate as string) : null,
          createdAt: new Date(query.createdAt as string),
          lastModified: new Date(query.lastModified as string),
          isFavorite: Boolean(query.isFavorite),
          description: typeof query.description === "string" ? query.description : undefined,
          tags: Array.isArray(query.tags) ? query.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
        };
      });
    } catch (error) {
      logger.error("storage", "Failed to load saved queries", { error });
      return [];
    }
  }, []);

  const saveQueries = useCallback((queries: SavedQuery[]): void => {
    try {
      const serialized = JSON.stringify(queries);
      localStorage.setItem(STORAGE_KEY, serialized);
      logger.debug("storage", "Saved queries updated", { count: queries.length });
    } catch (error) {
      logger.error("storage", "Failed to save queries", { error });
      throw error;
    }
  }, []);

  return { loadQueries, saveQueries };
};

export function SavedQueries({
  onLoadQuery,
  currentQuery,
  className
}: SavedQueriesProps) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [saveModalOpened, { open: openSaveModal, close: closeSaveModal }] = useDisclosure(false);
  const [renameModalOpened, { open: openRenameModal, close: closeRenameModal }] = useDisclosure(false);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [saveForm, setSaveForm] = useState({
    name: "",
    description: "",
    tags: "",
  });
  const [renameForm, setRenameForm] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  const { loadQueries, saveQueries } = useSavedQueriesStorage();

  // Load queries on component mount
  useEffect(() => {
    try {
      const loadedQueries = loadQueries();
      setQueries(loadedQueries);
      logger.debug("search", "Loaded saved queries", { count: loadedQueries.length });
    } catch (error) {
      logger.error("search", "Failed to load saved queries", { error });
      setError("Failed to load saved queries");
    }
  }, [loadQueries]);

  // Generate unique ID for new queries
  const generateId = useCallback((): string => {
    return `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Save current query
  const handleSaveQuery = useCallback(async () => {
    if (!currentQuery || !saveForm.name.trim()) {
      setError("Query name is required");
      return;
    }

    try {
      const newQuery: SavedQuery = {
        id: generateId(),
        name: saveForm.name.trim(),
        query: currentQuery.query,
        startDate: currentQuery.startDate,
        endDate: currentQuery.endDate,
        createdAt: new Date(),
        lastModified: new Date(),
        isFavorite: false,
        description: saveForm.description.trim() || undefined,
        tags: saveForm.tags.trim()
          ? saveForm.tags.split(",").map(tag => tag.trim()).filter(Boolean)
          : undefined,
      };

      const updatedQueries = [newQuery, ...queries];
      setQueries(updatedQueries);
      saveQueries(updatedQueries);

      // Reset form
      setSaveForm({ name: "", description: "", tags: "" });
      closeSaveModal();
      setError(null);

      logger.debug("search", "Query saved successfully", {
        queryId: newQuery.id,
        name: newQuery.name
      });
    } catch (error) {
      logger.error("search", "Failed to save query", { error });
      setError("Failed to save query");
    }
  }, [currentQuery, saveForm, queries, generateId, saveQueries, closeSaveModal]);

  // Load a saved query
  const handleLoadQuery = useCallback((query: SavedQuery) => {
    try {
      onLoadQuery?.(query);
      logger.debug("search", "Query loaded", { queryId: query.id, name: query.name });
    } catch (error) {
      logger.error("search", "Failed to load query", { error, queryId: query.id });
      setError("Failed to load query");
    }
  }, [onLoadQuery]);

  // Delete a query
  const handleDeleteQuery = useCallback((queryId: string) => {
    try {
      const updatedQueries = queries.filter(q => q.id !== queryId);
      setQueries(updatedQueries);
      saveQueries(updatedQueries);
      logger.debug("search", "Query deleted", { queryId });
    } catch (error) {
      logger.error("search", "Failed to delete query", { error, queryId });
      setError("Failed to delete query");
    }
  }, [queries, saveQueries]);

  // Toggle favorite status
  const handleToggleFavorite = useCallback((queryId: string) => {
    try {
      const updatedQueries = queries.map(q =>
        q.id === queryId
          ? { ...q, isFavorite: !q.isFavorite, lastModified: new Date() }
          : q
      );
      setQueries(updatedQueries);
      saveQueries(updatedQueries);
      logger.debug("search", "Query favorite toggled", { queryId });
    } catch (error) {
      logger.error("search", "Failed to toggle favorite", { error, queryId });
      setError("Failed to update query");
    }
  }, [queries, saveQueries]);

  // Rename a query
  const handleRenameQuery = useCallback(() => {
    if (!selectedQuery || !renameForm.name.trim()) {
      setError("Query name is required");
      return;
    }

    try {
      const updatedQueries = queries.map(q =>
        q.id === selectedQuery.id
          ? {
              ...q,
              name: renameForm.name.trim(),
              description: renameForm.description.trim() || undefined,
              lastModified: new Date()
            }
          : q
      );
      setQueries(updatedQueries);
      saveQueries(updatedQueries);

      // Reset form
      setRenameForm({ name: "", description: "" });
      setSelectedQuery(null);
      closeRenameModal();
      setError(null);

      logger.debug("search", "Query renamed", {
        queryId: selectedQuery.id,
        newName: renameForm.name
      });
    } catch (error) {
      logger.error("search", "Failed to rename query", { error, queryId: selectedQuery?.id });
      setError("Failed to rename query");
    }
  }, [selectedQuery, renameForm, queries, saveQueries, closeRenameModal]);

  // Open rename modal with selected query data
  const openRenameModalForQuery = useCallback((query: SavedQuery) => {
    setSelectedQuery(query);
    setRenameForm({
      name: query.name,
      description: query.description || "",
    });
    openRenameModal();
  }, [openRenameModal]);

  // Sort queries: favorites first, then by last modified
  const sortedQueries = [...queries].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.lastModified.getTime() - a.lastModified.getTime();
  });

  const formatDateOnly = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <Paper p="md" withBorder className={className}>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>Saved Queries</Title>
          <Group gap="xs">
            <Badge variant="light" size="sm">
              {queries.length}
            </Badge>
            {currentQuery?.query && (
              <Button
                size="sm"
                variant="light"
                leftSection={<IconBookmark size={16} />}
                onClick={openSaveModal}
              >
                Save Current
              </Button>
            )}
          </Group>
        </Group>

        {error && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="red"
            variant="light"
            onClose={() => { setError(null); }}
            withCloseButton
          >
            {error}
          </Alert>
        )}

        {queries.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No saved queries yet. Save your current search to get started.
          </Text>
        ) : (
          <ScrollArea h={400}>
            <Stack gap="xs">
              {sortedQueries.map((query) => (
                <Paper key={query.id} p="sm" withBorder>
                  <Group justify="space-between" align="flex-start">
                    <Box flex={1}>
                      <Group gap="xs" mb="xs">
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => { handleToggleFavorite(query.id); }}
                          aria-label={query.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          {query.isFavorite ? (
                            <IconStarFilled size={14} color="gold" />
                          ) : (
                            <IconStar size={14} />
                          )}
                        </ActionIcon>
                        <Text fw={500} size="sm" style={{ flex: 1 }}>
                          {query.name}
                        </Text>
                      </Group>

                      <Text size="xs" c="dimmed" mb="xs">
                        <IconSearch size={12} style={{ marginRight: 4 }} />
                        {query.query || "Empty query"}
                      </Text>

                      {(query.startDate || query.endDate) && (
                        <Text size="xs" c="dimmed" mb="xs">
                          <IconCalendar size={12} style={{ marginRight: 4 }} />
                          {query.startDate ? formatDateOnly(query.startDate) : "No start"} - {" "}
                          {query.endDate ? formatDateOnly(query.endDate) : "No end"}
                        </Text>
                      )}

                      {query.description && (
                        <Text size="xs" c="dimmed" mb="xs">
                          {query.description}
                        </Text>
                      )}

                      {query.tags && query.tags.length > 0 && (
                        <Group gap={4} mb="xs">
                          {query.tags.map((tag) => (
                            <Badge key={tag} size="xs" variant="dot">
                              {tag}
                            </Badge>
                          ))}
                        </Group>
                      )}

                      <Text size="xs" c="dimmed">
                        Created: {formatDateOnly(query.createdAt)}
                        {query.lastModified.getTime() !== query.createdAt.getTime() && (
                          <> • Modified: {formatDateOnly(query.lastModified)}</>
                        )}
                      </Text>
                    </Box>

                    <Group gap="xs">
                      <Tooltip label="Load query">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="sm"
                          onClick={() => { handleLoadQuery(query); }}
                          aria-label="Load query"
                        >
                          <IconLoader size={14} />
                        </ActionIcon>
                      </Tooltip>

                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" size="sm" aria-label="Query menu">
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={() => { openRenameModalForQuery(query); }}
                          >
                            Rename
                          </Menu.Item>
                          <Menu.Item
                            leftSection={query.isFavorite ? <IconStar size={14} /> : <IconStarFilled size={14} />}
                            onClick={() => { handleToggleFavorite(query.id); }}
                          >
                            {query.isFavorite ? "Remove from favorites" : "Add to favorites"}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => { handleDeleteQuery(query.id); }}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Stack>

      {/* Save Query Modal */}
      <Modal
        opened={saveModalOpened}
        onClose={closeSaveModal}
        title="Save Current Query"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Query Name"
            placeholder="Enter a name for this query"
            value={saveForm.name}
            onChange={(e) => {
              setSaveForm({ ...saveForm, name: e.target.value });
              setError(null);
            }}
            required
          />

          <TextInput
            label="Description"
            placeholder="Optional description"
            value={saveForm.description}
            onChange={(e) => { setSaveForm({ ...saveForm, description: e.target.value }); }}
          />

          <TextInput
            label="Tags"
            placeholder="Comma-separated tags (optional)"
            value={saveForm.tags}
            onChange={(e) => { setSaveForm({ ...saveForm, tags: e.target.value }); }}
          />

          {currentQuery && (
            <Paper p="sm" bg="gray.0">
              <Text size="sm" fw={500} mb="xs">Current Query Preview:</Text>
              <Text size="xs" c="dimmed">
                Query: {currentQuery.query || "Empty"}
              </Text>
              {(currentQuery.startDate || currentQuery.endDate) && (
                <Text size="xs" c="dimmed">
                  Date Range: {currentQuery.startDate ? formatDateOnly(currentQuery.startDate) : "No start"} - {" "}
                  {currentQuery.endDate ? formatDateOnly(currentQuery.endDate) : "No end"}
                </Text>
              )}
            </Paper>
          )}

          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeSaveModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuery} disabled={!saveForm.name.trim()}>
              Save Query
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Rename Query Modal */}
      <Modal
        opened={renameModalOpened}
        onClose={closeRenameModal}
        title="Edit Query"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Query Name"
            placeholder="Enter new name"
            value={renameForm.name}
            onChange={(e) => {
              setRenameForm({ ...renameForm, name: e.target.value });
              setError(null);
            }}
            required
          />

          <TextInput
            label="Description"
            placeholder="Optional description"
            value={renameForm.description}
            onChange={(e) => { setRenameForm({ ...renameForm, description: e.target.value }); }}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeRenameModal}>
              Cancel
            </Button>
            <Button onClick={handleRenameQuery} disabled={!renameForm.name.trim()}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}