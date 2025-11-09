/**
 * Bookmarks sidebar component for managing bookmarks in the left sidebar
 */

import { useUserInteractions } from "@/hooks/use-user-interactions";
import { catalogueService, type CatalogueEntity } from "@academic-explorer/utils/storage/catalogue-db";
import { logger } from "@academic-explorer/utils/logger";
import { useNavigate, Link } from "@tanstack/react-router";
import { CatalogueSidebarLink } from "@/components/catalogue";
import {
  IconBookmark,
  IconBookmarkOff,
  IconSearch,
  IconExternalLink,
  IconX,
  IconTrash,
  IconSettings,
  IconList,
} from "@tabler/icons-react";
import { useState } from "react";
import {
  TextInput,
  Button,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Loader,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import * as styles from "./sidebar.css";
import { SidebarFallback } from "./SidebarFallback";

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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (bookmark) =>
          bookmark.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.entityType.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : bookmarks;

  const handleNavigate = (bookmark: CatalogueEntity) => {
    // Extract URL from bookmark notes or construct from entity
    let url = "";

    // Try to extract URL from notes
    const urlMatch = bookmark.notes?.match(/URL: ([^\n]+)/);
    if (urlMatch) {
      url = urlMatch[1];
    } else if (bookmark.entityId.startsWith("search-") || bookmark.entityId.startsWith("list-")) {
      // For search and list bookmarks, use the URL from notes
      const urlFromNotes = bookmark.notes?.match(/URL: ([^\n]+)/);
      url = urlFromNotes?.[1] || "";
    } else {
      // For entity bookmarks, construct the internal path
      url = `/${bookmark.entityType}/${bookmark.entityId}`;
    }

    // Handle navigation
    if (url.startsWith("/")) {
      navigate({ to: url });
    } else if (url.startsWith("https://api.openalex.org")) {
      // Convert API URL to internal path for navigation
      const internalPath = url.replace("https://api.openalex.org", "");
      navigate({ to: internalPath });
    } else if (url) {
      window.location.href = url;
    }

    if (onClose) {
      onClose();
    }
  };

  const handleDeleteBookmark = (bookmarkRecordId: string, bookmarkTitle: string) => {
    modals.openConfirmModal({
      title: "Delete Bookmark",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete "{bookmarkTitle}"? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await catalogueService.removeBookmark(bookmarkRecordId);
          await refreshData();
        } catch (error) {
          logger.error("bookmarks", "Failed to delete bookmark:", error);
        }
      },
    });
  };

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
          <CatalogueSidebarLink onClose={onClose} />
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
            {filteredBookmarks.map((bookmark) => {
              // Extract title from bookmark notes or use entity ID
              let title = bookmark.entityId;
              const titleMatch = bookmark.notes?.match(/Title: ([^\n]+)/);
              if (titleMatch) {
                title = titleMatch[1];
              } else if (bookmark.entityId.startsWith("search-")) {
                title = `Search: ${bookmark.entityId.replace("search-", "").split("-")[0]}`;
              } else if (bookmark.entityId.startsWith("list-")) {
                title = `List: ${bookmark.entityId.replace("list-", "")}`;
              } else {
                title = `${bookmark.entityType}: ${bookmark.entityId}`;
              }

              return (
                <Card
                  key={bookmark.id || bookmark.entityId}
                  withBorder
                  padding="xs"
                  shadow="none"
                  className={styles.bookmarkCard}
                  onClick={() => handleNavigate(bookmark)}
                >
                  <Group justify="space-between" align="flex-start" gap="xs">
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text
                        size="xs"
                        fw={500}
                        lineClamp={2}
                        className={styles.bookmarkTitle}
                      >
                        {title}
                      </Text>
                      {bookmark.notes && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {bookmark.notes.split('\n').filter(line => !line.startsWith('URL:') && !line.startsWith('Title:')).join('\n')}
                        </Text>
                      )}
                      <Badge size="xs" variant="light" className={styles.tagBadge}>
                        {bookmark.entityType}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {new Date(bookmark.addedAt).toLocaleDateString()}
                      </Text>
                    </Stack>
                    <Group gap="xs">
                      <Tooltip label="Open bookmark">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          className={styles.actionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(bookmark);
                          }}
                        >
                          <IconExternalLink size={12} />
                        </ActionIcon>
                      </Tooltip>
                      {bookmark.id && (
                        <Tooltip label="Delete bookmark">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            className={styles.actionButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bookmark.id) {
                                handleDeleteBookmark(bookmark.id, title);
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