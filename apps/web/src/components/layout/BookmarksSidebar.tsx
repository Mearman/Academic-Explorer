/**
 * Bookmarks sidebar component for managing bookmarks in the left sidebar
 */

import { useUserInteractions } from "@/hooks/use-user-interactions";
import { useNavigate } from "@tanstack/react-router";
import {
  IconBookmark,
  IconBookmarkOff,
  IconSearch,
  IconExternalLink,
  IconX,
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
import * as styles from "./sidebar.css";

interface BookmarksSidebarProps {
  onClose?: () => void;
}

export function BookmarksSidebar({ onClose }: BookmarksSidebarProps) {
  const { bookmarks, isLoadingBookmarks } = useUserInteractions();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookmark.tags?.some((tag: string) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : bookmarks;

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

  if (isLoadingBookmarks) {
    return (
      <div className={styles.sidebarContainer}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>
            <IconBookmark size={18} />
            <Title order={6}>Bookmarks</Title>
          </div>
          {onClose && (
            <ActionIcon size="sm" variant="subtle" onClick={onClose}>
              <IconX size={14} />
            </ActionIcon>
          )}
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
        {onClose && (
          <ActionIcon size="sm" variant="subtle" onClick={onClose}>
            <IconX size={14} />
          </ActionIcon>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchInput}>
        <TextInput
          placeholder="Search bookmarks..."
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
              <Card
                key={bookmark.id}
                withBorder
                padding="xs"
                shadow="none"
                className={styles.bookmarkCard}
                onClick={() => handleNavigate(bookmark.request.cacheKey)}
              >
                <Group justify="space-between" align="flex-start" gap="xs">
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Text
                      size="xs"
                      fw={500}
                      lineClamp={2}
                      className={styles.bookmarkTitle}
                    >
                      {bookmark.title}
                    </Text>
                    {bookmark.notes && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {bookmark.notes}
                      </Text>
                    )}
                    <Group gap="xs">
                      {bookmark.tags &&
                        bookmark.tags.length > 0 &&
                        bookmark.tags.slice(0, 2).map((tag: string, index: number) => (
                          <Badge key={index} size="xs" variant="light" className={styles.tagBadge}>
                            {tag}
                          </Badge>
                        ))}
                      {bookmark.tags && bookmark.tags.length > 2 && (
                        <Badge size="xs" variant="light" className={styles.tagBadge}>
                          +{bookmark.tags.length - 2}
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {new Date(bookmark.timestamp).toLocaleDateString()}
                    </Text>
                  </Stack>
                  <Tooltip label="Open bookmark">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(bookmark.request.cacheKey);
                      }}
                    >
                      <IconExternalLink size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Card>
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