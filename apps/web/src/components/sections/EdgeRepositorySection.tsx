/**
 * Edge Repository Section component
 * Displays repository edges that can be dragged into the graph
 */

import React, { useCallback, useMemo } from "react";
import {
  Stack,
  Text,
  Checkbox,
  Group,
  Button,
  ScrollArea,
  Card,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconSelectAll,
  IconX,
  IconTrash,
  IconDragDrop,
  IconArrowRight,
  IconBulb,
} from "@tabler/icons-react";
import { useRepositoryStore, createInitialEdgeTypeFilter } from "@/stores/repository-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphEdge, EntityType } from "@academic-explorer/graph";
import { RelationType, getRelationColor } from "@academic-explorer/graph";
import type { RepositoryState } from "@/stores/repository-store";

const edgeTypeOptions = [
  {
    entityType: RelationType.AUTHORED,
    label: "Authored",
    color: getRelationColor(RelationType.AUTHORED),
  },
  {
    entityType: RelationType.AFFILIATED,
    label: "Affiliated",
    color: getRelationColor(RelationType.AFFILIATED),
  },
  {
    entityType: RelationType.PUBLISHED_IN,
    label: "Published In",
    color: getRelationColor(RelationType.PUBLISHED_IN),
  },
  {
    entityType: RelationType.FUNDED_BY,
    label: "Funded By",
    color: getRelationColor(RelationType.FUNDED_BY),
  },
  {
    entityType: RelationType.REFERENCES,
    label: "References",
    color: getRelationColor(RelationType.REFERENCES),
  },
  {
    entityType: RelationType.RELATED_TO,
    label: "Related To",
    color: getRelationColor(RelationType.RELATED_TO),
  },
  {
    entityType: RelationType.SOURCE_PUBLISHED_BY,
    label: "Source Published By",
    color: getRelationColor(RelationType.SOURCE_PUBLISHED_BY),
  },
  {
    entityType: RelationType.INSTITUTION_CHILD_OF,
    label: "Institution Child Of",
    color: getRelationColor(RelationType.INSTITUTION_CHILD_OF),
  },
  {
    entityType: RelationType.PUBLISHER_CHILD_OF,
    label: "Publisher Child Of",
    color: getRelationColor(RelationType.PUBLISHER_CHILD_OF),
  },
  {
    entityType: RelationType.WORK_HAS_TOPIC,
    label: "Work Has Topic",
    color: getRelationColor(RelationType.WORK_HAS_TOPIC),
  },
  {
    entityType: RelationType.WORK_HAS_KEYWORD,
    label: "Work Has Keyword",
    color: getRelationColor(RelationType.WORK_HAS_KEYWORD),
  },
  {
    entityType: RelationType.AUTHOR_RESEARCHES,
    label: "Author Researches",
    color: getRelationColor(RelationType.AUTHOR_RESEARCHES),
  },
  {
    entityType: RelationType.INSTITUTION_LOCATED_IN,
    label: "Institution Located In",
    color: getRelationColor(RelationType.INSTITUTION_LOCATED_IN),
  },
  {
    entityType: RelationType.FUNDER_LOCATED_IN,
    label: "Funder Located In",
    color: getRelationColor(RelationType.FUNDER_LOCATED_IN),
  },
  {
    entityType: RelationType.TOPIC_PART_OF_FIELD,
    label: "Topic Part Of Field",
    color: getRelationColor(RelationType.TOPIC_PART_OF_FIELD),
  },
];

interface EdgeRepositoryItemProps {
  edge: GraphEdge;
  isSelected: boolean;
  onSelect: (edgeId: string, selected: boolean) => void;
  onRemove: (edgeId: string) => void;
}

const EdgeRepositoryItem: React.FC<EdgeRepositoryItemProps> = ({
  edge,
  isSelected,
  onSelect,
  onRemove,
}) => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  // Get display info for edge type
  const edgeOption = edgeTypeOptions.find(
    (option) => option.entityType === edge.type,
  );
  const edgeColor = edgeOption?.color ?? "#95a5a6";
  const edgeLabel = edgeOption?.label ?? edge.type;

  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      // Store edge data for drop handler
      event.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          entityType: "repository-edge",
          edge,
        }),
      );
      event.dataTransfer.effectAllowed = "copy";

      logger.debug("repository", "Started dragging repository edge", {
        edgeId: edge.id,
        edgeType: edge.type,
        source: edge.source,
        target: edge.target,
      });
    },
    [edge],
  );

  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSelect(edge.id, event.currentTarget.checked);
    },
    [edge.id, onSelect],
  );

  const handleRemove = useCallback(() => {
    onRemove(edge.id);
  }, [edge.id, onRemove]);

  return (
    <Card
      padding="xs"
      withBorder
      style={{
        cursor: "grab",
        backgroundColor: isSelected
          ? colors.primary + "20"
          : colors.background.primary,
        borderColor: isSelected ? colors.primary : colors.border.primary,
        marginBottom: "4px",
      }}
      draggable="true"
      onDragStart={handleDragStart}
    >
      <Group gap="xs" wrap="nowrap">
        <Checkbox
          checked={isSelected}
          onChange={handleCheckboxChange}
          size="sm"
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" style={{ color: colors.text.secondary }} truncate>
              {edge.source}
            </Text>
            <IconArrowRight
              size={12}
              style={{ color: edgeColor, flexShrink: 0 }}
            />
            <Text size="xs" style={{ color: colors.text.secondary }} truncate>
              {edge.target}
            </Text>
          </Group>
          <Text size="xs" style={{ color: edgeColor, fontWeight: 500 }}>
            {edgeLabel}
          </Text>
        </div>

        <Group gap="xs">
          <Tooltip label="Drag to graph">
            <div style={{ color: colors.text.tertiary }}>
              <IconDragDrop size={14} />
            </div>
          </Tooltip>

          <Tooltip label="Remove from repository">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              onClick={handleRemove}
            >
              <IconTrash size={12} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
};

export const EdgeRepositorySection: React.FC = () => {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  // Repository store - use direct store instance
  const repositoryStore = useRepositoryStore();

  // State management for component
  const [edgeTypeFilter, setEdgeTypeFilterState] = React.useState(createInitialEdgeTypeFilter());
  const [selectedRepositoryEdges, setSelectedRepositoryEdges] = React.useState<Record<string, boolean>>({});

  // Initialize state from store
  React.useEffect(() => {
    (async () => {
      try {
        const state = await repositoryStore.getRepositoryState();
        setEdgeTypeFilterState(state.edgeTypeFilter);
        setSelectedRepositoryEdges(state.selectedRepositoryEdges);
      } catch (error) {
        logger?.error("ui", "Failed to load repository state", { error });
      }
    })();
  }, [repositoryStore]);

  // Get filtered edges using repository store methods
  const filteredEdges = useMemo(() => {
    // Create a complete mock state object for the compute method
    const mockState: RepositoryState = {
      repositoryMode: false,
      repositoryNodes: {},
      repositoryEdges: {}, // Empty for now
      searchQuery: "",
      nodeTypeFilter: {
        works: true,
        authors: true,
        sources: true,
        institutions: true,
        topics: true,
        concepts: true,
        publishers: true,
        funders: true,
        keywords: true,
      },
      edgeTypeFilter,
      selectedRepositoryNodes: {},
      selectedRepositoryEdges,
      filteredNodes: [],
      filteredEdges: [],
      totalNodeCount: 0,
      totalEdgeCount: 0,
      selectedNodeCount: 0,
      selectedEdgeCount: 0,
    };
    return repositoryStore.computeFilteredEdges(mockState);
  }, [edgeTypeFilter, selectedRepositoryEdges, repositoryStore]);

  const selectedEdges = useMemo(() => {
    // Get selected edge IDs from the record
    return Object.keys(selectedRepositoryEdges).filter(edgeId =>
      selectedRepositoryEdges[edgeId]
    );
  }, [selectedRepositoryEdges]);

  const handleTypeFilterChange = useCallback(
    async ({ relationType, checked }) => {
      try {
        await repositoryStore.setEdgeTypeFilter(relationType, checked);
        setEdgeTypeFilterState(prev => ({ ...prev, [relationType]: checked }));
      } catch (error) {
        logger?.error("ui", "Failed to set edge type filter", { error });
      }
    },
    [repositoryStore],
  );

  const handleSelectAll = useCallback(async () => {
    try {
      await repositoryStore.selectAllEdges();
      // Refresh selected edges
      const state = await repositoryStore.getRepositoryState();
      setSelectedRepositoryEdges(state.selectedRepositoryEdges);
    } catch (error) {
      logger?.error("ui", "Failed to select all edges", { error });
    }
  }, [repositoryStore]);

  const handleClearSelection = useCallback(async () => {
    try {
      await repositoryStore.clearAllSelections();
      setSelectedRepositoryEdges({});
    } catch (error) {
      logger?.error("ui", "Failed to clear selections", { error });
    }
  }, [repositoryStore]);

  const handleRemoveSelected = useCallback(async () => {
    try {
      const selectedEdgeIds = Object.keys(selectedRepositoryEdges);
      if (selectedEdgeIds.length > 0) {
        await repositoryStore.removeFromRepository([], selectedEdgeIds);
        setSelectedRepositoryEdges({});
        logger.debug("repository", "Removed selected edges from repository", {
          removedCount: selectedEdgeIds.length,
        });
      }
    } catch (error) {
      logger?.error("ui", "Failed to remove selected edges", { error });
    }
  }, [selectedRepositoryEdges, repositoryStore]);

  const handleRemoveEdge = useCallback(
    async (edgeId: string) => {
      try {
        await repositoryStore.removeFromRepository([], [edgeId]);
        setSelectedRepositoryEdges(prev => {
          const newState = { ...prev };
          delete newState[edgeId];
          return newState;
        });
        logger.debug("repository", "Removed single edge from repository", {
          edgeId,
        });
      } catch (error) {
        logger?.error("ui", "Failed to remove edge", { error });
      }
    },
    [repositoryStore],
  );

  const handleEdgeSelect = useCallback(
    async (edgeId: string, selected: boolean) => {
      try {
        await repositoryStore.selectRepositoryEdge(edgeId, selected);
        setSelectedRepositoryEdges(prev => ({
          ...prev,
          [edgeId]: selected
        }));
      } catch (error) {
        logger?.error("ui", "Failed to select edge", { error });
      }
    },
    [repositoryStore],
  );

  return (
    <Stack gap="sm" style={{ height: "100%", overflow: "hidden" }}>
      {/* Type filters */}
      <Stack gap="xs">
        <Text size="sm" style={{ fontWeight: 500, color: colors.text.primary }}>
          Filter by entityType:
        </Text>
        <ScrollArea style={{ maxHeight: "200px" }}>
          <Stack gap="xs">
            {edgeTypeOptions.map((option) => {
              const isChecked = edgeTypeFilter[option.entityType];

              return (
                <Checkbox
                  key={option.entityType}
                  checked={isChecked}
                  onChange={(event) => {
                    handleTypeFilterChange({
                      relationType: option.entityType,
                      checked: event.currentTarget.checked,
                    });
                  }}
                  label={
                    <Group gap="xs">
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: option.color,
                          borderRadius: "2px",
                        }}
                      />
                      <Text size="xs">{option.label}</Text>
                    </Group>
                  }
                  size="xs"
                />
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>

      {/* Selection controls */}
      <Group gap="xs">
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconSelectAll size={14} />}
          onClick={handleSelectAll}
          disabled={filteredEdges.length === 0}
        >
          All
        </Button>

        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconX size={14} />}
          onClick={handleClearSelection}
          disabled={selectedEdges.length === 0}
        >
          None
        </Button>

        <Button
          size="xs"
          variant="subtle"
          color="red"
          leftSection={<IconTrash size={14} />}
          onClick={handleRemoveSelected}
          disabled={selectedEdges.length === 0}
        >
          Remove
        </Button>
      </Group>

      {/* Results summary */}
      <Group gap="xs" justify="space-between">
        <Text size="xs" style={{ color: colors.text.secondary }}>
          {filteredEdges.length} edge{filteredEdges.length !== 1 ? "s" : ""}
        </Text>
        {selectedEdges.length > 0 && (
          <Badge size="xs" color="blue">
            {selectedEdges.length} selected
          </Badge>
        )}
      </Group>

      {/* Edge list */}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="xs">
          {filteredEdges.length === 0 ? (
            <Text
              size="sm"
              style={{
                color: colors.text.tertiary,
                textAlign: "center",
                padding: "20px",
              }}
            >
              No edges in repository. Edges are added when expanding nodes.
            </Text>
          ) : (
            filteredEdges.map((edge) => (
              <EdgeRepositoryItem
                key={edge.id}
                edge={edge}
                isSelected={selectedRepositoryEdges[edge.id] ?? false}
                onSelect={handleEdgeSelect}
                onRemove={handleRemoveEdge}
              />
            ))
          )}
        </Stack>
      </ScrollArea>

      {/* Drag instructions */}
      {filteredEdges.length > 0 && (
        <Group justify="center" gap="xs" style={{ padding: "8px" }}>
          <IconBulb size={12} style={{ color: colors.text.tertiary }} />
          <Text size="xs" style={{ color: colors.text.tertiary }}>
            Drag edges to the graph to add them
          </Text>
        </Group>
      )}
    </Stack>
  );
};
