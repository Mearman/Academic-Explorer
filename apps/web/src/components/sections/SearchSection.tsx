/**
 * Search section component
 * Extracted from LeftSidebar for dynamic section system
 */

import React, { useState, useCallback } from "react";
import { Switch, Group, Text, Stack, TextInput, Button, Flex } from "@mantine/core";
import { IconGraph, IconArchive, IconSearch } from "@tabler/icons-react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useRepositoryStore } from "@/stores/repository-store";
import { logger } from "@academic-explorer/utils/logger";

export const SearchSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { loadEntity, loadEntityIntoRepository, isLoading } = useGraphData();
  const themeColors = useThemeColors();
  const { colors } = themeColors;
  const prefersReducedMotion = useReducedMotion();

  // Repository store - use direct store methods
  const repositoryStore = useRepositoryStore();
  const [repositoryMode, setRepositoryModeState] = React.useState(false);

  // Initialize repository mode from store
  React.useEffect(() => {
    (async () => {
      try {
        const state = await repositoryStore.getRepositoryState();
        setRepositoryModeState(state.repositoryMode);
      } catch (error) {
        logger?.error("ui", "Failed to get repository state", { error });
      }
    })();
  }, [repositoryStore]);

  const handleRepositoryModeToggle = useCallback(
    async (checked: boolean) => {
      try {
        await repositoryStore.setRepositoryMode(checked);
        setRepositoryModeState(checked);
        logger.debug(
          "ui",
          `Repository mode ${checked ? "enabled" : "disabled"}`,
          {
            repositoryMode: checked,
          },
        );
      } catch (error) {
        logger?.error("ui", "Failed to set repository mode", { error });
      }
    },
    [repositoryStore],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    void (async () => {
      try {
        logger.debug("ui", "Starting search from SearchSection", {
          query: searchQuery,
          repositoryMode,
        });

        if (repositoryMode) {
          // Repository mode - add entity to repository collection
          await loadEntityIntoRepository(searchQuery);
        } else {
          // Live mode - add directly to graph (current behavior)
          await loadEntity(searchQuery);
        }

        logger.debug("ui", "Search completed successfully", {
          query: searchQuery,
          repositoryMode,
        });
      } catch (error) {
        logger.error("ui", "Search failed", { query: searchQuery, error });
      }
    })();
  };

  return (
    <Stack gap="sm">
      {/* Repository mode toggle */}
      <Group gap="xs" wrap="nowrap">
        <Switch
          size="sm"
          checked={repositoryMode}
          onChange={(event) => {
            handleRepositoryModeToggle(event.currentTarget.checked);
          }}
          color="blue"
          thumbIcon={
            repositoryMode ? (
              <IconArchive size={12} style={{ color: "white" }} />
            ) : (
              <IconGraph size={12} style={{ color: "var(--mantine-color-dimmed)" }} />
            )
          }
        />
        <Flex flex={1} direction="column">
          <Text size="sm" fw={500} c="var(--mantine-color-text)">
            {repositoryMode ? "Repository Mode" : "Live Mode"}
          </Text>
          <Text size="xs" c="dimmed">
            {repositoryMode
              ? "Search adds to repository for manual drag-to-graph"
              : "Search immediately adds results to graph"}
          </Text>
        </Flex>
      </Group>

      {/* Search form */}
      <form onSubmit={handleSearch}>
        <Stack gap="xs">
          <TextInput
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="Enter keywords, DOI, ORCID, etc..."
            disabled={isLoading}
            rightSection={<IconSearch size={16} />}
          />
          <Button
            type="submit"
            disabled={!searchQuery.trim() || isLoading}
            loading={isLoading}
            fullWidth
          >
            {repositoryMode ? "Search → Repository" : "Search → Graph"}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};
