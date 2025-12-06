import {
  ActionIcon,
  Badge,
  Group,
  Popover,
  Stack,
  Text,
  TextInput} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowRight,
  IconClock,
  IconHistory,
  IconSearch,
  IconX} from "@tabler/icons-react";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo,useRef, useState } from "react";

import { NOTIFICATION_DURATION } from "@/config/notification-constants";
import { useNavigationEnhancements } from "@/hooks/useNavigationEnhancements";

export const HeaderSearchInput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ strict: false });
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    addToSearchHistory,
    clearSearchHistory,
    searchHistory,
    useKeyboardNavigation
  } = useNavigationEnhancements();

  // Enable keyboard navigation shortcuts
  useKeyboardNavigation();

  // Initialize from URL params if on autocomplete page
  const [query, setQuery] = useState(() => {
    if (location.pathname === "/autocomplete" && searchParams.q) {
      return String(searchParams.q);
    }
    return "";
  });

  // Focus management
  const [focused, setFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Update local state when URL changes
  useEffect(() => {
    if (location.pathname === "/autocomplete" && searchParams.q) {
      setQuery(String(searchParams.q));
    } else if (location.pathname !== "/autocomplete") {
      setQuery("");
    }
  }, [location.pathname, searchParams.q]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const trimmedQuery = searchQuery.trim();

    // Add to search history
    addToSearchHistory(trimmedQuery);

    // Navigate to search
    navigate({
      to: "/autocomplete",
      search: { q: trimmedQuery, filter: undefined, search: undefined },
    });

    // Clear focus and close history
    setFocused(false);
    setShowHistory(false);
    inputRef.current?.blur();
  }, [navigate, addToSearchHistory]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch(query);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocused(false);
        setShowHistory(false);
        inputRef.current?.blur();
      } else if (e.key === "ArrowDown" && showHistory) {
        e.preventDefault();
        // Focus first history item
        const firstItem = document.querySelector('[data-history-item="0"]');
        if (firstItem) {
          (firstItem as HTMLElement).focus();
        }
      }
    },
    [query, handleSearch, showHistory],
  );

  const handleHistoryItemClick = useCallback((historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  }, [handleSearch]);

  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    notifications.show({
      title: "History Cleared",
      message: "Search history has been cleared",
      color: "blue",
      autoClose: NOTIFICATION_DURATION.SHORT_MS,
    });
  }, [clearSearchHistory]);

  // Auto-suggest recent searches when focused
  const filteredHistory = useMemo(() => {
    if (!query.trim()) {
      return searchHistory.slice(0, 8);
    }
    return searchHistory
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query, searchHistory]);

  return (
    <Group gap="xs" align="center">
      <Popover
        opened={showHistory && filteredHistory.length > 0}
        position="bottom"
        withArrow
        shadow="md"
        offset={8}
      >
        <Popover.Target>
          <TextInput
            ref={inputRef}
            placeholder="Search works, authors, institutions..."
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              setShowHistory(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                if (!inputRef.current?.matches(':focus-within')) {
                  setFocused(false);
                  setShowHistory(false);
                }
              }, 200);
            }}
            size="sm"
            styles={{
              root: {
                width: focused ? "420px" : "350px",
                transition: "width 200ms ease",
              },
              input: {
                borderRadius: "8px",
                fontSize: "14px",
              },
            }}
            aria-label="Global search input"
            rightSection={
              query ? (
                <ActionIcon
                  size="sm"
                  variant="transparent"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
          />
        </Popover.Target>

        <Popover.Dropdown>
          <Stack gap="xs" p="xs" miw="300">
            <Stack gap={4}>
              <Group justify="space-between" align="center">
                <Text size="sm" fw={600}>
                  <Group gap="xs">
                    <IconHistory size={14} />
                    Recent Searches
                  </Group>
                </Text>
                {searchHistory.length > 0 && (
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={handleClearHistory}
                    aria-label="Clear search history"
                  >
                    <IconX size={12} />
                  </ActionIcon>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Enter to search · Esc to close · ↓ to navigate
              </Text>
            </Stack>

            {filteredHistory.map((historyQuery, index) => (
              <Group
                key={historyQuery}
                gap="xs"
                align="center"
                p="xs"
                style={{
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleHistoryItemClick(historyQuery);
                }}
                data-history-item={index.toString()}
                tabIndex={0}
              >
                <IconClock size={12} color="var(--mantine-color-gray-5)" />
                <Text
                  size="sm"
                  style={{ flex: 1 }}
                  truncate
                >
                  {historyQuery}
                </Text>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHistoryItemClick(historyQuery);
                  }}
                >
                  <IconArrowRight size={10} />
                </ActionIcon>
              </Group>
            ))}

            {filteredHistory.length === 0 && (
              <Stack gap="xs" py="md">
                <Text size="sm" c="dimmed" ta="center">
                  {query ? "No matching searches" : "No recent searches"}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  Press Enter to search
                </Text>
              </Stack>
            )}
          </Stack>
        </Popover.Dropdown>
      </Popover>

      <Badge
        size="xs"
        variant="light"
        color="gray"
        hidden={searchHistory.length === 0}
      >
        {searchHistory.length}
      </Badge>
    </Group>
  );
};
