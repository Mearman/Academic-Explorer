/**
 * Bookmark manager component for displaying and managing user bookmarks
 */

import { useUserInteractions } from "@/hooks/use-user-interactions";
import {
  IconBookmark,
  IconBookmarkOff,
  IconSearch,
  IconExternalLink,
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
  SimpleGrid,
  Tooltip,
} from "@mantine/core";

interface BookmarkManagerProps {
  onNavigate?: (url: string) => void;
}

export function BookmarkManager({ onNavigate }: BookmarkManagerProps) {
  const { bookmarks, isLoadingBookmarks } =
    useUserInteractions();
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
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.href = url;
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
        </Group>
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
            <Card key={bookmark.id} withBorder padding="md">
              <Group justify="space-between" mb="xs">
                <Text
                  component="a"
                  href={`#${bookmark.request.cacheKey.replace(
                    /^\/(author|work|institution|source|funder|topic|concept)\//,
                    (_match: string, type: string) => {
                      const pluralMap: Record<string, string> = {
                        author: "authors",
                        work: "works",
                        institution: "institutions",
                        source: "sources",
                        funder: "funders",
                        topic: "topics",
                        concept: "concepts",
                      };
                      return `/${pluralMap[type] || type}/`;
                    },
                  )}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate(bookmark.request.cacheKey);
                  }}
                  flex={1}
                  fw={500}
                  c="inherit"
                  style={{ cursor: "pointer" }}
                  className="hover:text-blue-600 transition-colors"
                >
                  {bookmark.title}
                </Text>
                {bookmark.request.params &&
                  JSON.parse(bookmark.request.params) &&
                  Object.keys(JSON.parse(bookmark.request.params)).length >
                    0 && (
                    <Badge size="xs" variant="light">
                      {Object.keys(JSON.parse(bookmark.request.params)).length}{" "}
                      param
                      {Object.keys(JSON.parse(bookmark.request.params))
                        .length !== 1
                        ? "s"
                        : ""}
                    </Badge>
                  )}
              </Group>

              {bookmark.notes && (
                <Text size="sm" c="dimmed" mb="xs" lineClamp={2}>
                  {bookmark.notes}
                </Text>
              )}

              {bookmark.tags && bookmark.tags.length > 0 && (
                <Group gap="xs" mb="xs">
                  {bookmark.tags.map((tag: string, index: number) => (
                    <Badge key={index} size="xs" variant="light">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              )}

              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">
                  {new Date(bookmark.timestamp).toLocaleDateString()}
                </Text>
                <Tooltip label="Open bookmark">
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconExternalLink size={14} />}
                    onClick={() => handleNavigate(bookmark.request.cacheKey)}
                  >
                    Open
                  </Button>
                </Tooltip>
              </Group>
            </Card>
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
