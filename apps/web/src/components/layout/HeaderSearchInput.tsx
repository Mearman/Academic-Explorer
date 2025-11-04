import { useState, useCallback, useEffect } from "react";
import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useNavigate, useSearch, useLocation } from "@tanstack/react-router";
import { useDebouncedCallback } from "@mantine/hooks";

export function HeaderSearchInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ strict: false });

  // Initialize from URL params if on search page
  const [query, setQuery] = useState(() => {
    if (location.pathname === "/search" && searchParams.q) {
      return String(searchParams.q);
    }
    return "";
  });

  // Update local state when URL changes
  useEffect(() => {
    if (location.pathname === "/search" && searchParams.q) {
      setQuery(String(searchParams.q));
    } else if (location.pathname !== "/search") {
      setQuery("");
    }
  }, [location.pathname, searchParams.q]);

  // Debounced navigation to search page
  const debouncedNavigate = useDebouncedCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      navigate({
        to: "/search",
        search: { q: searchQuery.trim(), filter: undefined, search: undefined },
      });
    }
  }, 500);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      debouncedNavigate(value);
    },
    [debouncedNavigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (query.trim()) {
          navigate({
            to: "/search",
            search: { q: query.trim(), filter: undefined, search: undefined },
          });
        }
      }
    },
    [query, navigate],
  );

  return (
    <TextInput
      placeholder="Search works, authors, institutions..."
      leftSection={<IconSearch size={16} />}
      value={query}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      size="sm"
      styles={{
        root: {
          width: "350px",
        },
        input: {
          borderRadius: "8px",
        },
      }}
      aria-label="Global search input"
    />
  );
}
