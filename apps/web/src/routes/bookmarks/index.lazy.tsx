import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkList } from "@academic-explorer/ui";
import { logger } from "@academic-explorer/utils";
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Badge,
  Button,
  Alert,
} from "@mantine/core";
import { IconBookmark, IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";

/**
 * Bookmarks Index Route Component
 *
 * Displays all bookmarked entities in a list view.
 * Uses the useBookmarks hook for reactive bookmark state.
 */
function BookmarksIndexPage() {
  const navigate = useNavigate();
  const { bookmarks, removeBookmark, loading, error } = useBookmarks();

  // State for view options
  const [groupByType, setGroupByType] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  logger.debug("bookmarks", "Bookmarks index page rendering", {
    bookmarksCount: bookmarks.length,
    groupByType,
    sortBy,
    sortOrder
  });

  // Handle navigation to bookmarked entity
  const handleNavigate = (url: string) => {
    logger.debug("bookmarks", "Navigating to bookmarked entity", { url });
    // Convert full URL to relative path for router navigation
    try {
      const urlObj = new URL(url, window.location.origin);
      const path = urlObj.pathname + urlObj.search + urlObj.hash;
      navigate({ to: path as any });
    } catch (err) {
      logger.error("bookmarks", "Failed to navigate to bookmark", { url, error: err });
    }
  };

  // Handle bookmark deletion
  const handleDelete = async (bookmarkId: string) => {
    try {
      logger.debug("bookmarks", "Deleting bookmark", { bookmarkId });
      await removeBookmark(bookmarkId);
      logger.debug("bookmarks", "Bookmark deleted successfully", { bookmarkId });
    } catch (err) {
      logger.error("bookmarks", "Failed to delete bookmark", { bookmarkId, error: err });
    }
  };

  return (
    <Container size="lg" p="xl" data-testid="bookmarks-page">
      <Stack gap="xl">
        {/* Header */}
        <Paper p="xl" radius="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <Stack gap="sm">
              <Group gap="md" align="center">
                <IconBookmark size={32} />
                <Title order={1}>Bookmarks</Title>
                <Badge size="lg" variant="light" color="blue">
                  {bookmarks.length} {bookmarks.length === 1 ? 'item' : 'items'}
                </Badge>
              </Group>
              <Text c="dimmed">
                Bookmarked entities and query pages for quick access
              </Text>
            </Stack>

            {/* View Controls */}
            <Group gap="sm">
              <Button
                variant={groupByType ? "filled" : "light"}
                size="sm"
                onClick={() => setGroupByType(!groupByType)}
              >
                {groupByType ? "Grouped" : "Flat"}
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'} {sortBy}
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Error State */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error loading bookmarks"
            color="red"
            variant="light"
          >
            {error.message || "An error occurred while loading your bookmarks."}
          </Alert>
        )}

        {/* Bookmark List */}
        <BookmarkList
          bookmarks={bookmarks}
          groupByType={groupByType}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onDeleteBookmark={handleDelete}
          onNavigate={handleNavigate}
          loading={loading}
          emptyMessage="No bookmarks yet. Bookmark entities and query pages to see them here."
          data-testid="bookmark-list"
        />
      </Stack>
    </Container>
  );
}

export const Route = createLazyFileRoute("/bookmarks/")({
  component: BookmarksIndexPage,
});

export default BookmarksIndexPage;
