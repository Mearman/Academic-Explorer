/**
 * Bookmark manager component for displaying and managing user bookmarks
 */

import { useUserInteractions } from "@/hooks/use-user-interactions";
import {
  BookmarkSelectionProvider,
  useBookmarkSelection,
  useBookmarkSelectionActions,
  useSelectionCount,
  useSelectedBookmarks,
} from "@/contexts/bookmark-selection-context";
import {
  IconBookmark,
  IconBookmarkOff,
  IconSearch,
  IconExternalLink,
  IconCheckbox,
  IconSquare,
  IconTrash,
  IconTag,
  IconNotes,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Loader,
  SimpleGrid,
  Tooltip,
  Checkbox,
  Modal,
  ActionIcon,
  Divider,
  TagsInput,
  Textarea,
} from "@mantine/core";
import { modals } from "@mantine/modals";

interface BookmarkManagerProps {
  onNavigate?: (url: string) => void;
}

// Bookmark card component with selection
function BookmarkCard({
  bookmark,
  isSelected,
  onToggleSelection,
  onNavigate
}: {
  bookmark: any;
  isSelected: boolean;
  onToggleSelection: () => void;
  onNavigate: (url: string) => void;
}) {
  // Helper functions to extract data from CatalogueEntity
  const extractTitle = (bookmark: any): string => {
    const titleMatch = bookmark.notes?.match(/Title: ([^\n]+)/);
    return titleMatch?.[1] || bookmark.entityId;
  };

  const extractUrl = (bookmark: any): string => {
    const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/);
    return urlMatch?.[1] || "";
  };

  const extractNotes = (bookmark: any): string => {
    return bookmark.notes?.split('\n').filter(line => !line.startsWith('URL:') && !line.startsWith('Title:')).join('\n') || '';
  };

  const title = extractTitle(bookmark);
  const url = extractUrl(bookmark);
  const notes = extractNotes(bookmark);

  return (
    <Card
      withBorder
      padding="md"
      data-testid="bookmark-card"
      className={isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}
    >
      <Group justify="space-between" mb="xs">
        <Group>
          <Checkbox
            checked={isSelected}
            onChange={onToggleSelection}
            aria-label={`Select bookmark: ${title}`}
            size="sm"
          />
          <Text
            component="a"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(url);
            }}
            flex={1}
            fw={500}
            c="inherit"
            style={{ cursor: "pointer" }}
            className="hover:text-blue-600 transition-colors"
            data-testid="bookmark-title-link"
          >
            {title}
          </Text>
        </Group>
      </Group>

      {notes && (
        <Text size="sm" c="dimmed" mb="xs" lineClamp={2}>
          {notes}
        </Text>
      )}

      <Group justify="space-between" mt="xs">
        <Text size="xs" c="dimmed">
          {new Date(bookmark.addedAt).toLocaleDateString()}
        </Text>
        <Tooltip label="Open bookmark">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconExternalLink size={14} />}
            onClick={() => {
              onNavigate(url);
            }}
            data-testid="bookmark-open-button"
          >
            Open
          </Button>
        </Tooltip>
      </Group>
    </Card>
  );
}

// Inner component that uses selection context
function BookmarkManagerInner({ onNavigate }: BookmarkManagerProps) {
  const {
    bookmarks,
    isLoadingBookmarks,
    bulkRemoveBookmarks
  } = useUserInteractions();
  const [searchQuery, setSearchQuery] = useState("");

  // Selection state and actions
  const { state: selectionState } = useBookmarkSelection();
  const selectionCount = useSelectionCount();
  const selectedBookmarks = useSelectedBookmarks();
  const {
    toggleSelection,
    selectAll,
    deselectAll,
    setTotalCount
  } = useBookmarkSelectionActions();

  // Update total count when bookmarks change
  useEffect(() => {
    console.log("Updating total count to:", bookmarks.length);
    setTotalCount(bookmarks.length);
  }, [bookmarks.length, setTotalCount]);

  // Debug selection state
  useEffect(() => {
    console.log("Selection state updated:", {
      selectionCount,
      selectedBookmarks: Array.from(selectedBookmarks),
      isAllSelected: selectionState.isAllSelected,
      totalCount: selectionState.totalCount
    });
  }, [selectionCount, selectedBookmarks, selectionState.isAllSelected, selectionState.totalCount]);

  // Helper functions to extract data from CatalogueEntity
  const extractTitle = (bookmark: any): string => {
    const titleMatch = bookmark.notes?.match(/Title: ([^\n]+)/);
    return titleMatch?.[1] || bookmark.entityId;
  };

  const extractTags = (bookmark: any): string[] => {
    // For bookmarks, tags might be stored in a special format in notes
    // This is a placeholder - tags may need to be stored differently
    return [];
  };

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (bookmark) => {
          const title = extractTitle(bookmark);
          const notes = bookmark.notes?.split('\n').filter(line => !line.startsWith('URL:') && !line.startsWith('Title:')).join('\n') || '';
          return (
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notes.toLowerCase().includes(searchQuery.toLowerCase())
          );
        },
      )
    : bookmarks;

  // Bulk operation handlers
  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectedBookmarks);

    if (selectedIds.length === 0) {
      return;
    }

    modals.openConfirmModal({
      title: "Delete Selected Bookmarks",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete {selectedIds.length} selected bookmark{selectedIds.length !== 1 ? "s" : ""}? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          const result = await bulkRemoveBookmarks(selectedIds);

          // Always show result to user
          modals.open({
            title: result.failed > 0 ? "Partial Success" : "Success",
            children: (
              <Text size="sm">
                {result.failed > 0
                  ? `Successfully deleted ${result.success} bookmark${result.success !== 1 ? "s" : ""}, but ${result.failed} failed.`
                  : `Successfully deleted ${result.success} bookmark${result.success !== 1 ? "s" : ""}.`
                }
              </Text>
            ),
          });

          deselectAll();
        } catch (error) {
          // Show error modal
          modals.open({
            title: "Error",
            children: (
              <Text size="sm">
                Failed to delete bookmarks. Please try again.
              </Text>
            ),
          });
        }
      },
    });
  };

  const handleNavigate = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else {
      // Fallback if no onNavigate prop provided
      if (url.startsWith("/")) {
        window.location.hash = url;
      } else if (url.startsWith("https://api.openalex.org")) {
        // Convert API URL to internal path for navigation
        const internalPath = url.replace("https://api.openalex.org", "");
        window.location.hash = internalPath;
      } else {
        window.location.href = url;
      }
    }
  };

  if (isLoadingBookmarks) {
    return (
      <Stack align="center" p="xl">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Loading bookmarks...
        </Text>
      </Stack>
    );
  }

  return (
    <Stack maw={1000} mx="auto" p="md">
        <Group justify="space-between" mb="md">
          <Group>
            <IconBookmark size={24} />
            <Text size="xl" fw={700}>
              Bookmarks
            </Text>
            {selectionCount > 0 && (
              <Badge size="lg" color="blue">
                {selectionCount} selected
              </Badge>
            )}
          </Group>
          {filteredBookmarks.length > 0 && (
            <Group gap="xs">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => selectAll(filteredBookmarks.map(b => b.id || b.entityId))}
              >
                Select All ({filteredBookmarks.length})
              </Button>
              {selectionCount > 0 && (
                <>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Deselect All
                  </Button>
                  <Divider orientation="vertical" />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={handleBulkDelete}
                    title="Delete selected bookmarks"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </>
              )}
            </Group>
          )}
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search bookmarks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={16} />}
          mb="md"
        />

      {filteredBookmarks.length === 0 ? (
        <Card withBorder p="xl">
          <Stack align="center" gap="md">
            <div style={{ color: "var(--mantine-color-gray-4)" }}>
            <IconBookmarkOff size={48} />
          </div>
            <Text size="lg" fw={500}>
              {searchQuery ? "No bookmarks found" : "No bookmarks yet"}
            </Text>
            <Text size="sm" c="dimmed">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Bookmark entities you want to revisit later"}
            </Text>
          </Stack>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
          {filteredBookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id || bookmark.entityId}
              bookmark={bookmark}
              isSelected={selectedBookmarks.has(bookmark.id || bookmark.entityId)}
              onToggleSelection={() => toggleSelection(bookmark.id || bookmark.entityId)}
              onNavigate={handleNavigate}
            />
          ))}
        </SimpleGrid>
      )}

      {bookmarks.length > 0 && (
        <Text size="sm" c="dimmed" ta="center" mt="md">
          {filteredBookmarks.length} of {bookmarks.length} bookmarks
        </Text>
      )}
    </Stack>
  );
}

// Main component that provides the selection context
export function BookmarkManager({ onNavigate }: BookmarkManagerProps) {
  return (
    <BookmarkSelectionProvider>
      <BookmarkManagerInner onNavigate={onNavigate} />
    </BookmarkSelectionProvider>
  );
}
