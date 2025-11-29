/**
 * Bookmarks sidebar component for managing bookmarks in the left sidebar
 */

import { logger } from "@bibgraph/utils/logger";
import {
  TextInput,
  Card,
  Text,
  Group,
  Stack,
  Loader,
  ActionIcon,
  Tooltip,
  Title,
  Button,
} from "@mantine/core";
import {
  IconBookmark,
  IconBookmarkOff,
  IconSearch,
  IconX,
  IconBook,
  IconSettings,
  IconList,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useUserInteractions } from "@/hooks/use-user-interactions";

import { BookmarkCard } from "./BookmarkCard";
import * as styles from "./sidebar.css";

interface BookmarksSidebarProps {
  onClose?: () => void;
}

export function BookmarksSidebar({ onClose }: BookmarksSidebarProps) {
  // Simplified data loading without timeout fallback
  const safeUseUserInteractions = () => {
    try {
      return useUserInteractions();
    } catch (error) {
      logger.error('bookmarks', 'BookmarksSidebar: Error in useUserInteractions', error);
      // Return fallback values
      return {
        bookmarks: [],
        isLoadingBookmarks: false,
        refreshData: async () => {},
        isBookmarked: false,
        recordPageVisit: async () => {},
        bookmarkEntity: async () => {},
        bookmarkSearch: async () => {},
        bookmarkList: async () => {},
        unbookmarkEntity: async () => {},
        unbookmarkSearch: async () => {},
        unbookmarkList: async () => {},
        updateBookmark: async () => {},
        searchBookmarks: async () => [],
        isLoadingPageVisits: false,
        isLoadingStats: false,
      };
    }
  };

  const { bookmarks, isLoadingBookmarks, refreshData } = safeUseUserInteractions();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (bookmark) =>
          bookmark.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.entityType.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : bookmarks;

  if (isLoadingBookmarks) {
    return (
      <div className={styles.sidebarContainer}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>
            <IconBookmark size={18} />
            <Title order={6}>Bookmarks</Title>
          </div>
          <Group gap="xs">
            <Tooltip label="Manage all bookmarks">
              <ActionIcon
                size="sm"
                variant="subtle"
                component={Link}
                to="/bookmarks"
                aria-label="Go to bookmarks management page"
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
        <div className={styles.emptyState}>
          <Loader size="sm" />
          <Text size="xs" c="dimmed">
            Loading bookmarks...
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitle}>
          <IconBookmark size={18} />
          <Title order={6}>Bookmarks</Title>
        </div>
        <Group gap="xs">
          <Tooltip label="Manage all bookmarks">
            <ActionIcon
              size="sm"
              variant="subtle"
              component={Link}
              to="/bookmarks"
              aria-label="Go to bookmarks management page"
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

      {/* Catalogue Navigation */}
      <div className={styles.searchInput}>
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>Collections</Text>
          <IconBook size={14} />
        </Group>
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconList size={14} />}
          onClick={() => {
            window.location.hash = "/catalogue";
            if (onClose) onClose();
          }}
          title="Catalogue"
          fullWidth
        >
          Catalogue
        </Button>
      </div>

      {/* Search */}
      <div className={styles.searchInput}>
        <TextInput
          placeholder="Search bookmarks..."
          aria-label="Search bookmarks"
          label="Search bookmarks"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={14} />}
          size="sm"
        />
      </div>

      {/* Bookmarks List */}
      <div className={styles.scrollableContent}>
        {filteredBookmarks.length === 0 ? (
          <Card withBorder p="md">
            <div className={styles.emptyState}>
              <IconBookmarkOff size={32} />
              <Text size="sm" fw={500} ta="center">
                {searchQuery ? "No bookmarks found" : "No bookmarks yet"}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Bookmark entities you want to revisit later"}
              </Text>
            </div>
          </Card>
        ) : (
          <Stack gap="xs">
            {filteredBookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id || bookmark.entityId}
                bookmark={bookmark}
                onClose={onClose}
                onDeleted={refreshData}
              />
            ))}
          </Stack>
        )}
      </div>

      {/* Footer */}
      {bookmarks.length > 0 && (
        <Text className={styles.footerText}>
          {filteredBookmarks.length} of {bookmarks.length} bookmarks
        </Text>
      )}
    </div>
  );
}